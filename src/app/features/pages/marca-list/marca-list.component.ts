import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';

import { MarcaService } from '../../../core/services/marca.service';
import { MarcaFormComponent } from '../../../components/marca-form/marca-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Marca } from '../../../core/models/marca.model';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-marca-list',
  templateUrl: './marca-list.component.html',
  styleUrls: ['./marca-list.component.css'],
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
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule
  ]
})
export class MarcaListComponent implements OnInit {
  pageSize = 5; // 5 por defecto
  currentPage = 0;
  displayedColumns: string[] = [
    'numero',
    'id',
    'nombre',
    'acciones'
  ];

  dataSource: MatTableDataSource<Marca> = new MatTableDataSource<Marca>([]);
  allMarcas: Marca[] = [];
  filteredMarcas: Marca[] = [];
  paginatedMarcas: Marca[] = [];
  isLoading = true;

  constructor(
    private marcaService: MarcaService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMarcas();
  }

  loadMarcas(): void {
    this.isLoading = true;
    this.marcaService.getMarcas().subscribe({
      next: (marcas) => {
        console.log('Marcas cargadas:', marcas);
        
        this.allMarcas = [...marcas];
        this.filteredMarcas = [...marcas];
        
        this.applyPagination();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando marcas:', error);
        this.isLoading = false;
        this.showErrorMessage('Error al cargar las marcas');
      }
    });
  }

  // Aplicar paginación
  applyPagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    this.paginatedMarcas = this.filteredMarcas.slice(startIndex, endIndex);
    this.dataSource.data = this.paginatedMarcas;
  }

  // Cambiar tamaño de página
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.applyPagination();
  }

  // Aplicar filtro
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    if (!filterValue) {
      this.filteredMarcas = [...this.allMarcas];
    } else {
      this.filteredMarcas = this.allMarcas.filter(marca => 
        (marca.nombre && marca.nombre.toLowerCase().includes(filterValue)) ||
        (marca.id_marca && marca.id_marca.toString().includes(filterValue)) 
      );
    }
    
    this.currentPage = 0;
    this.applyPagination();
  }

  // Navegación de páginas
  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  firstPage(): void {
    this.currentPage = 0;
    this.applyPagination();
  }

  lastPage(): void {
    this.currentPage = this.getTotalPages() - 1;
    this.applyPagination();
  }

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages() - 1;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 0;
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredMarcas.length / this.pageSize);
  }

  // Métodos para información de paginación
  getCurrentPageStart(): number {
    if (this.filteredMarcas.length === 0) return 0;
    return (this.currentPage * this.pageSize) + 1;
  }

  getCurrentPageEnd(): number {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return Math.min(end, this.filteredMarcas.length);
  }

  getTotalFiltered(): number {
    return this.filteredMarcas.length;
  }

  getTotalMarcas(): number {
    return this.allMarcas.length;
  }

  getPageNumber(index: number): number {
    return (this.currentPage * this.pageSize) + index + 1;
  }

  // Métodos de acciones
  addMarca(): void {
    const dialogRef = this.dialog.open(MarcaFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMarcas();
        this.showSuccessMessage('Marca agregada correctamente');
      }
    });
  }

  editMarca(marca: Marca): void {
    const dialogRef = this.dialog.open(MarcaFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: marca,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMarcas();
        this.showSuccessMessage('Marca actualizada correctamente');
      }
    });
  }

  deleteMarca(marca: Marca): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        message: `¿Estás seguro de que deseas eliminar la marca "${marca.nombre}"?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && marca.id_marca) {
        this.marcaService.deleteMarca(marca.id_marca).subscribe({
          next: () => {
            this.loadMarcas();
            this.showSuccessMessage('Marca eliminada correctamente');
          },
          error: (error) => {
            console.error('Error eliminando marca:', error);
            this.showErrorMessage('Error al eliminar la marca');
          }
        });
      }
    });
  }

  viewProducts(marca: Marca): void {
    // Método para ver productos de la marca
    console.log('Ver productos de marca:', marca);
    this.showInfoMessage(`Productos de: ${marca.nombre}`);
  }

  // Métodos de utilidad
  getEstadoColor(estado: string): string {
    if (!estado) return 'basic';
    const est = estado.toLowerCase();
    if (est.includes('activo')) return 'primary';
    if (est.includes('inactivo')) return 'warn';
    if (est.includes('pendiente')) return 'accent';
    return 'basic';
  }

  getPaisOrigenColor(pais: string): string {
    if (!pais) return 'basic';
    const paisLower = pais.toLowerCase();
    if (paisLower.includes('peru')) return 'primary';
    if (paisLower.includes('usa') || paisLower.includes('estados unidos')) return 'accent';
    if (paisLower.includes('china')) return 'warn';
    if (paisLower.includes('alemania')) return 'basic';
    return 'basic';
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private showInfoMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}