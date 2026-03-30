// src/app/features/pages/repartidor/rutas-asignadas/rutas-asignadas.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RepartidorVentaService } from '../../../../core/services/repartidor-venta.service';
import { RepartidorVenta } from '../../../../core/models/repartidor-venta.model';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-rutas-asignadas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rutas-asignadas.component.html',
  styleUrls: ['../repartidor-styles.css']
})
export class RutasAsignadasComponent implements OnInit {
  private repartidorVentaService = inject(RepartidorVentaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ventas: RepartidorVenta[] = [];
  loading = true;
  error = '';

  verificarEstadoGPS() {
    console.log('🔍 Diagnóstico de GPS:');
    console.log(' - Geolocation disponible:', !!navigator.geolocation);
    console.log(' - Protocolo:', window.location.protocol);
    console.log(' - Host:', window.location.host);
    
    if (navigator.geolocation) {
      // Test rápido de geolocalización
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('✅ GPS funciona correctamente');
          console.log('📍 Posición actual:', pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.log('❌ Error GPS:', err.message, 'Código:', err.code);
        },
        { timeout: 5000 }
      );
    }
  }

  // Llamar este método en ngOnInit para diagnóstico
  ngOnInit() {
    this.cargarVentasAsignadas();
    this.verificarEstadoGPS(); // ← Agregar esta línea
  }

  cargarVentasAsignadas() {
    this.loading = true;
    this.repartidorVentaService.getVentasAsignadas().subscribe({
      next: (ventas) => {
        this.ventas = ventas;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando rutas asignadas:', error);
        this.error = 'Error al cargar las rutas asignadas';
        this.loading = false;
      }
    });
  }

 verDetalleVenta(idVenta: number) {
  // Guardar la ruta actual antes de navegar
  const currentRoute = this.router.url;
  localStorage.setItem('previous_repartidor_route', currentRoute);
  
  this.router.navigate(['/repartidor/venta', idVenta]);
}

  iniciarEntrega(idVenta: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    console.log('📍 Solicitando permisos de ubicación...');
    
    // Obtener ubicación GPS si está disponible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Ubicación obtenida correctamente');
          const coords = `${position.coords.latitude},${position.coords.longitude}`;
          console.log('📍 Coordenadas:', coords);
          this.confirmarInicioRuta(idVenta, coords, event);
        },
        (error) => {
          console.warn('❌ Error obteniendo ubicación GPS:', error);
          
          let mensajeError = 'No se pudo obtener la ubicación GPS. ';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              mensajeError += 'Permiso denegado por el usuario.';
              break;
            case error.POSITION_UNAVAILABLE:
              mensajeError += 'Ubicación no disponible.';
              break;
            case error.TIMEOUT:
              mensajeError += 'Tiempo de espera agotado.';
              break;
            default:
              mensajeError += 'Error desconocido.';
              break;
          }
          
          console.warn(mensajeError);
          
          // Preguntar si quiere continuar sin coordenadas
          if (confirm(mensajeError + '\n\n¿Desea iniciar la ruta sin registrar ubicación?')) {
            this.confirmarInicioRuta(idVenta, undefined, event);
          }
        },
        { 
          timeout: 15000, // Aumentar a 15 segundos
          enableHighAccuracy: true,
          maximumAge: 60000 // Usar ubicación cache de máximo 1 minuto
        }
      );
    } else {
      console.warn('❌ Geolocalización no soportada por el navegador');
      this.confirmarInicioRuta(idVenta, undefined, event);
    }
  }

// Reemplaza el método confirmarInicioRuta:
private confirmarInicioRuta(idVenta: number, coordenadas?: string, event?: Event) {
  // ✅ ELIMINAR el confirm y proceder directamente
  
  // Mostrar loading en el botón
  let button: HTMLButtonElement | null = null;
  if (event) {
    button = event.target as HTMLButtonElement;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    button.disabled = true;
  }

  this.repartidorVentaService.iniciarRutaEntrega(idVenta, coordenadas).subscribe({
    next: (response) => {
      // ✅ SweetAlert2 automático para éxito
      Swal.fire({
        title: '🚚 ¡Ruta Iniciada!',
        text: 'El seguimiento está activo',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        willClose: () => {
          this.cargarVentasAsignadas(); // Recargar la lista
        }
      });

      // También recargar después del timer por si acaso
      setTimeout(() => {
        this.cargarVentasAsignadas();
      }, 2000);
    },
    error: (error) => {
      console.error('Error iniciando ruta:', error);
      
      let mensajeError = 'Error al iniciar la ruta';
      
      if (error.status === 503) {
        mensajeError = 'El sistema está ocupado. Por favor, intente nuevamente en unos segundos.';
      } else if (error.error?.error) {
        mensajeError = error.error.error;
      }
      
      Swal.fire({
        title: '❌ Error',
        text: mensajeError,
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      
      // Restaurar botón en caso de error
      if (button) {
        button.innerHTML = '<i class="fas fa-play"></i> Iniciar Entrega';
        button.disabled = false;
      }
    }
  });
}

  // Verificar si una ruta ya fue iniciada
  isRutaIniciada(venta: RepartidorVenta): boolean {
    return !!venta.fecha_inicio_ruta;
  }

  // Obtener texto del botón según estado
  getTextoBoton(venta: RepartidorVenta): string {
    return this.isRutaIniciada(venta) ? 'Ruta en Curso' : 'Iniciar Entrega';
  }

  // Obtener clase del botón según estado
  getClaseBoton(venta: RepartidorVenta): string {
    return this.isRutaIniciada(venta) ? 'btn-secondary' : 'btn-success';
  }

  // Obtener icono del botón según estado
  getIconoBoton(venta: RepartidorVenta): string {
    return this.isRutaIniciada(venta) ? 'fa-play-circle' : 'fa-play';
  }

  // Método para tooltip informativo
  getTooltipUbicacion(venta: RepartidorVenta): string {
    if (this.isRutaIniciada(venta)) {
      return venta.ubicacion_inicio_ruta 
        ? `Ruta iniciada desde: ${venta.ubicacion_inicio_ruta}`
        : 'Ruta iniciada (sin ubicación GPS)';
    }
    return 'Iniciar ruta de entrega con ubicación GPS';
  }

  // Formatear fecha de inicio de ruta
  formatearFechaInicio(fechaInicio: string | undefined): string {
    if (!fechaInicio) return '';
    try {
      const fecha = new Date(fechaInicio);
      return fecha.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return fechaInicio || '';
    }
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
}