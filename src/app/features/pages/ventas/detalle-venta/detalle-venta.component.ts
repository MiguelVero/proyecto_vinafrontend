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
   * Genera el HTML del comprobante para la imagen - CON DISEÑO ORIGINAL
   */
  private generarHTMLComprobante(): string {
    if (!this.venta) return '';
    
    const empresa = this.comprobanteService.getDatosEmpresa();
    const logoUrl = this.comprobanteService.getLogoUrlParaHTML();
    const tipoComprobante = this.comprobanteService.getTipoComprobanteTexto(this.venta.tipo_comprobante_solicitado);
    
    let serieNumero = '---';
    if (this.venta.serie_comprobante && this.venta.numero_correlativo) {
      serieNumero = `${this.venta.serie_comprobante}-${this.venta.numero_correlativo.toString().padStart(5, '0')}`;
    } else {
      serieNumero = tipoComprobante.includes('Factura') ? 'F001-00001' : 'B001-00001';
    }
    
    const fechaEmision = this.fechaService.formatFechaCompleta(this.venta.fecha) + ' ' + this.fechaService.formatHora(this.venta.hora);
    
    let tipoDocumento = 'DNI';
    let documento = '---';
    if (this.venta.tipo_documento === 'RUC' && this.venta.numero_documento) {
      tipoDocumento = 'RUC';
      documento = this.venta.numero_documento;
    } else if (this.venta.tipo_documento === 'DNI' && this.venta.numero_documento) {
      tipoDocumento = 'DNI';
      documento = this.venta.numero_documento;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', Courier, monospace; }
          body { background: #f0f0f0; display: flex; justify-content: center; padding: 20px; }
          .comprobante-container { max-width: 600px; width: 100%; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border: 1px solid #ccc; }
          
          .empresa-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #057cbe; }
          .logo { width: 70px; height: 70px; flex-shrink: 0; }
          .logo img { width: 100%; height: 100%; object-fit: contain; border-radius: 8px; }
          .logo-placeholder { width: 70px; height: 70px; background: #057cbe; color: white; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
          .empresa-info h1 { font-size: 1.8rem; color: #057cbe; margin-bottom: 2px; }
          .ruc { font-size: 0.85rem; color: #333; font-weight: bold; }
          .eslogan { font-size: 0.8rem; color: #555; font-style: italic; }
          
          .titulo-comprobante { text-align: center; font-size: 1.4rem; font-weight: bold; color: #2c3e50; margin: 15px 0; text-transform: uppercase; letter-spacing: 2px; }
          
          .documento-info { display: flex; justify-content: space-between; background: #f8f9fa; padding: 12px; border-radius: 5px; margin-bottom: 20px; font-size: 0.9rem; border: 1px solid #dee2e6; }
          .label { font-weight: 600; color: #495057; }
          .valor { font-weight: 500; color: #2c3e50; }
          
          .cliente-section { margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 5px; border: 1px solid #dee2e6; }
          .cliente-section h3 { font-size: 1rem; color: #057cbe; margin-bottom: 8px; border-bottom: 1px dashed #057cbe; padding-bottom: 4px; }
          .cliente-tabla { width: 100%; font-size: 0.9rem; }
          .cliente-tabla td { padding: 4px 0; }
          .cliente-tabla .label { width: 100px; font-weight: bold; }
          
          .productos-section { margin-bottom: 20px; }
          .productos-section h3 { font-size: 1rem; color: #057cbe; margin-bottom: 8px; }
          .productos-tabla { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
          .productos-tabla th { background: #057cbe; color: white; padding: 8px; text-align: left; }
          .productos-tabla td { padding: 8px; border-bottom: 1px solid #dee2e6; }
          .productos-tabla tfoot tr td { border-top: 2px solid #057cbe; border-bottom: none; font-weight: bold; padding-top: 10px; }
          .center { text-align: center; }
          .right { text-align: right; }
          .total { font-size: 1.1rem; color: #28a745; }
          
          .monto-letras { text-align: center; font-size: 0.95rem; font-weight: bold; color: #2c3e50; margin: 20px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; border: 1px dashed #28a745; }
          
          .info-adicional { margin: 20px 0; padding: 12px; background: #f8f9fa; border-radius: 5px; border: 1px solid #dee2e6; font-size: 0.9rem; }
          .info-row { display: flex; justify-content: space-between; padding: 4px 0; }
          
          .footer { margin-top: 25px; padding-top: 15px; border-top: 2px solid #057cbe; text-align: center; font-size: 0.8rem; color: #6c757d; }
          .direccion-empresa { font-weight: 500; margin-bottom: 5px; }
          .contacto-empresa { font-size: 0.75rem; margin-bottom: 5px; }
          .gracias { font-size: 1rem; font-weight: bold; color: #057cbe; margin: 5px 0; }
          .sistema { font-size: 0.7rem; }
        </style>
      </head>
      <body>
        <div class="comprobante-container">
          <!-- HEADER -->
          <div class="empresa-header">
            <div class="logo">
              ${logoUrl ? `<img src="${logoUrl}" alt="${empresa.nombre}" crossorigin="anonymous">` : `<div class="logo-placeholder">${empresa.logoTexto}</div>`}
            </div>
            <div class="empresa-info">
              <h1>${empresa.nombre}</h1>
              <p class="ruc">RUC: ${empresa.ruc}</p>
              <p class="eslogan">${empresa.eslogan}</p>
            </div>
          </div>

          <!-- TÍTULO -->
          <h2 class="titulo-comprobante">${tipoComprobante}</h2>

          <!-- SERIE Y FECHA -->
          <div class="documento-info">
            <div><span class="label">Serie - Número:</span> <span class="valor">${serieNumero}</span></div>
            <div><span class="label">Fecha de Emisión:</span> <span class="valor">${fechaEmision}</span></div>
          </div>

          <!-- DATOS DEL CLIENTE -->
          <div class="cliente-section">
            <h3>Datos del Cliente</h3>
            <table class="cliente-tabla">
              <tr><td class="label">${tipoDocumento}:</td><td>${documento}</td></tr>
              <tr><td class="label">Cliente:</td><td>${this.venta.nombre_completo || 'Cliente General'}</td></tr>
              <tr><td class="label">Dirección:</td><td>${this.venta.direccion || 'No especificada'}</td></tr>
              <tr><td class="label">Teléfono:</td><td>${this.venta.telefono || '---'}</td></tr>
            </table>
          </div>

          <!-- TABLA DE PRODUCTOS -->
          <div class="productos-section">
            <h3>Detalle de Productos</h3>
            <table class="productos-tabla">
              <thead>
                <tr><th>Cant.</th><th>Producto</th><th>P. Unit.</th><th>Total</th></tr>
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
                  <td colspan="3" class="right"><strong>Total a Pagar:</strong></td>
                  <td class="right total"><strong>S/ ${Number(this.venta.total).toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- MONTO EN LETRAS -->
          <div class="monto-letras">
            <p>SON: ${this.comprobanteService.numeroALetras(Number(this.venta.total))} SOLES</p>
          </div>

          <!-- INFORMACIÓN ADICIONAL -->
          <div class="info-adicional">
            <div class="info-row"><span class="label">Vendedor:</span> <span>${this.venta.vendedor || 'admin'}</span></div>
            <div class="info-row"><span class="label">Forma de Pago:</span> <span>${this.venta.metodo_pago || 'Contado'}</span></div>
            ${this.venta.repartidor ? `<div class="info-row"><span class="label">Repartidor:</span> <span>${this.venta.repartidor}</span></div>` : ''}
          </div>

          <!-- PIE DE PÁGINA -->
          <div class="footer">
            <p class="direccion-empresa">${empresa.direccion}</p>
            <p class="contacto-empresa">Tel: ${empresa.telefono} ${empresa.email ? `| Email: ${empresa.email}` : ''}</p>
            <p class="gracias">¡Gracias por su compra! 💧</p>
            <p class="sistema">Sistema de Ventas</p>
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