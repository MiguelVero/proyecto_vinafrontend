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

import { Product } from '../../core/models/producto.model';
import { ProductService } from '../../core/services/producto.service';

@Component({
  selector: 'app-producto-form',
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
  templateUrl: './producto-form.component.html',
  styleUrls: ['./producto-form.component.css'],
})
export class ProductoFormComponent implements OnInit {
  productForm: FormGroup;
  isEditMode = false;
  isLoading = false;

  // Listas para los selects
  categorias: any[] = [];
  marcas: any[] = [];
  proveedores: any[] = [];
  paises: any[] = [];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ProductoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {
    this.productForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadData();

    if (this.data?.product) {
      this.isEditMode = true;
    }
  }

  isFormReady(): boolean {
    if (this.isEditMode) {
      const values = this.productForm.value;
      return !!(
        values.nombre &&
        values.descripcion &&
        values.precio &&
        values.stock !== null &&
        values.categoriaId &&
        values.marcaId &&
        values.paisOrigenId
      );
    }
    return true;
  }

private createForm(): FormGroup {
  return this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: ['', [Validators.required, Validators.minLength(3)]],
    precio: ['', [Validators.required, Validators.min(0.01)]],
    stock: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]], // 👈 SIEMPRE DESHABILITADO
    stockMinimo: [0, [Validators.required, Validators.min(0)]], // 👈 NUEVO CAMPO
    categoriaId: ['', Validators.required],
    marcaId: ['', Validators.required],
    paisOrigenId: ['', Validators.required],
  });
}

private loadFormData(product: Product): void {
  setTimeout(() => {
    this.productForm.patchValue({
      nombre: product.nombre || '',
      descripcion: product.descripcion || '',
      precio: product.precio || 0,
      stock: product.stock || 0, // El valor se asigna, pero el control sigue deshabilitado
      stockMinimo: product.stock_minimo || 0, // 👈 NUEVO
      categoriaId: product.categoriaId || '',
      marcaId: product.marcaId || '',
      paisOrigenId: product.paisOrigenId || '',
    });
    this.productForm.updateValueAndValidity();
  }, 0);
}

  private loadData(): void {
    this.isLoading = true;

    forkJoin({
      categorias: this.productService.getCategorias(),
      marcas: this.productService.getMarcas(),
      paises: this.productService.getPaises()
    }).subscribe({
      next: (data) => {
        this.categorias = data.categorias;
        this.marcas = data.marcas;
        this.paises = data.paises;
        this.isLoading = false;

        if (this.data?.product) {
          this.loadFormData(this.data.product);
        }
      },
      error: (err) => {
        console.error('Error cargando datos:', err);
        this.isLoading = false;
        this.showMessage('Error al cargar los datos del formulario', 'error');
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warn'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: [`${type}-snackbar`],
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const formData = this.productForm.value;

      const request$ = this.isEditMode
        ? this.productService.updateProduct(this.data.product.id_producto!, formData)
        : this.productService.createProduct(formData);

      this.isLoading = true;

      request$.subscribe({
        next: () => {
          this.isLoading = false;
          this.showMessage(
            this.isEditMode
              ? '✅ Producto actualizado correctamente'
              : '✅ Producto creado correctamente',
            'success'
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error guardando producto:', error);
          this.showMessage('❌ Error al guardar el producto', 'error');
        },
      });
    } else {
      this.showMessage('⚠️ Complete todos los campos requeridos correctamente', 'warn');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // ✅ MÉTODO LIMPIAR AGREGADO CORRECTAMENTE
  onLimpiar(): void {
    this.productForm.reset();
  }
}
