// src/app/core/services/comprobante.service.ts
import { Injectable, inject } from '@angular/core';
import { PersonalizacionService } from './personalizacion.service';
import { FechaService } from './fecha.service';
import { environment } from '../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ComprobanteService {
  private personalizacionService = inject(PersonalizacionService);
  private fechaService = inject(FechaService);

  /**
   * Obtiene la URL del logo de manera segura
   * Usa automáticamente la URL del backend desde environment
   */
  private getLogoUrl(): string | null {
    try {
      const config = this.personalizacionService.config();
      if (!config) return null;
      
      // Buscar en cualquiera de los campos de logo
      const logoPath = config.logo_login || config.logo_url || config.logo_navbar;
      
      if (!logoPath) {
        console.warn('⚠️ No hay logo configurado');
        return null;
      }
      
      // Si ya es una URL completa, devolverla
      if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
        return logoPath;
      }
      
      // ✅ OBTENER LA URL DEL BACKEND DESDE ENVIRONMENT
      // Eliminar '/api' del final si existe para obtener la base URL
      let backendBaseUrl = environment.apiUrl;
      
      // Si la URL termina en '/api', eliminarlo para obtener la base
      if (backendBaseUrl.endsWith('/api')) {
        backendBaseUrl = backendBaseUrl.slice(0, -4);
      } else if (backendBaseUrl.endsWith('/api/')) {
        backendBaseUrl = backendBaseUrl.slice(0, -5);
      }
      
      // Limpiar la ruta del logo
      const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
      const fullUrl = `${backendBaseUrl}/${cleanPath}`;
      
      console.log('🔍 Logo URL (desde environment):', fullUrl);
      console.log('   - Environment:', environment.production ? 'PRODUCCIÓN' : 'DESARROLLO');
      console.log('   - Backend URL:', backendBaseUrl);
      console.log('   - Ruta logo:', cleanPath);
      
      return fullUrl;
    } catch (error) {
      console.error('Error obteniendo logo:', error);
      return null;
    }
  }

  /**
   * Genera un PDF de la Boleta/Factura Electrónica
   */
  generarPDFVenta(venta: any, detalles: any[]): jsPDF {
    const empresa = this.getDatosEmpresa();
    const logoUrl = this.getLogoUrl();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // ===== HEADER CON LOGO =====
    if (logoUrl) {
      try {
        // Agregar el logo al PDF
        doc.addImage(logoUrl, 'JPEG', 15, yPos, 30, 30);
        
        // Logo a la izquierda, nombre a la derecha
        doc.setFontSize(18);
        doc.setTextColor(5, 124, 190);
        doc.text(empresa.nombre, 55, yPos + 15);
        yPos += 5;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`RUC: ${empresa.ruc}`, 55, yPos + 20);
        yPos += 3;
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(empresa.eslogan, 55, yPos + 25);
        yPos += 35;
      } catch (error) {
        console.warn('Error cargando logo en PDF, usando fallback:', error);
        this.dibujarHeaderSoloTexto(doc, empresa, pageWidth, yPos);
        yPos += 30;
      }
    } else {
      // Sin logo, solo texto centrado
      this.dibujarHeaderSoloTexto(doc, empresa, pageWidth, yPos);
      yPos += 30;
    }

    // Línea separadora
    doc.setDrawColor(5, 124, 190);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // ===== TÍTULO =====
    const tipoComprobante = this.getTipoComprobanteTexto(venta.tipo_comprobante_solicitado);
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(tipoComprobante, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // ===== SERIE Y FECHA =====
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    let serieNumero = '---';
    if (venta.serie_comprobante && venta.numero_correlativo) {
      serieNumero = `${venta.serie_comprobante}-${venta.numero_correlativo.toString().padStart(5, '0')}`;
    } else {
      serieNumero = tipoComprobante.includes('Factura') ? 'F001-00001' : 'B001-00001';
    }
    
    doc.text(`Serie - Número: ${serieNumero}`, 15, yPos);
    const fechaEmision = this.fechaService.formatFechaCompleta(venta.fecha) + ' ' + this.fechaService.formatHora(venta.hora);
    doc.text(`Fecha de Emisión: ${fechaEmision}`, 15, yPos + 5);
    yPos += 14;

    // ===== DATOS DEL CLIENTE =====
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Datos del Cliente', 15, yPos);
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
    yPos += 7;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    // Determinar documento
    let tipoDocumento = 'DNI';
    let documento = '---';
    if (venta.tipo_documento === 'RUC' && venta.numero_documento) {
      tipoDocumento = 'RUC';
      documento = venta.numero_documento;
    } else if (venta.tipo_documento === 'DNI' && venta.numero_documento) {
      tipoDocumento = 'DNI';
      documento = venta.numero_documento;
    }
    
    doc.text(`${tipoDocumento}: ${documento}`, 15, yPos);
    doc.text(`Cliente: ${venta.nombre_completo || 'Cliente General'}`, 15, yPos + 5);
    doc.text(`Dirección: ${venta.direccion || 'No especificada'}`, 15, yPos + 10);
    doc.text(`Teléfono: ${venta.telefono || '---'}`, 15, yPos + 15);
    yPos += 22;

    // ===== TABLA DE PRODUCTOS =====
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Detalle de Productos', 15, yPos);
    yPos += 2;
    doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
    yPos += 6;

    const tableData = detalles.map((d: any) => [
      d.cantidad.toString(),
      d.producto_nombre || 'Producto',
      `S/ ${Number(d.precio_unitario).toFixed(2)}`,
      `S/ ${(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Cant.', 'Producto', 'P. Unit.', 'Total']],
      body: tableData,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 124, 190],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || yPos + 30;

    // ===== TOTAL =====
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Total a Pagar: S/ ${Number(venta.total).toFixed(2)}`, pageWidth - 15, finalY + 8, { align: 'right' });
    finalY += 14;

    // ===== MONTO EN LETRAS =====
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const montoLetras = this.numeroALetras(Number(venta.total));
    doc.text(`SON: ${montoLetras} SOLES`, 15, finalY + 5);
    finalY += 10;

    // ===== INFORMACIÓN ADICIONAL =====
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Vendedor: ${venta.vendedor || 'admin'}`, 15, finalY + 5);
    doc.text(`Forma de Pago: ${venta.metodo_pago || 'Contado'}`, 15, finalY + 10);
    if (venta.repartidor) {
      doc.text(`Repartidor: ${venta.repartidor}`, 15, finalY + 15);
      finalY += 25;
    } else {
      finalY += 15;
    }

    // ===== PIE DE PÁGINA =====
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }

    doc.setDrawColor(5, 124, 190);
    doc.setLineWidth(0.5);
    doc.line(15, finalY, pageWidth - 15, finalY);
    finalY += 6;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(empresa.direccion, pageWidth / 2, finalY, { align: 'center' });
    finalY += 5;
    
    let contacto = '';
    if (empresa.telefono) contacto += `Tel: ${empresa.telefono}`;
    if (empresa.email) contacto += ` | Email: ${empresa.email}`;
    if (contacto) {
      doc.text(contacto, pageWidth / 2, finalY, { align: 'center' });
      finalY += 5;
    }

    doc.setFontSize(10);
    doc.setTextColor(5, 124, 190);
    doc.text('¡Gracias por su compra!', pageWidth / 2, finalY + 5, { align: 'center' });
    finalY += 6;

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Sistema de Ventas', pageWidth / 2, finalY + 3, { align: 'center' });

    return doc;
  }

  /**
   * Dibuja el header solo con texto (fallback cuando no hay logo)
   */
  private dibujarHeaderSoloTexto(doc: jsPDF, empresa: any, pageWidth: number, yPos: number): void {
    doc.setFontSize(18);
    doc.setTextColor(5, 124, 190);
    doc.text(empresa.nombre, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`RUC: ${empresa.ruc}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(empresa.eslogan, pageWidth / 2, yPos, { align: 'center' });
  }

  /**
   * Genera un PDF del Comprobante de Entrega
   */
  generarPDFEntrega(venta: any, detalles: any[]): jsPDF {
    const empresa = this.getDatosEmpresa();
    const logoUrl = this.getLogoUrl();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // ===== HEADER CON LOGO =====
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'JPEG', 15, yPos, 30, 30);
        doc.setFontSize(18);
        doc.setTextColor(5, 124, 190);
        doc.text(empresa.nombre, 55, yPos + 15);
        yPos += 5;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`RUC: ${empresa.ruc}`, 55, yPos + 20);
        yPos += 3;
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(empresa.eslogan, 55, yPos + 25);
        yPos += 35;
      } catch (error) {
        console.warn('Error cargando logo en PDF, usando fallback:', error);
        this.dibujarHeaderSoloTexto(doc, empresa, pageWidth, yPos);
        yPos += 30;
      }
    } else {
      this.dibujarHeaderSoloTexto(doc, empresa, pageWidth, yPos);
      yPos += 30;
    }

    doc.setDrawColor(5, 124, 190);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;

    // ===== TÍTULO =====
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('COMPROBANTE DE ENTREGA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(12);
    doc.setTextColor(5, 124, 190);
    doc.text(`#${venta.id_venta}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // ===== DATOS DEL CLIENTE =====
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Datos del Cliente', 15, yPos);
    yPos += 2;
    doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
    yPos += 7;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Cliente: ${venta.nombre_completo || 'Cliente General'}`, 15, yPos);
    yPos += 5;
    if (venta.razon_social) {
      doc.text(`Razón Social: ${venta.razon_social}`, 15, yPos);
      yPos += 5;
    }
    doc.text(`Teléfono: ${venta.telefono || '---'}`, 15, yPos);
    yPos += 5;
    doc.text(`Dirección: ${venta.direccion || 'No especificada'}`, 15, yPos);
    yPos += 10;

    // ===== TABLA DE PRODUCTOS =====
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Productos Entregados', 15, yPos);
    yPos += 2;
    doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
    yPos += 6;

    const tableData = detalles.map((d: any) => [
      d.cantidad.toString(),
      d.producto_nombre || 'Producto',
      `S/ ${Number(d.precio_unitario).toFixed(2)}`,
      `S/ ${(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Cant.', 'Producto', 'P. Unit.', 'Total']],
      body: tableData,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 124, 190],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable?.finalY || yPos + 30;

    // ===== TOTAL =====
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Total: S/ ${Number(venta.total).toFixed(2)}`, pageWidth - 15, finalY + 8, { align: 'right' });
    finalY += 14;

    // ===== INFORMACIÓN DE ENTREGA =====
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    const fechaCreacion = this.fechaService.formatFechaCompleta(venta.fecha) + ' ' + this.fechaService.formatHora(venta.hora);
    doc.text(`Fecha de Creación: ${fechaCreacion}`, 15, finalY + 5);
    finalY += 6;
    
    if (venta.fecha_inicio_ruta) {
      const fechaInicio = this.formatearFechaHora(venta.fecha_inicio_ruta);
      doc.text(`Ruta Iniciada: ${fechaInicio}`, 15, finalY);
      finalY += 6;
    }
    
    if (venta.fecha_fin_ruta) {
      const fechaFin = this.formatearFechaHora(venta.fecha_fin_ruta);
      doc.text(`Entregado: ${fechaFin}`, 15, finalY);
      finalY += 6;
    }
    
    doc.text(`Estado: ${venta.estado || 'Desconocido'}`, 15, finalY);
    finalY += 6;
    doc.text(`Método de Pago: ${venta.metodo_pago || 'Contado'}`, 15, finalY);
    finalY += 12;

    // ===== FIRMAS =====
    if (finalY > 230) {
      doc.addPage();
      finalY = 20;
    }

    const firmaY = finalY;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    doc.line(30, firmaY + 5, 85, firmaY + 5);
    doc.text('Firma del Cliente', 57.5, firmaY + 10, { align: 'center' });
    
    doc.line(125, firmaY + 5, 180, firmaY + 5);
    doc.text('Firma del Repartidor', 152.5, firmaY + 10, { align: 'center' });
    
    finalY = firmaY + 18;

    // ===== PIE DE PÁGINA =====
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.setDrawColor(5, 124, 190);
    doc.setLineWidth(0.5);
    doc.line(15, finalY, pageWidth - 15, finalY);
    finalY += 6;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(empresa.direccion, pageWidth / 2, finalY, { align: 'center' });
    finalY += 5;
    
    let contacto = '';
    if (empresa.telefono) contacto += `Tel: ${empresa.telefono}`;
    if (empresa.email) contacto += ` | Email: ${empresa.email}`;
    if (contacto) {
      doc.text(contacto, pageWidth / 2, finalY, { align: 'center' });
      finalY += 5;
    }

    doc.setFontSize(10);
    doc.setTextColor(5, 124, 190);
    doc.text('¡Gracias por su compra!', pageWidth / 2, finalY + 5, { align: 'center' });

    return doc;
  }

  /**
   * Guarda el PDF con un nombre de archivo
   */
  guardarPDF(doc: jsPDF, nombreArchivo: string): void {
    try {
      doc.save(`${nombreArchivo}.pdf`);
    } catch (error) {
      console.error('Error guardando PDF:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de la empresa
   */
  getDatosEmpresa() {
    try {
      const config = this.personalizacionService.config();
      return {
        nombre: config?.nombre || 'VIÑA',
        ruc: config?.ruc || '20605757451',
        eslogan: config?.eslogan || 'Agua de calidad para tu hogar',
        direccion: config?.direccion || 'Av. las rosas - UCAYALI - CORONEL PORTILLO - CALLERIA',
        telefono: config?.telefono || '961739701',
        email: config?.email || 'ventas@xn--aguavia-9za.com',
        logoTexto: config?.logo_texto || '💧'
      };
    } catch (error) {
      console.error('Error obteniendo datos de empresa:', error);
      return {
        nombre: 'VIÑA',
        ruc: '20605757451',
        eslogan: 'Agua de calidad para tu hogar',
        direccion: 'Av. las rosas - UCAYALI - CORONEL PORTILLO - CALLERIA',
        telefono: '961739701',
        email: 'ventas@xn--aguavia-9za.com',
        logoTexto: '💧'
      };
    }
  }

  /**
   * Obtiene el texto del tipo de comprobante
   */
  getTipoComprobanteTexto(tipo: string | undefined): string {
    if (!tipo) return 'Nota de Venta';
    switch(tipo.toUpperCase()) {
      case 'FACTURA': return 'Factura Electrónica';
      case 'BOLETA': return 'Boleta Electrónica';
      case 'SIN_COMPROBANTE': return 'Nota de Venta';
      default: return 'Nota de Venta';
    }
  }

  /**
   * Formatea fecha y hora
   */
  private formatearFechaHora(fechaHora: string): string {
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
      return fechaHora;
    }
  }

  /**
   * Convierte número a letras
   */
  numeroALetras(num: number): string {
    const entero = Math.floor(num);
    const decimal = Math.round((num - entero) * 100);
    
    const unidades = ['CERO', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (num === 0) return 'CERO';
    
    let letras = '';
    
    const convertirDosDigitos = (n: number): string => {
      if (n < 10) return unidades[n];
      if (n < 20) return especiales[n - 10];
      if (n < 30 && n > 20) return 'VEINTI' + unidades[n - 20];
      if (n < 100) {
        const decena = Math.floor(n / 10);
        const unidad = n % 10;
        return decenas[decena] + (unidad > 0 ? ' Y ' + unidades[unidad] : '');
      }
      return '';
    };

    const convertirTresDigitos = (n: number): string => {
      if (n < 100) return convertirDosDigitos(n);
      const centena = Math.floor(n / 100);
      const resto = n % 100;
      if (n === 100) return 'CIEN';
      if (resto === 0) return centenas[centena];
      return centenas[centena] + ' ' + convertirDosDigitos(resto);
    };

    const miles = Math.floor(entero / 1000);
    const restoMiles = entero % 1000;
    
    if (miles > 0) {
      if (miles === 1) {
        letras = 'MIL';
      } else {
        letras = convertirTresDigitos(miles) + ' MIL';
      }
      if (restoMiles > 0) {
        letras += ' ' + convertirTresDigitos(restoMiles);
      }
    } else {
      letras = convertirTresDigitos(entero);
    }
    
    letras = letras.charAt(0) + letras.slice(1).toLowerCase();
    return `${letras} CON ${decimal.toString().padStart(2, '0')}/100`;
  }
  // src/app/core/services/comprobante.service.ts

/**
 * Obtiene la URL del logo para usar en HTML (con crossorigin)
 */
getLogoUrlParaHTML(): string | null {
  const url = this.getLogoUrl();
  if (!url) return null;
  
  // Si la URL es del backend (localhost:4000), agregar crossorigin
  // Esto ayuda a que html2canvas pueda cargar la imagen
  return url;
}
}