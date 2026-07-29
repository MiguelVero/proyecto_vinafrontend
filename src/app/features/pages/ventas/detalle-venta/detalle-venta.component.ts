// src/app/features/pages/ventas/detalle-venta/detalle-venta.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VentasService, Venta } from '../../../../core/services/ventas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FechaService } from '../../../../core/services/fecha.service';
import { ComprobanteService } from '../../../../core/services/comprobante.service';

@Component({
  selector: 'app-detalle-venta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-venta.component.html',
  styleUrls: ['./detalle-venta.component.css']
})
export class DetalleVentaComponent implements OnInit {
  private ventasService = inject(VentasService);
  private authService = inject(AuthService);
  public fechaService = inject(FechaService);
  private comprobanteService = inject(ComprobanteService);
  private route = inject(ActivatedRoute);
  public router = inject(Router);

  venta: Venta | null = null;
  loading = false;
  error = '';
  notFound = false;
  descargando = false;

  ngOnInit() {
    this.cargarVenta();
  }

  cargarVenta() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID de venta no válido';
      return;
    }

    this.loading = true;
    this.error = '';
    this.notFound = false;

    this.ventasService.getVentaById(+id).subscribe({
      next: (venta) => {
        this.venta = venta;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 404) {
          this.notFound = true;
          this.error = 'Venta no encontrada';
        } else {
          this.error = 'Error al cargar la venta';
        }
        console.error('Error cargando venta:', error);
      }
    });
  }

  getEstadoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'Pendiente': 'estado-pendiente',
      'Listo para repartos': 'estado-listo',
      'En ruta': 'estado-ruta',
      'Pagado': 'estado-pagado',
      'Cancelado': 'estado-cancelado'
    };
    return classes[estado] || 'estado-desconocido';
  }

  volverAPanel() {
    const previousRoute = localStorage.getItem('previous_ventas_route');
    const returnData = this.route.snapshot.queryParams['return'];
    
    if (returnData) {
      try {
        const data = JSON.parse(returnData);
        this.router.navigate([data.route], {
          queryParams: data.queryParams
        });
        if (data.page) {
          sessionStorage.setItem('ventas_panel_pagina', data.page.toString());
        }
        if (data.items) {
          sessionStorage.setItem('ventas_panel_items', data.items.toString());
        }
        localStorage.removeItem('previous_ventas_route');
        return;
      } catch (error) {
        console.error('Error parsing return data:', error);
      }
    }
    
    if (previousRoute) {
      localStorage.removeItem('previous_ventas_route');
      this.router.navigate([previousRoute]);
    } else {
      this.router.navigate(['/ventas']);
    }
  }

  // ==============================================
  // MÉTODOS DE IMPRESIÓN Y DESCARGA
  // ==============================================

  /**
   * Imprime el comprobante - Genera PDF con jsPDF
   */
  imprimirComprobante() {
    if (!this.venta) return;
    
    try {
      const doc = this.comprobanteService.generarPDFVenta(this.venta, this.venta.detalles || []);
      this.comprobanteService.guardarPDF(doc, `Boleta-Electronica-Venta-${this.venta.id_venta}`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    }
  }

// src/app/features/pages/ventas/detalle-venta/detalle-venta.component.ts

/**
 * Descarga el comprobante como imagen
 */
async descargarComprobanteComoImagen() {
  if (!this.venta) return;
  
  this.descargando = true;
  try {
    // 1. Generar el HTML del comprobante
    const htmlContent = this.generarHTMLComprobante();
    
    // 2. Crear un contenedor temporal para renderizar
    const contenedor = document.createElement('div');
    contenedor.style.position = 'fixed';
    contenedor.style.left = '-9999px';
    contenedor.style.top = '0';
    contenedor.style.width = '650px';
    contenedor.style.background = 'white';
    contenedor.style.padding = '20px';
    contenedor.style.zIndex = '-1000';
    contenedor.innerHTML = htmlContent;
    document.body.appendChild(contenedor);
    
    // 3. Usar html2canvas para capturar como imagen
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(contenedor, {
      scale: 2,
      useCORS: true,        // ✅ IMPORTANTE: Permitir CORS
      allowTaint: true,     // ✅ Permitir imágenes de otros dominios
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 650,
      onclone: (clonedDoc) => {
        // ✅ Forzar que las imágenes se carguen correctamente
        const images = clonedDoc.querySelectorAll('img');
        images.forEach(img => {
          if (img.src && !img.src.startsWith('data:')) {
            // Asegurar que la imagen tenga crossorigin
            img.crossOrigin = 'anonymous';
          }
        });
      }
    });
    
    // 4. Descargar la imagen
    const link = document.createElement('a');
    link.download = `Comprobante-Venta-${this.venta?.id_venta}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // 5. Limpiar
    document.body.removeChild(contenedor);
    this.descargando = false;
    
  } catch (error) {
    console.error('Error generando imagen:', error);
    alert('Error al generar la imagen. Por favor, intenta de nuevo.');
    this.descargando = false;
  }
}

/**
 * Genera el HTML del comprobante para la imagen
 */
private generarHTMLComprobante(): string {
  if (!this.venta) return '';
  
  const empresa = this.comprobanteService.getDatosEmpresa();
  const logoUrl = this.comprobanteService.getLogoUrlParaHTML();
  
  const tipoComprobante = this.comprobanteService.getTipoComprobanteTexto(this.venta.tipo_comprobante_solicitado);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
        body { padding: 20px; background: white; }
        .comprobante { max-width: 600px; margin: 0 auto; }
        .header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; border-bottom: 2px solid #057cbe; padding-bottom: 15px; }
        .logo-container { width: 60px; height: 60px; flex-shrink: 0; }
        .logo-container img { width: 100%; height: 100%; object-fit: contain; }
        .header-text { flex: 1; }
        .header-text h1 { color: #057cbe; font-size: 22px; }
        .header-text p { color: #666; font-size: 12px; }
        .titulo { text-align: center; font-size: 18px; font-weight: bold; color: #333; margin: 15px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
        .cliente-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .cliente-section h3 { color: #057cbe; font-size: 14px; margin-bottom: 10px; }
        .cliente-row { padding: 3px 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
        th { background: #057cbe; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        .total { font-size: 16px; font-weight: bold; color: #28a745; text-align: right; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #057cbe; text-align: center; font-size: 11px; color: #666; }
        .gracias { font-size: 14px; font-weight: bold; color: #057cbe; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="comprobante">
        <div class="header">
          <div class="logo-container">
            ${logoUrl ? `<img src="${logoUrl}" alt="${empresa.nombre}" crossorigin="anonymous">` : ''}
          </div>
          <div class="header-text">
            <h1>${empresa.nombre}</h1>
            <p>RUC: ${empresa.ruc}</p>
            <p>${empresa.eslogan}</p>
          </div>
        </div>
        
        <div class="titulo">${tipoComprobante}</div>
        
        <div class="info-row">
          <span><strong>Serie - Número:</strong> B001-00001</span>
          <span><strong>Fecha:</strong> ${this.fechaService.formatFechaCompleta(this.venta.fecha)} ${this.fechaService.formatHora(this.venta.hora)}</span>
        </div>
        
        <div class="cliente-section">
          <h3>Datos del Cliente</h3>
          <div class="cliente-row"><strong>DNI:</strong> ${this.venta.numero_documento || '---'}</div>
          <div class="cliente-row"><strong>Cliente:</strong> ${this.venta.nombre_completo}</div>
          <div class="cliente-row"><strong>Dirección:</strong> ${this.venta.direccion || 'No especificada'}</div>
          <div class="cliente-row"><strong>Teléfono:</strong> ${this.venta.telefono || '---'}</div>
        </div>
        
        <h3 style="color: #057cbe; font-size: 14px; margin: 10px 0;">Detalle de Productos</h3>
        <table>
          <thead>
            <tr><th>Cant.</th><th>Producto</th><th>P. Unit.</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${this.venta.detalles?.map((d: any) => `
              <tr>
                <td>${d.cantidad}</td>
                <td>${d.producto_nombre}</td>
                <td>S/ ${Number(d.precio_unitario).toFixed(2)}</td>
                <td>S/ ${(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">Total a Pagar: S/ ${Number(this.venta.total).toFixed(2)}</div>
        
        <div style="margin: 15px 0; font-size: 12px;">
          <p><strong>SON:</strong> ${this.comprobanteService.numeroALetras(Number(this.venta.total))} SOLES</p>
        </div>
        
        <div style="margin: 10px 0; font-size: 12px;">
          <p><strong>Vendedor:</strong> ${this.venta.vendedor || 'admin'}</p>
          <p><strong>Forma de Pago:</strong> ${this.venta.metodo_pago || 'Contado'}</p>
          ${this.venta.repartidor ? `<p><strong>Repartidor:</strong> ${this.venta.repartidor}</p>` : ''}
        </div>
        
        <div class="footer">
          <p>${empresa.direccion}</p>
          <p>Tel: ${empresa.telefono} | Email: ${empresa.email}</p>
          <p class="gracias">¡Gracias por su compra!</p>
          <p style="font-size: 10px; color: #999;">Sistema de Ventas</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


  getTipoComprobanteTexto(tipo: string | undefined): string {
    return this.comprobanteService.getTipoComprobanteTexto(tipo);
  }

  get puedeCambiarEstado(): boolean {
    return this.authService.isAdmin();
  }
}