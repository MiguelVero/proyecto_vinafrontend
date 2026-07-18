// src/app/features/pages/insumo-list/insumo-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';

import { Insumo } from '../../../core/models/insumo.model';
import { InsumoService } from '../../../core/services/insumo.service';
import { InsumoFormComponent } from '../../../components/insumo-form/insumo-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-insumo-list',
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
    MatCardModule,
    MatTooltipModule,
    MatChipsModule,
    MatSelectModule
  ],
  templateUrl: './insumo-list.component.html',
  styleUrls: ['./insumo-list.component.css']
})
export class InsumoListComponent implements OnInit, AfterViewInit {
  // ✅ Columnas actualizadas (sin costo_promedio ni proveedor)
  displayedColumns: string[] = [
    'id_insumo',
    'nombre',
    'unidad_medida',
    'stock_actual',
    'stock_minimo',
    'estado',
    'acciones'
  ];
  
  dataSource = new MatTableDataSource<Insumo>([]);
  isLoading = true;
  isMobileView = false;
  selectedEstado: string = 'todos'; // ✅ Nuevo filtro

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private insumoService: InsumoService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadInsumos();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.setupFilterPredicate();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth < 768;
  }

  setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: Insumo, filter: string) => {
      try {
        const filtros = JSON.parse(filter);
        const searchTerm = filtros.searchTerm?.toLowerCase() || '';
        const estadoFiltro = filtros.estado || 'todos';

        // Filtro por búsqueda
        if (searchTerm) {
          const matchNombre = data.nombre.toLowerCase().includes(searchTerm);
          const matchDescripcion = data.descripcion?.toLowerCase().includes(searchTerm) || false;
          if (!matchNombre && !matchDescripcion) return false;
        }

        // ✅ Filtro por estado
        if (estadoFiltro === 'activo' && !data.activo) return false;
        if (estadoFiltro === 'inactivo' && data.activo) return false;

        return true;
      } catch {
        // Si falla el parse, usar filtro simple
        const searchTerm = filter.toLowerCase();
        return data.nombre.toLowerCase().includes(searchTerm) ||
               (data.descripcion?.toLowerCase().includes(searchTerm) || false);
      }
    };
  }

  loadInsumos(): void {
    this.isLoading = true;
    this.insumoService.getInsumos().subscribe({
      next: (data: Insumo[]) => {
        // ✅ Incluir TODOS los insumos (activos e inactivos)
        this.dataSource.data = data;
        this.isLoading = false;
        this.applyFilter(); // Aplicar filtros después de cargar
      },
      error: (error) => {
        console.error('Error loading insumos:', error);
        this.isLoading = false;
        this.showError('Error al cargar insumos');
      }
    });
  }

  applyFilter(event?: Event): void {
    const searchTerm = event ? (event.target as HTMLInputElement).value : '';
    this.applyFilters(searchTerm, this.selectedEstado);
  }

  // ✅ Nuevo método para filtrar por estado
  filterByEstado(estado: string): void {
    this.selectedEstado = estado;
    const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
    const searchTerm = searchInput?.value || '';
    this.applyFilters(searchTerm, estado);
  }

  private applyFilters(searchTerm: string, estado: string): void {
    const filterObject = {
      searchTerm: searchTerm.trim().toLowerCase(),
      estado: estado
    };
    this.dataSource.filter = JSON.stringify(filterObject);
  }

// En insumo-list.component.ts - método toggleActivo
toggleActivo(insumo: Insumo): void {
  const mensaje = insumo.activo 
    ? `¿Estás seguro de desactivar el insumo "${insumo.nombre}"?`
    : `¿Estás seguro de activar el insumo "${insumo.nombre}"?`;
  
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      title: insumo.activo ? 'Desactivar Insumo' : 'Activar Insumo',
      message: mensaje,
      confirmText: insumo.activo ? 'Desactivar' : 'Activar',
      cancelText: 'Cancelar',
      confirmColor: insumo.activo ? 'warn' : 'primary'
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && insumo.id_insumo) {
      const nuevoEstado = !insumo.activo;
      
      // ✅ Enviar TODOS los datos del insumo para evitar que se pierdan
      const payload = {
        nombre: insumo.nombre,
        descripcion: insumo.descripcion || '',
        unidad_medida: insumo.unidad_medida,
        stock_minimo: insumo.stock_minimo,
        activo: nuevoEstado
      };

      this.insumoService.updateInsumo(insumo.id_insumo, payload).subscribe({
        next: () => {
          this.showSuccess(nuevoEstado ? 'Insumo activado correctamente' : 'Insumo desactivado correctamente');
          this.loadInsumos();
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          this.showError('Error al cambiar estado del insumo');
        }
      });
    }
  });
}

  // ✅ Método para editar (mantenido)
  editInsumo(insumo: Insumo): void {
    const dialogRef = this.dialog.open(InsumoFormComponent, {
      width: this.isMobileView ? '95vw' : '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'insumo-dialog',
      autoFocus: false,
      data: { insumo }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInsumos();
        this.showSuccess('Insumo actualizado correctamente');
      }
    });
  }

  // ✅ Método para agregar (mantenido)
  addInsumo(): void {
    const dialogRef = this.dialog.open(InsumoFormComponent, {
      width: this.isMobileView ? '95vw' : '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'insumo-dialog',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInsumos();
        this.showSuccess('Insumo agregado correctamente');
      }
    });
  }

  getStockStatus(insumo: Insumo): { class: string, text: string } {
    if (insumo.stock_actual <= 0) {
      return { class: 'status-agotado', text: 'Agotado' };
    } else if (insumo.stock_actual <= insumo.stock_minimo) {
      return { class: 'status-bajo', text: 'Stock Bajo' };
    }
    return { class: 'status-normal', text: 'Normal' };
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
}