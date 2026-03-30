// src/app/features/pages/repartidor/entregas-pendientes/entregas-pendientes.component.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RepartidorVentaService } from '../../../../core/services/repartidor-venta.service';
import { RepartidorVenta } from '../../../../core/models/repartidor-venta.model';
import { AuthService } from '../../../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-entregas-pendientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entregas-pendientes.component.html',
  styleUrls: ['../repartidor-styles.css']
})
export class EntregasPendientesComponent implements OnInit, OnDestroy {
  private repartidorVentaService = inject(RepartidorVentaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  entregas: RepartidorVenta[] = [];
  loading = true;
  error = '';
  private timerSubscription!: Subscription;

  // ✅ AGREGAR esta propiedad para métodos de pago
  metodosPago: any[] = [
    { id_metodo_pago: 1, metodo_pago: 'Efectivo' },
    { id_metodo_pago: 2, metodo_pago: 'Yape' },
    { id_metodo_pago: 3, metodo_pago: 'Transferencia' },
    { id_metodo_pago: 4, metodo_pago: 'Tarjeta' }
  ];

  ngOnInit() {
    this.cargarEntregasPendientes();
    // Actualizar cada 30 segundos para mostrar tiempo transcurrido
    this.timerSubscription = interval(30000).subscribe(() => {
      this.actualizarTiempos();
    });
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  cargarEntregasPendientes() {
    this.loading = true;
    this.repartidorVentaService.getEntregasPendientes().subscribe({
      next: (entregas) => {
        this.entregas = entregas;
        this.loading = false;
        this.actualizarTiempos();
        this.verificarEstadosVentas();
      },
      error: (error) => {
        console.error('Error cargando entregas pendientes:', error);
        this.error = 'Error al cargar las entregas pendientes';
        this.loading = false;
      }
    });
  }

  private actualizarTiempos() {
    // Forzar actualización de la vista
    this.entregas = [...this.entregas];
  }

  // MEJORA: Método para navegar a rutas asignadas
  irARutasAsignadas() {
    this.router.navigate(['/repartidor/rutas-asignadas']);
  }

  // MEJORA: Método para verificar estado al cargar
  verificarEstadosVentas() {
    this.entregas.forEach(entrega => {
      if (entrega.id_estado_venta === 5 && !entrega.fecha_inicio_ruta) {
        console.warn(`⚠️ Venta #${entrega.id_venta} en estado "En ruta" pero sin fecha de inicio`);
        console.log('📋 Datos de la venta:', {
          id_venta: entrega.id_venta,
          estado: entrega.estado,
          id_estado_venta: entrega.id_estado_venta,
          fecha_inicio_ruta: entrega.fecha_inicio_ruta,
          ubicacion_inicio_ruta: entrega.ubicacion_inicio_ruta
        });
      } else if (entrega.id_estado_venta === 5 && entrega.fecha_inicio_ruta) {
        console.log(`✅ Venta #${entrega.id_venta} correcta: ruta iniciada el ${entrega.fecha_inicio_ruta}`);
      }
    });
  }

// Reemplaza el método marcarComoEntregado:
async marcarComoEntregado(idVenta: number) {
  const entrega = this.entregas.find(e => e.id_venta === idVenta);
  if (!entrega) return;

  // Verificación especial para Yape
  if (entrega.id_metodo_pago === 2) {
    const yapeConfirmado = await this.verificarPagoYape(idVenta);
    if (!yapeConfirmado) return;
  }

  this.repartidorVentaService.verificarPuedeMarcarPagado(idVenta).subscribe({
    next: (verificacion) => {
      if (!verificacion.puede) {
        Swal.fire({
          title: '❌ No se puede completar',
          text: verificacion.mensaje,
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      // ✅ ELIMINAR el confirm y proceder directamente
      this.repartidorVentaService.marcarComoPagado(idVenta).subscribe({
        next: () => {
          // ✅ SweetAlert2 automático para éxito
          Swal.fire({
            title: '✅ ¡Pagado!',
            text: 'Entrega marcada como pagada correctamente',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            timerProgressBar: true,
            willClose: () => {
              this.cargarEntregasPendientes();
            }
          });
        },
        error: (error) => {
          console.error('Error marcando como pagado:', error);
          Swal.fire({
            title: '❌ Error',
            text: error.error?.error || 'No se pudo completar la operación',
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
        }
      });
    },
    error: (error) => {
      console.error('Error en verificación:', error);
      Swal.fire({
        title: '❌ Error',
        text: 'Error al verificar condiciones de pago',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  });
}


// Reemplaza el método marcarComoCancelado completo por este:
marcarComoCancelado(idVenta: number) {
  const entrega = this.entregas.find(e => e.id_venta === idVenta);
  if (!entrega) return;

  const motivosPredefinidos: { [key: string]: string } = {
    'cliente_no_disponible': '👤 Cliente no disponible en la dirección',
    'direccion_incorrecta': '📍 Dirección incorrecta o inexistente',
    'producto_danado': '📦 Producto dañado durante el transporte',
    'cliente_rechazo': '❌ Cliente rechazó el pedido',
    'problema_vehiculo': '🚚 Problema con el vehículo de reparto',
    'cliente_no_pago': '💳 Cliente no puede realizar el pago',
    'zona_insegura': '⚠️ Zona insegura para la entrega',
    'horario_inconveniente': '⏰ Horario de entrega inconveniente',
    'otro': '📝 Otro motivo (especificar)'
  };

  Swal.fire({
    title: '❌ Cancelar Entrega',
    html: `
      <div style="text-align: left; margin-bottom: 1rem;">
        <p><strong>Entrega #${idVenta}</strong></p>
        <p><strong>Cliente:</strong> ${entrega.nombre_completo}</p>
        <p><strong>Total:</strong> S/ ${entrega.total}</p>
        <p><strong>Dirección:</strong> ${entrega.direccion}</p>
      </div>
      <p>Seleccione el motivo de cancelación:</p>
    `,
    input: 'select',
    inputOptions: motivosPredefinidos,
    inputPlaceholder: 'Seleccione un motivo...',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe seleccionar un motivo de cancelación';
      }
      return null;
    },
    showCancelButton: true,
    confirmButtonText: 'Continuar',
    cancelButtonText: 'Mantener entrega',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    width: '600px'
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const motivoKey = result.value;
      let motivo = motivosPredefinidos[motivoKey];
      
      // Si selecciona "otro", pedir texto personalizado
      if (motivoKey === 'otro') {
        this.solicitarMotivoPersonalizado(idVenta, entrega);
      } else {
        this.confirmarCancelacion(idVenta, entrega, motivo);
      }
    }
  });
}

private solicitarMotivoPersonalizado(idVenta: number, entrega: any) {
  Swal.fire({
    title: '✏️ Motivo de cancelación',
    html: `
      <div style="text-align: left; margin-bottom: 1rem;">
        <p><strong>Entrega #${idVenta}</strong> - ${entrega.nombre_completo}</p>
        <p>Describa detalladamente el motivo de la cancelación:</p>
      </div>
    `,
    input: 'textarea',
    inputLabel: 'Motivo personalizado',
    inputPlaceholder: 'Ingrese el motivo específico de la cancelación...',
    inputAttributes: {
      'maxlength': '500',
      'minlength': '10'
    },
    inputValidator: (value) => {
      if (!value) {
        return 'Debe ingresar un motivo para la cancelación';
      }
      if (value.length < 10) {
        return 'El motivo debe tener al menos 10 caracteres';
      }
      if (value.length > 500) {
        return 'El motivo no puede exceder los 500 caracteres';
      }
      return null;
    },
    showCancelButton: true,
    confirmButtonText: 'Continuar',
    cancelButtonText: 'Volver',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d'
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      this.confirmarCancelacion(idVenta, entrega, result.value);
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      // Si presiona "Volver", regresar a la selección de motivos
      this.marcarComoCancelado(idVenta);
    }
  });
}

private confirmarCancelacion(idVenta: number, entrega: any, motivo: string) {
  Swal.fire({
    title: '⚠️ Confirmar Cancelación',
    html: `
      <div style="text-align: left;">
        <p>¿Está seguro de cancelar la entrega?</p>
        <div style="background: #fff3cd; padding: 1rem; border-radius: 0.375rem; margin: 1rem 0;">
          <p><strong>Entrega #${idVenta}</strong></p>
          <p><strong>Cliente:</strong> ${entrega.nombre_completo}</p>
          <p><strong>Motivo:</strong> ${motivo}</p>
        </div>
        <p style="color: #dc3545; font-weight: bold;">
          ⚠️ Esta acción no se puede deshacer
        </p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar entrega',
    cancelButtonText: 'No, mantener',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    reverseButtons: true,
    focusCancel: true
  }).then((result) => {
    if (result.isConfirmed) {
      this.procesarCancelacion(idVenta, motivo);
    }
  });
}

private procesarCancelacion(idVenta: number, motivo: string) {
  // Mostrar loading
  Swal.fire({
    title: 'Procesando cancelación...',
    text: 'Por favor espere',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.repartidorVentaService.marcarComoCancelado(idVenta, motivo).subscribe({
    next: () => {
      Swal.fire({
        title: '✅ Cancelada',
        text: 'La entrega ha sido cancelada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        willClose: () => {
          this.cargarEntregasPendientes();
        }
      });
    },
    error: (error) => {
      console.error('Error cancelando entrega:', error);
      Swal.fire({
        title: '❌ Error',
        html: `
          <div style="text-align: left;">
            <p>No se pudo cancelar la entrega:</p>
            <p><strong>${error.error?.error || 'Error del sistema'}</strong></p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  });
}

 verDetalleVenta(idVenta: number) {
  // Guardar la ruta actual antes de navegar
  const currentRoute = this.router.url;
  localStorage.setItem('previous_repartidor_route', currentRoute);
  
  this.router.navigate(['/repartidor/venta', idVenta]);
}

  // Reemplaza el método abrirMapa existente con esta versión mejorada
abrirMapa(direccion: string, coordenadas?: string, clienteNombre?: string) {
  if (!direccion || direccion.trim() === '') {
    this.mostrarError('No hay dirección disponible para esta entrega');
    return;
  }

  // Si hay coordenadas, usarlas directamente (mejor opción)
  if (coordenadas) {
    const [lat, lng] = coordenadas.split(',');
    window.open(`https://www.google.com/maps/@${lat},${lng},17z`, '_blank');
    return;
  }

  // Normalizar y preparar la dirección para Google Maps
  const direccionNormalizada = this.normalizarDireccionPucallpa(direccion);
  
  // Intentar diferentes estrategias de búsqueda
  this.intentarEstrategiasMapa(direccionNormalizada, clienteNombre);
}

// Método para normalizar direcciones de Pucallpa
private normalizarDireccionPucallpa(direccion: string): string {
  let normalizada = direccion.trim();
  
  // Diccionario de normalizaciones para Pucallpa
  const normalizaciones = [
    // Abreviaciones comunes
    { regex: /\bav\.\b/gi, reemplazo: 'Avenida' },
    { regex: /\bjr\.\b/gi, reemplazo: 'Jirón' },
    { regex: /\bcll\.\b/gi, reemplazo: 'Calle' },
    { regex: /\burb\.\b/gi, reemplazo: 'Urbanización' },
    { regex: /\bpje\.\b/gi, reemplazo: 'Pasaje' },
    { regex: /\bmz\.\b/gi, reemplazo: 'Manzana' },
    { regex: /\blt\.\b/gi, reemplazo: 'Lote' },
    { regex: /\bms\s/gi, reemplazo: 'Manzana ' },
    
    // Errores comunes
    { regex: /\bmz\s/gi, reemplazo: 'Manzana ' },
    { regex: /\blt\s/gi, reemplazo: 'Lote ' },
    { regex: /\bMz\s/gi, reemplazo: 'Manzana ' },
    { regex: /\bLt\s/gi, reemplazo: 'Lote ' },
    
    // Tildes y mayúsculas
    { regex: /\bc\.\s/gi, reemplazo: 'Calle ' },
    { regex: /\blos cedros\b/gi, reemplazo: 'Los Cedros' },
    { regex: /\blos mangos\b/gi, reemplazo: 'Los Mangos' },
    { regex: /\blas flores\b/gi, reemplazo: 'Las Flores' },
    { regex: /\bmanco capac\b/gi, reemplazo: 'Manco Cápac' },
    { regex: /\btupac amaru\b/gi, reemplazo: 'Túpac Amaru' },
  ];

  // Aplicar normalizaciones
  normalizaciones.forEach(({ regex, reemplazo }) => {
    normalizada = normalizada.replace(regex, reemplazo);
  });

  // Capitalizar cada palabra
  normalizada = normalizada
    .split(' ')
    .map(palabra => {
      if (palabra.length === 0) return '';
      // Mantener números intactos
      if (/^\d+$/.test(palabra)) return palabra;
      // Capitalizar primera letra
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
    })
    .join(' ');

  // Agregar ciudad y país si no están
  if (!normalizada.toLowerCase().includes('pucallpa') && 
      !normalizada.toLowerCase().includes('25002') &&
      !normalizada.toLowerCase().includes('perú')) {
    normalizada += ', Pucallpa, Perú';
  }

  return normalizada;
}

// Método para intentar diferentes estrategias de búsqueda
private intentarEstrategiasMapa(direccion: string, clienteNombre?: string) {
  const estrategias = this.generarEstrategiasBusqueda(direccion, clienteNombre);
  
  // Preguntar al usuario qué estrategia usar
  this.mostrarSeleccionEstrategia(estrategias, direccion);
}

// Generar diferentes formas de buscar la dirección
private generarEstrategiasBusqueda(direccion: string, clienteNombre?: string): {nombre: string, url: string}[] {
  const estrategias = [];
  
  // Estrategia 1: Dirección completa normalizada
  estrategias.push({
    nombre: 'Dirección completa',
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
  });
  
  // Estrategia 2: Solo la calle principal (sin manzana/lote)
  const callePrincipal = this.extraerCallePrincipal(direccion);
  if (callePrincipal !== direccion) {
    estrategias.push({
      nombre: `Solo ${callePrincipal}`,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(callePrincipal + ', Pucallpa, Perú')}`
    });
  }
  
  // Estrategia 3: Buscar referencia conocida + calle
  const referencias = this.generarReferencias(direccion, clienteNombre);
  referencias.forEach(ref => {
    estrategias.push({
      nombre: ref.nombre,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ref.busqueda)}`
    });
  });
  
  // Estrategia 4: Plus Code (si se detecta)
  const plusCode = this.detectarPlusCode(direccion);
  if (plusCode) {
    estrategias.push({
      nombre: `Plus Code: ${plusCode}`,
      url: `https://www.google.com/maps/search/?api=1&query=${plusCode}`
    });
  }
  
  return estrategias;
}

// Extraer solo la calle principal (sin detalles específicos)
private extraerCallePrincipal(direccion: string): string {
  // Patrones para eliminar detalles específicos
  const patronesAEliminar = [
    /\s+[Mm]z\.?\s*[A-Za-z0-9]+\s*[Ll]t\.?\s*\d+/gi, // Mz A Lt 2
    /\s+[Ll]t\.?\s*\d+/gi, // Lt 5
    /\s+[Mm]anzana\s+[A-Za-z0-9]+\s+[Ll]ote\s+\d+/gi,
    /\s+manzana\s+[A-Za-z0-9]+\s+lote\s+\d+/gi,
    /\s+dpto\.?\s*\d+/gi,
    /\s+departamento\s+\d+/gi,
    /\s+oficina\s+\d+/gi,
    /\s+interior\s+\d+/gi,
    /\s+altura\s+\d+/gi,
  ];
  
  let calle = direccion;
  patronesAEliminar.forEach(patron => {
    calle = calle.replace(patron, '');
  });
  
  return calle.trim();
}

// Generar referencias de búsqueda
private generarReferencias(direccion: string, clienteNombre?: string): {nombre: string, busqueda: string}[] {
  const referencias = [];
  
  // Extraer posibles puntos de referencia
  const palabrasClave = direccion.toLowerCase().split(' ');
  
  if (palabrasClave.includes('hospital') || palabrasClave.includes('clínica')) {
    referencias.push({
      nombre: 'Hospital más cercano',
      busqueda: 'Hospital, Pucallpa'
    });
  }
  
  if (palabrasClave.includes('colegio') || palabrasClave.includes('escuela')) {
    referencias.push({
      nombre: 'Colegio en la zona',
      busqueda: 'Colegio, Pucallpa'
    });
  }
  
  if (palabrasClave.includes('mercado') || palabrasClave.includes('tienda')) {
    referencias.push({
      nombre: 'Mercado cercano',
      busqueda: 'Mercado, Pucallpa'
    });
  }
  
  if (palabrasClave.includes('parque') || palabrasClave.includes('plaza')) {
    referencias.push({
      nombre: 'Parque más cercano',
      busqueda: 'Parque, Pucallpa'
    });
  }
  
  // Si el cliente es un restaurante o negocio, buscar por nombre
  if (clienteNombre && (
      clienteNombre.toLowerCase().includes('restaurante') ||
      clienteNombre.toLowerCase().includes('bodega') ||
      clienteNombre.toLowerCase().includes('gimnasio')
  )) {
    referencias.push({
      nombre: `Buscar "${clienteNombre}"`,
      busqueda: clienteNombre + ', Pucallpa'
    });
  }
  
  return referencias;
}

// Detectar Plus Codes en la dirección
private detectarPlusCode(direccion: string): string | null {
  const plusCodeRegex = /[A-Z0-9]{4}\+[A-Z0-9]{3}/;
  const match = direccion.match(plusCodeRegex);
  return match ? match[0] : null;
}

// Mostrar selección de estrategia al usuario
private mostrarSeleccionEstrategia(estrategias: {nombre: string, url: string}[], direccionOriginal: string) {
  if (estrategias.length === 1) {
    // Solo una estrategia, abrir directamente
    window.open(estrategias[0].url, '_blank');
    return;
  }
  
  // Crear opciones para SweetAlert2
  const opciones = estrategias.reduce((acc, estrategia, index) => {
    acc[index] = estrategia.nombre;
    return acc;
  }, {} as {[key: number]: string});
  
  Swal.fire({
    title: '🔍 Seleccionar búsqueda en mapa',
    html: `
      <div style="text-align: left; margin-bottom: 15px;">
        <p><strong>Dirección:</strong> ${direccionOriginal}</p>
        <p class="text-muted" style="font-size: 0.9em;">
          Google Maps puede tener dificultades con algunas direcciones. 
          Seleccione la mejor opción:
        </p>
      </div>
    `,
    input: 'select',
    inputOptions: opciones,
    inputPlaceholder: 'Seleccione cómo buscar...',
    showCancelButton: true,
    confirmButtonText: 'Abrir en Maps',
    cancelButtonText: 'Cancelar',
   // CORREGIDO: Eliminar la comparación con 0
inputValidator: (value) => {
  if (!value) {
    return 'Debe seleccionar una opción';
  }
  return null;
},
    width: '600px'
  }).then((result) => {
    if (result.isConfirmed) {
      const index = parseInt(result.value);
      window.open(estrategias[index].url, '_blank');
      
      // Opcional: Guardar la estrategia que funcionó para futuras referencias
      this.registrarEstrategiaExitosa(estrategias[index].nombre);
    }
  });
}

// Registrar qué estrategia funcionó (para aprendizaje futuro)
private registrarEstrategiaExitosa(estrategia: string) {
  console.log(`✅ Estrategia exitosa: ${estrategia}`);
  // Aquí podrías guardar en localStorage o enviar a un servicio
  // para aprender qué estrategias funcionan mejor para cada zona
}

// Método auxiliar para mostrar errores
private mostrarError(mensaje: string) {
  Swal.fire({
    title: '❌ Error',
    text: mensaje,
    icon: 'error',
    confirmButtonText: 'Entendido'
  });
}

  // MEJORA: Método para formatear fecha y hora
  formatearFechaHora(fechaHora: string | undefined): string {
    if (!fechaHora) return '';
    try {
      const fecha = new Date(fechaHora);
      return fecha.toLocaleString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return fechaHora || '';
    }
  }

  // Calcular tiempo transcurrido desde el inicio de la ruta
  calcularTiempoTranscurrido(fechaInicio: string | undefined): string {
    if (!fechaInicio) return '';
    
    try {
      const inicio = new Date(fechaInicio);
      const ahora = new Date();
      const diffMs = ahora.getTime() - inicio.getTime();
      
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (horas > 0) {
        return `${horas}h ${minutos}m`;
      } else {
        return `${minutos}m`;
      }
    } catch (error) {
      return '';
    }
  }

  // Verificar si una ruta fue iniciada
  isRutaIniciada(venta: RepartidorVenta): boolean {
    return !!venta.fecha_inicio_ruta;
  }

  getEstadoBadgeClass(estado: string): string {
    const estadoClass: { [key: string]: string } = {
      'En ruta': 'badge-warning',
      'Listo para repartos': 'badge-info',
      'Pagado': 'badge-success',
      'Cancelado': 'badge-danger'
    };
    return estadoClass[estado] || 'badge-secondary';
  }

 // También actualiza cambiarMetodoPago para usar SweetAlert2:
cambiarMetodoPago(idVenta: number) {
  const entrega = this.entregas.find(e => e.id_venta === idVenta);
  if (!entrega) return;

  const metodosDisponibles = this.metodosPago.filter(
    metodo => metodo.id_metodo_pago !== entrega.id_metodo_pago
  );

  if (metodosDisponibles.length === 0) {
    Swal.fire({
      title: 'ℹ️ Información',
      text: 'No hay otros métodos de pago disponibles',
      icon: 'info',
      confirmButtonText: 'Entendido'
    });
    return;
  }

  // Crear opciones para SweetAlert2
  const opciones = metodosDisponibles.map(metodo => ({
    text: metodo.metodo_pago,
    value: metodo.id_metodo_pago
  }));

  Swal.fire({
    title: `Cambiar método de pago - Entrega #${idVenta}`,
    text: `Método actual: ${entrega.metodo_pago}`,
    input: 'select',
    inputOptions: opciones.reduce((acc, opcion) => {
      acc[opcion.value] = opcion.text;
      return acc;
    }, {} as {[key: number]: string}),
    inputPlaceholder: 'Seleccione nuevo método',
    showCancelButton: true,
    confirmButtonText: 'Cambiar',
    cancelButtonText: 'Cancelar',
    inputValidator: (value) => {
      if (!value) {
        return 'Debe seleccionar un método de pago';
      }
      return null;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const nuevoMetodoId = parseInt(result.value);
      const nuevoMetodo = this.metodosPago.find(m => m.id_metodo_pago === nuevoMetodoId);
      
      if (nuevoMetodo) {
        this.repartidorVentaService.cambiarMetodoPago(idVenta, nuevoMetodoId).subscribe({
          next: (response) => {
            Swal.fire({
              title: '✅ Método cambiado',
              text: `Método de pago cambiado a: ${nuevoMetodo.metodo_pago}`,
              icon: 'success',
              timer: 1500,
              showConfirmButton: false,
              timerProgressBar: true
            });
            
            // Actualizar la entrega localmente
            const entregaIndex = this.entregas.findIndex(e => e.id_venta === idVenta);
            if (entregaIndex !== -1) {
              this.entregas[entregaIndex].id_metodo_pago = nuevoMetodoId;
              this.entregas[entregaIndex].metodo_pago = nuevoMetodo.metodo_pago;
            }
          },
          error: (error) => {
            console.error('Error cambiando método de pago:', error);
            Swal.fire({
              title: '❌ Error',
              text: error.error?.error || 'No se pudo cambiar el método de pago',
              icon: 'error',
              confirmButtonText: 'Entendido'
            });
          }
        });
      }
    }
  });
}

// Reemplaza el método verificarPagoYape:
verificarPagoYape(idVenta: number): Promise<boolean> {
  return new Promise((resolve) => {
    Swal.fire({
      title: '🔐 Verificación de Pago Yape',
      html: `
        <div style="text-align: left;">
          <p><strong>Por seguridad, confirme:</strong></p>
          <p>✅ ¿Escaneó el código QR del cliente?</p>
          <p>✅ ¿Verificó que el pago apareció en su aplicación Yape?</p>
          <p>✅ ¿Confirmó el monto correcto (S/ ${this.getTotalVenta(idVenta)})?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, todo correcto',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      resolve(result.isConfirmed);
    });
  });
}
  // Método auxiliar para obtener total
  private getTotalVenta(idVenta: number): number {
    const entrega = this.entregas.find(e => e.id_venta === idVenta);
    return entrega ? entrega.total : 0;
  }

  // Método para manejar direcciones específicas de Pucallpa
private manejarDireccionesEspecificas(direccion: string): string | null {
  // Mapeo de direcciones problemáticas conocidas en Pucallpa
  const direccionesConocidas: {[key: string]: string} = {
    'jr.los mangos ms 3 lt 2': 'Jirón Los Mangos, Pucallpa',
    'av. los cedros mz.b lt.5': 'Avenida Los Cedros, Pucallpa',
    'urb. imosa mz.a lt.9': 'Urbanización Imosa, Pucallpa',
    'hospital ii ramón castilla': 'Hospital II Ramón Castilla, Pucallpa',
    'jc7m+jhq pucallpa': 'JC7M+JHQ Pucallpa, Perú',
    // Agrega más direcciones problemáticas aquí
  };
  
  const direccionLower = direccion.toLowerCase().trim();
  
  // Buscar coincidencia exacta
  if (direccionesConocidas[direccionLower]) {
    return direccionesConocidas[direccionLower];
  }
  
  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(direccionesConocidas)) {
    if (direccionLower.includes(key)) {
      return value;
    }
  }
  
  return null;
}

// Método para extraer y formatear coordenadas de texto
private extraerCoordenadasDeTexto(texto: string): string | null {
  // Patrones comunes de coordenadas
  const patrones = [
    /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,  // -8.385828, -74.5587662
    /(-?\d+\.\d+);\s*(-?\d+\.\d+)/,     // -8.385828; -74.5587662
    /lat:\s*(-?\d+\.\d+)\s*lng:\s*(-?\d+\.\d+)/i,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,       // @-8.385828,-74.5587662
  ];
  
  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match) {
      return `${match[1]},${match[2]}`;
    }
  }
  
  return null;
}
// Método para copiar dirección al portapapeles
copiarDireccion(direccion: string) {
  const direccionFormateada =
    ` ${direccion}`  
    direccion;
  
  navigator.clipboard.writeText(direccionFormateada).then(() => {
    Swal.fire({
      title: '✅ Copiada',
      text: 'Dirección copiada al portapapeles',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }).catch(err => {
    console.error('Error al copiar:', err);
    this.mostrarError('No se pudo copiar la dirección');
  });
}
}