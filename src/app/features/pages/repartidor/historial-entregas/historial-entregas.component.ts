// src/app/features/pages/repartidor/historial-entregas/historial-entregas.component.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
// Agrega esta importación
import { AuthService } from '../../../../core/services/auth.service'; // Ajusta la ruta según tu estructura
import { RepartidorVentaService } from '../../../../core/services/repartidor-venta.service';
import { EntregaDineroService } from '../../../../core/services/entrega-dinero.service';
import { RepartidorVenta } from '../../../../core/models/repartidor-venta.model';
import { DeteccionCambioDiaService } from '../../../../core/services/deteccion-cambio-dia.service';
import { DineroPendienteTotalResponse, RegularizarPendienteResponse } from '../../../../core/services/entrega-dinero.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// En historial-entregas.component.ts, en la sección de imports (línea 1-10 aproximadamente)
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmacionModalComponent } from '../../../../components/confirmacion-modal/confirmacion-modal.component';
import { EntregarDineroModalComponent } from '../../../../components/entregar-dinero-modal/entregar-dinero-modal.component';

@Component({
  selector: 'app-historial-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule,MatDialogModule],
  templateUrl: './historial-entregas.component.html',
  styleUrls: ['../repartidor-styles.css']
})
export class HistorialEntregasComponent implements OnInit, OnDestroy {
  // Agrega esta inyección
  private authService = inject(AuthService);
  private repartidorVentaService = inject(RepartidorVentaService);
  private entregaDineroService = inject(EntregaDineroService);
  private router = inject(Router);
  private subscription: Subscription = new Subscription();
  private dataSubscription: Subscription = new Subscription();
  private deteccionCambioDiaService = inject(DeteccionCambioDiaService);
  public dialog = inject(MatDialog); // <-- Agrega esta línea
  private route = inject(ActivatedRoute);
  // Datos principales
  historial: RepartidorVenta[] = [];
  historialFiltrado: RepartidorVenta[] = [];
  loading = true;
  error = '';

  // Filtros
  terminoBusqueda = '';
  filtroFecha = '';
  filtroMetodoPago = 'todos';
  filtroEstado = 'todos';

  // Control de dinero
  totalEntregadoAlAdmin = 0;
  dineroPendienteTotal = 0;
  ventasPendientesPorDia: any[] = [];
  detalleVentasPendientes: any[] = [];

  // Regularización
  mostrandoModalRegularizacion = false;
  fechaRegularizacion = '';
  montoRegularizacion = 0;
  metodoRegularizacion = 'efectivo';
  ventasSeleccionadas: number[] = [];

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  historialPaginado: RepartidorVenta[] = [];

  // Nueva propiedad para mostrar alerta
  mostrarAlertaPendiente = false;

 // MODIFICA ngOnInit
ngOnInit() {
  // Intentar restaurar estado guardado
  this.restaurarEstadoGuardado();
  
  this.cargarDatos();
  
  // Escuchar evento de cambio de día
  window.addEventListener('sistema:cambioDia', () => {
    this.recargarDatosPorCambioDia();
  });

  // Escuchar evento para mostrar dinero pendiente
  window.addEventListener('mostrarDineroPendiente', (event: any) => {
    this.mostrarAlertaPendienteModal();
  });

  // Verificar si hay dinero pendiente de días anteriores después de cargar datos
  setTimeout(() => {
    this.cargarDineroPendienteTotal();
    setTimeout(() => {
      this.verificarDineroPendienteAntiguo();
      
      // ✅ NUEVO: Verificar consistencia de datos
      this.verificarConsistenciaDatos();
    }, 1000);
  }, 2000);
  
  // ✅ NUEVO: Verificar configuración de empresa
  //setTimeout(() => {
   // this.verificarConfiguracionEmpresa();
  //}, 5000);
}

// NUEVO: Restaurar estado guardado
private restaurarEstadoGuardado() {
  const estadoGuardado = sessionStorage.getItem('historial_entregas_estado');
  
  if (estadoGuardado) {
    try {
      const estado = JSON.parse(estadoGuardado);
      
      // Restaurar filtros
      this.terminoBusqueda = estado.terminoBusqueda || '';
      this.filtroFecha = estado.filtroFecha || '';
      this.filtroMetodoPago = estado.filtroMetodoPago || 'todos';
      this.filtroEstado = estado.filtroEstado || 'todos';
      
      // Restaurar paginación
      this.paginaActual = estado.paginaActual || 1;
      this.itemsPorPagina = estado.itemsPorPagina || 10;
      
      console.log('🔄 Estado restaurado:', estado);
      
      // Limpiar después de restaurar
      sessionStorage.removeItem('historial_entregas_estado');
    } catch (error) {
      console.error('Error restaurando estado:', error);
    }
  }
}

// NUEVO: Guardar estado antes de navegar
private guardarEstadoAntesDeNavegar() {
  const estado = {
    terminoBusqueda: this.terminoBusqueda,
    filtroFecha: this.filtroFecha,
    filtroMetodoPago: this.filtroMetodoPago,
    filtroEstado: this.filtroEstado,
    paginaActual: this.paginaActual,
    itemsPorPagina: this.itemsPorPagina
  };
  
  sessionStorage.setItem('historial_entregas_estado', JSON.stringify(estado));
  console.log('💾 Estado de historial guardado:', estado);
}

// NUEVO: Método para verificar consistencia de datos
private verificarConsistenciaDatos() {
  const hoy = this.getTotalIngresos();
  const anterior = this.getDineroPendienteSoloAnteriores();
  const totalBackend = this.dineroPendienteTotal;
  
  console.log('🔍 Verificación de consistencia:');
  console.log('  - Dinero de hoy (frontend):', hoy);
  console.log('  - Dinero anterior (frontend filtrado):', anterior);
  console.log('  - Dinero pendiente total (backend):', totalBackend);
  
  // Si hay discrepancia, mostrar advertencia
  if (totalBackend > anterior && Math.abs(totalBackend - anterior) > 0.01) {
    console.warn('⚠️ DISCREPANCIA: El backend está incluyendo ventas de hoy en dinero pendiente');
    console.warn('  Diferencia:', (totalBackend - anterior).toFixed(2));
  }
}
// ========== MÉTODOS PARA WHATSAPP ==========

/**
 * Enviar notificación al administrador por WhatsApp
 */
public enviarWhatsAppAlAdministrador() {
  const totalPendiente = this.dineroPendienteTotal;
  
   if (totalPendiente <= 0) {
    // ✅ REEMPLAZAR alert() CON MODAL
    this.dialog.open(ConfirmacionModalComponent, {
      width: '400px',
      data: {
        titulo: 'ℹ️ Información',
        mensaje: 'No tienes dinero pendiente para reportar.',
        tipo: 'regularizacion',
        confirmText: 'Entendido'
      }
    });
    return;
  }

  // Obtener número configurado o usar predeterminado
  const NUMERO_ADMINISTRADOR = localStorage.getItem('admin_whatsapp') || '51987654321';
  
  // Verificar si el número está configurado
  if (NUMERO_ADMINISTRADOR === '51987654321') {
    const configurar = confirm(
      '⚠️ El número del administrador no está configurado.\n\n' +
      'Número predeterminado: +51987654321\n\n' +
      '¿Deseas configurar el número correcto ahora?'
    );
    
    if (configurar) {
      this.configurarContactoAdministrador();
      return;
    }
  }

  // Obtener información del repartidor
  let nombreRepartidor = 'Repartidor';
  let telefonoRepartidor = '';
  
  try {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      nombreRepartidor = usuario.nombre || 'Repartidor';
      
      const repartidorData = localStorage.getItem('repartidor_info');
      if (repartidorData) {
        const repartidorInfo = JSON.parse(repartidorData);
        telefonoRepartidor = repartidorInfo.telefono || '';
      }
    } else {
      const usuarioData = localStorage.getItem('auth_user');
      if (usuarioData) {
        const usuarioLocal = JSON.parse(usuarioData);
        nombreRepartidor = usuarioLocal.nombre || 'Repartidor';
      }
    }
  } catch (error) {
    console.error('Error obteniendo información del usuario:', error);
    nombreRepartidor = 'Repartidor';
  }

  const hoy = new Date();
  const fechaFormateada = hoy.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Obtener información de la empresa - IGNORAR la imagen
const empresa = this.obtenerNombreEmpresa();
const empresaLogo = empresa.logo; // Solo el emoji/texto
const empresaNombre = empresa.nombre;

// Crear mensaje profesional con nombre de empresa personalizado
const mensaje = `*${empresaLogo} ${empresaNombre} - NOTIFICACIÓN*\n\n` +
                `*👤 REPARTIDOR:* ${nombreRepartidor}\n` +
                  `${telefonoRepartidor ? `*📱 TELÉFONO:* ${telefonoRepartidor}\n` : ''}` +
                  `*💰 MONTO PENDIENTE:* S/ ${totalPendiente.toFixed(2)}\n` +
                  `*📅 FECHA:* ${fechaFormateada}\n\n` +
                  `*📋 DETALLE:*\n` +
                  `Tengo dinero pendiente de días anteriores que necesita ser regularizado.\n\n` +
                  `*✅ SOLICITO:*\n` +
                  `1. Coordinar entrega física del dinero\n` +
                  `2. Regularización en el sistema\n` +
                  `3. Confirmación de recepción\n\n` +
                  `*⌛ URGENCIA:* Normal\n` +
                  `*🏢 EMPRESA:* ${empresa.nombre}`;

  // *** AQUÍ ESTÁ EL CAMBIO: Usar el nuevo método con blob ***
  this.abrirWhatsAppConMensaje(NUMERO_ADMINISTRADOR, mensaje);
}

/**
 * Configurar el número de WhatsApp del administrador
 */
public configurarContactoAdministrador() {
  const numeroActual = localStorage.getItem('admin_whatsapp') || '51987654321';
  const nombreActual = localStorage.getItem('admin_nombre') || '';
  
  // Mostrar modal de configuración
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 450px;">
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #495057;">
          <i class="fas fa-info-circle"></i> Configura los datos del administrador:
        </p>
        <p style="margin: 0; font-size: 0.9em; color: #666;">
          Estos datos serán usados para enviar notificaciones sobre dinero pendiente.
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
          <i class="fas fa-user-tie"></i> Nombre del Administrador:
        </label>
        <input type="text" id="nombre-admin" 
               value="${nombreActual}"
               placeholder="Ej: Juan Pérez (Gerente)"
               style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; font-size: 16px; margin-bottom: 15px;">
        
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
          <i class="fab fa-whatsapp"></i> Número de WhatsApp:
        </label>
        <input type="text" id="numero-whatsapp" 
               value="${numeroActual}"
               placeholder="Ej: 51987654321"
               style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; font-size: 16px;">
        <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #6c757d;">
          <i class="fas fa-lightbulb"></i> Formato: 51 + 9 dígitos (sin espacios ni +)
        </p>
      </div>
      
      <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404; font-size: 0.9em;">
          <i class="fas fa-exclamation-triangle"></i> 
          <strong>Importante:</strong> Esta configuración se guarda solo en este navegador.
        </p>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="btnGuardar" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fas fa-save"></i> Guardar
        </button>
        <button id="btnCancelar" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>
  `;
  
  this.mostrarModalPersonalizado(html, '⚙️ Configurar Contacto del Administrador').then((modal) => {
    const btnGuardar = modal.querySelector('#btnGuardar');
    const btnCancelar = modal.querySelector('#btnCancelar');
    const inputNumero = modal.querySelector('#numero-whatsapp') as HTMLInputElement;
    const inputNombre = modal.querySelector('#nombre-admin') as HTMLInputElement;
    
    if (btnGuardar) {
      btnGuardar.addEventListener('click', () => {
        const nuevoNumero = inputNumero.value.trim();
        const nuevoNombre = inputNombre.value.trim();
        
        // Validar formato: 51 + 9 dígitos = 11 dígitos total
        if (/^51\d{9}$/.test(nuevoNumero)) {
          localStorage.setItem('admin_whatsapp', nuevoNumero);
          if (nuevoNombre) {
            localStorage.setItem('admin_nombre', nuevoNombre);
          }
          
          // Mostrar confirmación
          const confirmacionHtml = `
            <div style="text-align: center; padding: 20px;">
              <div style="color: #28a745; font-size: 48px; margin-bottom: 15px;">
                <i class="fas fa-check-circle"></i>
              </div>
              <h3 style="color: #28a745; margin-bottom: 10px;">✅ Configuración Guardada</h3>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                  <span>👤 Administrador:</span>
                  <span><strong>${nuevoNombre || 'No especificado'}</strong></span>
                </p>
                <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                  <span>📱 WhatsApp:</span>
                  <span><strong>+${nuevoNumero}</strong></span>
                </p>
              </div>
              
              <div style="background: #d4edda; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #155724; font-size: 0.9em;">
                  <i class="fas fa-info-circle"></i> 
                  Ahora podrás notificar al administrador cuando tengas dinero pendiente.
                </p>
              </div>
              
              <button id="btnCerrar" style="padding: 10px 25px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-check"></i> Entendido
              </button>
            </div>
          `;
          
          document.body.removeChild(modal);
          this.mostrarModalPersonalizado(confirmacionHtml, '✅ Configuración Guardada').then((confirmModal) => {
            const btnCerrar = confirmModal.querySelector('#btnCerrar');
            if (btnCerrar) {
              btnCerrar.addEventListener('click', () => {
                document.body.removeChild(confirmModal);
              });
            }
          });
          
        } else {
                // ✅ REEMPLAZAR alert() CON MODAL
          this.dialog.open(ConfirmacionModalComponent, {
            width: '450px',
            data: {
              titulo: '⚠️ Número Incorrecto',
              mensaje: 'Formato requerido: 51 + 9 dígitos\n\nEjemplo correcto: 51987654321\n\n❌ Incorrecto: +51987654321\n❌ Incorrecto: 519 876 54321',
              tipo: 'warning',
              confirmText: 'Entendido'
            }
          });
          inputNumero.focus();
          inputNumero.select();
        }
      });
    }
    
    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  });
}






  // Método para recargar datos por cambio de día
private recargarDatosPorCambioDia() {
  console.log('🔄 Recargando datos por cambio de día...');
  this.cargarDatos();
  this.cargarDineroPendienteTotal();
  
  // Mostrar notificación al usuario
  setTimeout(() => {
    // ✅ REEMPLAZAR alert() CON MODAL
    this.dialog.open(ConfirmacionModalComponent, {
      width: '450px',
      data: {
        titulo: '📅 Cambio de Día',
        mensaje: 'El sistema ha detectado un cambio de día. Los datos se han actualizado.',
        tipo: 'regularizacion',
        confirmText: 'Entendido'
      }
    });
  }, 500);
}

  ngOnDestroy() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    this.subscription.unsubscribe();
  }

cargarDatos() {
  this.loading = true;
  this.error = '';

  if (this.dataSubscription) {
    this.dataSubscription.unsubscribe();
  }

  this.dataSubscription = new Subscription();

  // 1. Cargar historial de entregas
  const historialSub = this.repartidorVentaService.getHistorialEntregas().subscribe({
    next: (historial) => {
      console.log('📊 Historial recibido:', historial.length, 'entregas');
      this.historial = historial;
      this.aplicarFiltros(); // Esto ahora llama a actualizarPaginacion()
      this.loading = false;
    },
    error: (error) => {
      console.error('Error cargando historial:', error);
      this.error = 'Error al cargar el historial de entregas.';
      this.loading = false;
    }
  });

  // 2. Cargar total entregado hoy
  const totalSub = this.entregaDineroService.getTotalEntregadoAlAdmin().subscribe({
    next: (response) => {
      if (response.success && response.data && response.data.hoy) {
        this.totalEntregadoAlAdmin = response.data.hoy.total || 0;
        console.log('💰 Total entregado hoy:', this.totalEntregadoAlAdmin);
      }
    },
    error: (error) => {
      console.error('Error cargando total entregado:', error);
      this.totalEntregadoAlAdmin = 0;
    }
  });

  this.dataSubscription.add(historialSub);
  this.dataSubscription.add(totalSub);
}
  // ========== MÉTODOS PARA DINERO PENDIENTE TOTAL ==========

// Modifica el método cargarDineroPendienteTotal()
// Método para verificar datos del backend
 // ========== MÉTODOS PARA DINERO PENDIENTE TOTAL ==========
  verificarDatosPendientes() {
    console.log('🔍 Verificando datos de ventas pendientes:');
    
    if (this.ventasPendientesPorDia.length > 0) {
      console.log('📅 Resumen por día:');
      this.ventasPendientesPorDia.forEach((dia: any, index: number) => {
        console.log(`  Día ${index + 1}: ${dia.fecha} - S/ ${dia.total} - ${dia.cantidad} ventas`);
      });
      
      const totalCalculado = this.ventasPendientesPorDia.reduce((sum: number, dia: any) => sum + (dia.total || 0), 0);
      console.log(`💰 Total calculado: S/ ${totalCalculado.toFixed(2)}`);
      console.log(`💰 Total del backend: S/ ${this.dineroPendienteTotal.toFixed(2)}`);
      console.log(`📊 Diferencia: S/ ${Math.abs(totalCalculado - this.dineroPendienteTotal).toFixed(2)}`);
      
      if (this.detalleVentasPendientes.length > 0) {
        console.log('📋 Detalle de ventas pendientes:');
        this.detalleVentasPendientes.forEach((venta: any, index: number) => {
          console.log(`  Venta ${venta.id_venta}: S/ ${venta.total} - Fecha: ${venta.fecha_formateada}`);
        });
      }
    } else {
      console.log('📭 No hay ventas pendientes por día');
    }
  }
// Llamar este método después de cargar los datos
cargarDineroPendienteTotal() {
  this.entregaDineroService.getDineroPendienteTotal().subscribe({
    next: (response: DineroPendienteTotalResponse) => {
      if (response.success) {
        this.dineroPendienteTotal = response.data.total_pendiente || 0;
        this.ventasPendientesPorDia = response.data.ventas_por_dia || [];
        this.detalleVentasPendientes = response.data.detalle_ventas || [];
        
        // DEBUG: Mostrar qué ventas está devolviendo el backend
        console.log('🔍 DEBUG - Ventas que devuelve el backend:');
        console.log('Total pendiente del backend:', this.dineroPendienteTotal);
        console.log('Detalle de ventas:', this.detalleVentasPendientes);
        
        // Verificar si hay ventas de hoy en el listado
        const hoy = new Date();
        const ventasHoy = this.detalleVentasPendientes.filter((venta: any) => {
          const fechaVenta = new Date(venta.fecha_venta || venta.fecha_original);
          return fechaVenta.toDateString() === hoy.toDateString();
        });
        
        console.log('📅 Ventas de HOY en dinero pendiente total:', ventasHoy.length);
        if (ventasHoy.length > 0) {
          console.log('⚠️ PROBLEMA: El backend está incluyendo ventas de hoy en dinero-pendiente-total');
          ventasHoy.forEach((v: any) => {
            console.log(`  - Venta ${v.id_venta}: S/ ${v.total} - Fecha: ${v.fecha_formateada}`);
          });
        }
          
          this.verificarDatosPendientes();
          
          if (this.dineroPendienteTotal > 0 && !this.mostrarAlertaPendiente) {
            this.mostrarAlertaPendiente = false;
          }
        }
      },
      error: (error: any) => {
        console.error('Error cargando dinero pendiente total:', error);
        this.dineroPendienteTotal = 0;
      }
    });
  }

  verificarAsociacionesCompletas() {
    const totalVentasPendientes = this.detalleVentasPendientes.reduce(
      (sum, venta) => sum + parseFloat(venta.total), 0
    );
    
    if (totalVentasPendientes > this.getTotalIngresosCompleto()) {
      console.warn('⚠️ ADVERTENCIA: Hay ventas que no se están asociando correctamente');
    }
  }
// Método para regularizar entregas pendientes
// REEMPLAZA el método regularizarEntregasPendientes con esta versión corregida:

// src/app/features/pages/repartidor/historial-entregas/historial-entregas.component.ts

regularizarEntregasPendientes(fecha: string, monto: number, metodo: string = 'efectivo') {
  console.log(`🔄 Regularizando fecha: ${fecha}, Monto: ${monto}, Método: ${metodo}`);
  
  // Convertir fecha del formato dd/mm/yyyy a yyyy-mm-dd para comparar
  const [day, month, year] = fecha.split('/');
  const fechaISO = `${year}-${month}-${day}`;
  
  // Filtrar ventas por fecha
  const ventasIds = this.detalleVentasPendientes
    .filter((venta: any) => {
      const ventaFecha = venta.fecha_venta || venta.fecha_original || venta.fecha;
      
      if (!ventaFecha) {
        console.warn(`⚠️ Venta ${venta.id_venta} no tiene fecha definida`);
        return false;
      }
      
      let ventaFechaISO;
      if (ventaFecha.includes('/')) {
        const [vDay, vMonth, vYear] = ventaFecha.split('/');
        ventaFechaISO = `${vYear}-${vMonth}-${vDay}`;
      } else {
        ventaFechaISO = ventaFecha.split('T')[0];
      }
      
      return ventaFechaISO === fechaISO;
    })
    .map((venta: any) => venta.id_venta);
  
  console.log(`✅ Ventas a regularizar (IDs): ${ventasIds.join(', ')}`);
  
  this.entregaDineroService.regularizarPendiente(fechaISO, monto, metodo, ventasIds).subscribe({
    next: (response: RegularizarPendienteResponse) => {
      console.log('✅ Entrega regularizada:', response);
      
      // ✅ MODAL DE ÉXITO
      this.dialog.open(ConfirmacionModalComponent, {
        width: '500px',
        data: {
          titulo: '🔄 Regularización Exitosa',
          mensaje: 'Las entregas pendientes han sido regularizadas correctamente.',
          tipo: 'regularizacion',
          monto: monto,
          metodo: metodo,
          fecha: fecha,
          detalles: [
            { label: 'Fecha regularizada', valor: fecha, icono: 'event' },
            { label: 'Monto', valor: `S/ ${monto.toFixed(2)}`, icono: 'attach_money' },
            { label: 'Método', valor: this.formatearMetodo(metodo), icono: 'payment' },
            { label: 'Ventas regularizadas', valor: ventasIds.length.toString(), icono: 'receipt' }
          ],
          total: `Total regularizado: S/ ${monto.toFixed(2)}`,
          confirmText: 'Aceptar'
        }
      }).afterClosed().subscribe(() => {
        this.cargarDatos();
        this.cargarDineroPendienteTotal();
        this.mostrarAlertaPendiente = false;
      });
    },
    error: (error: any) => {
      console.error('Error regularizando entregas:', error);
      
      // ✅ MODAL DE ERROR
      this.dialog.open(ConfirmacionModalComponent, {
        width: '450px',
        data: {
          titulo: '❌ Error',
          mensaje: error.error?.error || 'Error al regularizar las entregas',
          tipo: 'warning',
          confirmText: 'Entendido'
        }
      });
    }
  });
}


/**
 * Formatea el nombre del método de pago para mostrarlo correctamente
 */
private formatearMetodo(metodo: string): string {
  const metodos: {[key: string]: string} = {
    'efectivo': 'Efectivo',
    'transferencia': 'Transferencia',
    'yape': 'Yape',
    'tarjeta': 'Tarjeta'
  };
  return metodos[metodo] || metodo;
}










  private cargarDetalleVentasPendientes() {
    // Método para obtener detalles de ventas pendientes
    // Necesitarás crear un endpoint en el backend o usar el existente
    console.log('Cargando detalles de ventas pendientes...');
  }

// 2. Modifica el método verificarDineroPendienteAntiguo para NO mostrar alerta automática:
verificarDineroPendienteAntiguo() {
  // Solo verifica, no muestres alerta automática
  console.log('Dinero pendiente de días anteriores:', this.getDineroPendienteSoloAnteriores());
}
// 3. Agrega un método para mostrar la modal de WhatsApp directamente desde el panel:
public mostrarModalWhatsAppPersonalizado() {
  const totalPendiente = this.getDineroPendienteSoloAnteriores();
  
  if (totalPendiente <= 0) {
    alert('No tienes dinero pendiente de días anteriores para reportar.');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3 style="color: #25D366; margin-bottom: 15px; text-align: center;">
        <i class="fab fa-whatsapp"></i> Personalizar Mensaje WhatsApp
      </h3>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #666; margin-bottom: 10px;">
          <i class="fas fa-edit"></i> Edita el mensaje antes de enviar al administrador:
        </p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 5px 0; font-weight: 600; color: #495057;">
            <i class="fas fa-money-bill-wave"></i> Monto pendiente: 
            <span style="color: #dc3545; font-weight: bold;">S/ ${totalPendiente.toFixed(2)}</span>
          </p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
            <i class="fas fa-list-check"></i> Tipo de entrega que solicita:
          </label>
          <select id="tipoEntrega" style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; margin-bottom: 15px;">
            <option value="efectivo">💵 Entrega física en efectivo</option>
            <option value="transferencia">🏦 Transferencia bancaria</option>
            <option value="yape">📱 Yape</option>
            <option value="otro">Otro método</option>
          </select>
          
          <div id="otroMetodoContainer" style="display: none; margin-bottom: 15px;">
            <input type="text" id="otroMetodo" placeholder="Especifica otro método" 
                   style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px;">
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
            <i class="fas fa-clock"></i> Urgencia:
          </label>
          <select id="urgencia" style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px;">
            <option value="normal">⌛ Normal (Coordinar en horario laboral)</option>
            <option value="urgente">🚨 Urgente (Requiere atención inmediata)</option>
            <option value="programar">📅 Programar (Acordar fecha y hora)</option>
          </select>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
            <i class="fas fa-edit"></i> Mensaje adicional (opcional):
          </label>
          <textarea id="mensajeAdicional" 
                    placeholder="Ej: Ya tengo el dinero listo, podemos coordinar mañana en la mañana..."
                    style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; min-height: 80px; resize: vertical;"
                    rows="3"></textarea>
        </div>
      </div>
      
      <!-- Vista previa del mensaje -->
      <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #007bff;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #007bff;">
          <i class="fas fa-eye"></i> Vista previa del mensaje:
        </p>
        <div id="vistaPreviaMensaje" style="background: white; padding: 10px; border-radius: 5px; font-size: 0.9em; color: #666; line-height: 1.5; white-space: pre-wrap;">
          Cargando vista previa...
        </div>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
        <button id="btnEnviarWhatsApp" style="padding: 12px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fab fa-whatsapp"></i> Enviar WhatsApp
        </button>
        <button id="btnCancelar" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; flex: 1;">
          Cancelar
        </button>
      </div>
    </div>
  `;

  this.mostrarModalPersonalizado(html, '💬 Notificar al Administrador').then((modal) => {
    const tipoEntregaSelect = modal.querySelector('#tipoEntrega') as HTMLSelectElement;
    const otroMetodoContainer = modal.querySelector('#otroMetodoContainer') as HTMLDivElement;
    const otroMetodoInput = modal.querySelector('#otroMetodo') as HTMLInputElement;
    const urgenciaSelect = modal.querySelector('#urgencia') as HTMLSelectElement;
    const mensajeAdicionalTextarea = modal.querySelector('#mensajeAdicional') as HTMLTextAreaElement;
    const vistaPreviaDiv = modal.querySelector('#vistaPreviaMensaje') as HTMLDivElement;
    const btnEnviarWhatsApp = modal.querySelector('#btnEnviarWhatsApp');
    const btnCancelar = modal.querySelector('#btnCancelar');

    // Función para actualizar vista previa
    const actualizarVistaPrevia = () => {
      // Obtener información del repartidor
      let nombreRepartidor = 'Repartidor';
      const usuario = this.authService.getCurrentUser();
      if (usuario) {
        nombreRepartidor = usuario.nombre || 'Repartidor';
      }

      // Obtener información de la empresa
      const empresa = this.obtenerNombreEmpresa();
      const empresaLogo = empresa.logo;
      const empresaNombre = empresa.nombre;

      const hoy = new Date();
      const fechaFormateada = hoy.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Obtener tipo de entrega seleccionado
      let tipoEntregaTexto = '';
      if (tipoEntregaSelect.value === 'otro' && otroMetodoInput.value.trim()) {
        tipoEntregaTexto = otroMetodoInput.value.trim();
      } else {
        tipoEntregaTexto = tipoEntregaSelect.options[tipoEntregaSelect.selectedIndex].text;
      }

      // Obtener urgencia
      const urgenciaTexto = urgenciaSelect.options[urgenciaSelect.selectedIndex].text;
      const mensajeAdicional = mensajeAdicionalTextarea.value.trim();

      // Construir mensaje CON NOMBRE PERSONALIZADO
      const mensaje = `*${empresaLogo} ${empresaNombre} - NOTIFICACIÓN*\n\n` +
                      `*👤 REPARTIDOR:* ${nombreRepartidor}\n` +
                      `*💰 MONTO PENDIENTE:* S/ ${totalPendiente.toFixed(2)}\n` +
                      `*📅 FECHA:* ${fechaFormateada}\n\n` +
                      `*📋 DETALLE:*\n` +
                      `Tengo dinero pendiente de días anteriores que necesita ser regularizado.\n\n` +
                      `*✅ SOLICITO:*\n` +
                      `1. ${tipoEntregaTexto}\n` +
                      `2. Regularización en el sistema\n` +
                      `3. Confirmación de recepción\n\n` +
                      `${mensajeAdicional ? `*💬 MENSAJE ADICIONAL:*\n${mensajeAdicional}\n\n` : ''}` +
                      `*⌛ URGENCIA:* ${urgenciaTexto}\n` +
                      `*🏢 EMPRESA:* ${empresaNombre}`;

      vistaPreviaDiv.innerHTML = mensaje.replace(/\n/g, '<br>');
    };
    
    // Actualizar vista previa cuando cambian los inputs
    tipoEntregaSelect.addEventListener('change', () => {
      if (tipoEntregaSelect.value === 'otro') {
        otroMetodoContainer.style.display = 'block';
      } else {
        otroMetodoContainer.style.display = 'none';
      }
      actualizarVistaPrevia();
    });

    otroMetodoInput.addEventListener('input', actualizarVistaPrevia);
    urgenciaSelect.addEventListener('change', actualizarVistaPrevia);
    mensajeAdicionalTextarea.addEventListener('input', actualizarVistaPrevia);

    // Mostrar/Ocultar campo "otro método"
    if (tipoEntregaSelect.value === 'otro') {
      otroMetodoContainer.style.display = 'block';
    }

    // Inicializar vista previa
    actualizarVistaPrevia();

    // Evento del botón Enviar WhatsApp - VERSIÓN CORREGIDA
    if (btnEnviarWhatsApp) {
      btnEnviarWhatsApp.addEventListener('click', () => {
        // Generar mensaje final
        let nombreRepartidor = 'Repartidor';
        const usuario = this.authService.getCurrentUser();
        if (usuario) {
          nombreRepartidor = usuario.nombre || 'Repartidor';
        }

        // Obtener información de la empresa
        const empresa = this.obtenerNombreEmpresa();
        const empresaLogo = empresa.logo;
        const empresaNombre = empresa.nombre;

        const hoy = new Date();
        const fechaFormateada = hoy.toLocaleDateString('es-PE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        let tipoEntregaTexto = '';
        if (tipoEntregaSelect.value === 'otro' && otroMetodoInput.value.trim()) {
          tipoEntregaTexto = otroMetodoInput.value.trim();
        } else {
          tipoEntregaTexto = tipoEntregaSelect.options[tipoEntregaSelect.selectedIndex].text;
        }

        const urgenciaTexto = urgenciaSelect.options[urgenciaSelect.selectedIndex].text;
        const mensajeAdicional = mensajeAdicionalTextarea.value.trim();

        const mensaje = `*${empresaLogo} ${empresaNombre} - NOTIFICACIÓN*\n\n` +
                        `*👤 REPARTIDOR:* ${nombreRepartidor}\n` +
                        `*💰 MONTO PENDIENTE:* S/ ${totalPendiente.toFixed(2)}\n` +
                        `*📅 FECHA:* ${fechaFormateada}\n\n` +
                        `*📋 DETALLE:*\n` +
                        `Tengo dinero pendiente de días anteriores que necesita ser regularizado.\n\n` +
                        `*✅ SOLICITO:*\n` +
                        `1. ${tipoEntregaTexto}\n` +
                        `2. Regularización en el sistema\n` +
                        `3. Confirmación de recepción\n\n` +
                        `${mensajeAdicional ? `*💬 MENSAJE ADICIONAL:*\n${mensajeAdicional}\n\n` : ''}` +
                        `*⌛ URGENCIA:* ${urgenciaTexto}\n` +
                        `*🏢 EMPRESA:* ${empresaNombre}`;

        // Obtener número del administrador
        const NUMERO_ADMINISTRADOR = localStorage.getItem('admin_whatsapp') || '51987654321';
        
        // Verificar si el número está configurado
        if (NUMERO_ADMINISTRADOR === '51987654321') {
          const configurar = confirm(
            '⚠️ El número del administrador no está configurado.\n\n' +
            'Número predeterminado: +51987654321\n\n' +
            '¿Deseas configurar el número correcto ahora?'
          );
          
          if (configurar) {
            document.body.removeChild(modal);
            this.configurarContactoAdministrador();
            return;
          }
        }
        // *** AGREGAR ESTA LÍNEA PARA DIAGNÓSTICO ***
        this.diagnosticarProblemaEmojis(mensaje);
        // *** AQUÍ ESTÁ EL CAMBIO: Usar el nuevo método con blob ***
        this.abrirWhatsAppConMensaje(NUMERO_ADMINISTRADOR, mensaje);
        
    setTimeout(() => {
  document.body.removeChild(modal);
  
  this.dialog.open(ConfirmacionModalComponent, {
    width: '500px',
    data: {
      titulo: '📱 Notificación Enviada',
      mensaje: 'El administrador ha sido notificado sobre tu dinero pendiente.',
      tipo: 'entrega',
      detalles: [
        { label: 'Monto pendiente', valor: `S/ ${totalPendiente.toFixed(2)}`, icono: 'attach_money' },
        { label: 'Fecha', valor: new Date().toLocaleDateString('es-PE'), icono: 'event' },
        { label: 'Hora', valor: new Date().toLocaleTimeString('es-PE'), icono: 'schedule' }
      ],
      confirmText: 'Aceptar'
    }
  });
}, 500);
  });
}

    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  });
}

// 4. Agrega este método para abrir la modal directamente desde el panel:
public abrirNotificacionDineroPendiente() {
  const totalPendiente = this.getDineroPendienteSoloAnteriores();
  
  if (totalPendiente <= 0) {
    // ✅ REEMPLAZAR alert() CON MODAL
    this.dialog.open(ConfirmacionModalComponent, {
      width: '450px',
      data: {
        titulo: '✅ Al Día',
        mensaje: 'No tienes dinero pendiente de días anteriores.\n\nTodo tu dinero acumulado ha sido regularizado o estás al día.',
        tipo: 'entrega',
        confirmText: 'Entendido'
      }
    });
    return;
  }
  
  // Mostrar modal personalizado de WhatsApp
  this.mostrarModalWhatsAppPersonalizado();
}
// En historial-entregas.component.ts - MEJORAR mostrarModalRegularizacion()
// En historial-entregas.component.ts - MEJORAR mostrarModalRegularizacion()
mostrarModalRegularizacion() {
  if (this.ventasPendientesPorDia.length === 0) {
       // ✅ REEMPLAZAR alert() CON MODAL
    this.dialog.open(ConfirmacionModalComponent, {
      width: '400px',
      data: {
        titulo: 'ℹ️ Información',
        mensaje: 'No hay entregas pendientes para regularizar.',
        tipo: 'regularizacion',
        confirmText: 'Entendido'
      }
    });
    return;
  }

  let html = `
    <div style="font-family: Arial, sans-serif; padding: 15px;">
      
      <div style="margin-bottom: 20px;">
        <p style="color: #666; margin-bottom: 10px;">
          <i class="fas fa-info-circle"></i> 
          Selecciona las entregas pendientes que deseas regularizar:
        </p>
        
        <!-- Botón para seleccionar todo -->
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; cursor: pointer; padding: 8px; background: #e9ecef; border-radius: 5px;">
            <input type="checkbox" id="seleccionar-todo" style="margin-right: 10px;">
            <span style="font-weight: 600; color: #495057;">
              <i class="fas fa-check-square"></i> Seleccionar todo
            </span>
          </label>
        </div>
  `;

  // Filtrar días que no sean "null"
  const diasValidos = this.ventasPendientesPorDia.filter(dia => 
    dia.fecha && dia.fecha !== 'null' && dia.fecha !== 'Sin fecha específica'
  );

  // Si hay días sin fecha específica, mostrar una sección especial
  const diasSinFecha = this.ventasPendientesPorDia.filter(dia => 
    !dia.fecha || dia.fecha === 'null' || dia.fecha === 'Sin fecha específica'
  );

  if (diasSinFecha.length > 0) {
    html += `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
        <p style="margin: 0; color: #856404; font-weight: 600;">
          <i class="fas fa-exclamation-triangle"></i> 
          ${diasSinFecha.length} entregas sin fecha específica registrada
        </p>
      </div>
    `;
  }

  diasValidos.forEach((dia: any, index: number) => {
    html += `
      <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #dee2e6;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <input type="checkbox" id="dia-${index}" class="checkbox-dia" style="margin-right: 8px;">
            <label for="dia-${index}" style="font-weight: 600; color: #495057;">
              <i class="fas fa-calendar-day"></i> ${dia.fecha || 'Fecha no disponible'}
            </label>
          </div>
          <span style="font-weight: bold; color: #28a745;">
            S/ ${dia.total?.toFixed(2) || '0.00'}
          </span>
        </div>
        <div style="color: #666; font-size: 0.9em;">
          <i class="fas fa-receipt"></i> ${dia.cantidad || 0} ventas pendientes
        </div>
      </div>
    `;
  });

  // Agregar sección para ventas sin fecha si las hay
  if (diasSinFecha.length > 0) {
    const totalSinFecha = diasSinFecha.reduce((sum, dia) => sum + (dia.total || 0), 0);
    const cantidadTotalSinFecha = diasSinFecha.reduce((sum, dia) => sum + (dia.cantidad || 0), 0);
    
    html += `
      <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px dashed #dc3545;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <input type="checkbox" id="dia-sin-fecha" class="checkbox-dia" style="margin-right: 8px;">
            <label for="dia-sin-fecha" style="font-weight: 600; color: #dc3545;">
              <i class="fas fa-question-circle"></i> Ventas sin fecha específica
            </label>
          </div>
          <span style="font-weight: bold; color: #dc3545;">
            S/ ${totalSinFecha.toFixed(2)}
          </span>
        </div>
        <div style="color: #666; font-size: 0.9em;">
          <i class="fas fa-receipt"></i> ${cantidadTotalSinFecha} ventas - Fecha no registrada en sistema
        </div>
        <div style="color: #999; font-size: 0.8em; margin-top: 5px;">
          <i class="fas fa-info-circle"></i> Estas ventas no tienen fecha de fin de ruta registrada.
        </div>
      </div>
    `;
  }

  html += `
        </div>
        
        <div style="margin-top: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
            <i class="fas fa-money-bill-wave"></i> Método de entrega:
          </label>
          <select id="metodoRegularizacion" style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; margin-bottom: 15px;">
            <option value="efectivo">💵 Efectivo</option>
            <option value="transferencia">🏦 Transferencia</option>
            <option value="yape">📱 Yape</option>
          </select>
        </div>
        
        <!-- Resumen de selección -->
        <div id="resumen-seleccion" style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff; display: none;">
          <p style="margin: 0; color: #004085; font-size: 0.9em; font-weight: 600;">
            <i class="fas fa-list-check"></i> 
            <span id="contador-seleccionados">0</span> días seleccionados - 
            Total: S/ <span id="total-seleccionado">0.00</span>
          </p>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button id="btnConfirmarRegularizacion" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-check"></i> Confirmar Regularización
          </button>
          <button id="btnCancelarRegularizacion" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </div>
    `;

  this.mostrarModalPersonalizado(html, '🔄 Regularizar Entregas Pendientes').then((modal) => {
    const btnConfirmar = modal.querySelector('#btnConfirmarRegularizacion');
    const btnCancelar = modal.querySelector('#btnCancelarRegularizacion');
    const selectMetodo = modal.querySelector('#metodoRegularizacion');
    const seleccionarTodo = modal.querySelector('#seleccionar-todo') as HTMLInputElement;
    const checkboxesDia = modal.querySelectorAll('.checkbox-dia');
    const resumenSeleccion = modal.querySelector('#resumen-seleccion');

    // Función para actualizar el resumen de selección
   // Función para actualizar el resumen de selección
const actualizarResumenSeleccion = () => {
  let totalSeleccionado = 0;
  let diasSeleccionados = 0;
  
  checkboxesDia.forEach((checkbox: any) => {
    if (checkbox.checked) {
      diasSeleccionados++;
      // Encontrar el monto correspondiente
      const container = checkbox.closest('div[style*="background: #f8f9fa"]') || 
                       checkbox.closest('div[style*="border: 1px dashed #dc3545"]');
      if (container) {
        const montoElement = container.querySelector('span[style*="font-weight: bold"]');
        if (montoElement) {
          const montoTexto = montoElement.textContent || '';
          const monto = parseFloat(montoTexto.replace('S/ ', '').replace(',', ''));
          if (!isNaN(monto)) {
            totalSeleccionado += monto;
          }
        }
      }
    }
  });
  
  // Actualizar contadores
  const contadorElement = modal.querySelector('#contador-seleccionados');
  const totalElement = modal.querySelector('#total-seleccionado');
  
  if (contadorElement) contadorElement.textContent = diasSeleccionados.toString();
  if (totalElement) totalElement.textContent = totalSeleccionado.toFixed(2);
  
  // Mostrar/ocultar resumen - CORREGIDO CON TYPE CASTING
  if (resumenSeleccion) {
    (resumenSeleccion as HTMLElement).style.display = diasSeleccionados > 0 ? 'block' : 'none';
  }
};

    // Configurar "Seleccionar todo"
    if (seleccionarTodo) {
      seleccionarTodo.addEventListener('change', () => {
        const isChecked = seleccionarTodo.checked;
        checkboxesDia.forEach((checkbox: any) => {
          checkbox.checked = isChecked;
        });
        actualizarResumenSeleccion();
      });
    }

    // Configurar eventos en cada checkbox
    checkboxesDia.forEach((checkbox: any) => {
      checkbox.addEventListener('change', () => {
        actualizarResumenSeleccion();
        
        // Actualizar estado de "Seleccionar todo"
        if (seleccionarTodo) {
          const todosMarcados = Array.from(checkboxesDia).every((cb: any) => cb.checked);
          const algunoMarcado = Array.from(checkboxesDia).some((cb: any) => cb.checked);
          
          if (todosMarcados) {
            seleccionarTodo.checked = true;
            seleccionarTodo.indeterminate = false;
          } else if (algunoMarcado) {
            seleccionarTodo.checked = false;
            seleccionarTodo.indeterminate = true;
          } else {
            seleccionarTodo.checked = false;
            seleccionarTodo.indeterminate = false;
          }
        }
      });
    });

    // Inicializar resumen
    actualizarResumenSeleccion();

    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => {
        // Obtener días seleccionados (válidos)
        const diasSeleccionados = diasValidos.filter((dia: any, index: number) => {
          const checkbox = modal.querySelector(`#dia-${index}`) as HTMLInputElement;
          return checkbox?.checked;
        });

        // Verificar si se seleccionaron ventas sin fecha
        const checkboxSinFecha = modal.querySelector('#dia-sin-fecha') as HTMLInputElement;
        const incluirSinFecha = checkboxSinFecha?.checked && diasSinFecha.length > 0;

        if (diasSeleccionados.length === 0 && !incluirSinFecha) {
          alert('Por favor, selecciona al menos un día para regularizar.');
          return;
        }

        // Calcular total
        let totalSeleccionado = diasSeleccionados.reduce((sum: number, dia: any) => sum + dia.total, 0);
        const metodo = (selectMetodo as HTMLSelectElement)?.value || 'efectivo';

        // Agregar ventas sin fecha si están seleccionadas
        if (incluirSinFecha) {
          const totalSinFecha = diasSinFecha.reduce((sum, dia) => sum + (dia.total || 0), 0);
          totalSeleccionado += totalSinFecha;
        }

        const detalles = [];

    // Agregar días con fecha específica
    diasSeleccionados.forEach((dia: any) => {
      if (dia.fecha && dia.fecha !== 'Sin fecha específica') {
        detalles.push({
          label: `📅 ${dia.fecha}`,
          valor: `S/ ${dia.total.toFixed(2)}`,
          icono: 'event'
        });
      }
    });

    // Agregar ventas sin fecha si están seleccionadas
    if (incluirSinFecha) {
      const totalSinFecha = diasSinFecha.reduce((sum, dia) => sum + (dia.total || 0), 0);
      detalles.push({
        label: '📌 Ventas sin fecha específica',
        valor: `S/ ${totalSinFecha.toFixed(2)}`,
        icono: 'help'
      });
    }

    // Cerrar el modal personalizado actual
    document.body.removeChild(modal);

    // Abrir modal de confirmación de Angular Material
    const dialogRef = this.dialog.open(ConfirmacionModalComponent, {
      width: '550px',
      maxWidth: '95vw',
      data: {
        titulo: 'Confirmar Regularización',
        mensaje: '¿Estás seguro de regularizar las siguientes entregas pendientes?',
        tipo: 'regularizacion',
        detalles: detalles,
        total: `Total: S/ ${totalSeleccionado.toFixed(2)}`,
        metodo: metodo,
        confirmText: '✅ Regularizar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Procesar cada día seleccionado
        diasSeleccionados.forEach((dia: any) => {
          if (dia.fecha && dia.fecha !== 'Sin fecha específica') {
            const [day, month, year] = dia.fecha.split('/');
            if (day && month && year) {
              const fechaISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              console.log(`📅 Regularizando fecha: ${dia.fecha} -> ${fechaISO}`);
              this.regularizarEntregasPendientes(dia.fecha, dia.total, metodo);
            }
          }
        });

        // Regularizar ventas sin fecha específica
        if (incluirSinFecha) {
          const totalSinFecha = diasSinFecha.reduce((sum, dia) => sum + (dia.total || 0), 0);
          const hoy = new Date().toISOString().split('T')[0];
          this.regularizarEntregasSinFecha(hoy, totalSinFecha, metodo);
        }
      }
    });
  });
} // <-- Este es el cierre correcto del if (btnConfirmar)

    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  });
}

// Nuevo método para regularizar ventas sin fecha
regularizarEntregasSinFecha(fecha: string, monto: number, metodo: string = 'efectivo') {
  const ventasSinFechaIds = this.detalleVentasPendientes
    .filter((venta: any) => {
      return !venta.fecha_formateada || 
             venta.fecha_formateada === 'Sin fecha específica' ||
             venta.fecha_formateada === 'null';
    })
    .map((venta: any) => venta.id_venta);
  
  this.entregaDineroService.regularizarPendiente(fecha, monto, metodo, ventasSinFechaIds).subscribe({
    next: (response: RegularizarPendienteResponse) => {
      console.log('✅ Ventas sin fecha regularizadas:', response);
      
      // ✅ REEMPLAZAR alert() CON MODAL
      this.dialog.open(ConfirmacionModalComponent, {
        width: '500px',
        data: {
          titulo: '🔄 Regularización Exitosa',
          mensaje: 'Ventas sin fecha específica regularizadas exitosamente.',
          tipo: 'regularizacion',
          monto: monto,
          metodo: metodo,
          fecha: new Date().toLocaleDateString('es-PE'),
          detalles: [
            { label: 'Ventas regularizadas', valor: ventasSinFechaIds.length.toString(), icono: 'receipt' },
            { label: 'Monto', valor: `S/ ${monto.toFixed(2)}`, icono: 'attach_money' }
          ],
          confirmText: 'Aceptar'
        }
      });
      
      this.cargarDatos();
      this.cargarDineroPendienteTotal();
      this.mostrarAlertaPendiente = false;
    },
    error: (error: any) => {
      console.error('Error regularizando ventas sin fecha:', error);
      
      // ✅ MODAL DE ERROR
      this.dialog.open(ConfirmacionModalComponent, {
        width: '450px',
        data: {
          titulo: '❌ Error',
          mensaje: error.error?.error || 'Error al regularizar ventas sin fecha',
          tipo: 'warning',
          confirmText: 'Entendido'
        }
      });
    }
  });
}






  mostrarAlertaPendienteModal() {
    const totalPendiente = this.getTotalIngresosCompleto();
    const hoy = this.getTotalIngresos();
    const anterior = this.dineroPendienteTotal;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px;">
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
          <h4 style="color: #856404; margin-top: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle"></i> ATENCIÓN: Dinero Pendiente de Días Anteriores
          </h4>
          <p style="margin: 8px 0;">
            <strong>Total pendiente de entrega:</strong> <span style="color: #dc3545; font-weight: bold;">S/ ${totalPendiente.toFixed(2)}</span>
          </p>
          <div style="background: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p style="margin: 5px 0; font-weight: 600;">Desglose:</p>
            <p style="margin: 5px 0; display: flex; justify-content: space-between;">
              <span>💰 Hoy:</span>
              <span>S/ ${hoy.toFixed(2)}</span>
            </p>
            <p style="margin: 5px 0; display: flex; justify-content: space-between; color: #dc3545;">
              <span>📅 Días anteriores:</span>
              <span>S/ ${anterior.toFixed(2)}</span>
            </p>
          </div>
          <p style="font-size: 0.9em; color: #666;">
            <i class="fas fa-info-circle"></i> Debes entregar TODO el dinero pendiente al administrador.
          </p>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button id="btnVerDetalle" style="padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-list"></i> Ver Detalle
          </button>
          <button id="btnCerrar" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            Cerrar
          </button>
        </div>
      </div>
    `;

    this.mostrarModalPersonalizado(html, '⚠️ Dinero Pendiente').then((modal) => {
      const btnVerDetalle = modal.querySelector('#btnVerDetalle');
      const btnCerrar = modal.querySelector('#btnCerrar');

      if (btnVerDetalle) {
        btnVerDetalle.addEventListener('click', () => {
          document.body.removeChild(modal);
          this.mostrarModalDetallePendiente();
        });
      }

      if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
      }
    });
  }

mostrarModalDetallePendiente() {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 15px;">
      <h3 style="color: #495057; margin-bottom: 15px; text-align: center;">
        <i class="fas fa-file-invoice-dollar"></i> Detalle de Dinero Pendiente
      </h3>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 0; font-weight: 600; color: #495057;">
          Total pendiente: <span style="color: #dc3545;">S/ ${this.dineroPendienteTotal.toFixed(2)}</span>
        </p>
      </div>
      
      <div style="margin-top: 20px;">
        <p style="font-weight: 600; color: #495057; margin-bottom: 10px;">
          <i class="fas fa-lightbulb"></i> Procedimiento recomendado:
        </p>
        <ol style="color: #666; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Entrega el dinero físico al administrador</li>
          <li style="margin-bottom: 8px;">Notifica al administrador por WhatsApp</li>
          <li>Una vez regularizado, el sistema actualizará automáticamente</li>
        </ol>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
        <p style="margin: 0; color: #004085; font-size: 0.9em;">
          <i class="fas fa-info-circle"></i> 
          <strong>Nota:</strong> Usa WhatsApp para notificar inmediatamente al administrador.
        </p>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
        <button id="btnInformarAdmin" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fab fa-whatsapp"></i> Notificar por WhatsApp
        </button>
        <button id="btnCerrarDetalle" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
          Cerrar
        </button>
      </div>
    </div>
  `;

  this.mostrarModalPersonalizado(html, '📋 Detalle Pendiente').then((modal) => {
    const btnInformarAdmin = modal.querySelector('#btnInformarAdmin');
    const btnCerrarDetalle = modal.querySelector('#btnCerrarDetalle');

    if (btnInformarAdmin) {
      btnInformarAdmin.addEventListener('click', () => {
        document.body.removeChild(modal);
        this.enviarWhatsAppAlAdministrador();
      });
    }

    if (btnCerrarDetalle) {
      btnCerrarDetalle.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  });
}
  // ========== MÉTODOS DE FILTRADO ==========
// MODIFICA los métodos de filtrado para guardar estado cuando cambian
aplicarFiltros() {
  let filtrado = [...this.historial];

  if (this.terminoBusqueda.trim()) {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    filtrado = filtrado.filter(entrega => {
      return (
        entrega.nombre_completo?.toLowerCase().includes(termino) ||
        entrega.razon_social?.toLowerCase().includes(termino) ||
        entrega.direccion?.toLowerCase().includes(termino) ||
        entrega.telefono?.includes(termino) ||
        entrega.id_venta.toString().includes(termino)
      );
    });
  }
  
  if (this.filtroFecha) {
    filtrado = filtrado.filter(entrega =>
      entrega.fecha === this.filtroFecha
    );
  }
  
  if (this.filtroMetodoPago !== 'todos') {
    filtrado = filtrado.filter(entrega =>
      entrega.id_metodo_pago?.toString() === this.filtroMetodoPago
    );
  }

  if (this.filtroEstado !== 'todos') {
    filtrado = filtrado.filter(entrega =>
      entrega.estado?.toLowerCase() === this.filtroEstado.toLowerCase()
    );
  }

  filtrado.sort((a, b) => {
    const fechaA = new Date(a.fecha_creacion);
    const fechaB = new Date(b.fecha_creacion);
    return fechaB.getTime() - fechaA.getTime();
  });

  this.historialFiltrado = filtrado;
  
  // ✅ Reiniciar a página 1 y actualizar paginación
  this.paginaActual = 1;
  this.actualizarPaginacion();
  
  // Guardar estado después de filtrar
  this.guardarEstadoAntesDeNavegar();
}

 // MODIFICA limpiarFiltros
limpiarFiltros() {
  this.terminoBusqueda = '';
  this.filtroFecha = '';
  this.filtroMetodoPago = 'todos';
  this.filtroEstado = 'todos';
  this.aplicarFiltros();
}

  removerFiltro(tipo: string) {
    switch (tipo) {
      case 'busqueda': this.terminoBusqueda = ''; break;
      case 'fecha': this.filtroFecha = ''; break;
      case 'metodoPago': this.filtroMetodoPago = 'todos'; break;
      case 'estado': this.filtroEstado = 'todos'; break;
    }
    this.aplicarFiltros();
  }

  hayFiltrosActivos(): boolean {
    return (
      this.terminoBusqueda.trim() !== '' ||
      this.filtroFecha !== '' ||
      this.filtroMetodoPago !== 'todos' ||
      this.filtroEstado !== 'todos'
    );
  }

  // ========== MÉTODOS DE UTILIDAD ==========
  obtenerNombreMetodoPago(idMetodo: string): string {
    const metodos: { [key: string]: string } = {
      '1': 'Efectivo',
      '2': 'Yape',
      '3': 'Transferencia',
      '4': 'Tarjeta'
    };
    return metodos[idMetodo] || 'Desconocido';
  }

  getIconoMetodoPago(idMetodo: number): string {
    const iconos: { [key: number]: string } = {
      1: 'fa-money-bill-wave',
      2: 'fa-mobile-alt',
      3: 'fa-university',
      4: 'fa-credit-card'
    };
    return iconos[idMetodo] || 'fa-credit-card';
  }

// REEMPLAZA el método formatearFecha en historial-entregas.component.ts
formatearFecha(fecha: string): string {
  if (!fecha) return '';
  
  try {
    // Si la fecha viene en formato ISO (YYYY-MM-DD)
    if (fecha.includes('-')) {
      // Crear fecha considerando zona horaria Perú
      const fechaObj = new Date(fecha + 'T12:00:00-05:00');
      
      // Verificar que sea válida
      if (isNaN(fechaObj.getTime())) {
        console.warn('Fecha inválida:', fecha);
        return fecha;
      }
      
      // Formatear en formato DD/MM/YYYY
      const dia = fechaObj.getDate().toString().padStart(2, '0');
      const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
      const anio = fechaObj.getFullYear();
      
      return `${dia}/${mes}/${anio}`;
    }
    
    // Si ya está en formato DD/MM/YYYY, devolverla tal cual
    if (fecha.includes('/')) {
      return fecha;
    }
    
    return fecha;
  } catch (error) {
    console.error('Error en formatearFecha:', error, 'Fecha:', fecha);
    return fecha;
  }
}

  formatearFechaHora(fechaHora: string): string {
    if (!fechaHora) return '';
    const date = new Date(fechaHora);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

 // REEMPLAZA el método formatearFechaHistorial con esta versión mejorada:
formatearFechaHistorial(fechaISO: string): string {
  if (!fechaISO) return 'Sin fecha';
  try {
    let fecha: Date;
    if (fechaISO.includes('T')) {
      fecha = new Date(fechaISO);
    } else {
      return fechaISO;
    }
    
    // Verificar si es una entrega regularizada
    const esRegularizada = this.esEntregaRegularizada(fechaISO);
    
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Lima'
    });
    
    // Agregar indicador visual si es regularizada
    return esRegularizada ? `${fechaFormateada} 🔄` : fechaFormateada;
  } catch (error) {
    return fechaISO;
  }
}

  // ========== MÉTODOS DE DINERO ==========
  getTotalIngresos(): number {
    try {
      const hoy = new Date().toLocaleDateString('en-CA');
      const ventasPagadasHoy = this.historial.filter(e => {
        if (!e.fecha_creacion) return false;
        const fechaVenta = new Date(e.fecha_creacion);
        const fechaVentaStr = fechaVenta.toLocaleDateString('en-CA');
        const esPagado = e.estado === 'Pagado';
        const esHoy = fechaVentaStr === hoy;
        return esPagado && esHoy;
      });

      const totalVentasHoy = ventasPagadasHoy.reduce((sum, e) => {
        return sum + (Number(e.total) || 0);
      }, 0);

      const pendiente = Math.max(0, totalVentasHoy - this.totalEntregadoAlAdmin);
      return pendiente;
    } catch (error) {
      console.error('Error calculando ingresos:', error);
      return 0;
    }
  }

  // REEMPLAZA el método getTotalIngresosCompleto() con esta versión mejorada:
getTotalIngresosCompleto(): number {
  const hoy = this.getTotalIngresos(); // Solo ventas de hoy sin entregar
  const anterior = this.getDineroPendienteSoloAnteriores(); // Solo ventas anteriores
  
  return hoy + anterior;
}
// NUEVO: Método para obtener solo dinero de días anteriores (excluyendo hoy)
public getDineroPendienteSoloAnteriores(): number {
  const hoy = new Date();
  let totalAnterior = 0;
  
  // Filtrar ventas que NO son de hoy
  if (this.detalleVentasPendientes && this.detalleVentasPendientes.length > 0) {
    const ventasAnteriores = this.detalleVentasPendientes.filter((venta: any) => {
      try {
        const fechaVenta = new Date(venta.fecha_venta || venta.fecha_original);
        return fechaVenta.toDateString() !== hoy.toDateString();
      } catch (error) {
        // Si hay error al parsear la fecha, asumir que es anterior
        return true;
      }
    });
    
    totalAnterior = ventasAnteriores.reduce((sum: number, venta: any) => {
      return sum + (parseFloat(venta.total) || 0);
    }, 0);
  }
  
  return totalAnterior;
}


  getCantidadVentasHoy(): number {
    const hoy = new Date().toISOString().split('T')[0];
    return this.historial.filter(e => {
      if (!e.fecha_creacion) return false;
      const fechaVenta = new Date(e.fecha_creacion).toISOString().split('T')[0];
      return e.estado === 'Pagado' && fechaVenta === hoy;
    }).length;
  }

 // También actualiza hayDineroPendienteDeDiasAnteriores():
hayDineroPendienteDeDiasAnteriores(): boolean {
  return this.getDineroPendienteSoloAnteriores() > 0;
}
private obtenerIdsVentasAnteriores(): number[] {
    const hoy = new Date();
    return this.detalleVentasPendientes
      .filter((venta: any) => {
        const fechaVenta = new Date(venta.fecha_venta || venta.fecha_original);
        return fechaVenta.toDateString() !== hoy.toDateString();
      })
      .map((venta: any) => venta.id_venta);
  }
  // Métodos auxiliares para obtener IDs de ventas
  private obtenerIdsVentasHoy(): number[] {
    const hoy = new Date();
    return this.detalleVentasPendientes
      .filter((venta: any) => {
        const fechaVenta = new Date(venta.fecha_venta || venta.fecha_original);
        return fechaVenta.toDateString() === hoy.toDateString();
      })
      .map((venta: any) => venta.id_venta);
  }
 // NUEVO: Método para registrar dos entregas separadas
  private async registrarEntregasSeparadas(totalHoy: number, totalAnterior: number) {
    this.loading = true;
    
    try {
      // 1. Verificar si hay entrega reciente
      const tieneEntregaReciente = await this.verificarEntregaReciente();
      if (tieneEntregaReciente) {
        alert('⚠️ Ya tienes una entrega registrada recientemente. Espera unos minutos antes de registrar otra.');
        this.loading = false;
        return;
      }

      // 2. Primero registrar las ventas de HOY
      if (totalHoy > 0) {
        const ventasHoyIds = this.obtenerIdsVentasHoy();
        
        await this.entregaDineroService.registrarEntregaConVentasEspecificas(
          totalHoy,
          'efectivo',
          ventasHoyIds,
          'hoy' // Tipo: solo ventas de hoy
        ).toPromise();
        
        console.log('✅ Entrega de HOY registrada:', totalHoy);
      }

      // 3. Luego registrar las ventas de días anteriores (como mixta)
      if (totalAnterior > 0) {
        const ventasAnterioresIds = this.obtenerIdsVentasAnteriores();
        const hoyStr = new Date().toISOString().split('T')[0];
        
        await this.entregaDineroService.registrarEntregaConVentasEspecificas(
          totalAnterior,
          'efectivo',
          ventasAnterioresIds,
          'mixta', // Tipo: mixta (solo días anteriores entregados hoy)
          hoyStr
        ).toPromise();
        
        console.log('✅ Entrega de DÍAS ANTERIORES registrada:', totalAnterior);
      }

      // 4. Mostrar confirmación
      alert(`✅ Entregas registradas exitosamente:\n\n` +
            `1. HOY: S/ ${totalHoy.toFixed(2)} (en tiempo real)\n` +
            `2. DÍAS ANTERIORES: S/ ${totalAnterior.toFixed(2)} (mixta)\n\n` +
            `Total físico entregado: S/ ${(totalHoy + totalAnterior).toFixed(2)}`);
      
      this.recargarDatosCompletamente();
      
     } catch (error) {
    console.error('❌ Error registrando entregas separadas:', error);
    
    // CORRECCIÓN: Manejar el error correctamente
    let errorMessage = 'Error desconocido';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Intentar obtener el mensaje de error del objeto
      const errObj = error as any;
      errorMessage = errObj.error?.error || errObj.message || JSON.stringify(error);
    }
    
    alert('❌ Error al registrar las entregas: ' + errorMessage);
  } finally {
    this.loading = false;
  }
}

  // ========== REGISTRO DE ENTREGA MEJORADO ==========
   // ========== MÉTODOS PRINCIPALES DE ENTREGA ==========
// En el método registrarEntregaDinero():
/*registrarEntregaDinero() {
  const totalHoy = this.getTotalIngresos();
  const totalAnterior = this.getDineroPendienteSoloAnteriores(); // ¡USAR ESTE!
  const totalCompleto = totalHoy + totalAnterior;
    
    if (totalCompleto <= 0) {
      alert('💰 No tienes dinero pendiente de entrega.');
      return;
    }

    // Caso 1: Solo dinero de hoy
    if (totalHoy > 0 && totalAnterior === 0) {
      this.registrarEntregaSoloHoy(totalHoy);
      return;
    }

    // Caso 2: Solo dinero de días anteriores
    if (totalHoy === 0 && totalAnterior > 0) {
      this.mostrarModalSoloDiasAnteriores(totalAnterior);
      return;
    }

    // Caso 3: Ambos (hoy + anterior)
    if (totalHoy > 0 && totalAnterior > 0) {
      this.mostrarConfirmacionEntregasMixtas(totalHoy, totalAnterior);
      return;
    }
  }
*/
// NUEVO: Método para registrar solo ventas de hoy
  private registrarEntregaSoloHoy(totalHoy: number) {
    this.verificarEntregaReciente().then((tieneEntregaReciente) => {
      if (tieneEntregaReciente) {
        alert('⚠️ Ya tienes una entrega registrada recientemente. Espera unos minutos antes de registrar otra.');
        return;
      }

      const confirmacion = confirm(
        `¿Deseas registrar la entrega de S/ ${totalHoy.toFixed(2)} al administrador?\n\n` +
        `✅ Solo ventas del día de hoy\n` +
        `📅 Fecha: ${new Date().toLocaleDateString('es-PE')}`
      );

      if (confirmacion) {
        this.registrarEntregaSegura(totalHoy);
      }
    });
  }








  // NUEVO: Método para mostrar modal cuando solo hay días anteriores
  mostrarModalSoloDiasAnteriores(totalAnterior: number) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 15px;">
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
          <h4 style="color: #856404; margin-top: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-calendar-day"></i> SOLO DINERO DE DÍAS ANTERIORES
          </h4>
          
          <p style="margin: 8px 0;">
            Tienes <strong>S/ ${totalAnterior.toFixed(2)}</strong> pendiente de días anteriores, 
            pero <strong>NO tienes ventas del día de hoy</strong>.
          </p>
          
          <div style="background: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p style="margin: 5px 0; font-weight: 600; color: #dc3545;">
              <i class="fas fa-info-circle"></i> Opciones disponibles:
            </p>
            <ul style="color: #666; padding-left: 20px;">
              <li><strong>Regularizar por fecha</strong> (Recomendado): Cada día anterior se registra por separado</li>
              <li><strong>Entregar todo hoy</strong>: Se registrará como una sola entrega con fecha de hoy (no recomendado)</li>
            </ul>
          </div>
          
          <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #17a2b8;">
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              <i class="fas fa-lightbulb"></i> 
              <strong>Recomendación:</strong> Usa "Regularizar Pendiente" para mantener un historial preciso por fecha.
            </p>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          <button id="btnRegularizar" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-calendar-check"></i> Regularizar por Fecha (Recomendado)
          </button>
          
          <button id="btnEntregarTodoHoy" style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-hand-holding-usd"></i> Entregar TODO HOY (1 entrega)
          </button>
          
          <button id="btnCancelar" style="padding: 12px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </div>
    `;

    this.mostrarModalPersonalizado(html, '📅 Dinero de Días Anteriores').then((modal) => {
      const btnRegularizar = modal.querySelector('#btnRegularizar');
      const btnEntregarTodoHoy = modal.querySelector('#btnEntregarTodoHoy');
      const btnCancelar = modal.querySelector('#btnCancelar');

      if (btnRegularizar) {
        btnRegularizar.addEventListener('click', () => {
          document.body.removeChild(modal);
          this.mostrarModalRegularizacion();
        });
      }

      if (btnEntregarTodoHoy) {
        btnEntregarTodoHoy.addEventListener('click', () => {
          document.body.removeChild(modal);
          
          const confirmacion = confirm(
            `⚠️ ADVERTENCIA: Vas a registrar TODO el dinero como entregado HOY.\n\n` +
            `Monto: S/ ${totalAnterior.toFixed(2)}\n` +
            `Origen: Solo días anteriores (NO hay ventas de hoy)\n\n` +
            `¿Estás seguro? Esta acción registrará una entrega "en tiempo real" para dinero de días anteriores.`
          );

          if (confirmacion) {
            this.registrarEntregaTodoHoy(totalAnterior);
          }
        });
      }

      if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
      }
    });
  }
// MODIFICADO: Método para entregas mixtas (hoy + anterior)
 mostrarConfirmacionEntregasMixtas(totalHoy: number, totalAnterior: number) {
  const totalCompleto = totalHoy + totalAnterior;
  
  // Filtrar solo días anteriores para mostrar en el desglose
  const hoy = new Date();
  const fechasPendientesAnteriores = this.ventasPendientesPorDia.filter((dia: any) => {
    if (!dia.fecha || dia.fecha === 'null') return false;
    
    try {
      // Convertir fecha dd/mm/yyyy a Date
      const [day, month, year] = dia.fecha.split('/');
      const fechaDia = new Date(year, month - 1, day);
      return fechaDia.toDateString() !== hoy.toDateString();
    } catch (error) {
      return true; // Si hay error, asumir que es anterior
    }
  });
    
    let html = `
      <div style="font-family: Arial, sans-serif; padding: 15px; max-width: 500px;">
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
          <h4 style="color: #856404; margin-top: 0;">
            ⚠️ ENTREGA CON DINERO DE HOY Y DÍAS ANTERIORES
          </h4>
          <p style="margin: 8px 0;">
            Tienes dinero pendiente de HOY y de días anteriores. ¿Cómo deseas proceder?
          </p>
          
          <div style="background: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p style="margin: 5px 0; font-weight: 600;">Desglose del monto:</p>
            <p style="margin: 5px 0; display: flex; justify-content: space-between; color: #28a745;">
              <span>💰 Hoy (${new Date().toLocaleDateString('es-PE')}):</span>
              <span>S/ ${totalHoy.toFixed(2)}</span>
            </p>
            
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
              <p style="margin: 5px 0; font-weight: 600; color: #dc3545;">📅 Días anteriores:</p>
    `;
    
    fechasPendientesAnteriores.forEach((dia: any) => {
      html += `
        <p style="margin: 5px 0; display: flex; justify-content: space-between; padding-left: 15px;">
          <span style="font-size: 0.9em;">📌 ${dia.fecha || 'Fecha no disponible'}:</span>
          <span style="font-weight: 500;">S/ ${dia.total?.toFixed(2) || '0.00'}</span>
        </p>
      `;
    });
    
    html += `
            </div>
            
            <hr style="margin: 10px 0;">
            <p style="margin: 5px 0; display: flex; justify-content: space-between; font-weight: bold; background: #e7f3ff; padding: 8px; border-radius: 4px;">
              <span>Total a entregar:</span>
              <span>S/ ${totalCompleto.toFixed(2)}</span>
            </p>
          </div>
          
          <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #17a2b8;">
            <p style="margin: 0 0 8px 0; font-size: 0.9em; font-weight: 600; color: #17a2b8;">
              <i class="fas fa-lightbulb"></i> Recomendación:
            </p>
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              <strong>El sistema creará DOS registros separados:</strong><br>
              1. Ventas de HOY como "en tiempo real"<br>
              2. Ventas anteriores como "mixta"<br><br>
              Esto mantiene un historial preciso y evita confusiones.
            </p>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          <button id="btnEntregarSeparado" style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-check-circle"></i> Entregar SEPARADO (2 registros - Recomendado)
          </button>
          
          <button id="btnEntregarTodoJunto" style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-box"></i> Entregar TODO JUNTO (1 registro)
          </button>
          
          <button id="btnRegularizarSeparado" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-calendar-check"></i> Regularizar Días Anteriores por Fecha
          </button>
          
          <button id="btnCancelar" style="padding: 12px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </div>
    `;

    this.mostrarModalPersonalizado(html, '⚠️ Opciones de Entrega').then((modal) => {
      const btnEntregarSeparado = modal.querySelector('#btnEntregarSeparado');
      const btnEntregarTodoJunto = modal.querySelector('#btnEntregarTodoJunto');
      const btnRegularizarSeparado = modal.querySelector('#btnRegularizarSeparado');
      const btnCancelar = modal.querySelector('#btnCancelar');

      if (btnEntregarSeparado) {
        btnEntregarSeparado.addEventListener('click', async () => {
          document.body.removeChild(modal);
          
          const confirmacion = confirm(
            `¿Confirmas registrar DOS entregas separadas?\n\n` +
            `1. HOY: S/ ${totalHoy.toFixed(2)} (en tiempo real)\n` +
            `2. DÍAS ANTERIORES: S/ ${totalAnterior.toFixed(2)} (mixta)\n\n` +
            `Total físico a entregar: S/ ${totalCompleto.toFixed(2)}`
          );

          if (confirmacion) {
            await this.registrarEntregasSeparadas(totalHoy, totalAnterior);
          }
        });
      }

      if (btnEntregarTodoJunto) {
        btnEntregarTodoJunto.addEventListener('click', () => {
          document.body.removeChild(modal);
          
          const confirmacion = confirm(
            `⚠️ ADVERTENCIA: Vas a registrar TODO el dinero en UNA SOLA entrega.\n\n` +
            `Monto: S/ ${totalCompleto.toFixed(2)}\n` +
            `Origen: Hoy (${totalHoy.toFixed(2)}) + Días anteriores (${totalAnterior.toFixed(2)})\n\n` +
            `¿Estás seguro? Esta acción registrará una entrega "mixta" que incluye ambos tipos.`
          );

          if (confirmacion) {
            this.registrarEntregaTodoJunto(totalCompleto);
          }
        });
      }

      if (btnRegularizarSeparado) {
        btnRegularizarSeparado.addEventListener('click', () => {
          document.body.removeChild(modal);
          this.mostrarModalRegularizacion();
        });
      }

      if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
      }
    });
  }

  // Método para registrar todo junto (opción alternativa)
  private registrarEntregaTodoJunto(total: number) {
    this.loading = true;
    
    const todasVentasIds = this.detalleVentasPendientes.map(v => v.id_venta);
    
    this.entregaDineroService.registrarEntregaConVentasEspecificas(
      total,
      'efectivo',
      todasVentasIds,
      'mixta_completa' // Tipo: mixta completa
    ).subscribe({
      next: (response) => {
        console.log('✅ Entrega completa registrada:', response);
        alert('✅ Entrega COMPLETA registrada exitosamente.\n\n' +
              '💰 Incluye dinero de hoy y días anteriores en un solo registro.');
        this.recargarDatosCompletamente();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error registrando entrega completa:', error);
        alert('❌ Error al registrar entrega: ' + (error.error?.error || error.message));
        this.loading = false;
      }
    });
  }







  // Método existente para registrar "todo hoy" (solo días anteriores)
  private registrarEntregaTodoHoy(total: number) {
    this.loading = true;
    
    const ventasIds = this.detalleVentasPendientes.map(v => v.id_venta);
    
    this.entregaDineroService.registrarEntregaConVentasEspecificas(
      total,
      'efectivo',
      ventasIds,
      'completa_anterior' // Tipo: solo días anteriores
    ).subscribe({
      next: (response) => {
        console.log('✅ Entrega completa de días anteriores registrada:', response);
        alert('✅ Entrega de TODO el dinero (días anteriores) registrada exitosamente.');
        this.recargarDatosCompletamente();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error registrando entrega completa:', error);
        alert('❌ Error al registrar entrega: ' + (error.error?.error || error.message));
        this.loading = false;
      }
    });
  }
  private async verificarEntregaReciente(): Promise<boolean> {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const entregasHoy = await this.entregaDineroService.getEntregasPorFecha(hoy).toPromise();
      
      if (entregasHoy && entregasHoy.length > 0) {
        const ahora = new Date();
        const entregasRecientes = entregasHoy.filter(entrega => {
          const fechaEntrega = new Date(entrega.fecha_entrega);
          const diferenciaMinutos = (ahora.getTime() - fechaEntrega.getTime()) / (1000 * 60);
          return diferenciaMinutos < 30;
        });
        return entregasRecientes.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error verificando entregas recientes:', error);
      return false;
    }
  }



private registrarEntregaSegura(total: number) {
  this.loading = true;
  
  this.entregaDineroService.registrarEntrega(total, 'efectivo').subscribe({
    next: (response) => {
      console.log('✅ Entrega registrada:', response);
      
      // ✅ MODAL DE ÉXITO
      this.dialog.open(ConfirmacionModalComponent, {
        width: '500px',
        data: {
          titulo: '✅ Entrega Registrada',
          mensaje: 'El dinero ha sido registrado exitosamente en el sistema.',
          tipo: 'entrega',
          monto: total,
          metodo: 'efectivo',
          fecha: new Date().toLocaleDateString('es-PE'),
          detalles: [
            { label: 'Monto', valor: `S/ ${total.toFixed(2)}`, icono: 'attach_money' },
            { label: 'Método', valor: 'Efectivo', icono: 'paid' },
            { label: 'Fecha', valor: new Date().toLocaleDateString('es-PE'), icono: 'event' },
            { label: 'Hora', valor: new Date().toLocaleTimeString('es-PE'), icono: 'schedule' }
          ],
          confirmText: 'Aceptar'
        }
      }).afterClosed().subscribe(() => {
        this.recargarDatosCompletamente();
        this.loading = false;
      });
    },
    error: (error) => {
      console.error('Error registrando entrega:', error);
      
      // ✅ MODAL DE ERROR
      this.dialog.open(ConfirmacionModalComponent, {
        width: '450px',
        data: {
          titulo: '❌ Error',
          mensaje: error.error?.error || 'Error al registrar la entrega',
          tipo: 'warning',
          confirmText: 'Entendido'
        }
      });
      this.loading = false;
    }
  });
}

  private recargarDatosCompletamente() {
    this.cargarDatos();
    this.cargarDineroPendienteTotal();
  }

 // Y luego modifica el método verHistorialEntregasDinero para usar esta nueva versión:
verHistorialEntregasDinero() {
  this.mostrarModalHistorialMejorado();
}
 // Actualiza formatearMetodoEntrega para evitar emojis en CSV
public formatearMetodoEntrega(metodo: string): string {
  const metodos: { [key: string]: string } = {
    'efectivo': 'Efectivo',
    'transferencia': 'Transferencia',
    'yape': 'Yape',
    'tarjeta': 'Tarjeta'
  };
  return metodos[metodo] || metodo;
}

  mostrarModalHistorial(html: string) {
    this.mostrarModalPersonalizado(html, '📋 Historial de Entregas');
  }

  mostrarModalPersonalizado(html: string, titulo?: string): Promise<HTMLElement> {
    return new Promise((resolve) => {
      // Eliminar modales existentes
      const existingModal = document.querySelector('.modal-personalizado');
      if (existingModal) {
        document.body.removeChild(existingModal);
      }

      const modal = document.createElement('div');
      modal.className = 'modal-personalizado';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
      `;
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background-color: white;
        padding: 25px;
        border-radius: 12px;
        max-width: 600px;
        width: 95%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        position: relative;
      `;
      
      if (titulo) {
        modalContent.innerHTML = `
          <h3 style="color: #007bff; margin-bottom: 15px; text-align: center;">${titulo}</h3>
          ${html}
        `;
      } else {
        modalContent.innerHTML = html;
      }
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '<i class="fas fa-times"></i> Cerrar';
      closeButton.style.cssText = `
        display: block;
        margin: 25px auto 0 auto;
        padding: 10px 25px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      `;
      
      closeButton.onmouseover = () => {
        closeButton.style.backgroundColor = '#0056b3';
        closeButton.style.transform = 'translateY(-2px)';
      };
      
      closeButton.onmouseout = () => {
        closeButton.style.backgroundColor = '#007bff';
        closeButton.style.transform = 'translateY(0)';
      };
      
      closeButton.onclick = () => document.body.removeChild(modal);
      
      modalContent.appendChild(closeButton);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      const closeModal = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', closeModal);
        }
      };
      
      document.addEventListener('keydown', closeModal);
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', closeModal);
        }
      };
      
      resolve(modal);
    });
  }

  // ========== MÉTODOS DE PAGINACIÓN ==========
 // Modifica el método actualizarPaginacion para asegurar que siempre sea válido
actualizarPaginacion() {
  // Asegurar que paginaActual esté en rango válido
  if (this.paginaActual < 1) {
    this.paginaActual = 1;
  }
  
  const maxPagina = Math.max(1, this.totalPaginas);
  if (this.paginaActual > maxPagina) {
    this.paginaActual = maxPagina;
  }
  
  const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
  const fin = inicio + this.itemsPorPagina;
  this.historialPaginado = this.historialFiltrado.slice(inicio, fin);
}
  get totalPaginas(): number {
    return Math.ceil(this.historialFiltrado.length / this.itemsPorPagina);
  }

  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.actualizarPaginacion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
      this.actualizarPaginacion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ========== MÉTODOS DE CÁLCULO ==========
  getTotalEntregas(): number {
    return this.historial.filter(e => e.estado === 'Pagado').length;
  }

  getTotalCanceladas(): number {
    return this.historial.filter(e => e.estado === 'Cancelado').length;
  }

  // ========== GETTERS PARA TEMPLATE ==========
  get totalEntregadoAlAdminFixed(): string {
    return (this.totalEntregadoAlAdmin || 0).toFixed(2);
  }

  get totalIngresosFixed(): string {
    return this.getTotalIngresos().toFixed(2);
  }

  get totalIngresosCompletoFixed(): string {
    return this.getTotalIngresosCompleto().toFixed(2);
  }

  // ========== MÉTODOS EXISTENTES ==========

// MODIFICA verDetalleVenta
verDetalleVenta(idVenta: number) {
  // Guardar estado antes de navegar
  this.guardarEstadoAntesDeNavegar();
  
  // Guardar la ruta actual
  const currentRoute = this.router.url;
  localStorage.setItem('previous_repartidor_route', currentRoute);
  
  this.router.navigate(['/repartidor/venta', idVenta]);
}


  getEstadoBadgeClass(estado: string): string {
    const estadoClass: { [key: string]: string } = {
      'Pagado': 'badge-success',
      'Cancelado': 'badge-danger',
      'En ruta': 'badge-warning',
      'Listo para repartos': 'badge-info'
    };
    return estadoClass[estado] || 'badge-secondary';
  }
  // CON ESTA VERSIÓN CORREGIDA:
esEntregaRegularizada(fechaHora: string): boolean {
  // Si la hora es 00:00:00, es muy probable que sea una regularización
  return !!fechaHora && fechaHora.includes('00:00:00');
}
mostrarModalHistorialMejorado() {
  this.entregaDineroService.getHistorialEntregas().subscribe({
    next: (response) => {
      if (response && response.data && response.data.entregas) {
        const historial = response.data.entregas;
        
        if (historial.length === 0) {
          alert('📋 No hay entregas de dinero registradas.');
          return;
        }

        // CORRECCIÓN: Solo un título en el HTML
        let html = `
          <div style="font-family: Arial, sans-serif;">
            <div style="margin-bottom: 15px; text-align: center; color: #495057;">
              <h3 style="color: #007bff; margin-bottom: 5px;">
                📋 Historial de Entregas de Dinero
              </h3>
              <p style="color: #666; font-size: 14px; margin: 0;">
                <i class="fas fa-info-circle"></i> Mostrando ${historial.length} entregas
              </p>
            </div>
            
            <!-- FILTRO DE FECHA - NUEVO -->
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-filter" style="color: #007bff;"></i>
                <h4 style="margin: 0; font-size: 16px; color: #495057;">Filtrar por fecha</h4>
              </div>
              
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <!-- Filtro por rango de fechas -->
                <div style="flex: 1; min-width: 200px;">
                  <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #495057;">
                    <i class="fas fa-calendar-alt"></i> Fecha inicial:
                  </label>
                  <input type="date" id="fecha-inicio" 
                         style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 5px; font-size: 14px;">
                </div>
                
                <div style="flex: 1; min-width: 200px;">
                  <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 600; color: #495057;">
                    <i class="fas fa-calendar-alt"></i> Fecha final:
                  </label>
                  <input type="date" id="fecha-fin" 
                         style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 5px; font-size: 14px;">
                </div>
                
                <div style="display: flex; gap: 10px; align-items: flex-end;">
                  <button id="btn-filtrar" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-search"></i> Filtrar
                  </button>
                  <button id="btn-limpiar-filtro" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Limpiar
                  </button>
                </div>
              </div>
              
              <!-- Filtros rápidos -->
              <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="filtro-rapido" data-dias="7" style="padding: 6px 12px; background: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; font-size: 12px; cursor: pointer;">
                  Últimos 7 días
                </button>
                <button class="filtro-rapido" data-dias="30" style="padding: 6px 12px; background: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; font-size: 12px; cursor: pointer;">
                  Últimos 30 días
                </button>
                <button class="filtro-rapido" data-mes="actual" style="padding: 6px 12px; background: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; font-size: 12px; cursor: pointer;">
                  Este mes
                </button>
                <button class="filtro-rapido" data-tipo="hoy" style="padding: 6px 12px; background: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; font-size: 12px; cursor: pointer;">
                  Solo hoy
                </button>
              </div>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #007bff; color: white; position: sticky; top: 0;">
                    <th style="padding: 10px; text-align: left; font-weight: 600;">#</th>
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Fecha y Hora</th>
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Monto</th>
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Método</th>
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Tipo</th>
                    <th style="padding: 10px; text-align: left; font-weight: 600;">Origen</th>
                  </tr>
                </thead>
                <tbody id="tabla-historial">
        `;
        
        historial.forEach((entrega: any, index: number) => {
              const fecha = entrega.fecha || 'Sin fecha';
          const hora = entrega.hora || '';
          const total = Number(entrega.total) || 0;
          const metodo = entrega.metodo_entrega || 'efectivo';
          let fechaHoraMostrar = fecha;
          
          if (hora) {
            fechaHoraMostrar = `${fecha} ${hora}`;
          }
          
          // Determinar tipo
          const esRegularizada = hora === '00:00:00' || fechaHoraMostrar.includes('00:00:00');
          const notas = entrega.notas || '';
          
          let tipo = '✅ En tiempo real';
          let tipoColor = '#155724';
          let tipoBg = '#d4edda';
          let origen = 'Solo ventas de hoy';
          
          if (esRegularizada) {
            tipo = '🔄 Regularizada';
            tipoColor = '#856404';
            tipoBg = '#fff3cd';
            origen = 'Ventas de fecha específica';
          } else if (notas.includes('ENTREGA MIXTA') || notas.includes('mixta')) {
            tipo = '⚠️ Mixta';
            tipoColor = '#0c5460';
            tipoBg = '#d1ecf1';
            
            if (notas.includes('HOY') && notas.includes('DÍAS ANTERIORES')) {
              origen = 'Hoy + días anteriores';
            } else if (notas.includes('SOLO DÍAS ANTERIORES')) {
              origen = 'Solo días anteriores';
            } else {
              origen = 'Hoy + días anteriores';
            }
          } else if (notas.includes('COMPLETA') || notas.includes('COMPLETA DE DÍAS ANTERIORES')) {
            tipo = '📅 Completa';
            tipoColor = '#721c24';
            tipoBg = '#f8d7da';
            origen = 'Solo días anteriores';
          } else if (notas.includes('HOY')) {
            tipo = '✅ Hoy';
            tipoColor = '#155724';
            tipoBg = '#d4edda';
            origen = 'Solo ventas de hoy';
          }
          
          html += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px; font-weight: 500;">${index + 1}</td>
              <td style="padding: 10px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <i class="fas fa-calendar" style="color: #666;"></i>
                  ${fechaHoraMostrar}
                </div>
              </td>
              <td style="padding: 10px; font-weight: bold; color: #28a745;">
                S/ ${total.toFixed(2)}
              </td>
              <td style="padding: 10px;">
                <span style="padding: 4px 8px; border-radius: 4px; background: #f0f0f0; font-size: 12px;">
                  ${this.formatearMetodoEntrega(metodo)}
                </span>
              </td>
              <td style="padding: 10px;">
                <span style="padding: 4px 8px; border-radius: 4px; 
                          background: ${tipoBg}; 
                          color: ${tipoColor};
                  font-size: 12px;">
                  ${tipo}
                </span>
              </td>
              <td style="padding: 10px; font-size: 12px; color: #666;">
                ${origen}
              </td>
            </tr>
          `;
        });
        
        html += `</tbody></table>`;
        
        // Botón de exportar
        html += `
          <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div style="color: #666; font-size: 14px;">
              <i class="fas fa-download"></i> Exportar historial:
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="btn-exportar-csv" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                <i class="fas fa-file-csv"></i> CSV
              </button>
              <button id="btn-exportar-pdf" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                <i class="fas fa-file-pdf"></i> PDF
              </button>
            </div>
          </div>
        `;
        
        if (response.data.estadisticas) {
          const stats = response.data.estadisticas;
          const montoTotal = Number(stats.monto_total) || 0;
          const primeraEntrega = stats.primera_entrega ? 
            this.formatearFechaHistorial(stats.primera_entrega) : 'No disponible';
          const ultimaEntrega = stats.ultima_entrega ? 
            this.formatearFechaHistorial(stats.ultima_entrega) : 'No disponible';
          
          const entregasHoy = historial.filter((e: any) => 
            !e.hora || e.hora !== '00:00:00'
          ).length;
          
          const entregasRegularizadas = historial.filter((e: any) => 
            e.hora && e.hora === '00:00:00'
          ).length;
          
          html += `
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
              <h4 style="color: #495057; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-chart-bar"></i> Estadísticas del historial
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <p style="margin: 5px 0;"><strong>Total entregas:</strong></p>
                  <p style="margin: 5px 0;"><strong>✅ En tiempo real:</strong></p>
                  <p style="margin: 5px 0;"><strong>🔄 Regularizadas:</strong></p>
                </div>
                <div>
                  <p style="margin: 5px 0;">${stats.total_entregas || 0}</p>
                  <p style="margin: 5px 0;">${entregasHoy}</p>
                  <p style="margin: 5px 0;">${entregasRegularizadas}</p>
                </div>
                <div>
                  <p style="margin: 5px 0;"><strong>Monto total:</strong></p>
                  <p style="margin: 5px 0;"><strong>Primera entrega:</strong></p>
                  <p style="margin: 5px 0;"><strong>Última entrega:</strong></p>
                </div>
                <div>
                  <p style="margin: 5px 0; font-weight: bold; color: #28a745;">
                    S/ ${montoTotal.toFixed(2)}
                  </p>
                  <p style="margin: 5px 0;">${primeraEntrega}</p>
                  <p style="margin: 5px 0;">${ultimaEntrega}</p>
                </div>
              </div>
            </div>
          `;
        }
        
        html += `</div>`;
        
        // CORRECCIÓN: Solo un título en el modal
        this.mostrarModalPersonalizado(html, '').then((modal) => {
          this.configurarFiltrosModal(modal, historial);
        });
      } else {
        alert('❌ No se pudo obtener el historial.');
      }
    },
    error: (error) => {
      console.error('Error:', error);
      alert('❌ Error: ' + error.message);
    }
  });
}

  get Math() {
    return Math;
  }

/**
 * Método simplificado para entregar solo dinero de hoy
 */
// src/app/features/pages/repartidor/historial-entregas/historial-entregas.component.ts

public registrarEntregaDineroHoy() {
  const totalHoy = this.getTotalIngresos();
  
  if (totalHoy <= 0) {
    this.dialog.open(ConfirmacionModalComponent, {
      width: 'min(400px, 90vw)',
      data: {
        titulo: 'ℹ️ Información',
        mensaje: 'No tienes dinero pendiente de entrega del día de hoy.',
        tipo: 'regularizacion',
        confirmText: 'Entendido'
      }
    });
    return;
  }

  this.verificarEntregaReciente().then((tieneEntregaReciente) => {
    if (tieneEntregaReciente) {
      this.dialog.open(ConfirmacionModalComponent, {
        width: 'min(450px, 90vw)',
        data: {
          titulo: '⚠️ Atención',
          mensaje: 'Ya tienes una entrega registrada recientemente. Espera unos minutos antes de registrar otra.',
          tipo: 'warning',
          confirmText: 'Entendido'
        }
      });
      return;
    }

    // Abrir modal para seleccionar método de pago
    const dialogRef = this.dialog.open(EntregarDineroModalComponent, {
      width: 'min(600px, 95vw)',
      maxWidth: '95vw',
      maxHeight: '85vh',
      panelClass: 'responsive-dialog',
      data: {
        total: totalHoy,
        fecha: new Date().toLocaleDateString('es-PE'),
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmado) {
        this.procesarEntregaDinero(totalHoy, result.metodoId, result.metodoNombre);
      }
    });
  });
}

/**
 * Procesar la entrega de dinero con el método seleccionado
 */

// Reemplaza el método procesarEntregaDinero completo
// src/app/features/pages/repartidor/historial-entregas/historial-entregas.component.ts

// Modifica el método procesarEntregaDinero
private procesarEntregaDinero(total: number, metodoId: number, metodoNombre: string): void {
  this.loading = true;
  
  let metodoBackend = 'efectivo';
  switch (metodoId) {
    case 1: metodoBackend = 'efectivo'; break;
    case 2: metodoBackend = 'yape'; break;
    case 3: metodoBackend = 'transferencia'; break;
    case 4: metodoBackend = 'tarjeta'; break;
    default: metodoBackend = 'efectivo';
  }

  this.entregaDineroService.registrarEntrega(total, metodoBackend).subscribe({
    next: (response) => {
      console.log('✅ Entrega de HOY registrada:', response);
      
      // ✅ MODAL CON DIMENSIONES RESPONSIVAS
      this.dialog.open(ConfirmacionModalComponent, {
        width: 'min(500px, 90vw)',
        maxWidth: '95vw',
        maxHeight: '85vh',
        panelClass: 'responsive-dialog',
        data: {
          titulo: '✅ Entrega Registrada',
          mensaje: 'El dinero ha sido registrado exitosamente en el sistema.',
          tipo: 'entrega',
          fecha: new Date().toLocaleDateString('es-PE'),
          monto: total,
          metodo: metodoBackend,
          total: `Total entregado: S/ ${total.toFixed(2)}`,
          detalles: [
            { label: 'Monto entregado', valor: `S/ ${total.toFixed(2)}`, icono: 'attach_money' },
            { label: 'Método de pago', valor: metodoNombre, icono: 'payment' },
            { label: 'Fecha', valor: new Date().toLocaleDateString('es-PE'), icono: 'event' },
            { label: 'Hora', valor: new Date().toLocaleTimeString('es-PE'), icono: 'schedule' }
          ],
          confirmText: 'Aceptar',
          cancelText: 'Cerrar'
        }
      }).afterClosed().subscribe(() => {
        this.recargarDatosCompletamente();
        this.loading = false;
      });
    },
    error: (error) => {
      console.error('Error registrando entrega de hoy:', error);
      
      this.dialog.open(ConfirmacionModalComponent, {
        width: 'min(450px, 90vw)',
        maxWidth: '95vw',
        data: {
          titulo: '❌ Error',
          mensaje: error.error?.error || 'No se pudo registrar la entrega',
          tipo: 'warning',
          confirmText: 'Entendido'
        }
      });
      this.loading = false;
    }
  });
}
/**
 * Configurar el nombre y logo de la empresa para los mensajes de WhatsApp
 */
public configurarNombreEmpresa() {
  const nombreEmpresaActual = localStorage.getItem('empresa_nombre') || 'Distribuidora de Agua';
  const logoEmpresaActual = localStorage.getItem('empresa_logo') || '🚰';
  
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px;">
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #495057;">
          <i class="fas fa-info-circle"></i> Personaliza los datos de tu empresa:
        </p>
        <p style="margin: 0; font-size: 0.9em; color: #666;">
          Esta información aparecerá en todas las notificaciones enviadas por WhatsApp.
          <strong>Solo se pueden usar emojis como logo</strong> (WhatsApp no muestra imágenes).
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <!-- Logo de la empresa (SOLO EMOJI) -->
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
            <i class="fas fa-smile"></i> Logo (emoji):
          </label>
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Vista previa del logo -->
            <div id="logo-preview-container" style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 10px;">
              <div id="logo-preview" style="width: 80px; height: 80px; border: 2px dashed #ced4da; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
                <span id="logo-emoji-preview" style="font-size: 40px;">${logoEmpresaActual}</span>
              </div>
              <div id="logo-text" style="font-size: 0.85em; color: #6c757d; text-align: center;">
                Emoji actual: ${logoEmpresaActual}
              </div>
            </div>
            
            <!-- Campo para ingresar emoji -->
            <div>
              <input type="text" id="logo-emoji" 
                     value="${logoEmpresaActual}"
                     placeholder="Escribe un emoji (ej: 🚰, 💧, 🏪)"
                     style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; font-size: 16px; text-align: center;">
              <p style="margin: 5px 0 0 0; font-size: 0.75em; color: #6c757d;">
                <i class="fas fa-lightbulb"></i> Puedes usar cualquier emoji: 🚰 (agua), 💧 (gota), 🏪 (tienda), 🏭 (fábrica), 🍽️ (restaurante)
              </p>
            </div>
          </div>
        </div>
        
        <!-- Nombre de la empresa -->
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #495057;">
            <i class="fas fa-signature"></i> Nombre de la empresa:
          </label>
          <input type="text" id="nombre-empresa" 
                 value="${nombreEmpresaActual}"
                 placeholder="Ej: Agua Viña S.A.C."
                 style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 5px; font-size: 16px;">
        </div>
        
        <!-- Ejemplos de emojis (SIN TEXTO) -->
        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #007bff;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #004085; font-size: 0.9em;">
            <i class="fas fa-lightbulb"></i> Emojis sugeridos (haz clic para usarlos):
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="🚰"
                  title="Agua"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              🚰
            </span>
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="💧"
                  title="Gota de agua"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              💧
            </span>
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="🏪"
                  title="Tienda"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              🏪
            </span>
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="🏭"
                  title="Fábrica"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              🏭
            </span>
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="🍽️"
                  title="Restaurante"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              🍽️
            </span>
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="🏬"
                  title="Supermercado"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              🏬
            </span>
            <span style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #ced4da; transition: all 0.3s ease; font-size: 30px;" 
                  class="ejemplo-emoji" 
                  data-emoji="🏨"
                  title="Hotel"
                  onmouseover="this.style.borderColor='#007bff'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.borderColor='#ced4da'; this.style.transform='scale(1)'">
              🏨
            </span>
          </div>
        </div>
      </div>
      
      <!-- Vista previa del mensaje completo (se actualiza automáticamente) -->
      <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #007bff;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #007bff;">
          <i class="fas fa-eye"></i> Vista previa del mensaje:
        </p>
        <div id="vista-previa-empresa" style="background: white; padding: 15px; border-radius: 8px; font-size: 0.9em; color: #2c3e50; line-height: 1.5; white-space: pre-wrap; font-family: monospace; border: 1px solid #dee2e6;">
          *${logoEmpresaActual} ${nombreEmpresaActual} - NOTIFICACIÓN*

*👤 REPARTIDOR:* Ejemplo
*💰 MONTO PENDIENTE:* S/ 0.00
*📅 FECHA:* ${new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <p style="margin: 5px 0 0 0; font-size: 0.8em; color: #6c757d; text-align: center;">
          <i class="fas fa-sync-alt"></i> La vista previa se actualiza automáticamente mientras escribes
        </p>
      </div>
      
      <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404; font-size: 0.9em;">
          <i class="fas fa-info-circle"></i> 
          <strong>Nota:</strong> El texto que escribas en "Nombre de la empresa" aparecerá después del emoji seleccionado.
        </p>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="btnGuardarEmpresa" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fas fa-save"></i> Guardar
        </button>
        <button id="btnCancelarEmpresa" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>
  `;
  
  this.mostrarModalPersonalizado(html, '🏢 Configurar Empresa').then((modal) => {
    const btnGuardar = modal.querySelector('#btnGuardarEmpresa');
    const btnCancelar = modal.querySelector('#btnCancelarEmpresa');
    const inputNombre = modal.querySelector('#nombre-empresa') as HTMLInputElement;
    const inputEmoji = modal.querySelector('#logo-emoji') as HTMLInputElement;
    const logoPreview = modal.querySelector('#logo-emoji-preview') as HTMLSpanElement;
    const logoText = modal.querySelector('#logo-text') as HTMLDivElement;
    const vistaPreviaDiv = modal.querySelector('#vista-previa-empresa') as HTMLDivElement;
    const ejemplosEmoji = modal.querySelectorAll('.ejemplo-emoji');
    
    let logoActual = logoEmpresaActual;
    
    // Función para actualizar vista previa
    const actualizarVistaPrevia = () => {
      const nombre = inputNombre.value.trim() || 'Distribuidora de Agua';
      const emoji = inputEmoji.value.trim() || '🚰';
      const hoy = new Date();
      const fechaFormateada = hoy.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Actualizar previsualización del emoji
      if (logoPreview) {
        logoPreview.textContent = emoji;
      }
      if (logoText) {
        logoText.textContent = `Emoji actual: ${emoji}`;
      }
      
      // Actualizar vista previa del mensaje completo
      const vistaPrevia = `*${emoji} ${nombre} - NOTIFICACIÓN*\n\n` +
                         `*👤 REPARTIDOR:* Ejemplo\n` +
                         `*💰 MONTO PENDIENTE:* S/ 0.00\n` +
                         `*📅 FECHA:* ${fechaFormateada}`;
      
      vistaPreviaDiv.textContent = vistaPrevia;
    };
    
    // Eventos para ejemplos de emojis (solo actualizan el emoji, no el nombre)
    ejemplosEmoji.forEach(ejemplo => {
      ejemplo.addEventListener('click', () => {
        const emoji = ejemplo.getAttribute('data-emoji');
        if (emoji) {
          inputEmoji.value = emoji;
          actualizarVistaPrevia();
        }
      });
    });
    
    // Actualizar vista previa cuando cambian los inputs (en tiempo real)
    inputNombre.addEventListener('input', actualizarVistaPrevia);
    inputEmoji.addEventListener('input', actualizarVistaPrevia);
    
    // Inicializar vista previa
    actualizarVistaPrevia();
    
    if (btnGuardar) {
      btnGuardar.addEventListener('click', () => {
        const nuevoNombre = inputNombre.value.trim();
        const nuevoLogo = inputEmoji.value.trim() || '🚰';
        
        if (nuevoNombre) {
          // Guardar configuración
          localStorage.setItem('empresa_logo', nuevoLogo);
          localStorage.setItem('empresa_nombre', nuevoNombre);
          
          // Mostrar confirmación
          const confirmacionHtml = `
            <div style="text-align: center; padding: 20px;">
              <div style="color: #28a745; font-size: 48px; margin-bottom: 15px;">
                <i class="fas fa-check-circle"></i>
              </div>
              <h3 style="color: #28a745; margin-bottom: 10px;">✅ Empresa Configurada</h3>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="width: 50px; height: 50px; border: 1px solid #dee2e6; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: white; font-size: 30px;">
                    ${nuevoLogo}
                  </div>
                  <div>
                    <p style="margin: 0; font-weight: 600; font-size: 1.1em;">${nuevoNombre}</p>
                    <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 0.9em;">
                      Logo: ${nuevoLogo}
                    </p>
                  </div>
                </div>
              </div>
              
              <div style="background: #d4edda; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #155724; font-size: 0.9em;">
                  <i class="fas fa-info-circle"></i> 
                  Ahora el nombre y logo de tu empresa aparecerán en todos los mensajes de WhatsApp.
                </p>
              </div>
              
              <button id="btnCerrarEmpresa" style="padding: 10px 25px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-check"></i> Entendido
              </button>
            </div>
          `;
          
          document.body.removeChild(modal);
          this.mostrarModalPersonalizado(confirmacionHtml, '✅ Empresa Configurada').then((confirmModal) => {
            const btnCerrar = confirmModal.querySelector('#btnCerrarEmpresa');
            if (btnCerrar) {
              btnCerrar.addEventListener('click', () => {
                document.body.removeChild(confirmModal);
              });
            }
          });
          
        } else {
          alert('⚠️ El nombre de la empresa es requerido.');
          inputNombre.focus();
        }
      });
    }
    
    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  });
}


/**
 * Obtener el nombre y logo de la empresa configurado
 */
private obtenerNombreEmpresa(): { 
  logo: string, 
  nombre: string 
} {
  const logo = localStorage.getItem('empresa_logo') || '🚰';
  const nombre = localStorage.getItem('empresa_nombre') || 'Distribuidora de Agua';
  
  // Importante: NO devolver la imagen Base64, solo el emoji/texto
  // WhatsApp no puede mostrar imágenes en el texto del mensaje
  
  return { 
    logo: logo,  // Solo el emoji o texto (ej: "🚰")
    nombre: nombre
  };
}
// Agrega este método al componente:

private verificarConfiguracionEmpresa() {
  // Verificar si la empresa está configurada
  const empresaConfigurada = localStorage.getItem('empresa_nombre');
  
  if (!empresaConfigurada) {
    // Esperar un poco para que cargue la interfaz
    setTimeout(() => {
      const configurar = confirm(
        '🏢 Configurar Tu Empresa\n\n' +
        '¡Bienvenido al sistema de entregas!\n\n' +
        'Para personalizar los mensajes que se enviarán por WhatsApp, ' +
        'debes configurar el nombre y logo de tu empresa.\n\n' +
        '¿Deseas configurarlo ahora?\n\n' +
        'Podrás:\n' +
        '• Subir tu logo desde el dispositivo\n' + 
        '• Usar emojis como logo\n' +
        '• Personalizar el nombre de tu empresa'
      );
      
      if (configurar) {
        this.configurarNombreEmpresa();
      }
    }, 3000);
  }
}
// En historial-entregas.component.ts - AGREGAR NUEVO MÉTODO

private configurarFiltrosModal(modal: HTMLElement, historialCompleto: any[]) {
  const fechaInicioInput = modal.querySelector('#fecha-inicio') as HTMLInputElement;
  const fechaFinInput = modal.querySelector('#fecha-fin') as HTMLInputElement;
  const btnFiltrar = modal.querySelector('#btn-filtrar');
  const btnLimpiarFiltro = modal.querySelector('#btn-limpiar-filtro');
  const filtrosRapidos = modal.querySelectorAll('.filtro-rapido');
  const tablaBody = modal.querySelector('#tabla-historial') as HTMLElement;
  const btnExportarCsv = modal.querySelector('#btn-exportar-csv');
  const btnExportarPdf = modal.querySelector('#btn-exportar-pdf');

  // Datos originales para restaurar
  let datosOriginales = [...historialCompleto];
  let datosFiltrados = [...historialCompleto];

  // Establecer fechas por defecto (últimos 30 días)
  const fechaFin = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - 30);
  
  fechaInicioInput.value = fechaInicio.toISOString().split('T')[0];
  fechaFinInput.value = fechaFin.toISOString().split('T')[0];

  // Función para formatear fecha para comparación
  const formatearFechaComparacion = (fechaString: string) => {
    if (!fechaString) return '';
    return fechaString.split(' ')[0]; // Solo la parte de la fecha
  };

  // Función para aplicar filtro
  const aplicarFiltro = () => {
    const fechaInicioVal = fechaInicioInput.value;
    const fechaFinVal = fechaFinInput.value;

    if (!fechaInicioVal || !fechaFinVal) {
      datosFiltrados = [...datosOriginales];
    } else {
      datosFiltrados = datosOriginales.filter(entrega => {
        const fechaEntrega = formatearFechaComparacion(entrega.fecha || '');
        if (!fechaEntrega) return false;
        
        return fechaEntrega >= fechaInicioVal && fechaEntrega <= fechaFinVal;
      });
    }

    actualizarTabla();
  };

  // Función para actualizar la tabla
  const actualizarTabla = () => {
    if (!tablaBody) return;

    // Limpiar tabla
    tablaBody.innerHTML = '';

    // Llenar tabla con datos filtrados
    datosFiltrados.forEach((entrega: any, index: number) => {
      const fecha = entrega.fecha || 'Sin fecha';
      const hora = entrega.hora || '';
      const total = Number(entrega.total) || 0;
      const metodo = entrega.metodo_entrega || 'efectivo';
      let fechaHoraMostrar = fecha;
      
      if (hora) {
        fechaHoraMostrar = `${fecha} ${hora}`;
      }
      
      // Determinar tipo (mantener misma lógica)
      const esRegularizada = hora === '00:00:00' || fechaHoraMostrar.includes('00:00:00');
      const notas = entrega.notas || '';
      
      let tipo = '✅ En tiempo real';
      let tipoColor = '#155724';
      let tipoBg = '#d4edda';
      let origen = 'Solo ventas de hoy';
      
      if (esRegularizada) {
        tipo = '🔄 Regularizada';
        tipoColor = '#856404';
        tipoBg = '#fff3cd';
        origen = 'Ventas de fecha específica';
      } else if (notas.includes('ENTREGA MIXTA') || notas.includes('mixta')) {
        tipo = '⚠️ Mixta';
        tipoColor = '#0c5460';
        tipoBg = '#d1ecf1';
        
        if (notas.includes('HOY') && notas.includes('DÍAS ANTERIORES')) {
          origen = 'Hoy + días anteriores';
        } else if (notas.includes('SOLO DÍAS ANTERIORES')) {
          origen = 'Solo días anteriores';
        } else {
          origen = 'Hoy + días anteriores';
        }
      } else if (notas.includes('COMPLETA') || notas.includes('COMPLETA DE DÍAS ANTERIORES')) {
        tipo = '📅 Completa';
        tipoColor = '#721c24';
        tipoBg = '#f8d7da';
        origen = 'Solo días anteriores';
      } else if (notas.includes('HOY')) {
        tipo = '✅ Hoy';
        tipoColor = '#155724';
        tipoBg = '#d4edda';
        origen = 'Solo ventas de hoy';
      }
      
      const fila = document.createElement('tr');
      fila.style.borderBottom = '1px solid #eee';
      fila.innerHTML = `
        <td style="padding: 10px; font-weight: 500;">${index + 1}</td>
        <td style="padding: 10px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <i class="fas fa-calendar" style="color: #666;"></i>
            ${fechaHoraMostrar}
          </div>
        </td>
        <td style="padding: 10px; font-weight: bold; color: #28a745;">
          S/ ${total.toFixed(2)}
        </td>
        <td style="padding: 10px;">
          <span style="padding: 4px 8px; border-radius: 4px; background: #f0f0f0; font-size: 12px;">
            ${this.formatearMetodoEntrega(metodo)}
          </span>
        </td>
        <td style="padding: 10px;">
          <span style="padding: 4px 8px; border-radius: 4px; 
                    background: ${tipoBg}; 
                    color: ${tipoColor};
            font-size: 12px;">
            ${tipo}
          </span>
        </td>
        <td style="padding: 10px; font-size: 12px; color: #666;">
          ${origen}
        </td>
      `;
      
      tablaBody.appendChild(fila);
    });

    // Actualizar contador
    const contador = modal.querySelector('p[style*="font-size: 14px"]');
    if (contador) {
      contador.innerHTML = `<i class="fas fa-info-circle"></i> Mostrando ${datosFiltrados.length} de ${datosOriginales.length} entregas`;
    }
  };

  // Event listeners
  if (btnFiltrar) {
    btnFiltrar.addEventListener('click', aplicarFiltro);
  }

  if (btnLimpiarFiltro) {
    btnLimpiarFiltro.addEventListener('click', () => {
      fechaInicioInput.value = '';
      fechaFinInput.value = '';
      datosFiltrados = [...datosOriginales];
      actualizarTabla();
    });
  }

  // Filtros rápidos
  filtrosRapidos.forEach(filtro => {
    filtro.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const dias = target.getAttribute('data-dias');
      const mes = target.getAttribute('data-mes');
      const tipo = target.getAttribute('data-tipo');
      
      const hoy = new Date();
      
      if (dias) {
        const fechaInicio = new Date();
        fechaInicio.setDate(hoy.getDate() - parseInt(dias));
        fechaInicioInput.value = fechaInicio.toISOString().split('T')[0];
        fechaFinInput.value = hoy.toISOString().split('T')[0];
      } else if (mes === 'actual') {
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        fechaInicioInput.value = primerDiaMes.toISOString().split('T')[0];
        fechaFinInput.value = ultimoDiaMes.toISOString().split('T')[0];
      } else if (tipo === 'hoy') {
        fechaInicioInput.value = hoy.toISOString().split('T')[0];
        fechaFinInput.value = hoy.toISOString().split('T')[0];
      }
      
      aplicarFiltro();
    });
  });

  // Funcionalidad de exportación (ejemplo básico)
  if (btnExportarCsv) {
    btnExportarCsv.addEventListener('click', () => {
      this.exportarHistorialCSV(datosFiltrados);
    });
  }

  if (btnExportarPdf) {
    btnExportarPdf.addEventListener('click', () => {
      this.exportarHistorialPDF(datosFiltrados);
    });
  }

  // Aplicar filtro inicial
  aplicarFiltro();
}

// Métodos de exportación (agregar al componente)
private exportarHistorialCSV(historial: any[]) {
  // Encabezados específicos para HISTORIAL DE ENTREGAS
  const headers = [
    '#', 
    'Fecha y Hora', 
    'Monto (S/)', 
    'Método', 
    'Tipo', 
    'Origen',
    'Notas Adicionales'
  ];
  
  // Crear filas de datos con formato optimizado para Excel
  const rows = historial.map((entrega, index) => {
    // Extraer datos de la entrega del historial
    const fecha = entrega.fecha || '';
    const hora = entrega.hora || '';
    const total = Number(entrega.total || 0);
    const metodo = entrega.metodo_entrega || 'efectivo';
    const notas = entrega.notas || '';
    
    // Determinar tipo basado en hora y notas
    const esRegularizada = hora === '00:00:00';
    let tipo = 'En tiempo real';
    let origen = 'Solo ventas de hoy';
    
    if (esRegularizada) {
      tipo = 'Regularizada';
      origen = 'Ventas de fecha específica';
    }
    
    // Si hay notas adicionales, analizarlas para determinar tipo y origen
    if (notas.includes('ENTREGA MIXTA')) {
      tipo = 'Mixta';
      if (notas.includes('HOY') && notas.includes('DÍAS ANTERIORES')) {
        origen = 'Hoy + días anteriores';
      } else if (notas.includes('SOLO DÍAS ANTERIORES')) {
        origen = 'Solo días anteriores';
      }
    } else if (notas.includes('COMPLETA')) {
      tipo = 'Completa';
      origen = 'Solo días anteriores';
    }
    
    // Formatear fecha y hora
    let fechaHora = fecha;
    if (hora && hora !== '00:00:00') {
      fechaHora = `${fecha} ${hora}`;
    }
    
    // Convertir fecha al formato DD/MM/YYYY si está en YYYY-MM-DD
    let fechaFormateada = fechaHora;
    if (fecha.includes('-')) {
      fechaFormateada = this.formatearFechaParaExcel(fechaHora);
    }
    
    return [
      index + 1, // #
      fechaFormateada, // Fecha y Hora formateada
      `"${total.toFixed(2)}"`, // Monto (entre comillas para Excel)
      this.formatearMetodoEntrega(metodo), // Método de Pago
      tipo, // Tipo (Regularizada, En tiempo real, Mixta, Completa)
      origen, // Origen
      this.escapeCsv(notas) // Notas Adicionales
    ];
  });
  
  // Crear contenido CSV con punto y coma (;) para Excel
  const csvContent = [
    '\uFEFF', // BOM para UTF-8
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');
  
  // Crear y descargar archivo
  const blob = new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_entregas_${this.getFechaActual()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Método auxiliar para reemplazar emojis por texto
private reemplazarEmojisPorTexto(texto: string): string {
  const reemplazos: {[key: string]: string} = {
    '💵': 'Efectivo',
    '🏦': 'Transferencia',
    '📱': 'Yape',
    '🚰': 'Agua',
    '💧': 'Agua',
    '✅': 'Completado',
    '🔄': 'Regularizada',
    '👤': 'Repartidor',
    '💰': 'Monto',
    '📅': 'Fecha',
    '📋': 'Detalle',
    '⌛': 'Urgencia',
    '🏢': 'Empresa'
  };

  return texto.replace(/[\u{1F300}-\u{1F9FF}]/gu, emoji => 
    reemplazos[emoji] || emoji
  );
}

// Modifica el método exportarHistorialPDF:
private exportarHistorialPDF(historial: any[]) {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 139);
    doc.text('Historial de Entregas de Dinero', 105, 20, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generado el: ${new Date().toLocaleDateString('es-PE')}`, 
      105, 
      28, 
      { align: 'center' }
    );
    
    // Datos para la tabla
    const tableData = historial.map((entrega, index) => [
      (index + 1).toString(),
      entrega.fecha + (entrega.hora ? ' ' + entrega.hora : ''),
      `S/ ${Number(entrega.total || 0).toFixed(2)}`,
      this.formatearMetodoEntrega(entrega.metodo_entrega || 'efectivo'),
      this.obtenerTipoEntrega(entrega),
      this.obtenerOrigenEntrega(entrega)
    ]);
    
    // Encabezados
    const headers = [
      ['#', 'Fecha y Hora', 'Monto', 'Método', 'Tipo', 'Origen']
    ];
    
    // Usar autoTable directamente
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 40 }
      },
      margin: { left: 10, right: 10 }
    });
    
    // Obtener la posición Y final de la tabla
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    
    // Estadísticas
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const totalEntregas = historial.length;
    const montoTotal = historial.reduce((sum, e) => sum + Number(e.total || 0), 0);
    const entregasHoy = historial.filter(e => 
      !e.hora || e.hora !== '00:00:00'
    ).length;
    const entregasRegularizadas = historial.filter(e => 
      e.hora && e.hora === '00:00:00'
    ).length;
    
    doc.text(`Total de entregas: ${totalEntregas}`, 10, finalY + 10);
    doc.text(`Entregas en tiempo real: ${entregasHoy}`, 10, finalY + 16);
    doc.text(`Entregas regularizadas: ${entregasRegularizadas}`, 10, finalY + 22);
    doc.text(`Monto total: S/ ${montoTotal.toFixed(2)}`, 10, finalY + 28);
    
    // Guardar PDF
    doc.save(`historial_entregas_${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
  }
}

private obtenerTipoEntrega(entrega: any): string {
  const hora = entrega.hora || '';
  const notas = entrega.notas || '';
  
  if (hora === '00:00:00' || entrega.fecha?.includes('00:00:00')) {
    return 'Regularizada';
  } else if (notas.includes('ENTREGA MIXTA')) {
    return 'Mixta';
  } else if (notas.includes('COMPLETA')) {
    return 'Completa';
  } else if (notas.includes('HOY')) {
    return 'Hoy';
  }
  return 'En tiempo real';
}

private obtenerOrigenEntrega(entrega: any): string {
  const notas = entrega.notas || '';
  
  if (notas.includes('VENTAS DE FECHA ESPECÍFICA')) {
    return 'Ventas de fecha específica';
  } else if (notas.includes('SOLO VENTAS DE HOY')) {
    return 'Solo ventas de hoy';
  } else if (notas.includes('HOY + DÍAS ANTERIORES')) {
    return 'Hoy + días anteriores';
  } else if (notas.includes('SOLO DÍAS ANTERIORES')) {
    return 'Solo días anteriores';
  }
  return 'Solo ventas de hoy';
}
// Método para formatear fecha para Excel (DD/MM/YYYY)
private formatearFechaParaExcel(fecha: string): string {
  if (!fecha) return '';
  
  try {
    // Si ya está en formato DD/MM/YYYY, déjalo así
    if (fecha.includes('/')) {
      const parts = fecha.split('/');
      if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
    
    // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
    const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, anio, mes, dia] = match;
      return `${dia}/${mes}/${anio}`;
    }
    
    return fecha;
  } catch (error) {
    console.error('Error formateando fecha para Excel:', error);
    return fecha;
  }
}

// Método para escapar texto CSV (igual que en panel de ventas)
private escapeCsv(text: string): string {
  if (!text) return '';
  const escaped = text.replace(/"/g, '""');
  if (escaped.search(/[;,;"\n]/) >= 0) {
    return `"${escaped}"`;
  }
  return escaped;
}

// Método para obtener fecha actual en formato YYYYMMDD_HHMMSS
private getFechaActual(): string {
  const now = new Date();
  const dia = now.getDate().toString().padStart(2, '0');
  const mes = (now.getMonth() + 1).toString().padStart(2, '0');
  const anio = now.getFullYear();
  const hora = now.getHours().toString().padStart(2, '0');
  const minuto = now.getMinutes().toString().padStart(2, '0');
  const segundo = now.getSeconds().toString().padStart(2, '0');
  return `${anio}${mes}${dia}_${hora}${minuto}${segundo}`;
}
// Método para obtener inicio de página
getInicioPagina(): number {
  return (this.paginaActual - 1) * this.itemsPorPagina + 1;
}

// Método para obtener fin de página
getFinPagina(): number {
  const fin = this.paginaActual * this.itemsPorPagina;
  return Math.min(fin, this.historialFiltrado.length);
}

// MODIFICA cambiarPagina
cambiarPagina() {
  this.actualizarPaginacion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  this.guardarEstadoAntesDeNavegar();
}

// MODIFICA cambiarItemsPorPagina
cambiarItemsPorPagina() {
  this.paginaActual = 1;
  this.actualizarPaginacion();
  this.guardarEstadoAntesDeNavegar();
}
// AÑADE este método para restaurar después de volver
cargarHistorial() {
  this.restaurarEstadoGuardado();
  this.cargarDatos();
}

// Método para obtener array de páginas para el dropdown
getArrayPaginas(): number[] {
  const paginas = [];
  for (let i = 1; i <= this.totalPaginas; i++) {
    paginas.push(i);
  }
  return paginas;
}

// En la sección de métodos de cálculo, agrega esto:

/**
 * Obtiene las entregas canceladas SOLO del día de hoy
 */
getTotalCanceladasHoy(): number {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    return this.historial.filter(e => {
      if (!e.fecha_creacion) return false;
      const fechaVenta = new Date(e.fecha_creacion).toISOString().split('T')[0];
      return e.estado === 'Cancelado' && fechaVenta === hoy;
    }).length;
  } catch (error) {
    console.error('Error calculando canceladas de hoy:', error);
    return 0;
  }
}

/**
 * Obtiene las entregas canceladas de días anteriores (acumulado)
 */
getTotalCanceladasAnteriores(): number {
  return this.getTotalCanceladas() - this.getTotalCanceladasHoy();
}

// src/app/features/pages/repartidor/historial-entregas/historial-entregas.component.ts

public enviarReporteDiario() {
  const totalHoy = this.getTotalIngresos();
  const entregasHoy = this.getCantidadVentasHoy();
  const canceladasHoy = this.getTotalCanceladasHoy();
  
  console.log('📊 Debug - Canceladas hoy:', canceladasHoy);
  
  if (totalHoy <= 0 && entregasHoy === 0) {
    // ✅ REEMPLAZAR alert() CON MODAL
    this.dialog.open(ConfirmacionModalComponent, {
      width: '400px',
      data: {
        titulo: 'ℹ️ Información',
        mensaje: 'No tienes entregas hoy para reportar.',
        tipo: 'regularizacion',
        confirmText: 'Entendido'
      }
    });
    return;
  }

  // Obtener número del administrador
  const NUMERO_ADMINISTRADOR = localStorage.getItem('admin_whatsapp') || '51987654321';
  
  // Verificar si el número está configurado
  if (NUMERO_ADMINISTRADOR === '51987654321') {
    const configurar = confirm(
      '⚠️ El número del administrador no está configurado.\n\n' +
      'Número predeterminado: +51987654321\n\n' +
      '¿Deseas configurar el número correcto ahora?'
    );
    
    if (configurar) {
      this.configurarContactoAdministrador();
      return;
    }
  }

  // Obtener información del repartidor
  let nombreRepartidor = 'Repartidor';
  const usuario = this.authService.getCurrentUser();
  if (usuario) {
    nombreRepartidor = usuario.nombre || 'Repartidor';
  }

  // Obtener información de la empresa
  const empresa = this.obtenerNombreEmpresa();
  const empresaLogo = empresa.logo;
  const empresaNombre = empresa.nombre;

  const hoy = new Date();
  const fechaFormateada = hoy.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Crear mensaje profesional para el reporte diario
  const mensaje = `*${empresaLogo} ${empresaNombre} - REPORTE DIARIO*\n\n` +
                  `*👤 REPARTIDOR:* ${nombreRepartidor}\n` +
                  `*📅 FECHA:* ${fechaFormateada}\n` +
                  `*🕒 HORA:* ${hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n\n` +
                  `*📊 RENDIMIENTO DEL DÍA:*\n` +
                  `✅ Entregas completadas: ${entregasHoy}\n` +
                  `💰 Dinero recaudado: S/ ${totalHoy.toFixed(2)}\n` +
                  (canceladasHoy > 0 ? `❌ Entregas canceladas hoy: ${canceladasHoy}\n` : '') +
                  `*📱 Estado:* ${this.getTotalIngresos() > 0 ? '⚠️ Con dinero pendiente de entrega' : '✅ Todo entregado'}\n\n` +
                  `*💬 COMENTARIO:*\n` +
                  `Reporte de rendimiento diario enviado automáticamente desde el sistema de entregas.\n\n` +
                  `*🏢 Empresa:* ${empresaNombre}`;

  console.log('📤 Mensaje WhatsApp generado:', mensaje);
  
  this.diagnosticarProblemaEmojis(mensaje);

  // Abrir WhatsApp
  this.abrirWhatsAppConMensaje(NUMERO_ADMINISTRADOR, mensaje);
  
  // ✅ REEMPLAZAR alert() CON MODAL
  setTimeout(() => {
    this.dialog.open(ConfirmacionModalComponent, {
      width: '500px',
      data: {
        titulo: '📱 Reporte Enviado',
        mensaje: 'El administrador ha sido notificado sobre tu rendimiento del día.',
        tipo: 'entrega',
        detalles: [
          { label: 'Entregas completadas', valor: entregasHoy.toString(), icono: 'check_circle' },
          { label: 'Dinero recaudado', valor: `S/ ${totalHoy.toFixed(2)}`, icono: 'attach_money' },
          { label: 'Fecha', valor: fechaFormateada, icono: 'event' }
        ],
        confirmText: 'Aceptar'
      }
    });
  }, 500);
}
private diagnosticarProblemaEmojis(mensaje: string): void {
    console.log('🔍 DIAGNÓSTICO DE EMOJIS:');
    
    // Verificar cada carácter
    for (let i = 0; i < mensaje.length; i++) {
        const char = mensaje[i];
        const codePoint = mensaje.codePointAt(i);
        const charCode = mensaje.charCodeAt(i);
        
        if (codePoint && codePoint > 127) {
            console.log(`Posición ${i}:`, {
                caracter: char,
                codePoint: codePoint?.toString(16),
                charCode: charCode.toString(16),
                esEmoji: codePoint > 0xFFFF
            });
        }
    }
    
    // Verificar la codificación
    const codificado = encodeURIComponent(mensaje);
    console.log('Original:', mensaje);
    console.log('Codificado:', codificado);
    console.log('Decodificado:', decodeURIComponent(codificado));
}

// ========== MÉTODO MEJORADO PARA WHATSAPP CON SOPORTE DE EMOJIS ==========

/**
 * Abre WhatsApp Web con un mensaje predefinido, manejando correctamente los emojis.
 * @param numeroTelefono - Número de teléfono en formato internacional (ej. 51939702033)
 * @param mensaje - El mensaje de texto que incluye emojis.
 */
// ========== MÉTODO RECOMENDADO Y PROBADO ==========

// ========== MÉTODO DEFINITIVO PARA WHATSAPP ==========

// ========== MÉTODO ULTRA SIMPLE QUE SÍ FUNCIONA ==========

// ========== VERSIÓN CON INTENT (FALLBACK) ==========

// ========== VERSIÓN FINAL OPTIMIZADA ==========

// ========== VERSIÓN FINAL CON NUEVA PESTAÑA ==========

private abrirWhatsAppConMensaje(numeroTelefono: string, mensaje: string): void {
    
    const mensajeLimpio = mensaje.normalize('NFC');
    const mensajeCodificado = encodeURIComponent(mensajeLimpio);
    
    // Usar la URL que ha demostrado funcionar
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroTelefono}&text=${mensajeCodificado}`;
    
    console.log('📤 Abriendo WhatsApp en nueva pestaña:', whatsappUrl.substring(0, 150) + '...');
    
    // Abrir en NUEVA PESTAÑA para no abandonar la aplicación
    window.open(whatsappUrl, '_blank');
}
}