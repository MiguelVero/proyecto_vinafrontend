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
  filtroEstado: string = 'todos'; // 'todos' | 'activos' | 'inactivos'

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

    this.dataSource.filterPredicate = this.filtrarLotes();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
  // 🔍 FILTRO PRINCIPAL
  // ============================================
  private filtrarLotes() {
    return (data: Lote, filter: string): boolean => {
      if (!filter) return true;

      try {
        const filtros = JSON.parse(filter);

        // 1. Filtro por estado (activo/inactivo/todos)
        if (filtros.estado && filtros.estado !== 'todos') {
          if (filtros.estado === 'activos' && !data.activo) return false;
          if (filtros.estado === 'inactivos' && data.activo) return false;
        }

        // 2. Filtro por término de búsqueda
        if (filtros.searchTerm) {
          const term = filtros.searchTerm.toLowerCase();
          const productoNombre = data.producto?.nombre?.toLowerCase() || '';
          const numeroLote = data.numero_lote?.toLowerCase() || '';

          if (!productoNombre.includes(term) && !numeroLote.includes(term)) {
            return false;
          }
        }

        // 3. Filtro por estado de stock
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

        // 4. Filtro por estado de caducidad
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

  filtrarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    this.aplicarFiltrosLotes();
  }

  aplicarFiltrosLotes(): void {
    const filtroCombinado = {
      estado: this.filtroEstado,
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
    this.filtroEstado = 'todos';

    const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
    if (searchInput) searchInput.value = '';

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

  isLoteCaducado(fechaCaducidad: string): boolean {
    const dias = this.calcularDiasParaCaducar(fechaCaducidad);
    return dias < 0;
  }

  getLotesActivos(): Lote[] {
    return this.dataSource.data.filter(lote => lote.activo);
  }

  getLotesInactivos(): Lote[] {
    return this.dataSource.data.filter(lote => !lote.activo);
  }

  getLotesProximosCaducar(): any[] {
    return this.dataSource.data.filter(lote =>
      this.getDiasClass(lote.fecha_caducidad) === 'caducidad-critica' ||
      this.getDiasClass(lote.fecha_caducidad) === 'caducidad-proxima'
    );
  }

  // ============================================
  // 🔍 VERIFICAR SI SE PUEDE ELIMINAR
  // ============================================
  puedeEliminarLote(lote: Lote): boolean {
    if (lote.activo) return false;
    if (lote.cantidad_actual !== 0) return false;
    return true;
  }

  getMotivoNoEliminar(lote: Lote): string {
    if (lote.activo) {
      return 'El lote está activo. Primero debe desactivarlo.';
    }
    if (lote.cantidad_actual > 0) {
      return `El lote tiene ${lote.cantidad_actual} unidades en stock. Primero debe vaciar el stock.`;
    }
    return 'No se puede eliminar este lote.';
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
    const esCaducado = this.isLoteCaducado(lote.fecha_caducidad);
    const esAgotado = lote.cantidad_actual === 0;
    
    let mensaje = '';
    let titulo = '⚠️ Desactivar Lote';
    
    if (esCaducado) {
      titulo = '⚠️ Desactivar Lote Caducado';
      mensaje = `
        <p>El lote <strong>${lote.numero_lote}</strong> está <strong style="color: #d32f2f;">CADUCADO</strong>.</p>
        <p>Stock actual: <strong>${lote.cantidad_actual}</strong> unidades</p>
        <br>
        <p><strong>¿Estás seguro de desactivar este lote?</strong></p>
        <p style="color: #d32f2f; font-size: 0.9rem;">
          ⚠️ El stock de este lote se eliminará del inventario y no podrá ser utilizado.
        </p>
      `;
    } else if (esAgotado) {
      titulo = '⚠️ Desactivar Lote Agotado';
      mensaje = `
        <p>El lote <strong>${lote.numero_lote}</strong> está <strong style="color: #f57c00;">AGOTADO</strong>.</p>
        <br>
        <p><strong>¿Estás seguro de desactivar este lote?</strong></p>
        <p style="color: #f57c00; font-size: 0.9rem;">
          ⚠️ El lote no tiene stock disponible y será ocultado del sistema.
        </p>
      `;
    }
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: titulo,
        message: mensaje,
        confirmText: 'Sí, Desactivar',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'warning',
        showIcon: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loteService.updateLote(lote.id_lote, { activo: false }).subscribe({
          next: () => {
            this.showSuccess(esCaducado 
              ? '✅ Lote caducado desactivado correctamente' 
              : '✅ Lote desactivado correctamente'
            );
            this.loadLotes();
            window.dispatchEvent(new CustomEvent('inventario-actualizado'));
          },
          error: (err) => {
            console.error('Error al desactivar lote:', err);
            this.showError('Error al desactivar lote');
          }
        });
      }
    });
  }

// ============================================
// 🔄 REACTIVAR LOTE
// ============================================
reactivarLote(lote: Lote): void {
  const esCaducado = this.isLoteCaducado(lote.fecha_caducidad);
  const dias = this.calcularDiasParaCaducar(lote.fecha_caducidad);
  
  let mensaje = `
    <p>El lote <strong>${lote.numero_lote}</strong> está <strong style="color: #d32f2f;">CADUCADO</strong>.</p>
    <p><strong>Producto:</strong> ${lote.producto?.nombre}</p>
    <p><strong>Stock actual:</strong> <span style="color: #d32f2f; font-weight: bold;">${lote.cantidad_actual}</span> unidades</p>
    <p>Caducó hace <strong>${Math.abs(dias)}</strong> días.</p>
    <br>
    <p style="color: #f57c00; font-size: 0.9rem;">
      ⚠️ Este lote está caducado. Reactivarlo permitiría vender producto vencido.
    </p>
    <p style="color: #2e7d32; font-size: 0.9rem;">
      💡 Alternativa: Puedes <strong>vaciar el stock</strong> (crea un egreso) y luego eliminar el lote.
    </p>
  `;
  
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '500px',
    data: {
      title: '⚠️ Lote Caducado',
      message: mensaje,
      confirmText: 'Reactivar (No recomendado)',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'warning',
      showIcon: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.confirmarReactivacion(lote);
    }
  });
}

confirmarReactivacion(lote: Lote): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      title: '⚠️ Confirmar Reactivación',
      message: `
        <p>¿Estás seguro de REACTIVAR el lote caducado <strong>${lote.numero_lote}</strong>?</p>
        <p style="color: #d32f2f; font-size: 0.9rem;">
          ⚠️ Estás a punto de poner en venta producto caducado.
        </p>
        <p style="color: #d32f2f; font-size: 0.9rem;">
          Esto puede afectar la calidad y la reputación de la empresa.
        </p>
      `,
      confirmText: 'Sí, Reactivar (bajo mi responsabilidad)',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'warning',
      showIcon: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loteService.reactivarLote(lote.id_lote).subscribe({
        next: () => {
          this.showSuccess('✅ Lote reactivado (producto caducado)');
          this.loadLotes();
          window.dispatchEvent(new CustomEvent('inventario-actualizado'));
        },
        error: (err) => {
          console.error('Error al reactivar lote:', err);
          this.showError('Error al reactivar lote');
        }
      });
    }
  });
}

 // ============================================
// 📥 ELIMINAR LOTE (solo si está inactivo y sin stock)
// ============================================
eliminarLote(lote: Lote): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      title: '🗑️ Eliminar Lote',
      message: `
        <p>¿Estás seguro de ELIMINAR el lote <strong>${lote.numero_lote}</strong>?</p>
        <p><strong>Producto:</strong> ${lote.producto?.nombre}</p>
        <p><strong>Stock:</strong> ${lote.cantidad_actual} unidades</p>
        <br>
        <p style="color: #d32f2f; font-size: 0.9rem;">
          ⚠️ Esta acción no se puede deshacer. El lote será eliminado permanentemente.
        </p>
        <p style="color: #f57c00; font-size: 0.9rem;">
          ℹ️ Solo se pueden eliminar lotes inactivos y sin stock.
        </p>
      `,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'delete',
      showIcon: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loteService.deleteLote(lote.id_lote).subscribe({
        next: () => {
          this.showSuccess('✅ Lote eliminado correctamente');
          this.loadLotes();
          window.dispatchEvent(new CustomEvent('inventario-actualizado'));
        },
        error: (err) => {
          console.error('Error al eliminar lote:', err);
          this.showError('Error al eliminar lote: ' + (err.error?.message || err.message));
        }
      });
    }
  });
}


  recargarDatos(): void {
    this.loadLotes();
  }

  exportarExcel(): void {
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

// lote-list.component.ts - SOLO LA PARTE DE ACCIONES (mantener el resto igual)

// ============================================
// 🗑️ VACIAR STOCK DEL LOTE (CORREGIDO)
// ============================================
vaciarStockLote(lote: Lote): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      title: '🗑️ Vaciar Stock del Lote',
      message: `
        <p>¿Estás seguro de VACIAR el stock del lote <strong>${lote.numero_lote}</strong>?</p>
        <p><strong>Producto:</strong> ${lote.producto?.nombre}</p>
        <p><strong>Stock a vaciar:</strong> <span style="color: #d32f2f; font-weight: bold;">${lote.cantidad_actual}</span> unidades</p>
        <br>
        <p style="color: #d32f2f; font-size: 0.9rem;">
          ⚠️ El stock se eliminará del inventario y del lote.
        </p>
        <p style="color: #f57c00; font-size: 0.9rem;">
          💡 Esto creará un movimiento de egreso en el historial.
        </p>
        <p style="color: #2e7d32; font-size: 0.9rem; background: #e8f5e9; padding: 8px; border-radius: 4px;">
          ℹ️ El stock del producto NO se verá afectado porque el lote está inactivo.
        </p>
      `,
      confirmText: 'Sí, Vaciar Stock',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'warning',
      showIcon: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // ✅ USAR EL MÉTODO ESPECÍFICO vaciarStockLote en lugar de updateLote
      this.loteService.vaciarStockLote(lote.id_lote).subscribe({
        next: (response) => {
          this.showSuccess(`✅ Stock del lote ${lote.numero_lote} vaciado correctamente (${response.cantidad_eliminada} unidades)`);
          this.loadLotes();
          window.dispatchEvent(new CustomEvent('inventario-actualizado'));
        },
        error: (err) => {
          console.error('Error al vaciar stock:', err);
          this.showError('Error al vaciar stock del lote');
        }
      });
    }
  });
}

}