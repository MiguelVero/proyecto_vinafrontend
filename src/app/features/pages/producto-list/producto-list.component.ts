// En producto-list.component.ts - MODIFICAR completamente
import { Component, OnInit, ViewChild, inject, ElementRef } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Product } from '../../../core/models/producto.model';
import { ProductService } from '../../../core/services/producto.service';
import { ProductoFormComponent } from '../../../components/producto-form/producto-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service'; // ✅ AGREGAR

@Component({
  selector: 'app-producto-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule
  ],
  templateUrl: './producto-list.component.html',
  styleUrls: ['./producto-list.component.css'],
})
export class ProductoListComponent implements OnInit {
  pageSize = 10;
  displayedColumns: string[] = [
    'nombre',
    'descripcion',
    'precio',
    'stock',
    'stockMinimo', // 👈 NUEVA COLUMNA
    'categoria',
    'marca',
    'paisOrigen',
    'acciones'
  ];

  dataSource: MatTableDataSource<any>;
  isLoading = true;
  isVendedor = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
 @ViewChild('tableWrapper') tableWrapper!: ElementRef;
  // ✅ INYECTAR AuthService
  private authService = inject(AuthService);

  constructor(
    private productService: ProductService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<any>();
  }

  ngOnInit(): void {
    // ✅ DETERMINAR SI ES VENDEDOR
    const currentUser = this.authService.getCurrentUser();
    this.isVendedor = currentUser?.id_rol === 2;
    
    // ✅ OCULTAR COLUMNAS DE ACCIONES SI ES VENDEDOR
    if (this.isVendedor) {
      this.displayedColumns = this.displayedColumns.filter(col => col !== 'acciones');
    }

    this.loadProductsWithDetails();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadProductsWithDetails(): void {
    this.isLoading = true;

    
    if (this.isVendedor) {
      // ✅ USAR MÉTODO SIMPLIFICADO PARA VENDEDORES
      this.productService.getProductsForSales().subscribe({
        next: (products) => {
          console.log('📦 Productos para vendedor:', products);
          this.dataSource = new MatTableDataSource(products);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando productos para ventas:', error);
          this.isLoading = false;
          this.loadBasicProducts();
        }
      });
    } else {
      // ✅ USAR MÉTODO COMPLETO PARA ADMIN/ALMACENERO
      this.productService.getProductsWithDetails().subscribe({
        next: (productsWithDetails) => {
          console.log('📦 Productos con detalles:', productsWithDetails);
          this.dataSource = new MatTableDataSource(productsWithDetails);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando productos con detalles:', error);
          this.isLoading = false;
          this.loadBasicProducts();
        }
      });
    }
  }

  loadBasicProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        const productsWithPlaceholders = products.map(p => ({
          ...p,
          stockMinimo: p.stock_minimo || 0, // 👈 AÑADIR
          categoriaNombre: 'No disponible',
          marcaNombre: 'No disponible',
          proveedorNombre: 'No disponible',
          paisOrigenNombre: 'No disponible'
        }));
        
        this.dataSource = new MatTableDataSource(productsWithPlaceholders);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando productos básicos:', error);
        this.isLoading = false;
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

  openAddDialog(): void {
    // ✅ SOLO PERMITIR SI NO ES VENDEDOR
    if (this.isVendedor) {
      this.showErrorMessage('No tienes permisos para agregar productos');
      return;
    }

    const dialogRef = this.dialog.open(ProductoFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '85vh',
      panelClass: 'product-form-dialog',
      autoFocus: false
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProductsWithDetails();
      }
    });
  }

  openEditDialog(product: Product): void {
    // ✅ SOLO PERMITIR SI NO ES VENDEDOR
    if (this.isVendedor) {
      this.showErrorMessage('No tienes permisos para editar productos');
      return;
    }

    const dialogRef = this.dialog.open(ProductoFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '85vh',
      panelClass: 'product-form-dialog',
      autoFocus: false,
      data: { product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProductsWithDetails();
      }
    });
  }

  deleteProduct(product: Product): void {
    // ✅ SOLO PERMITIR SI NO ES VENDEDOR
    if (this.isVendedor) {
      this.showErrorMessage('No tienes permisos para eliminar productos');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        message: `¿Estás seguro de que deseas eliminar el producto "${product.nombre}"? Esta acción no se puede deshacer.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productService.deleteProduct(product.id_producto!).subscribe({
          next: () => {
            this.loadProductsWithDetails();
            this.showSuccessMessage('Producto eliminado correctamente');
          },
          error: (error) => {
            console.error('Error eliminando producto:', error);
            this.showErrorMessage('Error al eliminar el producto');
          }
        });
      }
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

  // ✅ NUEVO MÉTODO PARA VERIFICAR PERMISOS
  canEdit(): boolean {
    return !this.isVendedor;
  }
}