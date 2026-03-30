// frontend_dsi6/src/app/components/recarga-rapida/recarga-rapida.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RecargaService } from '../../core/services/recarga.service';
import { ClienteService, ClienteVenta } from '../../core/services/cliente.service';
import { ProductService } from '../../core/services/producto.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/producto.model';
import { ClienteRapidoFormComponent } from '../cliente-rapido-form/cliente-rapido-form.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-recarga-rapida',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './recarga-rapida.component.html',
  styleUrls: ['./recarga-rapida.component.css']
})
export class RecargaRapidaComponent implements OnInit {
  private recargaService = inject(RecargaService);
  private clienteService = inject(ClienteService);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Datos del formulario
  clientes: ClienteVenta[] = [];
  productos: Product[] = [];
  clienteSeleccionado: ClienteVenta | null = null;
  productoSeleccionado: Product | null = null;
  cantidad: number = 1;
  metodoPago: number = 1; // 1: Efectivo, 2: Yape
  notas: string = '';
  
  // Estados
  loading = false;
  searchCliente = '';
  filteredClientes: ClienteVenta[] = [];
  mostrarListaClientes = false;
  
  // Métodos de pago
  metodosPago = [
    { id: 1, nombre: 'Efectivo', icono: 'money', requiereConfirmacion: false },
    { id: 2, nombre: 'Yape', icono: 'qr_code', requiereConfirmacion: true }
  ];

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarProductosBidones();
  }

  // ========== MÉTODOS PARA CANTIDAD ==========
  decrementarCantidad(): void {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  incrementarCantidad(): void {
    // Limitar por stock si es necesario
    if (this.productoSeleccionado && this.cantidad >= this.productoSeleccionado.stock) {
      this.snackBar.open(`Stock máximo: ${this.productoSeleccionado.stock} unidades`, 'Cerrar', { duration: 2000 });
      return;
    }
    this.cantidad++;
  }

  onCantidadChange(): void {
    if (this.cantidad < 1) {
      this.cantidad = 1;
    }
    // Limitar por stock si es necesario
    if (this.productoSeleccionado && this.cantidad > this.productoSeleccionado.stock) {
      this.cantidad = this.productoSeleccionado.stock;
      this.snackBar.open(`Stock máximo: ${this.productoSeleccionado.stock} unidades`, 'Cerrar', { duration: 2000 });
    }
  }

  // ========== MÉTODOS DE CARGA DE DATOS ==========
  cargarClientes(): void {
    this.clienteService.getClientesParaVentas().subscribe({
      next: (clientes) => {
        this.clientes = clientes;
        this.filteredClientes = clientes;
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        this.snackBar.open('Error al cargar clientes', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarProductosBidones(): void {
    this.productService.getProducts().subscribe({
      next: (productos) => {
        // Filtrar solo productos que son bidones
        this.productos = productos.filter(p => 
          p.nombre.toLowerCase().includes('bidón') ||
          p.nombre.toLowerCase().includes('bidon')
        );
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // ========== MÉTODOS DE CLIENTES ==========
  filtrarClientes(): void {
    if (!this.searchCliente) {
      this.filteredClientes = this.clientes;
      return;
    }
    
    const searchLower = this.searchCliente.toLowerCase();
    this.filteredClientes = this.clientes.filter(cliente =>
      (cliente.nombre_completo?.toLowerCase().includes(searchLower) ||
       cliente.persona?.nombre_completo?.toLowerCase().includes(searchLower) ||
       cliente.persona?.telefono?.includes(this.searchCliente) ||
       cliente.persona?.numero_documento?.includes(this.searchCliente))
    );
    
    if (this.searchCliente && this.filteredClientes.length > 0) {
      this.mostrarListaClientes = true;
    }
  }

  seleccionarCliente(cliente: ClienteVenta): void {
    this.clienteSeleccionado = cliente;
    this.searchCliente = cliente.nombre_completo || cliente.persona?.nombre_completo || '';
    this.mostrarListaClientes = false;
  }

  limpiarBusquedaCliente(): void {
    this.searchCliente = '';
    this.clienteSeleccionado = null;
    this.filteredClientes = this.clientes;
  }

  abrirNuevoCliente(): void {
    const dialogRef = this.dialog.open(ClienteRapidoFormComponent, {
      width: '750px',
      maxWidth: '95vw',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe((nuevoCliente) => {
      if (nuevoCliente) {
        this.cargarClientes();
        setTimeout(() => {
          const clienteEncontrado = this.clientes.find(c => c.id_cliente === nuevoCliente.id_cliente);
          if (clienteEncontrado) {
            this.seleccionarCliente(clienteEncontrado);
          }
        }, 500);
      }
    });
  }

  // ========== MÉTODOS DE CÁLCULO Y VALIDACIÓN ==========
  getTotal(): number {
    if (!this.productoSeleccionado) return 0;
    return this.productoSeleccionado.precio * this.cantidad;
  }

  puedeRegistrar(): boolean {
    return !!this.clienteSeleccionado && 
           !!this.productoSeleccionado && 
           this.cantidad > 0 &&
           !this.loading;
  }

  // ========== MÉTODOS DE REGISTRO ==========
  registrarRecarga(): void {
    if (!this.puedeRegistrar()) return;

    const total = this.getTotal();
    const concepto = `Recarga de ${this.cantidad} bidón(es) - ${this.productoSeleccionado!.nombre}`;

    if (this.metodoPago === 2) {
      this.procesarYape(total, concepto);
    } else {
      this.procesarEfectivo(total);
    }
  }

  private procesarYape(total: number, concepto: string): void {
  this.loading = true;
  
  // Primero crear la recarga en estado "pendiente" (estado 4 = Listo para repartos)
  const recargaData = {
    id_cliente: this.clienteSeleccionado!.id_cliente,
    id_producto: this.productoSeleccionado!.id_producto!,
    cantidad: this.cantidad,
    total: total,
    id_metodo_pago: 2, // Yape
    notas: `${concepto} - PENDIENTE DE CONFIRMACIÓN YAPE`
  };
  
  this.recargaService.registrarRecarga(recargaData).subscribe({
    next: (response) => {
      const id_venta = response.recarga.id_venta;
      
      // Solicitar código de verificación
      this.recargaService.solicitarCodigoYape(id_venta, total).subscribe({
        next: (codigoResponse) => {
          const codigo = codigoResponse.codigo;
          
          this.loading = false;
          
          // Mostrar modal con código
          Swal.fire({
            title: '💛 Pago con Yape',
            html: `
              <div style="text-align: center;">
                <div style="font-size: 2rem; margin: 1rem 0;">💛</div>
                <p><strong>Monto a pagar: S/ ${total.toFixed(2)}</strong></p>
                
                <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                  <p><strong>🔐 CÓDIGO DE VERIFICACIÓN:</strong></p>
                  <p style="font-size: 2rem; font-weight: bold; font-family: monospace; letter-spacing: 2px;">
                    ${codigo}
                  </p>
                  <p style="font-size: 0.8rem; color: #856404;">
                    El cliente debe colocar ESTE CÓDIGO en el mensaje de Yape
                  </p>
                </div>
                
                <div style="background: #f0f0f0; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                  <p><strong>Número Yape de la empresa:</strong></p>
                  <p style="font-size: 1.2rem; font-weight: bold; color: #25D366;">999 999 999</p>
                </div>
                
                <div id="yape-status" style="margin: 1rem 0; padding: 0.75rem; background: #e3f2fd; border-radius: 8px;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <div class="spinner" style="width: 16px; height: 16px;"></div>
                    <span>Esperando confirmación de Yape...</span>
                  </div>
                  <small id="yape-timer" style="display: block; margin-top: 0.5rem; color: #666;">
                    Tiempo de espera: 2:00
                  </small>
                </div>
                
                <div id="yape-success" style="display: none; margin: 1rem 0; padding: 0.75rem; background: #e8f5e9; border-radius: 8px; color: #2e7d32;">
                  ✅ ¡Pago confirmado! Redirigiendo...
                </div>
                
                <div id="yape-error" style="display: none; margin: 1rem 0; padding: 0.75rem; background: #ffebee; border-radius: 8px; color: #c62828;">
                  ❌ Tiempo de espera agotado. El pago no fue confirmado.
                </div>
              </div>
            `,
            icon: 'info',
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#d33',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
              let tiempoRestante = 120;
              const timerElement = document.getElementById('yape-timer');
              const statusElement = document.getElementById('yape-status');
              const successElement = document.getElementById('yape-success');
              const errorElement = document.getElementById('yape-error');
              
              // Iniciar polling para verificar el pago
              const subscription = this.recargaService.verificarPagoYape(id_venta, 120)
                .subscribe({
                  next: (result: any) => {
                    if (result.pagado) {
                      // Pago confirmado
                      if (timerElement) timerElement.style.display = 'none';
                      if (statusElement) statusElement.style.display = 'none';
                      if (successElement) successElement.style.display = 'block';
                      
                      Swal.showLoading();
                      
                      setTimeout(() => {
                        subscription.unsubscribe();
                        Swal.fire({
                          title: '✅ Pago Confirmado',
                          html: `
                            <p>El pago con Yape ha sido confirmado</p>
                            <p><strong>Transacción:</strong> ${result.transaction_id}</p>
                            <p><strong>Cliente:</strong> ${this.clienteSeleccionado?.nombre_completo}</p>
                            <p><strong>Monto:</strong> S/ ${total.toFixed(2)}</p>
                          `,
                          icon: 'success',
                          confirmButtonText: 'Aceptar'
                        }).then(() => {
                          this.limpiarFormulario();
                          window.dispatchEvent(new CustomEvent('recarga-realizada'));
                        });
                      }, 1500);
                    } else if (result.timeout) {
                      // Tiempo agotado
                      if (timerElement) timerElement.style.display = 'none';
                      if (statusElement) statusElement.style.display = 'none';
                      if (errorElement) errorElement.style.display = 'block';
                      
                      subscription.unsubscribe();
                      
                      Swal.fire({
                        title: '⏱️ Tiempo agotado',
                        text: 'No se recibió confirmación de pago. Por favor, verifique si el cliente realizó el pago correctamente.',
                        icon: 'warning',
                        confirmButtonText: 'Entendido'
                      }).then(() => {
                        // Opcional: cancelar la venta pendiente
                        this.cancelarVentaPendiente(id_venta);
                      });
                    }
                  },
                  error: (err) => {
                    console.error('Error verificando pago:', err);
                    subscription.unsubscribe();
                    if (statusElement) statusElement.style.display = 'none';
                    if (errorElement) errorElement.style.display = 'block';
                  }
                });
              
              // Temporizador visual
              const intervalId = setInterval(() => {
                tiempoRestante--;
                const minutos = Math.floor(tiempoRestante / 60);
                const segundos = tiempoRestante % 60;
                
                if (timerElement) {
                  timerElement.innerHTML = `Tiempo de espera: ${minutos}:${segundos.toString().padStart(2, '0')}`;
                }
                
                if (tiempoRestante <= 0) {
                  clearInterval(intervalId);
                }
              }, 1000);
              
              // Guardar referencias para limpiar al cerrar
              (Swal as any).getPopup()?.setAttribute('data-subscription', subscription);
              (Swal as any).getPopup()?.setAttribute('data-interval', intervalId);
            },
            willClose: () => {
              const subscription = (Swal as any).getPopup()?.getAttribute('data-subscription');
              const interval = (Swal as any).getPopup()?.getAttribute('data-interval');
              if (subscription) subscription.unsubscribe();
              if (interval) clearInterval(interval);
            }
          });
        },
        error: (err) => {
          this.loading = false;
          console.error('Error generando código Yape:', err);
          Swal.fire({
            title: '❌ Error',
            text: 'No se pudo generar el código de verificación',
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
        }
      });
    },
    error: (error) => {
      this.loading = false;
      console.error('Error registrando recarga:', error);
      Swal.fire({
        title: '❌ Error',
        text: error.error?.message || 'Error al registrar la recarga',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  });
}

private cancelarVentaPendiente(id_venta: number): void {
  this.recargaService.cancelarRecarga(id_venta, 'Tiempo de espera agotado - Pago no confirmado')
    .subscribe({
      next: () => console.log(`Venta ${id_venta} cancelada por timeout`),
      error: (err) => console.error('Error cancelando venta:', err)
    });
}


  private confirmarYapeYRegistrar(total: number, concepto: string): void {
    Swal.fire({
      title: '¿Confirmar pago Yape?',
      text: '¿Ya verificaste que el cliente realizó el pago correctamente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar pago',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.registrarEnSistema(total, concepto, true);
      }
    });
  }

  private procesarEfectivo(total: number): void {
    this.registrarEnSistema(total, 'Pago en efectivo', false);
  }

  private registrarEnSistema(total: number, descripcion: string, yapeConfirmado: boolean): void {
    this.loading = true;

    const recargaData = {
      id_cliente: this.clienteSeleccionado!.id_cliente,
      id_producto: this.productoSeleccionado!.id_producto!,
      cantidad: this.cantidad,
      total: total,
      id_metodo_pago: this.metodoPago,
      notas: `${descripcion} - ${this.notas || 'Recarga en tienda'}`
    };

    this.recargaService.registrarRecarga(recargaData).subscribe({
      next: (response) => {
        this.loading = false;
        
        Swal.fire({
          title: '✅ Recarga registrada',
          html: `
            <p>${response.mensaje || 'Recarga completada exitosamente'}</p>
            <p><strong>Cliente:</strong> ${this.clienteSeleccionado?.nombre_completo}</p>
            <p><strong>Producto:</strong> ${this.productoSeleccionado?.nombre}</p>
            <p><strong>Cantidad:</strong> ${this.cantidad} bidón(es)</p>
            <p><strong>Total:</strong> S/ ${total.toFixed(2)}</p>
            <p><strong>Método:</strong> ${this.metodoPago === 2 ? 'Yape' : 'Efectivo'}</p>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.limpiarFormulario();
          window.dispatchEvent(new CustomEvent('recarga-realizada'));
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error registrando recarga:', error);
        Swal.fire({
          title: '❌ Error',
          text: error.error?.message || 'Error al registrar la recarga',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  private limpiarFormulario(): void {
    this.clienteSeleccionado = null;
    this.productoSeleccionado = null;
    this.cantidad = 1;
    this.metodoPago = 1;
    this.notas = '';
    this.searchCliente = '';
    this.mostrarListaClientes = false;
  }

  volver(): void {
    this.router.navigate(['/ventas']);
  }
}