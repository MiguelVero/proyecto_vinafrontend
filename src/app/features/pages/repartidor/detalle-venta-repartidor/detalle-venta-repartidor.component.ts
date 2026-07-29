// src/app/features/pages/repartidor/detalle-venta-repartidor/detalle-venta-repartidor.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RepartidorVentaService } from '../../../../core/services/repartidor-venta.service';
import { RepartidorVenta } from '../../../../core/models/repartidor-venta.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ComprobanteService } from '../../../../core/services/comprobante.service';
import { FechaService } from '../../../../core/services/fecha.service';

@Component({
  selector: 'app-detalle-venta-repartidor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-venta-repartidor.component.html',
  styleUrls: ['../repartidor-styles.css', './detalle-venta-repartidor.component.css']
})
export class DetalleVentaRepartidorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private repartidorVentaService = inject(RepartidorVentaService);
  private authService = inject(AuthService);
  private comprobanteService = inject(ComprobanteService);
  public fechaService = inject(FechaService);

  venta: RepartidorVenta | null = null;
  loading = true;
  error = '';
  descargando = false;
  private previousRoute = '/repartidor/rutas-asignadas';

  ngOnInit() {
    this.capturarRutaAnterior();
    this.cargarDetalleVenta();
  }

  private capturarRutaAnterior() {
    const savedRoute = localStorage.getItem('previous_repartidor_route');
    
    if (savedRoute) {
      if (savedRoute.includes('/repartidor/rutas-asignadas')) {
        this.previousRoute = '/repartidor/rutas-asignadas';
      } else if (savedRoute.includes('/repartidor/entregas-pendientes')) {
        this.previousRoute = '/repartidor/entregas-pendientes';
      } else if (savedRoute.includes('/repartidor/historial-entregas')) {
        this.previousRoute = '/repartidor/historial-entregas';
      }
      localStorage.removeItem('previous_repartidor_route');
    }
  }

  cargarDetalleVenta() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID de venta no válido';
      this.loading = false;
      return;
    }

    const ventaId = parseInt(id);
    this.repartidorVentaService.getVentaDetalle(ventaId).subscribe({
      next: (venta) => {
        this.venta = venta;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando detalle de venta:', error);
        this.error = 'Error al cargar los detalles de la venta';
        this.loading = false;
      }
    });
  }

  // ==============================================
  // MÉTODOS DE IMPRESIÓN Y DESCARGA
  // ==============================================

  /**
   * Imprime el comprobante de entrega - Genera PDF con jsPDF
   */
  imprimirComprobante() {
    if (!this.venta) return;
    
    try {
      const doc = this.comprobanteService.generarPDFEntrega(this.venta, this.venta.detalles || []);
      this.comprobanteService.guardarPDF(doc, `Comprobante-Entrega-${this.venta.id_venta}`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    }
  }

  /**
   * Descarga el comprobante de entrega como imagen
   */
  async descargarComprobanteEntregaComoImagen() {
    if (!this.venta) return;
    
    this.descargando = true;
    try {
      const doc = this.comprobanteService.generarPDFEntrega(this.venta, this.venta.detalles || []);
      
      const pdfData = doc.output('blob');
      const url = URL.createObjectURL(pdfData);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `Comprobante-Entrega-${this.venta?.id_venta}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        URL.revokeObjectURL(url);
        this.descargando = false;
      };
      img.onerror = () => {
        console.error('Error cargando imagen');
        this.descargando = false;
        alert('Error al generar la imagen. Por favor, intenta de nuevo.');
      };
      img.src = url;
    } catch (error) {
      console.error('Error generando imagen:', error);
      alert('Error al generar la imagen. Por favor, intenta de nuevo.');
      this.descargando = false;
    }
  }

  // ==============================================
  // MÉTODOS DE NAVEGACIÓN
  // ==============================================

  irARutasAsignadas() {
    this.router.navigate(['/repartidor/rutas-asignadas']);
  }

  irAEntregasPendientes() {
    this.router.navigate(['/repartidor/entregas-pendientes']);
  }

  abrirMapa() {
    if (!this.venta) return;

    const direccion = this.venta.direccion;
    const coordenadas = this.venta.coordenadas;

    if (coordenadas) {
      const [lat, lng] = coordenadas.split(',');
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps?q=${encodeURIComponent(direccion)}`, '_blank');
    }
  }

  volverAtras() {
    localStorage.removeItem('previous_repartidor_route');
    this.router.navigate([this.previousRoute]);
  }

  // ==============================================
  // MÉTODOS DE FORMATEO
  // ==============================================

  formatearFechaCompleta(fechaHora: string): string {
    if (!fechaHora) return '';
    try {
      const fecha = new Date(fechaHora);
      return fecha.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ', ' + fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return fechaHora;
    }
  }

  formatearFechaHora(fechaHora: string | undefined): string {
    if (!fechaHora) return '';
    try {
      const fecha = new Date(fechaHora);
      return fecha.toLocaleString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return fechaHora || '';
    }
  }

  isRutaIniciada(): boolean {
    return !!this.venta?.fecha_inicio_ruta;
  }

  isRutaFinalizada(): boolean {
    return !!this.venta?.fecha_fin_ruta;
  }

  calcularTiempoTotalEntrega(): string {
    if (!this.venta?.fecha_inicio_ruta) return '';

    try {
      const inicio = new Date(this.venta.fecha_inicio_ruta);
      let fin: Date;

      if (this.venta.fecha_fin_ruta) {
        fin = new Date(this.venta.fecha_fin_ruta);
      } else if (this.venta.estado === 'En ruta') {
        fin = new Date();
      } else {
        return '';
      }

      const diffMs = fin.getTime() - inicio.getTime();
      if (diffMs < 0) return '';

      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (horas > 0) {
        return `${horas}h ${minutos}m`;
      } else if (minutos > 0) {
        return `${minutos} minutos`;
      } else {
        const segundos = Math.floor(diffMs / 1000);
        return `${segundos} segundos`;
      }
    } catch (error) {
      console.error('Error calculando tiempo total:', error);
      return '';
    }
  }

  calcularTiempoEnCurso(): string {
    if (!this.venta?.fecha_inicio_ruta) return '';

    try {
      const inicio = new Date(this.venta.fecha_inicio_ruta);
      const ahora = new Date();
      const diffMs = ahora.getTime() - inicio.getTime();

      if (diffMs < 0) return '';

      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (horas > 0) {
        return `${horas}h ${minutos}m`;
      } else if (minutos > 0) {
        return `${minutos} minutos`;
      } else {
        const segundos = Math.floor(diffMs / 1000);
        return `${segundos} segundos`;
      }
    } catch (error) {
      return '';
    }
  }

  getEstadoDescripcion(): string {
    if (!this.venta) return '';

    switch (this.venta.estado) {
      case 'Pagado':
        return '✅ Entregado y pagado correctamente';
      case 'Cancelado':
        if (this.venta.fecha_inicio_ruta) {
          return `❌ Cancelado después de ${this.calcularTiempoTotalEntrega()} de ruta`;
        }
        return '❌ Cancelado antes de iniciar la ruta';
      case 'En ruta':
        return `🚚 En ruta por ${this.calcularTiempoEnCurso()}`;
      default:
        return this.venta.estado || 'Estado desconocido';
    }
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
}