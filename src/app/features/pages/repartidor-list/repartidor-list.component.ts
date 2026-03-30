import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Repartidor } from '../../../core/models/repartidor.model';
import { RepartidorService } from '../../../core/services/repartidor.service';
import { RepartidorFormComponent } from '../../../components/repartidor-form/repartidor-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-repartidor-list',
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
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './repartidor-list.component.html',
  styleUrls: ['./repartidor-list.component.css']
})
export class RepartidorListComponent implements OnInit {
  displayedColumns: string[] = ['nombre', 'contacto', 'vehiculo', 'estado', 'fecha_registro', 'acciones'];
  dataSource: MatTableDataSource<Repartidor> = new MatTableDataSource<Repartidor>([]);
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableWrapper') tableWrapper!: ElementRef;

  constructor(
    private repartidorService: RepartidorService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Configurar el filtro personalizado
    this.dataSource.filterPredicate = this.createFilter();
  }

  ngOnInit(): void {
    this.loadRepartidores();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadRepartidores(): void {
    this.isLoading = true;
    this.repartidorService.getRepartidores().subscribe({
      next: (repartidores) => {
        this.dataSource.data = repartidores;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando repartidores:', error);
        this.isLoading = false;
        this.showErrorMessage('Error al cargar repartidores');
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Filtro personalizado para buscar en propiedades anidadas
  private createFilter(): (data: Repartidor, filter: string) => boolean {
    return (data: Repartidor, filter: string): boolean => {
      if (!filter) return true;

      const searchTerm = filter.toLowerCase();
      
      // Buscar en nombre completo (propiedad anidada)
      if (data.persona?.nombre_completo?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Buscar en teléfono (propiedad anidada)
      if (data.persona?.telefono?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Buscar en número de documento (propiedad anidada)
      if (data.persona?.numero_documento?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Buscar en placa del furgón
      if (data.placa_furgon?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Buscar en estado activo
      if ((data.activo ? 'activo' : 'inactivo').includes(searchTerm)) {
        return true;
      }
      
      // Buscar en fecha de contratación (formateada)
      if (this.formatDate(data.fecha_contratacion)?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Buscar en fecha de creación (formateada)
      if (this.formatDate(data.fecha_creacion)?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      return false;
    };
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(RepartidorFormComponent, {
      width: '600px',
      maxHeight: '90vh',
      panelClass: 'repartidor-form-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRepartidores();
    });
  }

  openEditDialog(repartidor: Repartidor): void {
    const dialogRef = this.dialog.open(RepartidorFormComponent, {
      width: '600px',
      maxHeight: '90vh',
      panelClass: 'repartidor-form-dialog',
      data: { repartidor }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRepartidores();
    });
  }

  toggleActivo(repartidor: Repartidor): void {
    const action$ = repartidor.activo
      ? this.repartidorService.desactivarRepartidor(repartidor.id_repartidor)
      : this.repartidorService.activarRepartidor(repartidor.id_repartidor);

    action$.subscribe({
      next: () => {
        this.showSuccessMessage(repartidor.activo ? 'Repartidor desactivado' : 'Repartidor activado');
        this.loadRepartidores();
      },
      error: (err) => {
        console.error('Error cambiando estado:', err);
        this.showErrorMessage('Error al cambiar estado');
      }
    });
  }

  deleteRepartidor(repartidor: Repartidor): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      panelClass: 'confirm-dialog',
      data: { 
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de eliminar al repartidor <strong>${repartidor.persona?.nombre_completo || 'este repartidor'}</strong>?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.repartidorService.deleteRepartidor(repartidor.id_repartidor).subscribe({
          next: () => {
            this.showSuccessMessage('Repartidor eliminado correctamente');
            this.loadRepartidores();
          },
          error: (err) => {
            console.error('Error eliminando repartidor:', err);
            this.isLoading = false;
            this.showErrorMessage(err?.error?.message || 'Error al eliminar repartidor');
          }
        });
      }
    });
  }

  // NUEVO: Calcular antigüedad del repartidor
  calcularAntiguedad(fechaCreacion: any): string {
    if (!fechaCreacion) return '';
    
    const fecha = new Date(fechaCreacion);
    if (isNaN(fecha.getTime())) return '';
    
    const hoy = new Date();
    const diffMs = hoy.getTime() - fecha.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias < 30) {
      return `${diffDias} días`;
    } else if (diffDias < 365) {
      const meses = Math.floor(diffDias / 30);
      return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    } else {
      const años = Math.floor(diffDias / 365);
      const mesesRestantes = Math.floor((diffDias % 365) / 30);
      if (mesesRestantes > 0) {
        return `${años} ${años === 1 ? 'año' : 'años'} y ${mesesRestantes} meses`;
      }
      return `${años} ${años === 1 ? 'año' : 'años'}`;
    }
  }

  // Formatea fechas recibidas como ISO timestamp o como DATE string (YYYY-MM-DD)
  formatDate(value: any): string {
    if (!value && value !== 0) return '';

    // Si ya es string y contiene 'T', devolver la parte antes de la T
    if (typeof value === 'string') {
      if (value.includes('T')) return value.split('T')[0];
      // Si ya es YYYY-MM-DD
      return value;
    }

    // Si es Date u otro tipo, intentar crear Date y formatear
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private showSuccessMessage(msg: string) {
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['success-snackbar'], 
      horizontalPosition: 'right', 
      verticalPosition: 'top' 
    });
  }

  private showErrorMessage(msg: string) {
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 5000, 
      panelClass: ['error-snackbar'], 
      horizontalPosition: 'right', 
      verticalPosition: 'top' 
    });
  }
}