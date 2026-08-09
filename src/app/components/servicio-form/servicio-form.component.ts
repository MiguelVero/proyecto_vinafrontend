// src/app/components/servicio-form/servicio-form.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { ProductService } from '../../core/services/producto.service';

@Component({
  selector: 'app-servicio-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="title-icon">build</mat-icon>
      {{ isEditMode ? 'Editar' : 'Nuevo' }} Servicio
    </h2>

    <mat-dialog-content>
      <div class="loading-overlay" *ngIf="isLoading">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <form [formGroup]="servicioForm" class="servicio-form">
        <!-- Nombre -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" required />
          <mat-error *ngIf="servicioForm.get('nombre')?.hasError('required')">Nombre requerido</mat-error>
        </mat-form-field>

        <!-- Descripción -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="2" required></textarea>
          <mat-error *ngIf="servicioForm.get('descripcion')?.hasError('required')">Descripción requerida</mat-error>
        </mat-form-field>

        <!-- Precio -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Precio</mat-label>
          <input matInput type="number" formControlName="precio" min="0.01" step="0.01" required />
          <span matPrefix>S/&nbsp;</span>
          <mat-error *ngIf="servicioForm.get('precio')?.hasError('required')">Precio requerido</mat-error>
        </mat-form-field>

        <!-- Categoría (solo lectura, siempre Bidón) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="categorias.length > 0">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoriaId" required>
            <mat-option *ngFor="let cat of categorias" [value]="cat.id_categoria">
              {{ cat.nombre }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="servicioForm.get('categoriaId')?.hasError('required')">Categoría requerida</mat-error>
        </mat-form-field>

        <!-- Stock: Siempre ilimitado, solo para mostrar -->
        <div class="stock-info">
          <span class="stock-label">Stock</span>
          <span class="stock-value">♾️ Ilimitado</span>
          <small class="stock-hint">El stock de un servicio no se gestiona vía inventario</small>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" class="cancel-button">
        <mat-icon>close</mat-icon> Cancelar
      </button>
      <button mat-raised-button color="primary" (click)="onSubmit()" 
              [disabled]="servicioForm.invalid || isLoading" class="submit-button">
        <mat-icon>save</mat-icon> {{ isEditMode ? 'Actualizar' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 12px 20px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #fafafa;
      font-size: 1.1rem;
      font-weight: 500;
    }
    .title-icon { color: #3f51b5; }
    mat-dialog-content { padding: 16px 20px !important; max-height: 68vh !important; }
    .full-width { width: 100%; margin-bottom: 12px; }
    .stock-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      margin: 8px 0 16px;
      border: 1px solid #e0e0e0;
    }
    .stock-label { font-weight: 600; color: #333; }
    .stock-value { font-weight: 700; color: #2e7d32; }
    .stock-hint { color: #666; font-size: 0.8rem; margin-left: auto; }
    .cancel-button { background-color: #d32f2f !important; color: white !important; }
    .submit-button { background-color: #1976d2 !important; }
    mat-dialog-actions { padding: 12px 20px !important; border-top: 1px solid #e0e0e0; }
  `]
})
export class ServicioFormComponent implements OnInit {
  servicioForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  categorias: any[] = [];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ServicioFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { servicio: any }
  ) {
    this.servicioForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCategorias();
    if (this.data?.servicio) {
      this.isEditMode = true;
      this.servicioForm.patchValue({
        nombre: this.data.servicio.nombre || '',
        descripcion: this.data.servicio.descripcion || '',
        precio: this.data.servicio.precio || 0,
        categoriaId: this.data.servicio.categoriaId || 1 // Bidón por defecto
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: ['', [Validators.required, Validators.minLength(3)]],
      precio: ['', [Validators.required, Validators.min(0.01)]],
      categoriaId: [1, Validators.required] // Siempre Bidón, pero permitimos selección
    });
  }

  private loadCategorias(): void {
    this.isLoading = true;
    this.productService.getCategorias().subscribe({
      next: (cats) => {
        this.categorias = cats;
        this.isLoading = false;
        // Si no se ha seleccionado, poner Bidón (id 1)
        if (!this.servicioForm.get('categoriaId')?.value) {
          this.servicioForm.patchValue({ categoriaId: 1 });
        }
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar categorías', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onSubmit(): void {
    if (this.servicioForm.invalid) {
      this.snackBar.open('Complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formData = this.servicioForm.value;

    // Asegurar que stock no se envíe (o forzar 99999)
    // Si el backend espera stock, podemos enviarlo, pero como es un servicio, dejamos 99999
    const payload = {
      ...formData,
      stock: 99999,
      stockMinimo: 0,
      marcaId: 3, // Sin Marca (o el que corresponda)
      paisOrigenId: 1 // Perú
    };

    const request$ = this.isEditMode
      ? this.productService.updateProduct(this.data.servicio.id_producto, payload)
      : this.productService.createProduct(payload);

    request$.subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open(
          this.isEditMode ? 'Servicio actualizado' : 'Servicio creado',
          'Cerrar',
          { duration: 3000, panelClass: ['success-snackbar'] }
        );
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error guardando servicio:', error);
        this.snackBar.open('Error al guardar el servicio', 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}