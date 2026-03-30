import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CategoriaService } from '../../core/services/categoria.service';
import { Categoria } from '../../core/models/categoria.model';

@Component({
  selector: 'app-categoria-form',
  templateUrl: './categoria-form.component.html',
  styleUrls: ['./categoria-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ]
})
export class CategoriaFormComponent {
  form: FormGroup;
  isLoading = false;
  titulo = '';

  constructor(
    private fb: FormBuilder,
    private categoriaService: CategoriaService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CategoriaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Categoria
  ) {
    this.form = this.fb.group({
      id_categoria: [data?.id_categoria || 0],
      nombre: [data?.nombre || '', [Validators.required, Validators.minLength(3)]]
    });

    this.titulo = data && data.id_categoria ? 'Editar Categoría' : 'Nueva Categoría';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor complete los campos requeridos.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const categoria = this.form.value as Categoria;

    const request = categoria.id_categoria
      ? this.categoriaService.updateCategoria(categoria.id_categoria, categoria)
      : this.categoriaService.createCategoria(categoria);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          categoria.id_categoria ? 'Categoría actualizada correctamente.' : 'Categoría registrada correctamente.',
          'Cerrar',
          { duration: 3000 }
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.snackBar.open('Ocurrió un error: ' + err.message, 'Cerrar', { duration: 3000 });
        this.isLoading = false;
      },
      complete: () => (this.isLoading = false)
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
