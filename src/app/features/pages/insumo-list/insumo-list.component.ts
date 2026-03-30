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
    MatChipsModule
  ],
  templateUrl: './insumo-list.component.html',
  styleUrls: ['./insumo-list.component.css']
})
export class InsumoListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'id_insumo',
    'nombre',
    'unidad_medida',
    'stock_actual',
    'stock_minimo',
    'costo_promedio',
    'proveedor',
    'estado',
    'acciones'
  ];
  
  dataSource = new MatTableDataSource<Insumo>([]);
  isLoading = true;
  isMobileView = false;

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

  // ✅ CORREGIDO: Eliminar el parámetro del decorador
  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth < 768;
  }

  setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: Insumo, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.nombre.toLowerCase().includes(searchStr) ||
        (data.descripcion?.toLowerCase().includes(searchStr) || false) ||
        (data.proveedor_principal?.razon_social?.toLowerCase().includes(searchStr) || false)
      );
    };
  }

  loadInsumos(): void {
    this.isLoading = true;
    this.insumoService.getInsumos().subscribe({
      next: (data: Insumo[]) => {  // ✅ Tipado explícito
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading insumos:', error);
        this.isLoading = false;
        this.showError('Error al cargar insumos');
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

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

  editInsumo(insumo: Insumo): void {  // ✅ Tipado explícito
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

  deleteInsumo(insumo: Insumo): void {  // ✅ Tipado explícito
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Eliminar Insumo',
        message: `¿Estás seguro de eliminar el insumo "${insumo.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && insumo.id_insumo) {
        this.insumoService.deleteInsumo(insumo.id_insumo).subscribe({
          next: () => {
            this.showSuccess('Insumo eliminado correctamente');
            this.loadInsumos();
          },
          error: (error) => {
            console.error('Error deleting insumo:', error);
            this.showError('Error al eliminar insumo');
          }
        });
      }
    });
  }

  getStockStatus(insumo: Insumo): { class: string, text: string } {  // ✅ Tipado explícito
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