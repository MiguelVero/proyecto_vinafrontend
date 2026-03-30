// src/app/core/services/export.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Exportar a Excel
   */
  exportToExcel(data: any[], filename: string, sheetName: string = 'Reporte'): void {
    try {
      // Preparar datos para Excel
      const excelData = data.map(item => ({
        'Producto': item.producto,
        'Descripción': item.descripcion || '',
        'Categoría': item.categoria,
        'Marca': item.marca,
        'Precio Unitario': item.precio,
        'Stock Actual': item.stockActual,
        'Stock Mínimo': item.stockMinimo,
        'Diferencia': item.stockActual - item.stockMinimo,
        'Valor Total': item.valorTotal,
        'Estado': this.getEstadoText(item.estado)
      }));

      // Crear workbook y worksheet
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
      
      // Ajustar anchos de columnas
      const columnWidths = [
        { wch: 30 }, // Producto
        { wch: 40 }, // Descripción
        { wch: 15 }, // Categoría
        { wch: 15 }, // Marca
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Stock Actual
        { wch: 15 }, // Stock Mínimo
        { wch: 15 }, // Diferencia
        { wch: 15 }, // Valor Total
        { wch: 15 }  // Estado
      ];
      worksheet['!cols'] = columnWidths;

      // Crear workbook
      const workbook: XLSX.WorkBook = { 
        Sheets: { [sheetName]: worksheet }, 
        SheetNames: [sheetName] 
      };

      // Convertir a buffer
      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      // Guardar archivo
      this.saveAsExcelFile(excelBuffer, filename);
      
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      throw new Error('No se pudo exportar a Excel');
    }
  }

  /**
   * Exportar a PDF
   */
  async exportToPDF(
    elementId: string, 
    filename: string, 
    title: string = 'Reporte de Inventario',
    metrics?: any
  ): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      
      if (!element) {
        throw new Error('Elemento no encontrado para exportar a PDF');
      }

      // Obtener dimensiones del elemento
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;

      // Crear PDF
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Agregar título
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, pageWidth / 2, 15, { align: 'center' });

      // Agregar fecha
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const fecha = new Date().toLocaleDateString('es-PE');
      pdf.text(`Generado el: ${fecha}`, pageWidth - 20, 15, { align: 'right' });

      // Agregar métricas si están disponibles
      if (metrics) {
        pdf.setFontSize(12);
        pdf.text(`Productos analizados: ${metrics.totalProductos}`, 20, 25);
        pdf.text(`Valor total del stock: S/ ${metrics.valorTotal.toFixed(2)}`, 20, 32);
        pdf.text(`Movimientos: ${metrics.totalMovimientos}`, 20, 39);
      }

      // Capturar el elemento como imagen
      const canvas = await html2canvas(element, {
        scale: 2, // Mejor calidad
        useCORS: true,
        logging: false,
        width: elementWidth,
        height: elementHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calcular dimensiones para la imagen en el PDF
      const imgWidth = pageWidth - 20; // Margen de 10mm cada lado
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 45; // Posición inicial después del título y métricas

      // Agregar la imagen al PDF (puede requerir múltiples páginas)
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Agregar páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Guardar PDF
      pdf.save(`${filename}.pdf`);
      
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      throw new Error('No se pudo exportar a PDF');
    }
  }

  /**
   * Exportar datos simples a PDF (sin captura de pantalla)
   */
  exportSimplePDF(data: any[], filename: string, title: string = 'Reporte de Inventario', metrics?: any): void {
    try {
      const pdf = new jsPDF();
      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;

      // Título
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin, yPosition);
      yPosition += 10;

      // Fecha
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const fecha = new Date().toLocaleDateString('es-PE');
      pdf.text(`Generado el: ${fecha}`, margin, yPosition);
      yPosition += 10;

      // Métricas
      if (metrics) {
        pdf.setFontSize(12);
        pdf.text(`• Productos analizados: ${metrics.totalProductos}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`• Valor total del stock: S/ ${metrics.valorTotal.toFixed(2)}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`• Movimientos: ${metrics.totalMovimientos}`, margin, yPosition);
        yPosition += 15;
      }

      // Encabezados de tabla
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const headers = ['Producto', 'Categoría', 'Stock', 'Mínimo', 'Valor', 'Estado'];
      const columnWidths = [60, 30, 20, 20, 25, 25];
      
      let xPosition = margin;
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += columnWidths[index];
      });
      
      yPosition += lineHeight;
      pdf.line(margin, yPosition - 2, margin + 180, yPosition - 2);

      // Datos
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      data.forEach((item, index) => {
        // Verificar si necesita nueva página
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        xPosition = margin;
        const rowData = [
          item.producto.substring(0, 30), // Limitar longitud
          item.categoria,
          item.stockActual.toString(),
          item.stockMinimo.toString(),
          `S/ ${item.valorTotal}`,
          this.getEstadoText(item.estado)
        ];

        rowData.forEach((cell, cellIndex) => {
          pdf.text(cell, xPosition, yPosition);
          xPosition += columnWidths[cellIndex];
        });

        yPosition += lineHeight;
      });

      // Guardar PDF
      pdf.save(`${filename}.pdf`);

    } catch (error) {
      console.error('Error al exportar PDF simple:', error);
      throw new Error('No se pudo exportar a PDF');
    }
  }

  /**
   * Método auxiliar para guardar archivo Excel
   */
  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    saveAs(data, `${fileName}_${new Date().getTime()}.xlsx`);
  }

  /**
   * Convertir estado a texto legible
   */
  private getEstadoText(estado: string): string {
    switch(estado) {
      case 'normal': return 'Normal';
      case 'bajo': return 'Bajo Stock';
      case 'agotado': return 'Agotado';
      default: return estado;
    }
  }
}