import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { ProveedorFormComponent } from '../../../components/proveedor-form/proveedor-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Proveedor } from '../../../core/models/proveedor.model';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ExportOptionsDialogComponent } from '../../../components/export-options-dialog/export-options-dialog.component';

@Component({
  selector: 'app-proveedor-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './proveedor-list.component.html',
  styleUrls: ['./proveedor-list.component.css']
})
export class ProveedorListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'id_proveedor', 
    'razon_social', 
    'contacto', 
    'documento', 
    'direccion', 
    'activo', 
    'acciones'
  ];
  
  dataSource = new MatTableDataSource<Proveedor>([]);
  filteredData: Proveedor[] = [];
  isLoading = true;
  currentFilter: string = 'todos';
  searchValue: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(
    private proveedorService: ProveedorService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { 
    this.loadProveedores(); 
  }

  ngAfterViewInit(): void { 
    this.dataSource.paginator = this.paginator; 
    this.dataSource.sort = this.sort;
    
    // Configurar el filterPredicate por defecto para búsqueda por texto
    this.setupDefaultFilterPredicate();
    
    // Actualizar filteredData cuando cambie la data
    this.dataSource.connect().subscribe(data => {
      this.filteredData = data;
    });
  }
exportToPDF(): void {
  try {
    // Crear documento PDF
    const doc = new jsPDF();
    
    // Título del documento
    doc.setFontSize(18);
    doc.setTextColor(5, 124, 190); // Color primario
    doc.text('Lista de Proveedores', 14, 22);
    
    // Subtítulo con fecha
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const fecha = new Date().toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Fecha de exportación: ${fecha}`, 14, 30);
    
    // Información adicional
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total de proveedores: ${this.filteredData.length}`, 14, 38);
    
    // Preparar datos para la tabla
    const tableColumn = [
      'ID', 
      'Razón Social', 
      'Contacto', 
      'Documento', 
      'Teléfono', 
      'Dirección', 
      'Estado'
    ];
    
    const tableRows = this.filteredData.map(proveedor => [
      proveedor.id_proveedor.toString(),
      proveedor.razon_social,
      proveedor.nombre_completo,
      `${proveedor.tipo_documento}: ${proveedor.numero_documento}`,
      proveedor.telefono || 'N/A',
      proveedor.direccion || 'N/A',
      proveedor.activo ? 'Activo' : 'Inactivo'
    ]);
    
    // Generar tabla
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [5, 124, 190],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 15 }, // ID
        1: { cellWidth: 40 }, // Razón Social
        2: { cellWidth: 35 }, // Contacto
        3: { cellWidth: 35 }, // Documento
        4: { cellWidth: 20 }, // Teléfono
        5: { cellWidth: 35 }, // Dirección
        6: { cellWidth: 15 }, // Estado
      },
      didDrawPage: (data) => {
        // Pie de página
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generado por Sistema de Gestión - Página ${doc.getNumberOfPages()}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    // Guardar el PDF
    const fileName = `proveedores_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    this.showSuccess(`Exportados ${this.filteredData.length} proveedores a PDF`);
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    this.showError('Error al exportar a PDF');
  }
}
  // Configurar el filtro por defecto (búsqueda por texto)
  setupDefaultFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: Proveedor, filter: string) => {
      // Si no hay filtro, mostrar todos
      if (!filter) return true;
      
      const searchStr = filter.toLowerCase();
      
      // Buscar en múltiples campos
      return (
        (data.razon_social?.toLowerCase().includes(searchStr) || false) ||
        (data.nombre_completo?.toLowerCase().includes(searchStr) || false) ||
        (data.numero_documento?.toLowerCase().includes(searchStr) || false) ||
        (data.tipo_documento?.toLowerCase().includes(searchStr) || false) ||
        (data.telefono?.toLowerCase().includes(searchStr) || false) ||
        (data.direccion?.toLowerCase().includes(searchStr) || false)
      );
    };
  }

  loadProveedores(): void {
    this.isLoading = true;
    this.proveedorService.getProveedores().subscribe({
      next: (rows) => { 
        this.dataSource.data = rows; 
        this.filteredData = rows;
        this.isLoading = false;
        
        // Restaurar el filtro actual después de cargar datos
        if (this.currentFilter !== 'todos' || this.searchValue) {
          this.applyCurrentFilters();
        }
      },
      error: (error) => { 
        console.error('Error loading proveedores:', error);
        this.isLoading = false; 
        this.showError('Error al cargar proveedores'); 
      }
    });
  }

  applyFilter(event: Event): void {
    this.searchValue = (event.target as HTMLInputElement).value;
    this.applyCurrentFilters();
  }

  clearSearch(): void {
    if (this.searchInput) {
      this.searchInput.nativeElement.value = '';
      this.searchValue = '';
      this.applyCurrentFilters();
      this.searchInput.nativeElement.focus();
    }
  }

  filterByStatus(status: string): void {
    this.currentFilter = status;
    this.applyCurrentFilters();
    
    // Actualizar la selección visual de los chips
    // Esto es opcional, dependiendo de cómo manejes la selección
  }

  applyCurrentFilters(): void {
    // Si el filtro actual es 'todos', solo aplicar búsqueda por texto
    if (this.currentFilter === 'todos') {
      // Restaurar el filterPredicate por defecto
      this.setupDefaultFilterPredicate();
      
      // Aplicar solo el filtro de búsqueda si existe
      if (this.searchValue) {
        this.dataSource.filter = this.searchValue.trim().toLowerCase();
      } else {
        this.dataSource.filter = '';
      }
    } 
    // Para 'activos' e 'inactivos', aplicar filtro combinado
    else {
      // Crear un filterPredicate personalizado que combine estado y búsqueda
      this.dataSource.filterPredicate = (data: Proveedor, filter: string) => {
        // Primero, verificar el estado
        if (this.currentFilter === 'activos' && !data.activo) return false;
        if (this.currentFilter === 'inactivos' && data.activo) return false;
        
        // Si hay búsqueda por texto, aplicarla
        if (filter) {
          const searchStr = filter.toLowerCase();
          return (
            (data.razon_social?.toLowerCase().includes(searchStr) || false) ||
            (data.nombre_completo?.toLowerCase().includes(searchStr) || false) ||
            (data.numero_documento?.toLowerCase().includes(searchStr) || false) ||
            (data.tipo_documento?.toLowerCase().includes(searchStr) || false) ||
            (data.telefono?.toLowerCase().includes(searchStr) || false) ||
            (data.direccion?.toLowerCase().includes(searchStr) || false)
          );
        }
        
        // Si no hay búsqueda, mostrar todos los que cumplan el estado
        return true;
      };
      
      // Aplicar el filtro con el valor de búsqueda
      this.dataSource.filter = this.searchValue ? this.searchValue.trim().toLowerCase() : ' ';
      // Nota: Usamos un espacio en blanco para forzar la actualización del filtro
      // cuando no hay búsqueda pero queremos filtrar por estado
    }
    
    // Actualizar filteredData
    this.filteredData = this.dataSource.filteredData;
  }

  addProveedor(): void {
    const dialogRef = this.dialog.open(ProveedorFormComponent, { 
      width: '550px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'proveedor-dialog'
    });
    
    dialogRef.afterClosed().subscribe(result => { 
      if(result) {
        this.loadProveedores();
        this.showSuccess('Proveedor agregado exitosamente');
      }
    });
  }

  editProveedor(proveedor: Proveedor): void {
    const dialogRef = this.dialog.open(ProveedorFormComponent, { 
      width: '550px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: proveedor,
      panelClass: 'proveedor-dialog'
    });
    
    dialogRef.afterClosed().subscribe(result => { 
      if(result) {
        this.loadProveedores();
        this.showSuccess('Proveedor actualizado exitosamente');
      }
    });
  }

  deleteProveedor(proveedor: Proveedor): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { 
      width: '450px',
      maxWidth: '95vw',
      data: { 
        title: 'Eliminar Proveedor',
        message: `¿Está seguro de eliminar al proveedor "${proveedor.razon_social}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      } 
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if(result && proveedor.id_proveedor) {
        this.proveedorService.deleteProveedor(proveedor.id_proveedor).subscribe({
          next: () => { 
            this.showSuccess('Proveedor eliminado exitosamente'); 
            this.loadProveedores(); 
          },
          error: (error) => {
            console.error('Error deleting proveedor:', error);
            this.showError('Error al eliminar proveedor');
          }
        });
      }
    });
  }

  viewDetails(proveedor: Proveedor): void {
    console.log('View details:', proveedor);
    this.showInfo(`Viendo detalles de ${proveedor.razon_social}`);
  }

  viewProducts(proveedor: Proveedor): void {
    console.log('View products:', proveedor);
    this.showInfo(`Productos de ${proveedor.razon_social}`);
  }

  viewHistory(proveedor: Proveedor): void {
    console.log('View history:', proveedor);
    this.showInfo(`Historial de ${proveedor.razon_social}`);
  }

  exportToExcel(): void {
    try {
      const dataToExport = this.filteredData.map(proveedor => ({
        'ID': proveedor.id_proveedor,
        'Razón Social': proveedor.razon_social,
        'Nombre Contacto': proveedor.nombre_completo,
        'Tipo Documento': proveedor.tipo_documento,
        'Número Documento': proveedor.numero_documento,
        'Teléfono': proveedor.telefono || 'N/A',
        'Dirección': proveedor.direccion || 'N/A',
        'Estado': proveedor.activo ? 'Activo' : 'Inactivo',
        'Fecha Registro': new Date(proveedor.fecha_registro).toLocaleDateString('es-PE')
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');

      worksheet['!cols'] = [
        { wch: 5 },  // ID
        { wch: 30 }, // Razón Social
        { wch: 25 }, // Nombre Contacto
        { wch: 15 }, // Tipo Documento
        { wch: 15 }, // Número Documento
        { wch: 15 }, // Teléfono
        { wch: 30 }, // Dirección
        { wch: 10 }, // Estado
        { wch: 15 }, // Fecha Registro
      ];

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `proveedores_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      
      this.showSuccess(`Exportados ${dataToExport.length} proveedores correctamente`);
    } catch (error) {
      console.error('Error al exportar:', error);
      this.showError('Error al exportar datos');
    }
  }

exportData(): void {
  if (this.filteredData.length === 0) {
    this.showInfo('No hay datos para exportar');
    return;
  }
  
  const dialogRef = this.dialog.open(ExportOptionsDialogComponent, {
    width: '400px',
    data: { total: this.filteredData.length }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === 'excel') {
      this.exportToExcel();
    } else if (result === 'csv') {
      this.exportToCSV();
    } else if (result === 'pdf') {
      this.exportToPDF();
    }
  });
}
  exportToCSV(): void {
    try {
      const dataToExport = this.filteredData.map(proveedor => ({
        ID: proveedor.id_proveedor,
        RazonSocial: proveedor.razon_social,
        Contacto: proveedor.nombre_completo,
        TipoDocumento: proveedor.tipo_documento,
        NumeroDocumento: proveedor.numero_documento,
        Telefono: proveedor.telefono || '',
        Direccion: proveedor.direccion || '',
        Estado: proveedor.activo ? 'Activo' : 'Inactivo'
      }));

      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(row => Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(','));
      
      const csv = [headers, ...rows].join('\n');
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const fileName = `proveedores_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      
      this.showSuccess(`Exportados ${dataToExport.length} proveedores a CSV`);
    } catch (error) {
      console.error('Error al exportar a CSV:', error);
      this.showError('Error al exportar a CSV');
    }
  }

  private showSuccess(msg: string): void { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    }); 
  }

  private showError(msg: string): void { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 5000, 
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    }); 
  }

  private showInfo(msg: string): void { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['info-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    }); 
  }
}