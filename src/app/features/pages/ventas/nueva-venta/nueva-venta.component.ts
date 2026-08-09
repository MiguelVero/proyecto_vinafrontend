// src/app/features/pages/ventas/nueva-venta/nueva-venta.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TruncatePipe } from '../../../../pipes/truncate.pipe';
import { ClienteRapidoFormComponent } from '../../../../components/cliente-rapido-form/cliente-rapido-form.component';
import { VentasService, Venta, VentaDetalle } from '../../../../core/services/ventas.service';
import { ClienteService, ClienteVenta } from '../../../../core/services/cliente.service';
import { ProductService} from '../../../../core/services/producto.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RepartidorService } from '../../../../core/services/repartidor.service';
import { Repartidor } from '../../../../core/models/repartidor.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, TruncatePipe],
  templateUrl: './nueva-venta.component.html',
  styleUrls: ['./nueva-venta.component.css']
})
export class NuevaVentaComponent implements OnInit {
  public ventasService = inject(VentasService);
  public clientesService = inject(ClienteService);
  public productosService = inject(ProductService);
  public authService = inject(AuthService);
  public router = inject(Router);
  public repartidorService = inject(RepartidorService);
  public dialog = inject(MatDialog);

  venta: Venta = {
    id_cliente: 0,
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().split(' ')[0],
    total: 0,
    id_metodo_pago: 1,
    id_estado_venta: 1,
    id_repartidor: null,
    id_vendedor: null,
    notas: '',
    detalles: [],
    tipo_comprobante: 'SIN_COMPROBANTE',
    tipo_comprobante_solicitado: 'SIN_COMPROBANTE'
  };

  serieNumeroPreview: string = '';
  loadingSerie: boolean = false;
  
  clientes: ClienteVenta[] = [];
  productos: any[] = [];
  metodosPago = this.ventasService.getMetodosPago();
  repartidores: Repartidor[] = [];
  
  searchCliente: string = '';
  searchProducto: string = '';
  productoSeleccionado: any = null;
  cantidad: number = 1;

  loading = false;
  error = '';

  filteredClientes: ClienteVenta[] = [];
  filteredProductos: any[] = [];

  mostrarListaClientes: boolean = false;
  mostrarListaProductos: boolean = false;
  clienteSeleccionadoNombre: string = '';

  currentYear: number = new Date().getFullYear();
  lastUpdate: Date = new Date();

  get Math() {
    return Math;
  }

  ngOnInit() {
    this.cargarDatosIniciales();
    this.cargarRepartidores();
  }

  // ==============================================
  // VALIDACIÓN DE TIPO DE COMPROBANTE - CON SWEETALERT
  // ==============================================

  validarTipoComprobanteSegunCliente(tipo: string): boolean {
    if (this.venta.id_cliente === 0) {
      // ✅ MOSTRAR ERROR CON SWEETALERT2
      Swal.fire({
        title: '⚠️ Cliente no seleccionado',
        text: 'Primero debes seleccionar un cliente antes de elegir el tipo de comprobante.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#057cbe',
        timer: 5000,
        timerProgressBar: true,
        backdrop: 'rgba(0,0,0,0.4)',
        customClass: {
          popup: 'swal-responsive'
        }
      });
      return false;
    }

    const clienteSeleccionado = this.clientes.find(c => c.id_cliente === this.venta.id_cliente);
    
    if (!clienteSeleccionado) {
      Swal.fire({
        title: '❌ Error',
        text: 'Cliente no encontrado en el sistema.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#dc3545'
      });
      return false;
    }

    const tipoDocumento = clienteSeleccionado.persona?.tipo_documento;
    const numeroDocumento = clienteSeleccionado.persona?.numero_documento || '';

    if (tipo === 'FACTURA') {
      if (tipoDocumento !== 'RUC') {
        const esRUC = numeroDocumento && numeroDocumento.length === 11 && /^\d+$/.test(numeroDocumento);
        
        if (!esRUC) {
          // ✅ MOSTRAR ERROR CON SWEETALERT2
          Swal.fire({
            title: '❌ Tipo de comprobante no válido',
            html: `
              <div style="text-align: left;">
                <p><strong>Cliente:</strong> ${clienteSeleccionado.nombre_completo}</p>
                <p><strong>Documento:</strong> ${numeroDocumento || 'No registrado'}</p>
                <hr>
                <p style="color: #dc3545;">⚠️ El cliente seleccionado no tiene RUC.</p>
                <p style="color: #6c757d; font-size: 0.9rem;">Debe emitir <strong>BOLETA</strong> o <strong>NOTA DE VENTA</strong>.</p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#057cbe'
          });
          return false;
        }
      }
    } else if (tipo === 'BOLETA') {
      const esValidoParaBoleta = 
        tipoDocumento === 'DNI' || 
        tipoDocumento === 'NO_ESPECIFICADO' ||
        (numeroDocumento && numeroDocumento.length === 8 && /^\d+$/.test(numeroDocumento));
      
      if (!esValidoParaBoleta) {
        if (tipoDocumento === 'RUC') {
          return true;
        }
        
        Swal.fire({
          title: '⚠️ Documento no válido',
          html: `
            <div style="text-align: left;">
              <p><strong>Cliente:</strong> ${clienteSeleccionado.nombre_completo}</p>
              <p><strong>Tipo documento:</strong> ${tipoDocumento || 'No especificado'}</p>
              <hr>
              <p style="color: #856404;">Para emitir una <strong>Boleta Electrónica</strong> se requiere DNI.</p>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#057cbe'
        });
        return false;
      }
    }
    
    return true;
  }

  // ==============================================
  // MÉTODO SELECTOR DE COMPROBANTE - CON VALIDACIÓN
  // ==============================================

  seleccionarComprobante(tipo: string) {
    // ✅ VALIDAR ANTES DE SELECCIONAR
    if (!this.validarTipoComprobanteSegunCliente(tipo)) {
      // Si la validación falla, NO cambiar el tipo de comprobante
      return;
    }
    
    this.venta.tipo_comprobante = tipo;
    this.venta.tipo_comprobante_solicitado = tipo;
    this.onTipoComprobanteChange();
    
    // ✅ MOSTRAR CONFIRMACIÓN DE SELECCIÓN
    const nombreTipo = this.getTipoComprobanteNombre(tipo);
    Swal.fire({
      title: `✅ ${nombreTipo} seleccionada`,
      text: `El comprobante "${nombreTipo}" ha sido seleccionado correctamente.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
  }

  seleccionarNotaDeVenta() {
    this.venta.tipo_comprobante = 'SIN_COMPROBANTE';
    this.venta.tipo_comprobante_solicitado = 'SIN_COMPROBANTE';
    this.serieNumeroPreview = '';
    this.loadingSerie = false;
    
    Swal.fire({
      title: '📝 Nota de Venta',
      text: 'Se utilizará una nota de venta sin comprobante oficial.',
      icon: 'info',
      timer: 1500,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
  }

  private getTipoComprobanteNombre(tipo: string): string {
    switch(tipo) {
      case 'FACTURA': return 'Factura Electrónica';
      case 'BOLETA': return 'Boleta Electrónica';
      default: return 'Comprobante';
    }
  }

  // ==============================================
  // MÉTODO FINALIZAR VENTA - CON VALIDACIÓN MEJORADA
  // ==============================================

  finalizarVenta() {
    // ✅ VALIDAR CLIENTE CON SWEETALERT
    if (this.venta.id_cliente === 0) {
      Swal.fire({
        title: '⚠️ Cliente no seleccionado',
        text: 'Debes seleccionar un cliente para continuar con la venta.',
        icon: 'warning',
        confirmButtonText: 'Seleccionar cliente',
        confirmButtonColor: '#057cbe',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#6c757d',
        backdrop: 'rgba(0,0,0,0.4)',
        customClass: {
          popup: 'swal-responsive'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          // Enfocar el input de búsqueda de cliente
          const clienteInput = document.querySelector('#clienteInput') as HTMLInputElement;
          if (clienteInput) {
            clienteInput.focus();
          }
        }
      });
      return;
    }

    // ✅ VALIDAR PRODUCTOS CON SWEETALERT
    if (this.venta.detalles.length === 0) {
      Swal.fire({
        title: '🛒 Carrito vacío',
        text: 'Debes agregar al menos un producto al carrito.',
        icon: 'warning',
        confirmButtonText: 'Agregar productos',
        confirmButtonColor: '#057cbe',
        backdrop: 'rgba(0,0,0,0.4)'
      }).then((result) => {
        if (result.isConfirmed) {
          const productoInput = document.querySelector('#productoInput') as HTMLInputElement;
          if (productoInput) {
            productoInput.focus();
          }
        }
      });
      return;
    }

    // ✅ VALIDAR USUARIO
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id_usuario) {
      Swal.fire({
        title: '❌ Sesión expirada',
        text: 'No se pudo identificar al vendedor. Por favor, inicie sesión nuevamente.',
        icon: 'error',
        confirmButtonText: 'Iniciar sesión',
        confirmButtonColor: '#057cbe'
      });
      return;
    }

    // Asegurar que tipo_comprobante esté sincronizado
    if (!this.venta.tipo_comprobante) {
      this.venta.tipo_comprobante = 'SIN_COMPROBANTE';
    }
    if (!this.venta.tipo_comprobante_solicitado) {
      this.venta.tipo_comprobante_solicitado = this.venta.tipo_comprobante;
    }

    // ... resto del código de finalizarVenta ...
    
    // Preparar datos para enviar
    const safeValue = (value: any): any => {
      if (value === undefined || value === '') return null;
      return value;
    };

    const ventaParaEnviar = {
      id_cliente: this.venta.id_cliente,
      fecha: this.venta.fecha,
      hora: this.venta.hora,
      total: this.venta.total,
      id_metodo_pago: this.venta.id_metodo_pago,
      id_estado_venta: 4,
      id_repartidor: safeValue(this.venta.id_repartidor),
      id_vendedor: currentUser.id_usuario,
      notas: safeValue(this.venta.notas || ''),
      tipo_comprobante_solicitado: this.venta.tipo_comprobante_solicitado || 'SIN_COMPROBANTE',
      detalles: this.venta.detalles.map(detalle => ({
        id_producto: detalle.id_producto,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        producto_nombre: safeValue(detalle.producto_nombre)
      }))
    };

    this.loading = true;
    this.error = '';

    this.ventasService.createVenta(ventaParaEnviar).subscribe({
      next: (ventaCreada) => {
        this.loading = false;
        
        Swal.fire({
          title: '✅ Venta registrada',
          text: `Venta #${ventaCreada.id_venta} registrada correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          timerProgressBar: true,
          willClose: () => {
            this.router.navigate(['/ventas/asignacion-rutas']);
          }
        });
      },
      error: (error) => {
        this.loading = false;
        const errorMsg = error.error?.error || 'Error al registrar la venta';
        
        Swal.fire({
          title: '❌ Error',
          text: errorMsg,
          icon: 'error',
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: '#057cbe'
        });
      }
    });
  }

  // ==============================================
  // MÉTODO LIMPIAR VENTA - CON CONFIRMACIÓN
  // ==============================================

  limpiarVenta() {
    Swal.fire({
      title: '¿Limpiar venta?',
      text: 'Se perderán todos los datos de la venta actual',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      backdrop: 'rgba(0,0,0,0.4)',
      customClass: {
        popup: 'swal-responsive'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.venta = {
          id_cliente: 0,
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
          total: 0,
          id_metodo_pago: 1,
          id_estado_venta: 1,
          id_repartidor: null,
          id_vendedor: null,
          notas: '',
          detalles: [],
          tipo_comprobante: 'SIN_COMPROBANTE',
          tipo_comprobante_solicitado: 'SIN_COMPROBANTE'
        };
        this.serieNumeroPreview = '';
        this.loadingSerie = false;
        this.searchCliente = '';
        this.searchProducto = '';
        this.productoSeleccionado = null;
        this.cantidad = 1;
        this.clienteSeleccionadoNombre = '';
        this.filteredClientes = [];
        this.filteredProductos = [];
        this.mostrarListaClientes = false;
        this.mostrarListaProductos = false;
        this.error = '';
        
        Swal.fire({
          title: '🧹 Limpiado',
          text: 'La venta ha sido limpiada correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          timerProgressBar: true,
          toast: true,
          position: 'top-end'
        });
      }
    });
  }

  // ==============================================
  // MÉTODO PARA MOSTRAR ERROR GENÉRICO
  // ==============================================

  mostrarError(mensaje: string, titulo: string = '❌ Error') {
    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'error',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#dc3545',
      backdrop: 'rgba(0,0,0,0.4)'
    });
  }

  // ==============================================
  // MÉTODO PARA MOSTRAR ÉXITO
  // ==============================================

  mostrarExito(mensaje: string, titulo: string = '✅ Éxito') {
    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
  }

  // ==============================================
  // RESTO DE MÉTODOS EXISTENTES
  // ==============================================

  incrementarCantidad() {
    if (this.productoSeleccionado) {
      this.cantidad = Math.min(this.productoSeleccionado.stock, this.cantidad + 1);
    }
  }

  decrementarCantidad() {
    this.cantidad = Math.max(1, this.cantidad - 1);
  }

  abrirModalClienteRapido() {
    const dialogRef = this.dialog.open(ClienteRapidoFormComponent, {
      width: '750px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'cliente-rapido-dialog',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((nuevoCliente) => {
      if (nuevoCliente) {
        this.cargarClientes();
        setTimeout(() => {
          this.buscarYSeleccionarNuevoCliente(nuevoCliente);
        }, 500);
      }
    });
  }

  private buscarYSeleccionarNuevoCliente(nuevoCliente: any) {
    const clienteEncontrado = this.clientes.find(cliente => 
      cliente.id_cliente === nuevoCliente.id_cliente || 
      cliente.id_cliente === nuevoCliente.id
    );
    
    if (clienteEncontrado) {
      this.seleccionarCliente(clienteEncontrado);
      this.mostrarExito(`Cliente "${nuevoCliente.nombre}" seleccionado automáticamente`);
    } else {
      this.cargarClientes();
      setTimeout(() => {
        const clienteReintento = this.clientes.find(cliente => 
          cliente.id_cliente === nuevoCliente.id_cliente
        );
        if (clienteReintento) {
          this.seleccionarCliente(clienteReintento);
        }
      }, 1000);
    }
  }

  private cargarClientes() {
    this.clientesService.getClientesParaVentas().subscribe({
      next: (clientes: ClienteVenta[]) => {
        this.clientes = clientes;
        this.filteredClientes = clientes;
        if (this.searchCliente) {
          this.filtrarClientes();
        }
      },
      error: (error) => console.error('Error recargando clientes:', error)
    });
  }

  async cargarDatosIniciales() {
    try {
      this.clientesService.getClientesParaVentas().subscribe({
        next: (clientes: ClienteVenta[]) => {
          this.clientes = clientes;
          this.filteredClientes = clientes;
        },
        error: (error) => console.error('Error cargando clientes:', error)
      });

this.productosService.getProductsWithDetails().subscribe({
      next: (productos) => {
        // ✅ FILTRAR: Excluir el producto de recarga
        this.productos = productos.filter(p => 
          !p.nombre.toLowerCase().includes('recarga') &&
          p.id_producto !== 5 // Ajusta según el ID real
        );
        this.filteredProductos = this.productos;
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        // Fallback
        this.productosService.getProducts().subscribe({
          next: (productos) => {
            this.productos = productos.filter(p => 
              !p.nombre.toLowerCase().includes('recarga') &&
              p.id_producto !== 5
            );
            this.filteredProductos = this.productos;
          }
        });
      }
    });
  } catch (error) {
    console.error('Error inicializando venta:', error);
  }
  }

  cargarRepartidores() {
    this.repartidorService.getRepartidoresActivos().subscribe({
      next: (repartidores) => {
        this.repartidores = repartidores;
      },
      error: (error) => console.error('Error cargando repartidores:', error)
    });
  }

  filtrarClientes() {
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

  filtrarProductos() {
    if (!this.searchProducto) {
      this.filteredProductos = this.productos;
      return;
    }
    
    const searchLower = this.searchProducto.toLowerCase();
    this.filteredProductos = this.productos.filter(producto =>
      producto.nombre.toLowerCase().includes(searchLower) ||
      (producto.marca?.nombre.toLowerCase().includes(searchLower)) ||
      (producto.id_producto?.toString().includes(this.searchProducto)) ||
      (producto.id?.toString().includes(this.searchProducto))
    );
    
    if (this.searchProducto && this.filteredProductos.length > 0) {
      this.mostrarListaProductos = true;
    }
  }

  seleccionarCliente(cliente: ClienteVenta) {
    this.venta.id_cliente = cliente.id_cliente;
    this.clienteSeleccionadoNombre = cliente.nombre_completo || cliente.persona?.nombre_completo || '';
    this.searchCliente = this.clienteSeleccionadoNombre;
    
    this.mostrarListaClientes = false;
    this.filteredClientes = [];
    
    if (this.venta.tipo_comprobante && this.venta.tipo_comprobante !== 'SIN_COMPROBANTE') {
      if (!this.validarTipoComprobanteSegunCliente(this.venta.tipo_comprobante)) {
        this.venta.tipo_comprobante = 'SIN_COMPROBANTE';
        this.venta.tipo_comprobante_solicitado = 'SIN_COMPROBANTE';
        this.serieNumeroPreview = '';
      }
    }
    
    // ✅ MOSTRAR CONFIRMACIÓN DE CLIENTE SELECCIONADO
    Swal.fire({
      title: '✅ Cliente seleccionado',
      text: `${this.clienteSeleccionadoNombre} ha sido seleccionado correctamente.`,
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
  }

  seleccionarProducto(producto: any) {
    this.productoSeleccionado = producto;
    this.cantidad = 1;
    this.searchProducto = producto.nombre;
    this.mostrarListaProductos = false;
    this.filteredProductos = [];
  }

  agregarProducto() {
    if (!this.productoSeleccionado || this.cantidad <= 0) {
      this.mostrarError('Selecciona un producto y cantidad válida');
      return;
    }

    if (this.cantidad > this.productoSeleccionado.stock) {
      this.mostrarError(`Stock insuficiente. Disponible: ${this.productoSeleccionado.stock}`);
      return;
    }

    const idProducto = this.productoSeleccionado.id_producto || this.productoSeleccionado.id;
    
    if (!idProducto) {
      this.mostrarError('Error: No se pudo obtener el ID del producto');
      return;
    }

    const detalle: VentaDetalle = {
      id_producto: idProducto,
      cantidad: this.cantidad,
      precio_unitario: this.productoSeleccionado.precio,
      producto_nombre: this.productoSeleccionado.nombre
    };

    this.venta.detalles.push(detalle);
    this.calcularTotal();
    this.limpiarSeleccionProducto();
    
    // ✅ MOSTRAR CONFIRMACIÓN DE PRODUCTO AGREGADO
    Swal.fire({
      title: '🛒 Producto agregado',
      text: `${detalle.producto_nombre} (${detalle.cantidad} und) agregado al carrito.`,
      icon: 'success',
      timer: 1000,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
  }

  limpiarSeleccionProducto() {
    this.productoSeleccionado = null;
    this.cantidad = 1;
    this.searchProducto = '';
    this.filteredProductos = [];
    this.mostrarListaProductos = false;
    this.error = '';
  }

  removerProducto(index: number) {
    const productoRemovido = this.venta.detalles[index];
    this.venta.detalles.splice(index, 1);
    this.calcularTotal();
    
    Swal.fire({
      title: '🗑️ Producto removido',
      text: `${productoRemovido.producto_nombre} ha sido eliminado del carrito.`,
      icon: 'info',
      timer: 1000,
      showConfirmButton: false,
      timerProgressBar: true,
      toast: true,
      position: 'top-end'
    });
  }

  calcularTotal() {
    this.venta.total = this.venta.detalles.reduce((total, detalle) => {
      return total + (detalle.cantidad * detalle.precio_unitario);
    }, 0);
  }

  limpiarBusquedaCliente() {
    this.searchCliente = '';
    this.venta.id_cliente = 0;
    this.clienteSeleccionadoNombre = '';
    this.filteredClientes = this.clientes;
    this.mostrarListaClientes = false;
  }

  limpiarBusquedaProducto() {
    this.searchProducto = '';
    this.filteredProductos = this.productos;
    this.productoSeleccionado = null;
    this.mostrarListaProductos = false;
    this.cantidad = 1;
  }

  mostrarTodosClientes() {
    if (this.venta.id_cliente === 0) {
      this.mostrarListaClientes = true;
      if (!this.searchCliente) {
        this.filteredClientes = this.clientes;
      }
    }
  }

  mostrarTodosProductos() {
    if (!this.productoSeleccionado) {
      this.mostrarListaProductos = true;
      if (!this.searchProducto) {
        this.filteredProductos = this.productos;
      }
    }
  }

  onBlurCliente() {
    setTimeout(() => {
      if (this.venta.id_cliente === 0) {
        this.mostrarListaClientes = false;
      }
    }, 200);
  }

  onBlurProducto() {
    setTimeout(() => {
      if (!this.productoSeleccionado) {
        this.mostrarListaProductos = false;
      }
    }, 200);
  }

  onTipoComprobanteChange() {
    if (this.venta.tipo_comprobante && this.venta.id_cliente !== 0) {
      this.venta.tipo_comprobante_solicitado = this.venta.tipo_comprobante;
      
      this.loadingSerie = true;
      this.serieNumeroPreview = 'Calculando...';
      
      this.ventasService.getSiguienteNumeroComprobante(
        this.venta.tipo_comprobante,
        this.venta.id_cliente
      ).subscribe({
        next: (respuesta: any) => {
          this.serieNumeroPreview = `${respuesta.serie}-${respuesta.correlativo}`;
          this.venta.serie_comprobante = respuesta.serie;
          this.venta.numero_correlativo = respuesta.numero_secuencial;
          this.loadingSerie = false;
        },
        error: (error: any) => {
          console.error('❌ Error obteniendo número de comprobante:', error);
          this.serieNumeroPreview = 'Error: ' + (error.error?.error || error.message);
          this.loadingSerie = false;
        }
      });
    } else {
      this.serieNumeroPreview = '';
    }
  }

  getVendedorNombre(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.nombre || currentUser?.username || 'Vendedor';
  }
}