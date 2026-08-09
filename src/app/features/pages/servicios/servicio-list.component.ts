// src/app/features/pages/servicios/servicio-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // ✅ AGREGAR ESTA LÍNEA
import { ProductService } from '../../../core/services/producto.service';
import { ProductoFormComponent } from '../../../components/producto-form/producto-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';
import { ServicioFormComponent } from '../../../components/servicio-form/servicio-form.component';
@Component({
  selector: 'app-servicio-list',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule // ✅ AGREGAR ESTA LÍNEA
  ],
  templateUrl: './servicio-list.component.html',
  styleUrls: ['./servicio-list.component.css']
})
export class ServicioListComponent implements OnInit {
  private productService = inject(ProductService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  // Datos de servicios (actualmente solo el de recarga, pero ampliable)
  servicios: any[] = [];
  displayedColumns: string[] = ['nombre', 'descripcion', 'precio', 'stock', 'categoria', 'marca', 'acciones'];
  isLoading = false;

  ngOnInit(): void {
    this.cargarServicios();
  }

  cargarServicios(): void {
    this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (productos) => {
        // 🔥 Aquí defines qué productos son servicios.
        // Por ahora, filtramos por id_producto === 5 (Servicio de Recarga de Bidón)
        // En el futuro, podrías usar un campo booleano 'es_servicio' en la BD.
        this.servicios = productos.filter(p => 
          p.id_producto === 5 || 
          p.nombre.toLowerCase().includes('servicio')
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando servicios:', error);
        this.servicios = [];
        this.isLoading = false;
        this.mostrarError('No se pudieron cargar los servicios');
      }
    });
  }

  // Editar servicio (reutiliza el mismo formulario de productos)
 // En el método editarServicio:
editarServicio(servicio: any): void {
  if (!this.authService.isAdmin()) {
    this.mostrarError('Solo los administradores pueden editar servicios');
    return;
  }

  const dialogRef = this.dialog.open(ServicioFormComponent, {
    width: '600px',
    maxWidth: '95vw',
    height: 'auto',
    maxHeight: '85vh',
    panelClass: 'servicio-form-dialog',
    autoFocus: false,
    data: { servicio }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.cargarServicios();
      this.mostrarExito('Servicio actualizado correctamente');
    }
  });
}

  // Eliminar servicio (solo administradores)
  eliminarServicio(servicio: any): void {
    if (!this.authService.isAdmin()) {
      this.mostrarError('Solo los administradores pueden eliminar servicios');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        message: `¿Estás seguro de eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productService.deleteProduct(servicio.id_producto).subscribe({
          next: () => {
            this.cargarServicios();
            this.mostrarExito('Servicio eliminado correctamente');
          },
          error: (error) => {
            console.error('Error eliminando servicio:', error);
            this.mostrarError('No se pudo eliminar el servicio');
          }
        });
      }
    });
  }

  // Mensajes de feedback
  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}