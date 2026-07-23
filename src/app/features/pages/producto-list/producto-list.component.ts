// producto-list.component.ts - VERSIÓN COMPLETA CORREGIDA
import { Component, OnInit, ViewChild, inject, ElementRef } from '@angular/core';
import { forkJoin } from 'rxjs';
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
import { LoteService } from '../../../core/services/lote.service';
import { Lote } from '../../../core/models/lote.model';
import { ProductoFormComponent } from '../../../components/producto-form/producto-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

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
    'stockMinimo',
    'categoria',
    'marca',
    'paisOrigen',
    'acciones'
  ];

  dataSource: MatTableDataSource<any>;
  isLoading = true;
  isVendedor = false;
  lotesCache: Lote[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableWrapper') tableWrapper!: ElementRef;

  private authService = inject(AuthService);

  constructor(
    private productService: ProductService,
    private loteService: LoteService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<any>();
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isVendedor = currentUser?.id_rol === 2;
    
    if (this.isVendedor) {
      this.displayedColumns = this.displayedColumns.filter(col => col !== 'acciones');
    }

    this.loadProductsWithDetails();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // ============================================
  // 🔧 NORMALIZAR FECHA A FORMATO YYYY-MM-DD
  // ============================================
  private normalizarFecha(fecha: string): string {
    if (!fecha) return '';
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    
    if (fecha.includes('T')) {
      return fecha.split('T')[0];
    }
    
    if (fecha.includes('/')) {
      const partes = fecha.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const anio = partes[2];
        const anioCompleto = anio.length === 2 ? `20${anio}` : anio;
        return `${anioCompleto}-${mes}-${dia}`;
      }
    }
    
    if (fecha.includes('-')) {
      const partes = fecha.split('-');
      if (partes.length === 3 && partes[2].length === 4) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const anio = partes[2];
        return `${anio}-${mes}-${dia}`;
      }
    }
    
    try {
      const date = new Date(fecha);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Error normalizando fecha:', fecha, e);
    }
    
    return fecha;
  }

  // ============================================
  // 🔍 VERIFICAR CONSISTENCIA DE STOCK
  // ============================================
  private verificarConsistenciaStock(producto: any, lotes: Lote[]): boolean {
    const lotesProducto = lotes.filter(l => l.id_producto === producto.id_producto);
    
    if (lotesProducto.length === 0) {
      return producto.stock !== 0;
    }
    
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    
    let stockLotesValidos = 0;
    
    lotesProducto.forEach(l => {
      // ✅ SOLO considerar lotes ACTIVOS
      if (!l.activo) return;
      
      const fechaStr = this.normalizarFecha(l.fecha_caducidad);
      const esValido = fechaStr >= hoyStr;
      
      if (esValido) {
        stockLotesValidos += l.cantidad_actual;
      }
    });
    
    // Debug para identificar inconsistencias
    const esInconsistente = producto.stock !== stockLotesValidos;
    
    if (esInconsistente) {
      console.log(`⚠️ Producto "${producto.nombre}" - INCONSISTENTE:`, {
        stockProducto: producto.stock,
        stockLotesValidos: stockLotesValidos,
        hoy: hoyStr,
        diferencia: producto.stock - stockLotesValidos
      });
    } else {
      console.log(`✅ Producto "${producto.nombre}" - CONSISTENTE:`, {
        stockProducto: producto.stock,
        stockLotesValidos: stockLotesValidos,
        hoy: hoyStr
      });
    }
    
    return esInconsistente;
  }

  // ============================================
  // 📥 CARGAR PRODUCTOS CON DETALLES
  // ============================================
  loadProductsWithDetails(): void {
    this.isLoading = true;

    if (this.isVendedor) {
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
      forkJoin({
        productos: this.productService.getProductsWithDetails(),
        lotes: this.loteService.getLotes()
      }).subscribe({
        next: ({ productos, lotes }) => {
          this.lotesCache = lotes;
          
          const productosConStock = productos.map((producto: any) => {
            const stockInconsistente = this.verificarConsistenciaStock(producto, lotes);
            return {
              ...producto,
              stockInconsistente
            };
          });
          
          console.log('📦 Productos con verificación de stock:', productosConStock);
          this.dataSource = new MatTableDataSource(productosConStock);
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

  // ============================================
  // 📥 CARGAR PRODUCTOS BÁSICOS (FALLBACK)
  // ============================================
  loadBasicProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        const productsWithPlaceholders = products.map(p => ({
          ...p,
          stockMinimo: p.stock_minimo || 0,
          categoriaNombre: 'No disponible',
          marcaNombre: 'No disponible',
          proveedorNombre: 'No disponible',
          paisOrigenNombre: 'No disponible',
          stockInconsistente: false
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

  // ============================================
  // 🔄 RECARGAR DATOS
  // ============================================
  recargarDatos(): void {
    this.loadProductsWithDetails();
  }

  // ============================================
  // 🔍 FILTRO DE BÚSQUEDA
  // ============================================
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // ============================================
  // ➕ AGREGAR PRODUCTO
  // ============================================
  openAddDialog(): void {
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

  // ============================================
  // ✏️ EDITAR PRODUCTO
  // ============================================
  openEditDialog(product: Product): void {
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

  // ============================================
  // 🗑️ ELIMINAR PRODUCTO
  // ============================================
  deleteProduct(product: Product): void {
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

  // ============================================
  // 📢 NOTIFICACIONES
  // ============================================
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

  // ============================================
  // 🔐 VERIFICAR PERMISOS
  // ============================================
  canEdit(): boolean {
    return !this.isVendedor;
  }

  // ============================================
  // 📊 OBTENER CONTEO DE PRODUCTOS INCONSISTENTES
  // ============================================
  getProductosInconsistentes(): number {
    return this.dataSource.data.filter((p: any) => p.stockInconsistente).length;
  }
}