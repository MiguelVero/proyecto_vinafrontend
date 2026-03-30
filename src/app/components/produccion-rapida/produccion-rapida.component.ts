// src/app/components/produccion-rapida/produccion-rapida.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ProductService } from '../../core/services/producto.service';
import { ProduccionService, VerificacionProduccion } from '../../core/services/produccion.service';
import { Product } from '../../core/models/producto.model';

@Component({
  selector: 'app-produccion-rapida',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  templateUrl: './produccion-rapida.component.html',
  styleUrls: ['./produccion-rapida.component.css']
})
export class ProduccionRapidaComponent implements OnInit {
  private productService = inject(ProductService);
  private produccionService = inject(ProduccionService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ProduccionRapidaComponent>);

  productos: Product[] = [];
  productoSeleccionado: Product | null = null;
  cantidadPaquetes: number = 1;
  cantidadBotellas: number = 15;
  descripcion: string = '';
  
  verificando: boolean = false;
  produciendo: boolean = false;
  verificacion: VerificacionProduccion | null = null;
  
  // Para productos de botella (paquetes de 15)
  esProductoPaquete: boolean = false;
  
  ngOnInit(): void {
    this.cargarProductos();
  }
  
  cargarProductos(): void {
    this.productService.getProducts().subscribe({
      next: (productos) => {
        // Mostrar solo productos que son botellas/paquetes
        this.productos = productos.filter(p => 
          p.nombre.includes('Botella') || p.nombre.includes('Paquete')
        );
      },
      error: (err) => {
        this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 });
      }
    });
  }
  
  onProductoChange(): void {
    if (this.productoSeleccionado) {
      this.esProductoPaquete = this.productoSeleccionado.nombre.includes('Paquete') || 
                                this.productoSeleccionado.nombre.includes('Botella');
      this.verificarDisponibilidad();
    }
  }
  
  onCantidadChange(): void {
    this.cantidadBotellas = this.esProductoPaquete ? this.cantidadPaquetes * 15 : this.cantidadPaquetes;
    this.verificarDisponibilidad();
  }
  
  verificarDisponibilidad(): void {
    if (!this.productoSeleccionado) return;
    
    this.verificando = true;
    this.verificacion = null;
    
    const cantidad = this.esProductoPaquete ? this.cantidadPaquetes : this.cantidadPaquetes;
    
    this.produccionService.verificarDisponibilidad(this.productoSeleccionado.id_producto!, cantidad).subscribe({
      next: (result) => {
        this.verificacion = result;
        this.verificando = false;
        
        if (!result.disponible) {
          this.snackBar.open(
            `⚠️ Stock insuficiente: ${result.insumosFaltantes.map(i => i.nombre).join(', ')}`,
            'Cerrar',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      },
      error: (err) => {
        this.verificando = false;
        this.snackBar.open(err.error?.message || 'Error al verificar disponibilidad', 'Cerrar', { duration: 3000 });
      }
    });
  }
  
  puedeProducir(): boolean {
    return !!this.productoSeleccionado && 
           !!this.verificacion && 
           this.verificacion.disponible && 
           this.cantidadPaquetes > 0 &&
           !this.produciendo;
  }
  
  producir(): void {
    if (!this.puedeProducir()) return;
    
    this.produciendo = true;
    const cantidad = this.esProductoPaquete ? this.cantidadPaquetes : this.cantidadPaquetes;
    
    this.produccionService.ejecutarProduccion(
      this.productoSeleccionado!.id_producto!,
      cantidad,
      this.descripcion || `Producción de ${this.cantidadBotellas} botellas (${this.cantidadPaquetes} paquetes)`
    ).subscribe({
      next: (result) => {
        this.produciendo = false;
        this.snackBar.open(
          `✅ ${result.message}`,
          'Cerrar',
          { duration: 5000, panelClass: ['success-snackbar'] }
        );
        
        // Disparar evento de actualización
        window.dispatchEvent(new CustomEvent('inventario-actualizado'));
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          this.dialogRef.close(true);
        }, 1500);
      },
      error: (err) => {
        this.produciendo = false;
        this.snackBar.open(
          err.error?.message || 'Error al procesar producción',
          'Cerrar',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }
  
  cancelar(): void {
    this.dialogRef.close();
  }
  
  // Helper para calcular porcentaje de stock
  getPorcentajeStock(stock: number, necesario: number): number {
    if (!stock || necesario === 0) return 0;
    return Math.min(100, (stock / necesario) * 100);
  }
  
  // Helper para obtener clase de stock
  getStockClass(stock: number, necesario: number): string {
    if (!stock || stock === 0) return 'sin-stock';
    if (stock < necesario) return 'stock-insuficiente';
    return 'stock-suficiente';
  }
}