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
  // Columnas para la tabla profesional
  displayedColumnsProfessional: string[] = [
    'id', 'producto', 'numero_lote', 'stock', 'caducidad', 'estado', 'acciones'
  ];

  dataSource = new MatTableDataSource<Lote>([]);
  isLoading = true;
  mostrarFiltrosAvanzados = false;
  searchTerm: string = '';

  filtrosLotes: {
    stock: string[];
    caducidad: string[];
    searchTerm: string;
  } = {
    stock: [],
    caducidad: [],
    searchTerm: ''
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private loteService: LoteService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadLotes();

    window.addEventListener('inventario-actualizado', () => {
      this.loadLotes();
    });

    // ✅ Configurar el filterPredicate UNA SOLA VEZ
    this.dataSource.filterPredicate = this.filtrarLotes();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    // ❌ NO sobrescribir filterPredicate aquí
  }

  // ============================================
  // 🔍 FILTRO PRINCIPAL (combina todos los filtros)
  // ============================================
  private filtrarLotes() {
    return (data: Lote, filter: string): boolean => {
      if (!filter) return true;

      try {
        const filtros = JSON.parse(filter);

        // 1. Filtro por término de búsqueda
        if (filtros.searchTerm) {
          const term = filtros.searchTerm.toLowerCase();
          const productoNombre = data.producto?.nombre?.toLowerCase() || '';
          const numeroLote = data.numero_lote?.toLowerCase() || '';

          if (!productoNombre.includes(term) && !numeroLote.includes(term)) {
            return false;
          }
        }

        // 2. Filtro por estado de stock
        if (filtros.stock && filtros.stock.length > 0) {
          const stockClass = this.getStockClass(data);
          let coincideStock = false;

          filtros.stock.forEach((filtro: string) => {
            if (filtro === 'normal' && stockClass === 'stock-normal') coincideStock = true;
            if (filtro === 'bajo' && (stockClass === 'stock-bajo' || stockClass === 'stock-medio')) coincideStock = true;
            if (filtro === 'agotado' && stockClass === 'stock-agotado') coincideStock = true;
          });

          if (!coincideStock) return false;
        }

        // 3. Filtro por estado de caducidad
        if (filtros.caducidad && filtros.caducidad.length > 0) {
          const dias = this.calcularDiasParaCaducar(data.fecha_caducidad);
          let coincideCaducidad = false;

          filtros.caducidad.forEach((filtro: string) => {
            if (filtro === 'normal' && dias > 30) coincideCaducidad = true;
            if (filtro === 'proxima' && dias >= 0 && dias <= 30) coincideCaducidad = true;
            if (filtro === 'critica' && dias >= 0 && dias <= 7) coincideCaducidad = true;
            if (filtro === 'caducado' && dias < 0) coincideCaducidad = true;
          });

          if (!coincideCaducidad) return false;
        }

        return true;
      } catch (e) {
        console.error('Error al filtrar:', e);
        return true;
      }
    };
  }

  // ============================================
  // 📥 CARGAR LOTES
  // ============================================
  loadLotes(): void {
    this.isLoading = true;
    this.loteService.getLotes().subscribe({
      next: (rows: Lote[]) => {
        this.dataSource.data = rows;
        this.isLoading = false;
        console.log('✅ Lotes cargados:', rows);
        // Aplicar filtros después de cargar
        this.aplicarFiltrosLotes();
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Error al cargar lotes');
        console.error('❌ Error cargando lotes:', error);
      }
    });
  }

  // ============================================
  // 🔄 MÉTODOS DE FILTRO
  // ============================================
  applyFilter(event: Event): void {
    this.filtrosLotes.searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.aplicarFiltrosLotes();
  }

  aplicarFiltroStock(estados: string[]): void {
    this.filtrosLotes.stock = estados || [];
    this.aplicarFiltrosLotes();
  }

  aplicarFiltroCaducidad(estados: string[]): void {
    this.filtrosLotes.caducidad = estados || [];
    this.aplicarFiltrosLotes();
  }

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

  limpiarFiltrosLotes(): void {
    this.filtrosLotes = {
      stock: [],
      caducidad: [],
      searchTerm: ''
    };

    const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
    if (searchInput) searchInput.value = '';

    // Cerrar paneles de selects abiertos
    document.querySelectorAll('.cdk-overlay-container .mat-select-panel').forEach(panel => {
      panel.remove();
    });

    this.aplicarFiltrosLotes();
    console.log('🧹 Filtros de lotes limpiados');
  }

  toggleFiltrosAvanzados(): void {
    this.mostrarFiltrosAvanzados = !this.mostrarFiltrosAvanzados;
  }

  // ============================================
  // 📊 MÉTODOS HELPER
  // ============================================
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

  getLotesProximosCaducar(): any[] {
    return this.dataSource.data.filter(lote =>
      this.getDiasClass(lote.fecha_caducidad) === 'caducidad-critica' ||
      this.getDiasClass(lote.fecha_caducidad) === 'caducidad-proxima'
    );
  }

  // ============================================
  // 🎯 ACCIONES
  // ============================================
  verDetallesLote(lote: Lote): void {
    this.dialog.open(DetalleLoteModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: lote,
      panelClass: 'detalle-modal-panel'
    });
  }

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

  recargarDatos(): void {
    this.loadLotes();
  }

  exportarExcel(): void {
    // TODO: Implementar exportación a Excel
    console.log('📊 Exportando a Excel...');
  }

  // ============================================
  // 📢 NOTIFICACIONES
  // ============================================
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
}