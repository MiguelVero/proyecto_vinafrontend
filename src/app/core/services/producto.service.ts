import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, throwError, catchError,of  } from 'rxjs';
import { Product, Country, Category, Brand, Supplier } from '../models/producto.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

private handleError(error: any) {
  console.error('Error completo:', error);
  
  let errorMessage = 'Something went wrong; please try again later.';
  
  if (error.status === 404) {
    errorMessage = 'Recurso no encontrado. Verifica la URL.';
  } else if (error.status === 0) {
    errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté ejecutándose.';
  } else if (error.error instanceof ErrorEvent) {
    errorMessage = `Error del cliente: ${error.error.message}`;
  } else {
    errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
  }
  
  console.error('An error occurred:', errorMessage);
  return throwError(() => new Error(errorMessage));
}
  // ========= MÉTODOS DE RELACIONES =========
  getCategorias(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categorias`).pipe(
      catchError(this.handleError)
    );
  }

  getMarcas(): Observable<Brand[]> {
    return this.http.get<Brand[]>(`${this.apiUrl}/marcas`).pipe(
      catchError(this.handleError)
    );
  }

getProveedores(): Observable<Supplier[]> {
  return this.http.get<any[]>(`${this.apiUrl}/proveedores`).pipe(
    map(proveedores => {
      console.log('Proveedores crudos:', proveedores);
      return proveedores.map(prov => ({
        id_proveedor: prov.id_proveedor,
        nombre: prov.razon_social || prov.nombre_completo // Usa razón social o nombre completo
      }));
    }),
    catchError(this.handleError)
  );
}
  getPaises(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.apiUrl}/paises`).pipe(
      catchError(this.handleError)
    );
  }

  // ========= PRODUCTOS =========
// En producto.service.ts - MODIFICAR el método getProductsWithDetails
getProductsWithDetails(): Observable<any[]> {
  return forkJoin({
    productos: this.http.get<Product[]>(`${this.apiUrl}/productos`),
    paises: this.http.get<Country[]>(`${this.apiUrl}/paises`).pipe(catchError(() => of([]))),
    categorias: this.http.get<Category[]>(`${this.apiUrl}/categorias`).pipe(catchError(() => of([]))),
    marcas: this.http.get<Brand[]>(`${this.apiUrl}/marcas`).pipe(catchError(() => of([]))),
    proveedores: this.getProveedores().pipe(catchError(() => of([])))
  }).pipe(
    map(({ productos, paises, categorias, marcas, proveedores }) => {
      console.log('=== DEBUG PRODUCTOS ===');
      
      return productos.map(product => {
        const pais = paises?.find(p => p.id === product.paisOrigenId);
        const categoria = categorias?.find(c => c.id_categoria === product.categoriaId);
        const marca = marcas?.find(m => m.id_marca === product.marcaId);

        return {
          ...product,
           stockMinimo: product.stock_minimo || 0, // 👈 AÑADIR
          paisOrigenNombre: pais ? pais.nombre : 'No disponible',
          categoriaNombre: categoria ? categoria.nombre : 'No disponible',
          marcaNombre: marca ? marca.nombre : 'No disponible'
        };
      });
    }),
    catchError(this.handleError)
  );
}

// AGREGAR este nuevo método para vendedores
getProductsForSales(): Observable<any[]> {
  return this.http.get<Product[]>(`${this.apiUrl}/productos`).pipe(
    map(productos => {
      // Solo información esencial para ventas
      return productos.map(producto => ({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        stock: producto.stock,
         stockMinimo: producto.stock_minimo || 0, // 👈 AÑADIR
        categoriaId: producto.categoriaId,
        marcaId: producto.marcaId,
        // Placeholders para la vista
        categoriaNombre: 'Categoría',
        marcaNombre: 'Marca', 
        proveedorNombre: 'Proveedor',
        paisOrigenNombre: 'País'
      }));
    }),
    catchError(this.handleError)
  );
}
  private getNameById(items: any[], id: number): string {
    const item = items.find(i => i.id === id);
    return item ? item.nombre : 'N/A';
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/productos`).pipe(
      catchError(this.handleError)
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/productos/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/productos`, product).pipe(
      catchError(this.handleError)
    );
  }

  updateProduct(id: number, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/productos/${id}`, product).pipe(
      catchError(this.handleError)
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/productos/${id}`).pipe(
      catchError(this.handleError)
    );
  }
  // src/app/core/services/producto.service.ts
// AGREGAR ESTE MÉTODO A LA CLASE EXISTENTE

// ========== NUEVO MÉTODO PARA VERIFICAR LOTES DE PRODUCTO ==========
verificarLotesProducto(id_producto: number): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/lotes/producto/${id_producto}/verificar`).pipe(
    catchError(this.handleError)
  );
}

// ========== NUEVO MÉTODO PARA OBTENER STOCK REAL ==========
getStockRealProducto(id_producto: number): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/lotes/producto/${id_producto}/stock-real`).pipe(
    catchError(this.handleError)
  );
}
}
