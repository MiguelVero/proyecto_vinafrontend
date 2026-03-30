// src/app/features/pages/ventas/panel-ventas/panel-ventas.component.ts
import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription,Subject  } from 'rxjs';
import { VentasService, Venta, EstadoVenta } from '../../../../core/services/ventas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmitirComprobanteComponent } from '../../../../components/sunat/emitir-comprobante/emitir-comprobante.component';
import { EstadisticasVentasComponent } from '../../../../components/ventas/estadisticas-ventas/estadisticas-ventas.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FechaService } from '../../../../core/services/fecha.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
@Component({
  selector: 'app-panel-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, EmitirComprobanteComponent, EstadisticasVentasComponent],
  templateUrl: './panel-ventas.component.html',
  styleUrls: ['./panel-ventas.component.css']
})
export class PanelVentasComponent implements OnInit, OnDestroy {
  showExportDropdown = false;
  dropdownTimeout: any;
  clickInsideDropdown = false;
  
  public ventasService = inject(VentasService);
  public authService = inject(AuthService);
  public router = inject(Router);
  public fechaService = inject(FechaService);
  // En la clase, AÑADE estas propiedades:
  private routeSubscription: Subscription | null = null;
  private navigationSubscription: Subscription | null = null;
   private route = inject(ActivatedRoute);
   private searchSubject = new Subject<string>();
   private searchSubscription: any;
  // Datos
  ventas: Venta[] = [];
  ventasFiltradas: Venta[] = [];
  estadosVenta: EstadoVenta[] = [];

  // Filtros
  filtroEstado: number = 0;
  filtroFecha: string = '';
  filtroEstadoPago: string = '';
  searchTerm: string = '';

  // Estados
  loading = false;
  error = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Estadísticas
  mostrarEstadisticas = false;
  estadisticasAvanzadas = {
    totalPagadoHoy: 0,
    totalCanceladoHoy: 0,
    promedioVentaHoy: 0,
    ventasPorMetodo: [] as any[]
  };
  
  // Filtros avanzados
  filtroRangoFechas = {
    inicio: '',
    fin: ''
  };

// Variables para las fechas
maxDate: string = '';
minDate: string = '';

// Añade estas variables después de las declaraciones existentes:
filtroRangoTemp = {
  inicio: '',
  fin: ''
};

rangoAplicado = {
  inicio: '',
  fin: ''
};

// Método toggleExportDropdown - CORREGIDO
toggleExportDropdown(event?: Event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault(); // Añadir esto
  }
  console.log('Toggle dropdown. Estado actual:', this.showExportDropdown);
  this.showExportDropdown = !this.showExportDropdown;
}

// Método closeExportDropdown - CORREGIDO
closeExportDropdown() {
  console.log('Cerrando dropdown...'); // Para debug
  this.showExportDropdown = false;
}
  private handleClickOutside(event: MouseEvent) {
    const dropdownElement = document.querySelector('.export-dropdown');
    const buttonElement = document.querySelector('.dropdown-toggle');
    
    if (dropdownElement && 
        !dropdownElement.contains(event.target as Node) &&
        !buttonElement?.contains(event.target as Node)) {
      this.closeExportDropdown();
    }
  }

  private removeEventListeners() {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  // Modifica el método exportarVentas para cerrar el dropdown
  exportarVentas(formato: 'excel' | 'csv' | 'json' | 'pdf' = 'excel') {
    this.closeExportDropdown();
    
    if (!this.authService.isAdmin()) {
      this.mostrarAlerta('Solo los administradores pueden exportar ventas', 'warning');
      return;
    }
    
    const ventasExportar = this.ventasFiltradas.length > 0 ? this.ventasFiltradas : this.ventas;
    
    if (ventasExportar.length === 0) {
      this.mostrarAlerta('No hay ventas para exportar', 'warning');
      return;
    }
    
    switch (formato) {
      case 'excel':
        this.exportarExcel(ventasExportar);
        break;
      case 'csv':
        this.exportarCSV(ventasExportar);
        break;
      case 'json':
        this.exportarJSON(ventasExportar);
        break;
      case 'pdf':
        this.exportarPDF(ventasExportar);
        break;
    }
  }

 // REEMPLAZA las líneas donde usas emojis en el PDF:
exportarResumenEjecutivo() {
   this.closeExportDropdown(); // AÑADIR esta línea
  if (!this.authService.isAdmin()) {
    this.mostrarAlerta('Solo los administradores pueden exportar resúmenes', 'warning');
    return;
  }
  
  const ventas = this.ventasFiltradas.length > 0 ? this.ventasFiltradas : this.ventas;
  
  if (ventas.length === 0) {
    this.mostrarAlerta('No hay ventas para generar resumen', 'warning');
    return;
  }
  
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const fechaActual = new Date();
    const fechaStr = fechaActual.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Portada - SIN EMOJIS
    doc.setFillColor(0, 153, 73); // Verde corporativo
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMEN EJECUTIVO', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('REPORTE DE VENTAS', 105, 28, { align: 'center' });
    
    // Información de generación
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${fechaStr}`, 105, 45, { align: 'center' });
    
    let yPos = 60;
    
    // Estadísticas principales - SIN EMOJIS
    doc.setFontSize(14);
    doc.setTextColor(0, 153, 73);
    doc.text('ESTADÍSTICAS PRINCIPALES', 14, yPos);
    yPos += 10;
    
    // ✅ CORREGIDO: Solo considerar ventas pagadas para cálculos
    const ventasPagadas = ventas.filter(v => v.estado === 'Pagado');
    const ventasCanceladas = ventas.filter(v => v.estado === 'Cancelado');
    const totalPagado = ventasPagadas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
    
    const stats = {
      totalVentas: ventas.length,
      ventasPagadas: ventasPagadas.length,
      ventasCanceladas: ventasCanceladas.length,
      montoTotal: totalPagado, // ✅ Solo ventas pagadas
      ticketPromedio: ventasPagadas.length > 0 ? totalPagado / ventasPagadas.length : 0,
      ventaMaxima: ventasPagadas.length > 0 ? 
        Math.max(...ventasPagadas.map(v => Number(v.total) || 0)) : 0
    };
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Primera columna
    doc.text(`• Total Ventas: ${stats.totalVentas}`, 14, yPos);
    doc.text(`• Ventas Pagadas: ${stats.ventasPagadas}`, 14, yPos + 6);
    doc.text(`• Ventas Canceladas: ${stats.ventasCanceladas}`, 14, yPos + 12);
    
    // Segunda columna
    doc.text(`• Monto Total: S/ ${stats.montoTotal.toFixed(2)}`, 80, yPos);
    doc.text(`• Ticket Promedio: S/ ${stats.ticketPromedio.toFixed(2)}`, 80, yPos + 6);
    doc.text(`• Venta Más Alta: S/ ${stats.ventaMaxima.toFixed(2)}`, 80, yPos + 12);
    
    yPos += 25;
    
    // Métodos de pago - SIN EMOJIS
    doc.setFontSize(14);
    doc.setTextColor(0, 153, 73);
    doc.text('MÉTODOS DE PAGO', 14, yPos);
    yPos += 10;
    
    // ✅ CORREGIDO: Solo contar ventas pagadas por método
    const metodos = this.calcularMetodosPagoResumen(ventasPagadas); // Solo ventas pagadas
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    let metodoY = yPos;
    metodos.forEach((metodo, index) => {
      if (index % 2 === 0 && index > 0) {
        metodoY += 15;
      }
      const x = 14 + (index % 2) * 90;
      
      if (metodoY < 250) {
        doc.text(`• ${metodo.metodo}: ${metodo.cantidad} ventas (S/ ${metodo.total.toFixed(2)})`, x, metodoY);
      }
    });
    
    yPos = metodoY + Math.ceil(metodos.length / 2) * 15 + 10;
    
    // Top 5 clientes - SIN EMOJIS
    doc.setFontSize(14);
    doc.setTextColor(0, 153, 73);
    doc.text('TOP 5 CLIENTES', 14, yPos);
    yPos += 10;
    
    // ✅ CORREGIDO: Solo ventas pagadas para top clientes
    const topClientes = this.calcularTopClientes(ventasPagadas, 5);
    
    autoTable(doc, {
      head: [['Cliente', 'Ventas', 'Monto Total']],
      body: topClientes.map(cliente => [
        this.truncarTexto(cliente.nombre, 30),
        cliente.ventas.toString(),
        `S/ ${cliente.monto.toFixed(2)}`
      ]),
      startY: yPos,
      theme: 'striped',
      headStyles: {
        fillColor: [57, 123, 190],
        textColor: [255, 255, 255]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 }
      },
      margin: { left: 14, right: 14 }
    });
    
    // Resumen por mes - SIN EMOJIS
    const ventasPorMes = this.calcularVentasPorMes(ventasPagadas); // Solo ventas pagadas
    if (ventasPorMes.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
      doc.setPage(doc.getNumberOfPages());
      
      doc.setFontSize(14);
      doc.setTextColor(0, 153, 73);
      doc.text('VENTAS POR MES', 14, finalY + 20);
      
      autoTable(doc, {
        head: [['Mes', 'Ventas', 'Monto Total']],
        body: ventasPorMes.map(mes => [
          mes.mes,
          mes.ventas.toString(),
          `S/ ${mes.monto.toFixed(2)}`
        ]),
        startY: finalY + 25,
        theme: 'grid',
        headStyles: {
          fillColor: [153, 77, 0],
          textColor: [255, 255, 255]
        }
      });
    }
    
    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Documento confidencial - Uso interno',
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    const nombreArchivo = `resumen_ejecutivo_${this.getFechaActual()}.pdf`;
    doc.save(nombreArchivo);
    
    this.mostrarAlerta('✅ Resumen ejecutivo generado exitosamente', 'success');
    
  } catch (error) {
    console.error('Error generando resumen:', error);
    this.mostrarAlerta('Error al generar el resumen. Por favor, intente nuevamente.', 'error');
  }
}

  mostrarOpcionesAvanzadas() {
    this.closeExportDropdown();
    
    const opciones = `
Seleccione las opciones de exportación:
  
1. Rango de fechas específico
2. Solo ventas pagadas
3. Incluir detalles de productos
4. Exportar con formato para contabilidad
5. Exportar para análisis en Power BI

¿Desea configurar opciones avanzadas?`;

    if (confirm(opciones)) {
      this.abrirModalOpcionesAvanzadas();
    }
  }

  // Métodos de exportación
  private exportarExcel(ventas: Venta[]) {
    const headers = [
      'ID Venta',
      'Fecha', 
      'Hora',
      'Cliente',
      'Razón Social',
      'Teléfono',
      'Total (S/)',
      'Estado',
      'Método de Pago',
      'Vendedor',
      'Repartidor',
      'Comprobante Emitido',
      'Tipo Comprobante'
    ];
    
    const rows = ventas.map(v => [
      v.id_venta,
      this.formatearFechaParaExportacion(v.fecha),
      v.hora || '',
      this.escapeCsv(v.nombre_completo || 'Sin nombre'),
      this.escapeCsv(v.razon_social || ''),
      v.telefono || '',
      `"${Number(v.total).toFixed(2)}"`,
      v.estado,
      v.metodo_pago,
      this.escapeCsv(v.vendedor || 'Sin asignar'),
      this.escapeCsv(v.repartidor || 'Sin asignar'),
      v.comprobante_emitido === 1 ? 'Sí' : 'No',
      v.tipo_comprobante_solicitado || 'SIN_COMPROBANTE'
    ]);
    
    const csvContent = [
      '\uFEFF',
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    this.descargarArchivo(csvContent, `ventas_excel_${this.getFechaActual()}.csv`, 'text/csv;charset=utf-8;');
    
    this.mostrarInstruccionesExcel();
  }

  private exportarCSV(ventas: Venta[]) {
    const headers = ['ID', 'Cliente', 'Fecha', 'Total', 'Estado', 'Método Pago', 'Vendedor', 'Repartidor'];
    const rows = ventas.map(v => [
      v.id_venta,
      this.escapeCsv(v.nombre_completo || 'Sin nombre'),
      v.fecha,
      `S/ ${v.total}`,
      v.estado,
      v.metodo_pago,
      this.escapeCsv(v.vendedor || 'Sin asignar'),
      this.escapeCsv(v.repartidor || 'Sin asignar')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    this.descargarArchivo(csvContent, `ventas_${this.getFechaActual()}.csv`, 'text/csv');
  }

  private exportarJSON(ventas: Venta[]) {
    const datos = {
      metadata: {
        fechaExportacion: new Date().toISOString(),
        totalVentas: ventas.length,
        totalMonto: ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0),
        filtrosAplicados: this.hayFiltrosActivos()
      },
      ventas: ventas.map(v => ({
        id: v.id_venta,
        cliente: {
          nombre: v.nombre_completo,
          razonSocial: v.razon_social,
          telefono: v.telefono
        },
        venta: {
          fecha: v.fecha,
          hora: v.hora,
          total: v.total,
          estado: v.estado,
          metodoPago: v.metodo_pago
        },
        personal: {
          vendedor: v.vendedor,
          repartidor: v.repartidor
        },
        sunat: {
          comprobanteEmitido: v.comprobante_emitido === 1,
          tipoComprobante: v.tipo_comprobante_solicitado
        }
      }))
    };
    
    const jsonContent = JSON.stringify(datos, null, 2);
    this.descargarArchivo(jsonContent, `ventas_${this.getFechaActual()}.json`, 'application/json');
  }

  private exportarPDF(ventas: Venta[]) {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const fechaActual = new Date();
      const fechaStr = fechaActual.toLocaleDateString('es-PE');
      const horaStr = fechaActual.toLocaleTimeString('es-PE');
      
      doc.setFontSize(18);
      doc.setTextColor(0, 153, 73);
      doc.text('REPORTE DE VENTAS', 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${fechaStr} ${horaStr}`, 105, 22, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const totalVentas = ventas.length;
      const totalMonto = ventas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
      const ventasPagadas = ventas.filter(v => v.estado === 'Pagado').length;
      
      doc.text(`Total Ventas: ${totalVentas} | Monto Total: S/ ${totalMonto.toFixed(2)} | Pagadas: ${ventasPagadas}`, 14, 30);
      
      const headers = [
        ['ID', 'Fecha', 'Cliente', 'Total', 'Estado', 'Método Pago', 'Vendedor', 'Repartidor']
      ];
      
      const data = ventas.map(v => [
        v.id_venta?.toString() || '',
        this.formatearFechaParaExportacion(v.fecha),
        this.truncarTexto(v.nombre_completo || 'Sin nombre', 20),
        `S/ ${Number(v.total).toFixed(2)}`,
        v.estado || '',
        v.metodo_pago || '',
        v.vendedor || 'Sin asignar',
        v.repartidor || 'Sin asignar'
      ]);
      
      autoTable(doc, {
        head: headers,
        body: data,
        startY: 35,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 153, 73],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 },
          7: { cellWidth: 30 }
        },
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        }
      });
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Página ${i} de ${pageCount} | Exportado desde Sistema de Ventas`,
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      const nombreArchivo = `reporte_ventas_${this.getFechaActual()}.pdf`;
      doc.save(nombreArchivo);
      
      this.mostrarAlerta('✅ Reporte PDF generado exitosamente', 'success');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      this.mostrarAlerta('Error al generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  // Métodos auxiliares
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

  private descargarArchivo(contenido: string, nombre: string, tipo: string) {
    const blob = new Blob([contenido], { type: tipo });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nombre);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeCsv(text: string): string {
    if (!text) return '';
    const escaped = text.replace(/"/g, '""');
    if (escaped.search(/[,;"\n]/) >= 0) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  private mostrarInstruccionesExcel() {
    const mensaje = `
✅ Archivo exportado exitosamente!

📋 INSTRUCCIONES PARA ABRIR EN EXCEL:

1. Abre Excel
2. Ve a "Datos" → "Desde archivo de texto/CSV"
3. Selecciona el archivo descargado
4. En el asistente de importación:
   - Codificación: Unicode (UTF-8)
   - Delimitador: Punto y coma (;)
   - Formato de columnas:
     * Fecha: Fecha (DD/MM/AAAA)
     * Total: General (para números)

💡 TIPS:
• Si usas Google Sheets: Sube el archivo y confirma que el separador es ";"
• Los acentos y caracteres especiales se verán correctamente
• Las fechas se reconocerán automáticamente

¿Quieres ver las instrucciones completas?`;
    
    if (confirm(mensaje)) {
      this.mostrarModalInstrucciones();
    }
  }

  private mostrarModalInstrucciones() {
    const html = `
    <div style="padding: 20px; max-width: 600px;">
      <h3>📊 Instrucciones para Importar a Excel</h3>
      
      <h4>Excel (Windows/Mac):</h4>
      <ol>
        <li>Abre Excel</li>
        <li>Ve a <strong>Datos → Desde archivo de texto/CSV</strong></li>
        <li>Selecciona el archivo exportado</li>
        <li>En el asistente:
          <ul>
            <li><strong>Origen del archivo:</strong> 65001: Unicode (UTF-8)</li>
            <li><strong>Delimitador:</strong> Marcar solo "Punto y coma"</li>
            <li><strong>Formato de columnas:</strong>
              <br/>• Fecha: Fecha (DMY)
              <br/>• Total: General
              <br/>• Demás columnas: Texto
            </li>
          </ul>
        </li>
        <li>Click en "Finalizar"</li>
      </ol>
      
      <h4>Google Sheets:</h4>
      <ol>
        <li>Abre Google Sheets</li>
        <li><strong>Archivo → Importar</strong></li>
        <li>Sube el archivo</li>
        <li>Selecciona "Reemplazar hoja de cálculo"</li>
        <li>En "Separador" selecciona "Punto y coma"</li>
      </ol>
      
      <h4>LibreOffice Calc:</h4>
      <ol>
        <li>Abre Calc</li>
        <li><strong>Archivo → Abrir</strong></li>
        <li>Selecciona "Todos los archivos"</li>
        <li>En "Opciones del filtro CSV":
          <br/>• Codificación: Unicode (UTF-8)
          <br/>• Separador: Punto y coma
        </li>
      </ol>
    </div>`;
    
    console.log('Instrucciones de exportación:', html);
    alert('Instrucciones guardadas. Consulta la consola del navegador para más detalles.');
  }

  private mostrarAlerta(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const iconos = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    alert(`${iconos[tipo]} ${mensaje}`);
  }

  private abrirModalOpcionesAvanzadas() {
    alert('Funcionalidad de opciones avanzadas en desarrollo.');
  }

 // REEMPLAZA el método calcularEstadisticasResumen:
private calcularEstadisticasResumen(ventas: Venta[]): any {
  // ✅ SOLO VENTAS PAGADAS para cálculos financieros
  const ventasPagadas = ventas.filter(v => v.estado === 'Pagado');
  const ventasCanceladas = ventas.filter(v => v.estado === 'Cancelado');
  const totalVentas = ventas.length;
  
  const montoTotal = ventasPagadas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const ticketPromedio = ventasPagadas.length > 0 ? montoTotal / ventasPagadas.length : 0;
  const ventaMaxima = ventasPagadas.length > 0 ? 
    Math.max(...ventasPagadas.map(v => Number(v.total) || 0)) : 0;
  
  return {
    totalVentas,
    ventasPagadas: ventasPagadas.length,
    ventasCanceladas: ventasCanceladas.length,
    montoTotal, // ✅ Solo ventas pagadas
    ticketPromedio, // ✅ Calculado solo con ventas pagadas
    ventaMaxima // ✅ Solo ventas pagadas
  };
}
  private calcularMetodosPagoResumen(ventas: Venta[]): any[] {
    const metodosMap = new Map();
    
    ventas.forEach(v => {
      const metodo = v.metodo_pago || 'Desconocido';
      const monto = Number(v.total) || 0;
      
      if (!metodosMap.has(metodo)) {
        metodosMap.set(metodo, { metodo, cantidad: 0, total: 0 });
      }
      
      const data = metodosMap.get(metodo);
      data.cantidad += 1;
      data.total += monto;
    });
    
    return Array.from(metodosMap.values())
      .sort((a, b) => b.total - a.total);
  }

  private calcularTopClientes(ventas: Venta[], limite: number): any[] {
    const clientesMap = new Map();
    
    ventas.forEach(v => {
      const cliente = v.nombre_completo || 'Cliente Desconocido';
      const monto = Number(v.total) || 0;
      
      if (!clientesMap.has(cliente)) {
        clientesMap.set(cliente, { nombre: cliente, ventas: 0, monto: 0 });
      }
      
      const data = clientesMap.get(cliente);
      data.ventas += 1;
      data.monto += monto;
    });
    
    return Array.from(clientesMap.values())
      .sort((a, b) => b.monto - a.monto)
      .slice(0, limite);
  }

  private calcularVentasPorMes(ventas: Venta[]): any[] {
    const mesesMap = new Map();
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    ventas.forEach(v => {
      if (v.fecha) {
        const fecha = new Date(v.fecha);
        const mes = fecha.getMonth();
        const anio = fecha.getFullYear();
        const clave = `${anio}-${mes}`;
        const monto = Number(v.total) || 0;
        
        if (!mesesMap.has(clave)) {
          mesesMap.set(clave, { mes: `${meses[mes]} ${anio}`, ventas: 0, monto: 0 });
        }
        
        const data = mesesMap.get(clave);
        data.ventas += 1;
        data.monto += monto;
      }
    });
    
    return Array.from(mesesMap.values())
      .sort((a, b) => {
        const [aAnio, aMes] = a.mes.split(' ');
        const [bAnio, bMes] = b.mes.split(' ');
        const aIndex = meses.indexOf(aMes);
        const bIndex = meses.indexOf(bMes);
        return parseInt(bAnio) - parseInt(aAnio) || bIndex - aIndex;
      });
  }

  private truncarTexto(texto: string, maxLength: number): string {
    if (!texto) return '';
    return texto.length > maxLength ? texto.substring(0, maxLength - 3) + '...' : texto;
  }

  // Resto de métodos existentes...
  verificarEstadosVentas() {
    console.log('🔍 VERIFICANDO ESTADOS DE VENTAS:');
    this.ventas.forEach(venta => {
      console.log(`Venta ${venta.id_venta}: Estado ID = ${venta.id_estado_venta}, Estado = ${venta.estado}`);
    });
    
    console.log('📋 ESTADOS DISPONIBLES:');
    this.estadosVenta.forEach(estado => {
      console.log(`ID: ${estado.id_estado_venta}, Nombre: ${estado.estado}`);
    });
  }

  verificarFechasVentas() {
    console.log('🔍 VERIFICANDO FECHAS DE VENTAS:');
    this.ventas.forEach(venta => {
      console.log(`Venta ${venta.id_venta}: Fecha BD = ${venta.fecha}, Hora BD = ${venta.hora}`);
    });
  }

// MODIFICA ngOnInit para configurar el debounce
ngOnInit() {
  this.cargarVentas();
  this.estadosVenta = this.ventasService.getEstadosVenta();
  this.cargarEstadisticasAvanzadas();
  this.inicializarFechas();
  
  // Configurar debounce para la búsqueda
  this.searchSubscription = this.searchSubject.pipe(
    debounceTime(500), // Esperar 500ms después de la última pulsación
    distinctUntilChanged() // Solo si el valor cambió
  ).subscribe(term => {
    this.searchTerm = term;
    this.aplicarFiltros();
  });
  
  // Sincronizar filtros con query params
  this.sincronizarConQueryParams();
  
  // Escuchar cambios en query params
  this.routeSubscription = this.route.queryParams.subscribe(params => {
    this.aplicarQueryParams(params);
  });
  
  // Guardar estado antes de navegar a detalle
  this.navigationSubscription = this.router.events.subscribe(event => {
    if (event.constructor.name === 'NavigationStart') {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.finalUrl?.toString().includes('/ventas/')) {
        this.guardarEstadoAntesDeNavegar();
      }
    }
  });
  
  // Debug después de cargar
  setTimeout(() => {
    this.debugFechasCargadas();
  }, 1500);
}


// NUEVO: Método para manejar la búsqueda con debounce
onSearchInput(term: string) {
  this.searchSubject.next(term);
}










// NUEVO: Guardar estado antes de navegar a detalle
private guardarEstadoAntesDeNavegar() {
  const estado = {
    filtroEstado: this.filtroEstado,
    filtroFecha: this.filtroFecha,
    filtroEstadoPago: this.filtroEstadoPago,
    searchTerm: this.searchTerm,
    filtroRangoFechas: this.filtroRangoFechas,
    rangoAplicado: this.rangoAplicado,
    currentPage: this.currentPage,
    itemsPerPage: this.itemsPerPage,
    mostrarEstadisticas: this.mostrarEstadisticas
  };
  
  sessionStorage.setItem('ventas_panel_estado', JSON.stringify(estado));
  console.log('💾 Estado guardado antes de navegar:', estado);
}

// NUEVO: Sincronizar con query params al inicio
private sincronizarConQueryParams() {
  const queryParams: any = {};
  
  if (this.filtroEstado > 0) queryParams.estado = this.filtroEstado;
  if (this.filtroFecha) queryParams.fecha = this.filtroFecha;
  if (this.filtroEstadoPago) queryParams.estadoPago = this.filtroEstadoPago;
  if (this.searchTerm) queryParams.busqueda = this.searchTerm;
  if (this.filtroRangoFechas.inicio) queryParams.rangoInicio = this.filtroRangoFechas.inicio;
  if (this.filtroRangoFechas.fin) queryParams.rangoFin = this.filtroRangoFechas.fin;
  if (this.currentPage > 1) queryParams.pagina = this.currentPage;
  if (this.itemsPerPage !== 10) queryParams.items = this.itemsPerPage;
  
  if (Object.keys(queryParams).length > 0) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}

// REEMPLAZA el método aplicarQueryParams
private aplicarQueryParams(params: any) {
  console.log('📥 Aplicando query params:', params);
  
  // Si no hay parámetros, resetear todo
  if (Object.keys(params).length === 0) {
    this.filtroEstado = 0;
    this.filtroFecha = '';
    this.filtroEstadoPago = '';
    this.searchTerm = '';
    this.filtroRangoFechas = { inicio: '', fin: '' };
    this.rangoAplicado = { inicio: '', fin: '' };
    this.aplicarFiltros();
    return;
  }
  
  let cambios = false;
  
  // Estado
  if (params['estado'] !== undefined) {
    const nuevoEstado = +params['estado'];
    if (nuevoEstado !== this.filtroEstado) {
      this.filtroEstado = nuevoEstado;
      cambios = true;
    }
  } else if (this.filtroEstado !== 0) {
    this.filtroEstado = 0;
    cambios = true;
  }
  
  // Fecha específica
  if (params['fecha'] !== undefined) {
    if (params['fecha'] !== this.filtroFecha) {
      this.filtroFecha = params['fecha'];
      cambios = true;
    }
  } else if (this.filtroFecha !== '') {
    this.filtroFecha = '';
    cambios = true;
  }
  
  // Estado de pago
  if (params['estadoPago'] !== undefined) {
    if (params['estadoPago'] !== this.filtroEstadoPago) {
      this.filtroEstadoPago = params['estadoPago'];
      cambios = true;
    }
  } else if (this.filtroEstadoPago !== '') {
    this.filtroEstadoPago = '';
    cambios = true;
  }
  
  // Búsqueda
  if (params['busqueda'] !== undefined) {
    if (params['busqueda'] !== this.searchTerm) {
      this.searchTerm = params['busqueda'];
      cambios = true;
    }
  } else if (this.searchTerm !== '') {
    this.searchTerm = '';
    cambios = true;
  }
  
  // Rango de fechas
  const rangoInicio = params['rangoInicio'] || '';
  const rangoFin = params['rangoFin'] || '';
  
  if (rangoInicio && rangoFin) {
    if (rangoInicio !== this.filtroRangoFechas.inicio || 
        rangoFin !== this.filtroRangoFechas.fin) {
      this.filtroRangoFechas = { inicio: rangoInicio, fin: rangoFin };
      this.rangoAplicado = { inicio: rangoInicio, fin: rangoFin };
      cambios = true;
    }
  } else if (this.filtroRangoFechas.inicio || this.filtroRangoFechas.fin) {
    this.filtroRangoFechas = { inicio: '', fin: '' };
    this.rangoAplicado = { inicio: '', fin: '' };
    cambios = true;
  }
  
  if (cambios) {
    console.log('🔄 Cambios detectados en query params, aplicando filtros');
    this.aplicarFiltros();
  }
}
debugFechasCargadas() {
    console.log('🔍 DEBUG FECHAS CARGADAS:');
    this.ventas.forEach(v => {
        if (v.id_venta && v.id_venta >= 94 && v.id_venta <= 97) {
            const fechaExtraida = this.fechaService.extraerSoloFecha(v.fecha);
            console.log(`Venta #${v.id_venta}:`, {
                fechaOriginal: v.fecha,
                fechaExtraida: fechaExtraida,
                tipoFecha: typeof v.fecha,
                fechaFormateada: this.fechaService.formatFechaTabla(v.fecha),
                fechaObj: new Date(v.fecha),
                horaOriginal: v.hora,
                horaFormateada: this.fechaService.formatHora(v.hora)
            });
        }
    });
}

// MODIFICA ngOnDestroy para limpiar la suscripción
ngOnDestroy() {
  this.removeEventListeners();
  if (this.routeSubscription) {
    this.routeSubscription.unsubscribe();
  }
  if (this.navigationSubscription) {
    this.navigationSubscription.unsubscribe();
  }
  if (this.searchSubscription) {
    this.searchSubscription.unsubscribe();
  }
}
  cargarEstadisticasAvanzadas() {
    if (!this.authService.isAdmin() && !this.authService.isVendedor()) return;
    
    const hoy = new Date().toISOString().split('T')[0];
    
    this.calcularEstadisticasLocales();
  }

// Reemplaza el método inicializarFechas():
inicializarFechas() {
  const hoy = new Date();
  
  // Fecha máxima: hoy
  this.maxDate = hoy.toISOString().split('T')[0];
  
  // Fecha mínima: 1 año atrás
  const haceUnAnio = new Date();
  haceUnAnio.setFullYear(hoy.getFullYear() - 1);
  this.minDate = haceUnAnio.toISOString().split('T')[0];
  
  // Inicializar fechas temporales
  this.filtroRangoTemp = { inicio: '', fin: '' };
  this.rangoAplicado = { inicio: '', fin: '' };
}
// Método para cambio de fecha específica
onFechaEspecificaChange() {
  if (this.filtroFecha) {
    // Si se selecciona una fecha específica, limpiar el rango
    this.filtroRangoFechas = { inicio: '', fin: '' };
  }
  this.aplicarFiltros();
}


// MODIFICA limpiarFiltroRango
limpiarFiltroRango() {
  console.log('🧹 Limpiando filtro de rango...');
  
  // Limpiar todo
  this.filtroRangoTemp = { inicio: '', fin: '' };
  this.filtroRangoFechas = { inicio: '', fin: '' };
  this.rangoAplicado = { inicio: '', fin: '' };
  
  // Actualizar URL (esto eliminará los parámetros de rango)
  this.actualizarUrlConFiltros();
  
  this.aplicarFiltros();
  this.mostrarAlerta('Rango de fechas limpiado', 'info');
}


// Modifica el método establecerRangoRapido():
establecerRangoRapido(tipo: string) {
  const hoy = new Date();
  
  switch (tipo) {
    case 'hoy':
      const hoyStr = hoy.toISOString().split('T')[0];
      this.filtroRangoTemp = { inicio: hoyStr, fin: hoyStr };
      break;
      
    case 'ayer':
      const ayer = new Date(hoy);
      ayer.setDate(hoy.getDate() - 1);
      const ayerStr = ayer.toISOString().split('T')[0];
      this.filtroRangoTemp = { inicio: ayerStr, fin: ayerStr };
      break;
      
    case 'semana':
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
      const finSemana = new Date(hoy);
      finSemana.setDate(hoy.getDate() + (6 - hoy.getDay())); // Sábado
      
      this.filtroRangoTemp = {
        inicio: inicioSemana.toISOString().split('T')[0],
        fin: finSemana.toISOString().split('T')[0]
      };
      break;
      
    case 'mes':
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      
      this.filtroRangoTemp = {
        inicio: inicioMes.toISOString().split('T')[0],
        fin: finMes.toISOString().split('T')[0]
      };
      break;
  }
  
  // No aplicar automáticamente, solo mostrar en los inputs
  // El usuario debe presionar "Aplicar Rango"
  
  this.mostrarAlerta(`Rango "${tipo}" seleccionado. Presiona "Aplicar Rango" para filtrar.`, 'info');
}

  calcularEstadisticasLocales() {
  const hoy = new Date().toISOString().split('T')[0];
  
  // Filtrar ventas de hoy
  const ventasHoy = this.ventas.filter(v => {
    if (!v.fecha) return false;
    return new Date(v.fecha).toISOString().split('T')[0] === hoy;
  });
  
  // ✅ SOLO VENTAS PAGADAS para cálculos financieros
  const ventasPagadasHoy = ventasHoy.filter(v => v.estado === 'Pagado');
  const ventasCanceladasHoy = ventasHoy.filter(v => v.estado === 'Cancelado');
  
  // Total pagado hoy (solo ventas pagadas)
  this.estadisticasAvanzadas.totalPagadoHoy = ventasPagadasHoy
    .reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  
  // Total cancelado hoy
  this.estadisticasAvanzadas.totalCanceladoHoy = ventasCanceladasHoy
    .reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  
  // ✅ Ticket Promedio (solo ventas pagadas)
  this.estadisticasAvanzadas.promedioVentaHoy = ventasPagadasHoy.length > 0 
    ? this.estadisticasAvanzadas.totalPagadoHoy / ventasPagadasHoy.length 
    : 0;
  
  // Ventas por método de pago (solo ventas pagadas)
  this.estadisticasAvanzadas.ventasPorMetodo = this.calcularVentasPorMetodoPago(ventasPagadasHoy);
}
  calcularVentasPorMetodoPago(ventas: Venta[]): any[] {
    const metodos = this.ventasService.getMetodosPago();
    const resultado: any[] = [];
    
    metodos.forEach(metodo => {
      const ventasMetodo = ventas.filter(v => v.id_metodo_pago === metodo.id_metodo_pago && v.estado === 'Pagado');
      const total = ventasMetodo.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
      
      if (total > 0) {
        resultado.push({
          metodo: metodo.metodo_pago,
          cantidad: ventasMetodo.length,
          total: total,
          porcentaje: ventas.length > 0 ? (ventasMetodo.length / ventas.length) * 100 : 0
        });
      }
    });
    
    return resultado;
  }

// Reemplaza el método aplicarFiltroRangoFechas():
// MODIFICA aplicarFiltroRangoFechas
aplicarFiltroRangoFechas() {
  if (this.filtroRangoTemp.inicio && this.filtroRangoTemp.fin) {
    this.filtroRangoFechas = {
      inicio: this.filtroRangoTemp.inicio,
      fin: this.filtroRangoTemp.fin
    };
    
    this.rangoAplicado = {
      inicio: this.filtroRangoFechas.inicio,
      fin: this.filtroRangoFechas.fin
    };
    
    this.filtroFecha = '';
    
    // Usar el método unificado para actualizar URL
    this.actualizarUrlConFiltros();
    
    this.aplicarFiltrosConRango();
    
    const inicioFormateada = this.fechaService.formatFechaTabla(this.filtroRangoFechas.inicio);
    const finFormateada = this.fechaService.formatFechaTabla(this.filtroRangoFechas.fin);
    this.mostrarAlerta(`Rango aplicado: ${inicioFormateada} - ${finFormateada}`, 'success');
  } else {
    this.mostrarAlerta('Por favor, seleccione ambas fechas para el rango', 'warning');
  }
}
// Añade este método para formatear fechas correctamente:
private formatarFechaParaMostrar(fecha: string): string {
  if (!fecha) return '';
  
  try {
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return fecha;
    
    // Formato DD/MM/YYYY
    const dia = fechaObj.getDate().toString().padStart(2, '0');
    const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaObj.getFullYear();
    
    return `${dia}/${mes}/${anio}`;
  } catch (error) {
    console.error('Error formateando fecha:', error, 'Fecha:', fecha);
    return fecha;
  }
}

// Modifica el método aplicarFiltrosConRango() para usar rangoAplicado:
aplicarFiltrosConRango() {
  console.log('🔍 Aplicando filtros con rango:', this.filtroRangoFechas);

  let filtered = [...this.ventas];

  if (this.filtroRangoFechas.inicio && this.filtroRangoFechas.fin) {
    const inicio = this.filtroRangoFechas.inicio;
    const fin = this.filtroRangoFechas.fin;
    
    console.log('📅 Comparando rango:', inicio, 'hasta', fin);
    
    filtered = filtered.filter(venta => {
      if (!venta.fecha) return false;
      
      // Usar el servicio para extraer solo la fecha
      const fechaVenta = this.fechaService.extraerSoloFecha(venta.fecha);
      
      // Validar
      if (!fechaVenta.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn(`⚠️ Venta #${venta.id_venta} fecha inválida:`, {
          original: venta.fecha,
          extraida: fechaVenta
        });
        return false;
      }
      
      return fechaVenta >= inicio && fechaVenta <= fin;
    });
    
    console.log(`📊 Filtrado por rango ${inicio} - ${fin}: ${filtered.length} ventas`);
  }

    if (this.filtroEstado > 0) {
    const estadoFiltro = Number(this.filtroEstado);
    filtered = filtered.filter(venta => venta.id_estado_venta === estadoFiltro);
  }

  if (this.filtroEstadoPago) {
    switch (this.filtroEstadoPago) {
      case 'pagado':
        filtered = filtered.filter(v => v.estado === 'Pagado');
        break;
      case 'pendiente':
        filtered = filtered.filter(v => v.estado !== 'Pagado' && v.estado !== 'Cancelado');
        break;
      case 'cancelado':
        filtered = filtered.filter(v => v.estado === 'Cancelado');
        break;
    }
  }

  if (this.searchTerm) {
    const term = this.searchTerm.toLowerCase();
    filtered = filtered.filter(venta => {
      return (
        venta.nombre_completo?.toLowerCase().includes(term) ||
        venta.id_venta?.toString().includes(term) ||
        venta.estado?.toLowerCase().includes(term) ||
        venta.telefono?.includes(term) ||
        venta.razon_social?.toLowerCase().includes(term)
      );
    });
  }

  console.log(`📊 Resultados filtrados: ${filtered.length} de ${this.ventas.length}`);
  
  this.ventasFiltradas = filtered;
  this.totalItems = filtered.length;
  this.currentPage = 1;
}

  getResumenDiario(): {[key: string]: {total: number, cantidad: number}} {
    const resumen: {[key: string]: {total: number, cantidad: number}} = {};
    
    this.ventas.forEach(venta => {
      if (venta.estado === 'Pagado' && venta.fecha) {
        const fecha = venta.fecha;
        if (!resumen[fecha]) {
          resumen[fecha] = { total: 0, cantidad: 0 };
        }
        resumen[fecha].total += Number(venta.total) || 0;
        resumen[fecha].cantidad += 1;
      }
    });
    
    return resumen;
  }

  cargarVentas() {
    this.loading = true;
    this.error = '';

    this.ventasService.getVentas().subscribe({
      next: (ventas) => {
        console.log('📦 Ventas cargadas:', ventas);
        this.ventas = ventas;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar las ventas';
        this.loading = false;
        console.error('Error cargando ventas:', error);
      }
    });
  }

 // En panel-ventas.component.ts
// REEMPLAZAR el método formatearFechaTabla en panel-ventas.component.ts

// AÑADIR este método para debug
verificarFechasEnPanel() {
    console.log('🔍 VERIFICANDO FECHAS EN PANEL:');
    this.ventasFiltradas.forEach((venta, index) => {
        if (venta.id_venta === 97 || venta.id_venta === 96 || venta.id_venta === 95) {
            console.log(`Venta #${venta.id_venta}:`, {
                fechaBD: venta.fecha,
                fechaFormateada: this.fechaService.formatFechaTabla(venta.fecha),
                fechaObj: new Date(venta.fecha)
            });
        }
    });
}
// Agregar método para fecha-hora completa
formatearFechaHoraCompleta(fecha: string, hora: string): string {
    if (!fecha || !hora) return '';
    
    try {
        // Crear fecha completa en Perú
        const fechaCompleta = new Date(`${fecha}T${hora}:00-05:00`);
        
        if (isNaN(fechaCompleta.getTime())) {
            return `${fecha} ${hora}`;
        }
        
        return fechaCompleta.toLocaleString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Lima'
        });
    } catch (error) {
        console.error('Error formateando fecha-hora:', error);
        return `${fecha} ${hora}`;
    }
}

  formatearFechaParaExportacion(fecha: string): string {
    if (!fecha) return '';
    
    try {
      const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, anio, mes, dia] = match;
        return `${dia}/${mes}/${anio}`;
      }
      
      return fecha;
    } catch (error) {
      console.error('Error formateando fecha para exportación:', error);
      return fecha;
    }
  }

  

// REEMPLAZA el método aplicarFiltros completo
aplicarFiltros() {
  console.log('🔍 Aplicando filtros:', {
    estado: this.filtroEstado,
    fecha: this.filtroFecha,
    estadoPago: this.filtroEstadoPago,
    busqueda: this.searchTerm
  });

  let filtered = [...this.ventas];

  if (this.filtroEstado > 0) {
    const estadoFiltro = Number(this.filtroEstado);
    filtered = filtered.filter(venta => venta.id_estado_venta === estadoFiltro);
  }

  if (this.filtroFecha) {
    filtered = filtered.filter(venta => {
      if (!venta.fecha) return false;
      const fechaVenta = new Date(venta.fecha).toISOString().split('T')[0];
      return fechaVenta === this.filtroFecha;
    });
  }

  if (this.filtroEstadoPago) {
    switch (this.filtroEstadoPago) {
      case 'pagado':
        filtered = filtered.filter(v => v.estado === 'Pagado');
        break;
      case 'pendiente':
        filtered = filtered.filter(v => v.estado !== 'Pagado' && v.estado !== 'Cancelado');
        break;
      case 'cancelado':
        filtered = filtered.filter(v => v.estado === 'Cancelado');
        break;
    }
  }

  if (this.searchTerm) {
    const term = this.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(venta => {
      return (
        venta.nombre_completo?.toLowerCase().includes(term) ||
        venta.id_venta?.toString().includes(term) ||
        venta.estado?.toLowerCase().includes(term) ||
        venta.telefono?.includes(term) ||
        venta.razon_social?.toLowerCase().includes(term)
      );
    });
  }

  console.log(`📊 Resultados filtrados: ${filtered.length} de ${this.ventas.length}`);
  
  this.ventasFiltradas = filtered;
  this.totalItems = filtered.length;
  this.currentPage = 1;
  
  // Actualizar URL con los filtros activos SOLO si hay filtros aplicados
  this.actualizarUrlConFiltros();
}

// NUEVO: Método separado para actualizar la URL solo con filtros que tienen valor
private actualizarUrlConFiltros() {
  const queryParams: any = {};
  
  // Solo agregar parámetros que tengan valores significativos
  if (this.filtroEstado > 0) {
    queryParams.estado = this.filtroEstado;
  }
  
  if (this.filtroFecha) {
    queryParams.fecha = this.filtroFecha;
  }
  
  if (this.filtroEstadoPago) {
    queryParams.estadoPago = this.filtroEstadoPago;
  }
  
  if (this.searchTerm && this.searchTerm.trim() !== '') {
    queryParams.busqueda = this.searchTerm.trim();
  }
  
  if (this.filtroRangoFechas.inicio && this.filtroRangoFechas.fin) {
    queryParams.rangoInicio = this.filtroRangoFechas.inicio;
    queryParams.rangoFin = this.filtroRangoFechas.fin;
  }
  
  // Solo navegar si los parámetros han cambiado para evitar loops infinitos
  const currentParams = this.route.snapshot.queryParams;
  const paramsChanged = JSON.stringify(currentParams) !== JSON.stringify(queryParams);
  
  if (paramsChanged) {
    console.log('🔄 Actualizando URL con filtros:', queryParams);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      replaceUrl: true
    });
  }
}
  get ventasPendientes(): number {
    return this.ventas.filter(v => v.id_estado_venta === 1).length;
  }

  get ventasLista(): number {
    return this.ventas.filter(v => v.id_estado_venta === 4).length;
  }

  cambiarEstadoVenta(venta: Venta, nuevoEstado: any) {
    if (!this.authService.isAdmin() && !this.authService.isVendedor()) {
      alert('Solo administradores y vendedores pueden cambiar el estado de las ventas');
      return;
    }

    const estadoNumerico = Number(nuevoEstado);
    
    if (this.authService.isVendedor() && !this.authService.isAdmin()) {
      const estadosPermitidosVendedor = [1, 4, 8];
      if (!estadosPermitidosVendedor.includes(estadoNumerico)) {
        alert('Los vendedores solo pueden cambiar a: Pendiente, Listo para repartos, Cancelado');
        return;
      }
    }

    const estadoEncontrado = this.estadosVenta.find(e => e.id_estado_venta === estadoNumerico);
    const nombreEstado = estadoEncontrado?.estado || 'Desconocido';

    if (confirm(`¿Cambiar estado a "${nombreEstado}"?`)) {
      this.ventasService.updateEstadoVenta(venta.id_venta!, estadoNumerico).subscribe({
        next: (response) => {
          venta.id_estado_venta = estadoNumerico;
          venta.estado = nombreEstado;
          this.aplicarFiltros();
          alert('✅ Estado actualizado correctamente');
        },
        error: (error) => {
          alert('Error al actualizar el estado');
          console.error('Error actualizando estado:', error);
        }
      });
    }
  }

  recargarVenta(id: number) {
    this.ventasService.getVentaById(id).subscribe({
      next: (ventaActualizada) => {
        const index = this.ventas.findIndex(v => v.id_venta === id);
        if (index !== -1) {
          this.ventas[index] = ventaActualizada;
          this.aplicarFiltros();
        }
      },
      error: (error) => {
        console.error('Error recargando venta:', error);
      }
    });
  }

  getEstadoNombre(idEstado: any): string {
    const idNumerico = Number(idEstado);
    
    console.log('🔍 Buscando estado con ID:', {
      idOriginal: idEstado,
      idConvertido: idNumerico,
      tipoOriginal: typeof idEstado,
      tipoConvertido: typeof idNumerico
    });
    
    console.log('📋 Estados disponibles:', this.estadosVenta);
    
    const estado = this.estadosVenta.find(e => e.id_estado_venta === idNumerico);
    const nombre = estado?.estado || 'Desconocido';
    
    console.log('✅ Estado encontrado:', nombre);
    return nombre;
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

  goToAsignacionRutas() {
    if (this.authService.hasModuleAccess('ventas_asignacion_rutas')) {
      this.router.navigate(['/ventas/asignacion-rutas']);
    }
  }

// MODIFICA el método verDetalleVenta
verDetalleVenta(id: number) {
  // Guardar estado actual en URL (ya está sincronizado)
  this.router.navigate(['/ventas', id], {
    queryParams: {
      return: JSON.stringify({
        route: '/ventas',
        queryParams: this.route.snapshot.queryParams,
        page: this.currentPage,
        items: this.itemsPerPage
      })
    }
  });
}
  nuevaVenta() {
    this.router.navigate(['/ventas/nueva']);
  }

  irAAsignacionRutas() {
    this.router.navigate(['/ventas/asignacion-rutas']);
  }

  get ventasPaginadas(): Venta[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.ventasFiltradas.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }
// MODIFICA cambiarPagina
cambiarPagina(pagina: number) {
  this.currentPage = pagina;
  
  // Actualizar URL con página actual
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { pagina: this.currentPage },
    queryParamsHandling: 'merge',
    replaceUrl: true
  });
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  get paginas(): number[] {
    const pages = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

// REEMPLAZA el método limpiarFiltros completo
limpiarFiltros() {
  console.log('🧹 Limpiando todos los filtros...');
  
  // Resetear todos los filtros a sus valores por defecto
  this.filtroEstado = 0;
  this.filtroFecha = '';
  this.filtroEstadoPago = '';
  this.filtroRangoFechas = { inicio: '', fin: '' };
  this.rangoAplicado = { inicio: '', fin: '' };
  this.searchTerm = '';
  
  // Limpiar completamente los query params - ¡ESTA ES LA CLAVE!
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: {}, // Vacío para eliminar TODOS los parámetros
    replaceUrl: true // Reemplazar en el historial, no agregar
  }).then(() => {
    console.log('✅ Query params limpiados, URL actual:', this.router.url);
    this.aplicarFiltros(); // Aplicar filtros con valores vacíos
  });
}

  onComprobanteEmitido(event: any) {
    console.log('Comprobante emitido para venta:', event);
    const ventaIndex = this.ventas.findIndex(v => v.id_venta === event.idVenta);
    if (ventaIndex !== -1) {
      this.ventas[ventaIndex].comprobante_emitido = 1;
      this.aplicarFiltros();
    }
  }

// Modifica el método hayFiltrosActivos() para que no considere el rango temporal:
hayFiltrosActivos(): boolean {
  return (
    this.filtroEstado > 0 ||
    this.filtroEstadoPago !== '' ||
    this.filtroFecha !== '' ||
    this.searchTerm !== '' ||
    (this.filtroRangoFechas.inicio !== '' && this.filtroRangoFechas.fin !== '')
  );
}

// MODIFICA removerFiltro
removerFiltro(tipo: string) {
  console.log(`🧹 Removiendo filtro: ${tipo}`);
  
  switch (tipo) {
    case 'estado':
      this.filtroEstado = 0;
      break;
    case 'estadoPago':
      this.filtroEstadoPago = '';
      break;
    case 'fecha':
      this.filtroFecha = '';
      break;
    case 'busqueda':
      this.searchTerm = '';
      this.searchSubject.next(''); // Notificar al subject de búsqueda
      break;
    case 'rango':
      this.limpiarFiltroRango();
      return; // limpiarFiltroRango ya llama a actualizarUrlConFiltros()
  }
  
  // Actualizar URL y aplicar filtros
  this.actualizarUrlConFiltros();
  this.aplicarFiltros();
}
  getNombreEstadoPago(estado: string): string {
    const estados: {[key: string]: string} = {
      'pagado': 'Pagado',
      'pendiente': 'Pendiente',
      'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
  }

  getVentasPagadas(): number {
    return this.ventas.filter(v => v.estado === 'Pagado').length;
  }
getVentasCanceladas(): number {
    return this.ventas.filter(v => v.estado === 'Cancelado').length;
  }
  getTotalVentasPagadas(): number {
    return this.ventas
      .filter(v => v.estado === 'Pagado')
      .reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  }

    // Asegúrate que este método solo sume ventas pagadas:
    getTotalVentasPagadasFiltradas(): number {
      return this.ventasFiltradas
        .filter(v => v.estado === 'Pagado') // ✅ Solo ventas pagadas
        .reduce((sum, v) => sum + (Number(v.total) || 0), 0);
    }
  formatearFechaHoraCorta(fechaHora: string): string {
    if (!fechaHora) return '';
    try {
      const date = new Date(fechaHora);
      return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  }

  getMetodoPagoIcon(idMetodo: number): string {
    const iconos: {[key: number]: string} = {
      1: 'fas fa-money-bill-wave',
      2: 'fas fa-mobile-alt',
      3: 'fas fa-university',
      4: 'fas fa-credit-card'
    };
    return iconos[idMetodo] || 'fas fa-money-bill-wave';
  }

// MODIFICA cambiarItemsPorPagina
cambiarItemsPorPagina() {
  this.currentPage = 1;
  
  // Actualizar URL con items por página
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { 
      items: this.itemsPerPage,
      pagina: 1
    },
    queryParamsHandling: 'merge',
    replaceUrl: true
  });
}

  recargarTodasVentas() {
    this.cargarVentas();
  }

  mostrarSelectorEstado(venta: Venta) {
    const nuevoEstado = prompt('Selecciona nuevo estado:', venta.estado);
    if (nuevoEstado) {
      const estado = this.estadosVenta.find(e => e.estado === nuevoEstado);
      if (estado) {
        this.cambiarEstadoVenta(venta, estado.id_estado_venta);
      }
    }
  }

  editarVenta(id: number) {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/ventas/editar', id]);
    }
  }
  
  // En panel-ventas.component.ts - AÑADE métodos auxiliares
getFechaFiltroFormateada(fecha: string): string {
  if (!fecha) return '';
  return this.fechaService.formatFechaInput(fecha);
}

getRangoFechasFormateado(): string {
  if (!this.filtroRangoFechas.inicio || !this.filtroRangoFechas.fin) return '';
  
  const inicio = this.fechaService.formatFechaInput(this.filtroRangoFechas.inicio);
  const fin = this.fechaService.formatFechaInput(this.filtroRangoFechas.fin);
  
  return `${inicio} - ${fin}`;
}
}