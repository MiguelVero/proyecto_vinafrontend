import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';

import { CategoriaService } from '../../../core/services/categoria.service';
import { CategoriaFormComponent } from '../../../components/categoria-form/categoria-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Categoria } from '../../../core/models/categoria.model';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-categoria-list',
  templateUrl: './categoria-list.component.html',
  styleUrls: ['./categoria-list.component.css'],
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
export class CategoriaListComponent implements OnInit {
  pageSize = 5; // 5 por defecto
  currentPage = 0;
  displayedColumns: string[] = [
    'numero',
    'id',
    'nombre',
    'acciones'
  ];

  dataSource: MatTableDataSource<Categoria> = new MatTableDataSource<Categoria>([]);
  allCategorias: Categoria[] = [];
  filteredCategorias: Categoria[] = [];
  paginatedCategorias: Categoria[] = [];
  isLoading = true;

  constructor(
    private categoriaService: CategoriaService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCategorias();
  }

  loadCategorias(): void {
    this.isLoading = true;
    this.categoriaService.getCategorias().subscribe({
      next: (categorias) => {
        console.log('Categorías cargadas:', categorias);
        
        this.allCategorias = [...categorias];
        this.filteredCategorias = [...categorias];
        
        this.applyPagination();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.isLoading = false;
        this.showErrorMessage('Error al cargar las categorías');
      }
    });
  }

  // Aplicar paginación
  applyPagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    this.paginatedCategorias = this.filteredCategorias.slice(startIndex, endIndex);
    this.dataSource.data = this.paginatedCategorias;
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
      this.filteredCategorias = [...this.allCategorias];
    } else {
      this.filteredCategorias = this.allCategorias.filter(categoria => 
        (categoria.nombre && categoria.nombre.toLowerCase().includes(filterValue)) ||
        (categoria.id_categoria && categoria.id_categoria.toString().includes(filterValue))
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
    return Math.ceil(this.filteredCategorias.length / this.pageSize);
  }

  // Métodos para información de paginación
  getCurrentPageStart(): number {
    if (this.filteredCategorias.length === 0) return 0;
    return (this.currentPage * this.pageSize) + 1;
  }

  getCurrentPageEnd(): number {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return Math.min(end, this.filteredCategorias.length);
  }

  getTotalFiltered(): number {
    return this.filteredCategorias.length;
  }

  getTotalCategorias(): number {
    return this.allCategorias.length;
  }

  getPageNumber(index: number): number {
    return (this.currentPage * this.pageSize) + index + 1;
  }

  // Métodos de acciones
  addCategoria(): void {
    const dialogRef = this.dialog.open(CategoriaFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCategorias();
        this.showSuccessMessage('Categoría agregada correctamente');
      }
    });
  }

  editCategoria(categoria: Categoria): void {
    const dialogRef = this.dialog.open(CategoriaFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: categoria,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCategorias();
        this.showSuccessMessage('Categoría actualizada correctamente');
      }
    });
  }

  deleteCategoria(categoria: Categoria): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        message: `¿Estás seguro de que deseas eliminar la categoría "${categoria.nombre}"?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && categoria.id_categoria) {
        this.categoriaService.deleteCategoria(categoria.id_categoria).subscribe({
          next: () => {
            this.loadCategorias();
            this.showSuccessMessage('Categoría eliminada correctamente');
          },
          error: (error) => {
            console.error('Error eliminando categoría:', error);
            this.showErrorMessage('Error al eliminar la categoría');
          }
        });
      }
    });
  }

  viewDetails(categoria: Categoria): void {
    // Método para ver detalles de la categoría
    console.log('Ver detalles de categoría:', categoria);
    this.showInfoMessage(`Detalles de: ${categoria.nombre}`);
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