// src/app/features/pages/repartidor/detalle-venta-repartidor/detalle-venta-repartidor.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RepartidorVentaService } from '../../../../core/services/repartidor-venta.service';
import { RepartidorVenta, VentaDetalle } from '../../../../core/models/repartidor-venta.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PersonalizacionService } from '../../../../core/services/personalizacion.service'; // ✅ IMPORTAR


@Component({
  selector: 'app-detalle-venta-repartidor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-venta-repartidor.component.html',
  styleUrls: ['../repartidor-styles.css', './detalle-venta-repartidor.component.css'] // ✅ CSS específico
})
export class DetalleVentaRepartidorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private repartidorVentaService = inject(RepartidorVentaService);
  private authService = inject(AuthService);
  private personalizacionService = inject(PersonalizacionService); // ✅ PARA LOGO

  venta: RepartidorVenta | null = null;
  loading = true;
  error = '';
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
    
    console.log('🔙 Ruta de origen:', this.previousRoute);
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
            
            // ✅ DEBUG: Verificar los datos de fechas
            console.log('✅ Detalle de venta cargado:', {
                id_venta: venta.id_venta,
                estado: venta.estado,
                fecha_inicio_ruta: venta.fecha_inicio_ruta,
                fecha_fin_ruta: venta.fecha_fin_ruta,
                tipo_datos_inicio: typeof venta.fecha_inicio_ruta,
                tipo_datos_fin: typeof venta.fecha_fin_ruta,
                fecha_inicio_ruta_obj: venta.fecha_inicio_ruta ? new Date(venta.fecha_inicio_ruta) : null,
                fecha_fin_ruta_obj: venta.fecha_fin_ruta ? new Date(venta.fecha_fin_ruta) : null
            });
        },
        error: (error) => {
            console.error('Error cargando detalle de venta:', error);
            this.error = 'Error al cargar los detalles de la venta';
            this.loading = false;
        }
    });
}

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
    const historialGuardado = sessionStorage.getItem('historial_entregas_estado');
    
    if (historialGuardado && this.previousRoute === '/repartidor/historial-entregas') {
      console.log('📦 Estado de historial disponible para restaurar');
    }
    
    localStorage.removeItem('previous_repartidor_route');
    console.log('🔙 Volviendo a:', this.previousRoute);
    this.router.navigate([this.previousRoute]);
  }

  // ========== MÉTODOS DE FORMATEO MEJORADOS ==========

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

  formatearFechaCorta(fecha: string): string {
    if (!fecha) return '';
    try {
      const fechaObj = new Date(fecha + 'T12:00:00');
      return fechaObj.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return fecha;
    }
  }

  formatearHora(hora: string): string {
    if (!hora) return '';
    try {
      const [horas, minutos] = hora.split(':');
      const fecha = new Date();
      fecha.setHours(parseInt(horas), parseInt(minutos));
      return fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return hora;
    }
  }

  isRutaIniciada(): boolean {
    return !!this.venta?.fecha_inicio_ruta;
  }

  isRutaFinalizada(): boolean {
    return !!this.venta?.fecha_fin_ruta;
  }

  // ========== MÉTODOS DE CÁLCULO DE TIEMPO ==========

  /**
   * Calcula el tiempo transcurrido desde el inicio de la ruta hasta ahora
   * (Para entregas en curso)
   */
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




calcularTiempoTotalEntrega(): string {
    // Si no hay fecha de inicio, no se puede calcular tiempo
    if (!this.venta?.fecha_inicio_ruta) return '';
    
    try {
        const inicio = new Date(this.venta.fecha_inicio_ruta);
        let fin: Date;
        
        // ✅ CORREGIDO: Si hay fecha de fin (entregado o cancelado con ruta), usar esa fecha
        if (this.venta.fecha_fin_ruta) {
            fin = new Date(this.venta.fecha_fin_ruta);
        } 
        // Si está en curso (estado "En ruta" sin fecha_fin_ruta), usar hora actual
        else if (this.venta.estado === 'En ruta') {
            fin = new Date();
        }
        // Si está cancelado sin fecha_fin_ruta, no mostrar tiempo
        else {
            return '';
        }
        
        const diffMs = fin.getTime() - inicio.getTime();
        
        // Validar que la diferencia sea positiva
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


// src/app/features/pages/repartidor/detalle-venta-repartidor/detalle-venta-repartidor.component.ts

/**
 * Formatea una fecha para asegurar que se maneje correctamente
 * @param fechaStr - String de fecha (puede venir en diferentes formatos)
 */
private formatearFechaParaCalculo(fechaStr: string | undefined): Date | null {
    if (!fechaStr) return null;
    
    try {
        // Si ya es un string ISO, convertirlo directamente
        if (fechaStr.includes('T')) {
            return new Date(fechaStr);
        }
        
        // Si viene como 'YYYY-MM-DD HH:MM:SS'
        if (fechaStr.includes(' ')) {
            return new Date(fechaStr.replace(' ', 'T') + '-05:00');
        }
        
        // Si solo es fecha 'YYYY-MM-DD'
        return new Date(fechaStr + 'T12:00:00-05:00');
    } catch (error) {
        console.error('Error formateando fecha para cálculo:', error, fechaStr);
        return null;
    }
}



















// ✅ NUEVO: Método para obtener el estado de la entrega con descripción
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


//Método para mostrar si la ruta fue iniciada o no
getRutaStatus(): string {
    if (!this.venta) return '';
    
    if (this.venta.fecha_inicio_ruta) {
        return 'Ruta iniciada';
    } else {
        return 'Ruta no iniciada';
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

  // ========== MÉTODO DE IMPRESIÓN ==========

  imprimirComprobante() {
    if (!this.venta) return;

    // 1. Obtener configuración de la empresa
    const config = this.personalizacionService.config();
    const logoUrl = config?.logo_login ? this.personalizacionService.logoLoginUrl() : null;
    const nombreEmpresa = config?.nombre || 'VIÑA';
    const rucEmpresa = config?.ruc || '20605757451';
    const esloganEmpresa = config?.eslogan || 'Agua de calidad para tu hogar';
    const direccionEmpresa = config?.direccion || 'Av. Mercado 111 - UCAYALI - CORONEL PORTILLO - CALLERIA';
    const telefonoEmpresa = config?.telefono || '';
    const emailEmpresa = config?.email || '';
    const logoTexto = config?.logo_texto || '💧';

    // 2. Construir contenido HTML
    const contenido = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comprobante de Entrega #${this.venta.id_venta}</title>
          ${this.generarEstiloComprobante()}
      </head>
      <body>
          <div class="comprobante-container">
              <!-- HEADER EMPRESA -->
              <div class="empresa-header">
                  <div class="logo">
                      ${logoUrl ? 
                        `<img src="${logoUrl}" alt="${nombreEmpresa}" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                      }
                      <div class="logo-placeholder" ${logoUrl ? 'style="display:none;"' : ''}>
                          ${logoTexto}
                      </div>
                  </div>
                  <div class="empresa-info">
                      <h1>${nombreEmpresa}</h1>
                      <p class="ruc">RUC: ${rucEmpresa}</p>
                      <p class="eslogan">${esloganEmpresa}</p>
                  </div>
              </div>

              <h2 class="titulo-comprobante">COMPROBANTE DE ENTREGA</h2>
              <p class="subtitulo">#${this.venta.id_venta}</p>

              <!-- INFORMACIÓN DEL CLIENTE -->
              <div class="cliente-section">
                  <h3>Datos del Cliente</h3>
                  <table class="cliente-tabla">
                      <tr>
                          <td class="label">Cliente:</td>
                          <td class="valor">${this.venta.nombre_completo}</td>
                      </tr>
                      ${this.venta.razon_social ? `
                      <tr>
                          <td class="label">Razón Social:</td>
                          <td class="valor">${this.venta.razon_social}</td>
                      </tr>
                      ` : ''}
                      <tr>
                          <td class="label">Teléfono:</td>
                          <td class="valor">${this.venta.telefono}</td>
                      </tr>
                      <tr>
                          <td class="label">Dirección:</td>
                          <td class="valor">${this.venta.direccion}</td>
                      </tr>
                  </table>
              </div>

              <!-- TABLA DE PRODUCTOS -->
              <div class="productos-section">
                  <h3>Productos Entregados</h3>
                  <table class="productos-tabla">
                      <thead>
                          <tr>
                              <th>Cant.</th>
                              <th>Producto</th>
                              <th>P. Unit.</th>
                              <th>Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${this.venta.detalles?.map((d: any) => `
                          <tr>
                              <td class="center">${d.cantidad}</td>
                              <td>${d.producto_nombre}</td>
                              <td class="right">S/ ${Number(d.precio_unitario).toFixed(2)}</td>
                              <td class="right">S/ ${(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}</td>
                          </tr>
                          `).join('')}
                      </tbody>
                      <tfoot>
                          <tr>
                              <td colspan="3" class="right"><strong>Total:</strong></td>
                              <td class="right total"><strong>S/ ${Number(this.venta.total).toFixed(2)}</strong></td>
                          </tr>
                      </tfoot>
                  </table>
              </div>

              <!-- INFORMACIÓN DE LA ENTREGA -->
              <div class="info-entrega">
                  <div class="info-row">
                      <span class="label">Fecha de Creación:</span>
                      <span class="valor">${this.formatearFechaCompleta(this.venta.fecha + 'T' + this.venta.hora)}</span>
                  </div>
                  ${this.venta.fecha_inicio_ruta ? `
                  <div class="info-row">
                      <span class="label">Ruta Iniciada:</span>
                      <span class="valor">${this.formatearFechaHora(this.venta.fecha_inicio_ruta)}</span>
                  </div>
                  ` : ''}
                  ${this.venta.fecha_fin_ruta ? `
                  <div class="info-row">
                      <span class="label">Entregado:</span>
                      <span class="valor">${this.formatearFechaHora(this.venta.fecha_fin_ruta)}</span>
                  </div>
                  ` : ''}
                  <div class="info-row">
                      <span class="label">Estado:</span>
                      <span class="valor estado">${this.venta.estado}</span>
                  </div>
                  <div class="info-row">
                      <span class="label">Método de Pago:</span>
                      <span class="valor">${this.venta.metodo_pago}</span>
                  </div>
              </div>

              <!-- FIRMAS -->
              <div class="firmas">
                  <div class="firma">
                      <p>_________________________</p>
                      <p>Firma del Cliente</p>
                  </div>
                  <div class="firma">
                      <p>_________________________</p>
                      <p>Firma del Repartidor</p>
                  </div>
              </div>

              <!-- PIE DE PÁGINA -->
              <div class="footer">
                  <p class="direccion-empresa">${direccionEmpresa}</p>
                  ${telefonoEmpresa ? `<p class="contacto-empresa">Tel: ${telefonoEmpresa} ${emailEmpresa ? `| Email: ${emailEmpresa}` : ''}</p>` : ''}
                  <p class="gracias">¡Gracias por su compra! 💧</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank', 'width=800,height=600');
    ventana?.document.write(contenido);
    ventana?.document.close();

    setTimeout(() => {
      ventana?.print();
      ventana?.close();
    }, 500);
  }

  private generarEstiloComprobante(): string {
    return `
      <style>
          * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Courier New', Courier, monospace;
          }
          
          body {
              background: #f0f0f0;
              display: flex;
              justify-content: center;
              padding: 20px;
          }
          
          .comprobante-container {
              max-width: 600px;
              width: 100%;
              background: white;
              padding: 25px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              border: 1px solid #ccc;
          }

          .empresa-header {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #057cbe;
          }
          
          .logo {
              width: 70px;
              height: 70px;
              flex-shrink: 0;
          }
          
          .logo-img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 8px;
          }
          
          .logo-placeholder {
              width: 70px;
              height: 70px;
              background: #057cbe;
              color: white;
              font-size: 2.5rem;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
          }
          
          .empresa-info h1 {
              font-size: 1.8rem;
              color: #057cbe;
              margin-bottom: 2px;
          }
          
          .ruc {
              font-size: 0.85rem;
              color: #333;
              font-weight: bold;
          }
          
          .eslogan {
              font-size: 0.8rem;
              color: #555;
              font-style: italic;
          }

          .titulo-comprobante {
              text-align: center;
              font-size: 1.4rem;
              font-weight: bold;
              color: #2c3e50;
              margin: 10px 0 5px 0;
              text-transform: uppercase;
          }

          .subtitulo {
              text-align: center;
              font-size: 1.2rem;
              color: #057cbe;
              margin-bottom: 20px;
          }

          .cliente-section, .productos-section, .info-entrega {
              margin-bottom: 20px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #dee2e6;
          }

          h3 {
              font-size: 1rem;
              color: #057cbe;
              margin-bottom: 10px;
              border-bottom: 1px dashed #057cbe;
              padding-bottom: 5px;
          }

          table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.9rem;
          }

          th {
              background: #057cbe;
              color: white;
              padding: 8px;
              text-align: left;
          }

          td {
              padding: 8px;
              border-bottom: 1px solid #dee2e6;
          }

          tfoot td {
              border-top: 2px solid #057cbe;
              font-weight: bold;
              padding-top: 10px;
          }

          .center { text-align: center; }
          .right { text-align: right; }
          
          .total {
              font-size: 1.1rem;
              color: #28a745;
          }

          .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #dee2e6;
          }

          .info-row:last-child {
              border-bottom: none;
          }

          .label {
              font-weight: 600;
              color: #495057;
          }

          .valor {
              font-weight: 500;
              color: #2c3e50;
          }

          .estado {
              color: #28a745;
              font-weight: bold;
          }

          .firmas {
              display: flex;
              justify-content: space-between;
              margin: 30px 0 20px;
              text-align: center;
          }

          .firma p {
              margin: 5px 0;
              font-size: 0.9rem;
              color: #666;
          }

          .footer {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #057cbe;
              text-align: center;
              font-size: 0.8rem;
              color: #6c757d;
          }

          .gracias {
              font-size: 1rem;
              font-weight: bold;
              color: #057cbe;
              margin: 10px 0;
          }

          @media print {
              body { background: white; padding: 0; }
              .comprobante-container { box-shadow: none; border: none; }
          }
      </style>
    `;
  }
}