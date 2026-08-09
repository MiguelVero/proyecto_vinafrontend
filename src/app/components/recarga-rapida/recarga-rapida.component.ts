// src/app/components/recarga-rapida/recarga-rapida.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
import { PersonalizacionService } from '../../core/services/personalizacion.service';

@Component({
  selector: 'app-recarga-rapida',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
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
  public personalizacionService = inject(PersonalizacionService);

  // ===== DATOS DEL FORMULARIO =====
  clientes: ClienteVenta[] = [];
  productos: Product[] = []; // ✅ Solo tendrá 1 producto (Servicio de Recarga)
  clienteSeleccionado: ClienteVenta | null = null;
  productoSeleccionado: Product | null = null;
  cantidad: number = 1;
  metodoPago: number = 1;
  notas: string = '';

  // ===== ESTADOS =====
  loading = false;
  searchCliente = '';
  filteredClientes: ClienteVenta[] = [];
  mostrarListaClientes = false;
  currentYear: number = new Date().getFullYear();
  totalRecargasHoy: number = 0;
  
  // ===== MÉTODOS DE PAGO =====
  metodosPago = [
    { id: 1, nombre: 'Efectivo', icono: 'money', descripcion: 'Pago inmediato en caja' },
    { id: 2, nombre: 'Yape', icono: 'qr_code', descripcion: 'El cliente paga con Yape y confirmas' }
  ];

  // ===== TELEFONO YAPE =====
  get telefonoYape(): string {
    const telefono = this.personalizacionService.config()?.telefono;
    if (telefono && telefono.trim() !== '') {
      const numeros = telefono.replace(/\D/g, '');
      if (numeros.length === 9) {
        return `${numeros.slice(0, 3)} ${numeros.slice(3, 6)} ${numeros.slice(6, 9)}`;
      }
      return telefono;
    }
    return '999 999 999';
  }

  // ==============================================
  // 🔄 LIFECYCLE
  // ==============================================
  ngOnInit(): void {
    this.cargarClientes();
    this.cargarProductoRecarga(); // ✅ Cambiado: solo 1 producto
    this.cargarTotalRecargasHoy();
  }

  // ==============================================
  // ➕ CONTROLES DE CANTIDAD
  // ==============================================
  decrementarCantidad(): void {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  incrementarCantidad(): void {
    if (this.cantidad < 100) {
      this.cantidad++;
    } else {
      this.snackBar.open('Máximo 100 bidones por recarga', 'Cerrar', { duration: 2000 });
    }
  }

  onCantidadChange(): void {
    if (this.cantidad < 1) {
      this.cantidad = 1;
    }
    if (this.cantidad > 100) {
      this.cantidad = 100;
      this.snackBar.open('Máximo 100 bidones por recarga', 'Cerrar', { duration: 2000 });
    }
  }

  // ==============================================
  // 📥 CARGA DE DATOS
  // ==============================================
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

  // ✅ CORREGIDO: Cargar SOLO el producto de recarga (único)
  cargarProductoRecarga(): void {
    this.productService.getProducts().subscribe({
      next: (productos) => {
        // ✅ Buscar el producto de recarga por nombre o ID fijo
        const productoRecarga = productos.find(p => 
          p.nombre.toLowerCase().includes('servicio de recarga') ||
          p.nombre.toLowerCase().includes('recarga de bidón') ||
          p.nombre.toLowerCase().includes('recarga bidón') ||
          p.id_producto === 5 // ID que tendrá en la base de datos
        );
        
        this.productos = productoRecarga ? [productoRecarga] : [];
        
        // ✅ Si solo hay uno, seleccionarlo automáticamente
        if (this.productos.length === 1) {
          this.productoSeleccionado = this.productos[0];
          console.log('✅ Producto de recarga seleccionado automáticamente:', this.productoSeleccionado.nombre);
        } else {
          this.snackBar.open(
            '⚠️ No hay producto de recarga configurado. Contacte al administrador.',
            'Cerrar',
            { duration: 5000 }
          );
        }
      },
      error: (err) => {
        console.error('Error cargando producto de recarga:', err);
        this.snackBar.open('Error al cargar producto de recarga', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarTotalRecargasHoy(): void {
    this.recargaService.getRecargasHoy().subscribe({
      next: (recargas) => {
        this.totalRecargasHoy = recargas.length;
      },
      error: (err) => {
        console.error('Error cargando total recargas hoy:', err);
        this.totalRecargasHoy = 0;
      }
    });
  }

  // ==============================================
  // 👤 CLIENTES
  // ==============================================
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
    const nombreCliente = cliente.nombre_completo || cliente.persona?.nombre_completo || 'Cliente';
    Swal.fire({
      title: '✅ Cliente seleccionado',
      text: `${nombreCliente} seleccionado correctamente.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
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

  // ==============================================
  // 💰 CÁLCULOS Y VALIDACIONES
  // ==============================================
  getTotal(): number {
    if (!this.productoSeleccionado) return 0;
    // ✅ Precio único de recarga (3.00)
    return this.productoSeleccionado.precio * this.cantidad;
  }

  puedeRegistrar(): boolean {
    return !!this.clienteSeleccionado && 
           !!this.productoSeleccionado && 
           this.cantidad > 0 &&
           !this.loading;
  }

  getVendedorNombre(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.nombre || currentUser?.username || 'Vendedor';
  }

  getRecargasHoy(): number {
    return this.totalRecargasHoy;
  }

  // ==============================================
  // 📝 REGISTRAR RECARGA - CORREGIDO
  // ==============================================
  registrarRecarga(): void {
    if (!this.puedeRegistrar()) return;

    // ✅ OBTENER NOMBRE DEL CLIENTE
    const nombreCliente = this.clienteSeleccionado?.nombre_completo || 
                          this.clienteSeleccionado?.persona?.nombre_completo || 
                          'Cliente';
    const telefonoCliente = this.clienteSeleccionado?.persona?.telefono || '';

    const total = this.getTotal();
    const concepto = `Recarga de ${this.cantidad} bidón(es)`;

    // Confirmación
    Swal.fire({
      title: '¿Confirmar recarga?',
      html: `
        <div style="text-align: left;">
          <p><strong>Cliente:</strong> ${nombreCliente}</p>
          <p><strong>Servicio:</strong> Recarga de bidón (agua purificada)</p>
          <p><strong>Cantidad:</strong> ${this.cantidad} bidón(es)</p>
          <p><strong>Total:</strong> S/ ${total.toFixed(2)}</p>
          <p><strong>Método:</strong> ${this.metodoPago === 2 ? 'Yape' : 'Efectivo'}</p>
          <p style="font-size: 0.8rem; color: #666; margin-top: 8px;">
            <i class="fas fa-info-circle"></i> El cliente trae su propio bidón
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#009949',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarRecarga(total, concepto, nombreCliente, telefonoCliente);
      }
    });
  }

  private procesarRecarga(total: number, concepto: string, nombreCliente: string, telefonoCliente: string): void {
    this.loading = true;

    const recargaData = {
      id_cliente: this.clienteSeleccionado!.id_cliente,
      id_producto: this.productoSeleccionado!.id_producto!,
      cantidad: this.cantidad,
      total: total,
      id_metodo_pago: this.metodoPago,
      notas: `${concepto} - ${this.notas || 'Recarga en planta'}`
    };

    this.recargaService.registrarRecarga(recargaData).subscribe({
      next: (response) => {
        this.loading = false;
        
        // ✅ USAR DATOS LOCALES
        const clienteFinal = response.recarga?.cliente || nombreCliente;
        const telefonoFinal = response.recarga?.telefono || telefonoCliente;
        
        Swal.fire({
          title: '✅ Recarga registrada',
          html: `
            <div style="text-align: left; margin-top: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #f0f7ff; border-radius: 8px; margin-bottom: 10px;">
                <i class="fas fa-user" style="color: #057cbe; font-size: 1.2rem;"></i>
                <div>
                  <strong>${clienteFinal}</strong>
                  <div style="font-size: 0.8rem; color: #666;">${telefonoFinal}</div>
                </div>
              </div>
              <p><strong>Servicio:</strong> Recarga de bidón (agua purificada)</p>
              <p><strong>Cantidad:</strong> ${this.cantidad} bidón(es)</p>
              <p><strong>Total:</strong> S/ ${(response.recarga?.total || total).toFixed(2)}</p>
              <p><strong>Método:</strong> ${this.metodoPago === 2 ? 'Yape' : 'Efectivo'}</p>
              <p style="font-size: 0.8rem; color: #666; margin-top: 8px;">
                <i class="fas fa-hashtag"></i> Venta #${response.recarga?.id_venta || 'N/A'}
              </p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#009949'
        }).then(() => {
          this.limpiarFormulario();
          this.cargarTotalRecargasHoy();
          window.dispatchEvent(new CustomEvent('recarga-realizada'));
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error registrando recarga:', error);
        Swal.fire({
          title: '❌ Error',
          text: error.error?.error || error.error?.message || 'Error al registrar la recarga',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  // ==============================================
  // 🧹 LIMPIAR FORMULARIO
  // ==============================================
  private limpiarFormulario(): void {
    this.clienteSeleccionado = null;
    // ✅ NO limpiar productoSeleccionado porque es único y debe quedar seleccionado
    this.cantidad = 1;
    this.metodoPago = 1;
    this.notas = '';
    this.searchCliente = '';
    this.mostrarListaClientes = false;
  }

  // ==============================================
  // 🔙 VOLVER
  // ==============================================
  volver(): void {
    this.router.navigate(['/ventas']);
  }
// Añadir una propiedad computada
get nombreClienteSeleccionado(): string {
  if (!this.clienteSeleccionado) return '';
  return this.clienteSeleccionado.nombre_completo || 
         this.clienteSeleccionado.persona?.nombre_completo || 
         'Cliente';
}



}