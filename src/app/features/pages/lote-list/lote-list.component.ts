import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoteService } from '../../../core/services/lote.service';
import { LoteFormComponent } from '../../../components/lote-form/lote-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Lote } from '../../../core/models/lote.model';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleLoteModalComponent } from '../../../components/detalle-lote-modal/detalle-lote-modal.component';
import { AuthService } from '../../../core/services/auth.service'; 
@Component({
  selector: 'app-lote-list',
  templateUrl: './lote-list.component.html',
  styleUrls: ['./lote-list.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule
  ]
})
export class LoteListComponent implements OnInit, AfterViewInit {
  // ✅ COLUMNAS CORREGIDAS (sin duplicados)
  displayedColumns: string[] = [
    'id', 
    'producto', 
    'numero_lote',
    'cantidad_inicial', 
    'cantidad_actual',  
    'fecha_caducidad',
    'dias_caducar',
    'fecha_creacion',
    'acciones'
  ];
  
  dataSource = new MatTableDataSource<Lote>([]);
  isLoading = true;
  // Agregar propiedades
filtrosLotes: {
  stock: string[],
  caducidad: string[],
  searchTerm: string
} = {
  stock: [],
  caducidad: [],
  searchTerm: ''
};
  
  searchTerm: string = '';
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private loteService: LoteService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
  public authService: AuthService
  ) {}

// En el constructor o ngOnInit, configurar el filterPredicate
ngOnInit(): void {
  this.loadLotes();
  window.addEventListener('inventario-actualizado', () => {
    this.loadLotes();
  });
  
  // Configurar filterPredicate personalizado
  this.dataSource.filterPredicate = this.filtrarLotes();
}
// Método para filtrar lotes
private filtrarLotes() {
  return (data: Lote, filter: string): boolean => {
    if (!filter) return true;
    
    try {
      const filtros = JSON.parse(filter);
      
      // Filtro por término de búsqueda
      if (filtros.searchTerm) {
        const term = filtros.searchTerm.toLowerCase();
        const productoNombre = data.producto?.nombre?.toLowerCase() || '';
        const numeroLote = data.numero_lote?.toLowerCase() || '';
        
        if (!productoNombre.includes(term) && !numeroLote.includes(term)) {
          return false;
        }
      }
      
      // Filtro por estado de stock
      if (filtros.stock && filtros.stock.length > 0) {
        const stockClass = this.getStockClass(data);
        const stockText = this.getStockText(data).toLowerCase();
        
        // Mapear clases a valores del filtro
        let coincideStock = false;
        filtros.stock.forEach((filtro: string) => {
          if (filtro === 'normal' && stockClass === 'stock-normal') coincideStock = true;
          if (filtro === 'bajo' && (stockClass === 'stock-bajo' || stockClass === 'stock-medio')) coincideStock = true;
          if (filtro === 'agotado' && stockClass === 'stock-agotado') coincideStock = true;
        });
        
        if (!coincideStock) return false;
      }
      
      // Filtro por estado de caducidad
      if (filtros.caducidad && filtros.caducidad.length > 0) {
        const dias = this.calcularDiasParaCaducar(data.fecha_caducidad);
        const caducidadClass = this.getDiasClass(data.fecha_caducidad);
        
        let coincideCaducidad = false;
        filtros.caducidad.forEach((filtro: string) => {
          if (filtro === 'normal' && dias > 90) coincideCaducidad = true;
          if (filtro === 'proxima' && dias <= 30 && dias > 7) coincideCaducidad = true;
          if (filtro === 'critica' && dias <= 7 && dias >= 0) coincideCaducidad = true;
          if (filtro === 'caducado' && dias < 0) coincideCaducidad = true;
        });
        
        if (!coincideCaducidad) return false;
      }
      
      return true;
    } catch (e) {
      return true;
    }
  };
}

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

     // ✅ CORREGIDO: Configurar filtro personalizado simplificado
    this.dataSource.filterPredicate = this.createFilterPredicate();
  }

 // ✅ NUEVO: Método para debug
  private debugFiltros(): void {
    console.log('🔍 DEBUG FILTROS:');
    console.log('   - Término búsqueda:', this.searchTerm);
    
    console.log('📋 DATOS ORIGINALES:');
    this.dataSource.data.forEach(lote => {
      console.log(`   lote ${lote.id_lote}`);
    });
  }

  loadLotes(): void {
    this.isLoading = true;
    this.loteService.getLotes().subscribe({
      next: (rows: Lote[]) => { 
        this.dataSource.data = rows; 
        this.isLoading = false;
        console.log('✅ Lotes cargados:', rows);
         setTimeout(() => {
          this.debugFiltros();
        }, 500);
      },
      error: (error) => { 
        this.isLoading = false; 
        this.showError('Error al cargar lotes');
        console.error('❌ Error cargando lotes:', error);
      }
    });
  }

 // Modificar applyFilter
applyFilter(event: Event): void {
  this.filtrosLotes.searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
  this.aplicarFiltrosLotes();
}

// Método para limpiar filtros de lotes (agregar en el HTML)
limpiarFiltrosLotes(): void {
  // Resetear filtros
  this.filtrosLotes = {
    stock: [],
    caducidad: [],
    searchTerm: ''
  };
  
  // Limpiar input de búsqueda
  const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
  if (searchInput) searchInput.value = '';
  
  // 🔥 NUEVO: Resetear los selects de Material
  setTimeout(() => {
    // Forzar actualización de los selects
    const stockSelect = document.querySelector('mat-select[placeholder="Estado de Stock"]') as any;
    const caducidadSelect = document.querySelector('mat-select[placeholder="Estado de Caducidad"]') as any;
    
    // Cerrar paneles abiertos si los hay
    document.querySelectorAll('.cdk-overlay-container .mat-select-panel').forEach(panel => {
      panel.remove();
    });
  }, 100);
  
  // Aplicar filtros vacíos
  this.aplicarFiltrosLotes();
  
  console.log('🧹 Filtros de lotes limpiados');
}

   // ✅ CORREGIDO: Filtro simplificado
// ✅ CORREGIDO: Filtro que incluye nombre del producto
private createFilterPredicate() {
  return (data: Lote, filter: string): boolean => {
    const searchTerms = JSON.parse(filter);
    const { searchTerm } = searchTerms;

    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    
    // Buscar en múltiples campos
    const matchesId = data.id_lote.toString().includes(term);
    const matchesNumeroLote = data.numero_lote.toLowerCase().includes(term);
    const matchesProductoNombre = data.producto?.nombre?.toLowerCase().includes(term) || false;

    return matchesId || matchesNumeroLote || matchesProductoNombre;
  };
}
  addLote(): void {
    const dialogRef = this.dialog.open(LoteFormComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadLotes(); });
  }

  editLote(lote: Lote): void {
    const dialogRef = this.dialog.open(LoteFormComponent, { width: '600px', data: lote });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadLotes(); });
  }

  deleteLote(lote: Lote): void {
    const nombreProducto = lote.producto?.nombre ?? 'desconocido';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { 
      width: '420px', 
      data: { message: `¿Eliminar lote "${lote.numero_lote}" del producto "${nombreProducto}"?` } 
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loteService.deleteLote(lote.id_lote).subscribe({
          next: () => { 
            this.showSuccess('Lote eliminado correctamente'); 
            this.loadLotes(); 
          },
          error: () => this.showError('Error al eliminar lote')
        });
      }
    });
  }

   // ✅ CORREGIDO: Aplicar filtros simplificado
  private applyFilterToDataSource(): void {
    const filterObject = {
      searchTerm: this.searchTerm
    };
    console.log('📊 Aplicando filtros:', filterObject);
    this.dataSource.filter = JSON.stringify(filterObject);
    
    // Debug: mostrar resultados
    setTimeout(() => {
      console.log('📋 Resultados filtrados:', this.dataSource.filteredData.length);
      console.log('✅ Pedidos encontrados:', this.dataSource.filteredData.map(l => ({
        id: l.id_lote
      })));
    }, 100);
  }

  // ✅ MÉTODOS HELPER MEJORADOS
  calcularDiasParaCaducar(fechaCaducidad: string): number {
    const hoy = new Date();
    const caducidad = new Date(fechaCaducidad);
    const diffTime = caducidad.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDiasClass(fechaCaducidad: string): string {
    const dias = this.calcularDiasParaCaducar(fechaCaducidad);
    
    if (dias < 0) return 'caducado';
    if (dias <= 7) return 'caducidad-critica';
    if (dias <= 30) return 'caducidad-proxima';
    if (dias <= 90) return 'caducidad-advertencia';
    return 'caducidad-normal';
  }

  getStockClass(lote: Lote): string {
    const porcentaje = (lote.cantidad_actual / lote.cantidad_inicial) * 100;
    
    if (lote.cantidad_actual === 0) return 'stock-agotado';
    if (porcentaje <= 20) return 'stock-bajo';
    if (porcentaje <= 50) return 'stock-medio';
    return 'stock-normal';
  }

  private showSuccess(msg: string) { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['success-snackbar'] 
    }); 
  }
  
  private showError(msg: string) { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 5000, 
      panelClass: ['error-snackbar'] 
    }); 
  }
  // En lote-list.component.ts - agregar estos métodos
displayedColumnsProfessional: string[] = [
  'id', 'producto', 'numero_lote', 'stock', 'caducidad', 'estado', 'acciones'
];

mostrarFiltrosAvanzados = false;

// Métodos adicionales
toggleFiltrosAvanzados(): void {
  this.mostrarFiltrosAvanzados = !this.mostrarFiltrosAvanzados;
}

getLotesProximosCaducar(): any[] {
  return this.dataSource.data.filter(lote => 
    this.getDiasClass(lote.fecha_caducidad) === 'caducidad-critica' || 
    this.getDiasClass(lote.fecha_caducidad) === 'caducidad-proxima'
  );
}

getPorcentajeStock(lote: Lote): number {
  return Math.round((lote.cantidad_actual / lote.cantidad_inicial) * 100);
}

getStockText(lote: Lote): string {
  const porcentaje = this.getPorcentajeStock(lote);
  if (lote.cantidad_actual === 0) return 'Agotado';
  if (porcentaje <= 20) return 'Bajo';
  if (porcentaje <= 50) return 'Medio';
  return 'Normal';
}

getCaducidadText(fechaCaducidad: string): string {
  const dias = this.calcularDiasParaCaducar(fechaCaducidad);
  if (dias < 0) return 'Caducado';
  if (dias <= 7) return 'Crítica';
  if (dias <= 30) return 'Próxima';
  if (dias <= 90) return 'Advertencia';
  return 'Normal';
}

// Implementar aplicarFiltroStock
aplicarFiltroStock(estados: string[]): void {
  this.filtrosLotes.stock = estados || [];
  this.aplicarFiltrosLotes();
}
// Implementar aplicarFiltroCaducidad
aplicarFiltroCaducidad(estados: string[]): void {
  this.filtrosLotes.caducidad = estados || [];
  this.aplicarFiltrosLotes();
}
// Nuevo método para aplicar filtros combinados
aplicarFiltrosLotes(): void {
  const filtroCombinado = {
    stock: this.filtrosLotes.stock,
    caducidad: this.filtrosLotes.caducidad,
    searchTerm: this.filtrosLotes.searchTerm
  };
  
  this.dataSource.filter = JSON.stringify(filtroCombinado);
  
  console.log('🔍 Filtros de lotes:', filtroCombinado);
  console.log('📊 Resultados:', this.dataSource.filteredData.length);
}
exportarExcel(): void {
  // Implementar exportación a Excel
}

recargarDatos(): void {
  this.loadLotes();
}


// En lote-list.component.ts - AGREGAR MÉTODO
desactivarLote(lote: Lote): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      title: '⚠️ Desactivar Lote',
      message: `¿Estás seguro de DESACTIVAR el lote <strong>${lote.numero_lote}</strong>?<br><br>
                Esta acción marcará el lote como inactivo y no aparecerá en las listas.`,
      confirmText: 'Sí, Desactivar',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'warning'
    }
  });
  
  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loteService.updateLote(lote.id_lote, { activo: false }).subscribe({
        next: () => {
          this.showSuccess('Lote desactivado correctamente');
          this.loadLotes();
        },
        error: (err) => {
          console.error('Error al desactivar lote:', err);
          this.showError('Error al desactivar lote');
        }
      });
    }
  });
}
// En lote-list.component.ts
getStockIcon(lote: Lote): string {
  const porcentaje = this.getPorcentajeStock(lote);
  if (lote.cantidad_actual === 0) return 'block';
  if (porcentaje <= 20) return 'warning';
  if (porcentaje <= 50) return 'info';
  return 'check_circle';
}

getCaducidadIcon(fechaCaducidad: string): string {
  const dias = this.calcularDiasParaCaducar(fechaCaducidad);
  if (dias < 0) return 'error';
  if (dias <= 7) return 'warning';
  if (dias <= 30) return 'schedule';
  return 'event_available';
}
// Agregar el método
verDetallesLote(lote: Lote): void {
  this.dialog.open(DetalleLoteModalComponent, {
    width: '600px',
    maxWidth: '95vw',
    data: lote,
    panelClass: 'detalle-modal-panel'
  });
}
}