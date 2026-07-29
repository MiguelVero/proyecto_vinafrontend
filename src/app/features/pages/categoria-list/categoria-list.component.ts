import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import Swal from 'sweetalert2'; // ✅ IMPORTADO

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
  pageSize = 5;
  currentPage = 0;
  
  // ✅ SOLO NOMBRE Y ACCIONES (ELIMINADOS # E ID)
  displayedColumns: string[] = [
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

  applyPagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCategorias = this.filteredCategorias.slice(startIndex, endIndex);
    this.dataSource.data = this.paginatedCategorias;
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.applyPagination();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!filterValue) {
      this.filteredCategorias = [...this.allCategorias];
    } else {
      this.filteredCategorias = this.allCategorias.filter(categoria => 
        (categoria.nombre && categoria.nombre.toLowerCase().includes(filterValue))
      );
    }
    this.currentPage = 0;
    this.applyPagination();
  }

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
            // ✅ MANEJO DE ERROR 409 (LLAVE FORÁNEA)
            if (error.status === 409) {
              Swal.fire({
                icon: 'warning',
                title: 'No se puede eliminar',
                text: 'Esta categoría tiene productos asociados. Primero debes eliminar o reasignar esos productos.',
                confirmButtonColor: '#3498db',
                confirmButtonText: 'Entendido'
              });
            } else {
              this.showErrorMessage('Error al eliminar la categoría');
            }
          }
        });
      }
    });
  }

  // ✅ MEJORADO CON SWEETALERT2
  viewDetails(categoria: Categoria): void {
    Swal.fire({
      title: `Detalles de: ${categoria.nombre}`,
      html: `<div style="text-align: left; padding: 10px;">
               <p>Información detallada de la categoría <b>${categoria.nombre}</b>.</p>
               <p><i>(Puedes cargar más detalles del backend aquí)</i></p>
             </div>`,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3498db',
      showCloseButton: true,
    });
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
}