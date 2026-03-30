import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProveedorService } from '../../core/services/proveedor.service';
import { Proveedor, ProveedorCreate, ProveedorUpdate } from '../../core/models/proveedor.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-proveedor-form',
  templateUrl: './proveedor-form.component.html',
  styleUrls: ['./proveedor-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ]
})
export class ProveedorFormComponent {
  form: FormGroup;
  isLoading = false;
  titulo = '';

  constructor(
    private fb: FormBuilder,
    private proveedorService: ProveedorService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ProveedorFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Proveedor
  ) {
    this.form = this.fb.group({
      // Datos de persona
      tipo_documento: [data?.tipo_documento || 'RUC', Validators.required],
      numero_documento: [data?.numero_documento || '', Validators.required],
      nombre_completo: [data?.nombre_completo || '', Validators.required],
      telefono: [data?.telefono || ''],
      direccion: [data?.direccion || ''],
      
      // Datos de proveedor
      razon_social: [data?.razon_social || '', Validators.required],
      activo: [data?.activo !== undefined ? data.activo : true]
    });

    this.titulo = data && data.id_proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor complete los campos requeridos.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.form.value;

    if (this.data && this.data.id_proveedor) {
      // Editar
      const proveedorUpdate: ProveedorUpdate = {
        nombre_completo: formValue.nombre_completo,
        telefono: formValue.telefono,
        direccion: formValue.direccion,
        razon_social: formValue.razon_social,
        activo: formValue.activo
      };

      this.proveedorService.updateProveedor(this.data.id_proveedor, proveedorUpdate).subscribe({
        next: () => {
          this.snackBar.open('Proveedor actualizado correctamente.', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackBar.open('Ocurrió un error: ' + err.message, 'Cerrar', { duration: 3000 });
          this.isLoading = false;
        },
        complete: () => (this.isLoading = false)
      });
    } else {
      // Crear
      const proveedorCreate: ProveedorCreate = {
        tipo_documento: formValue.tipo_documento,
        numero_documento: formValue.numero_documento,
        nombre_completo: formValue.nombre_completo,
        telefono: formValue.telefono,
        direccion: formValue.direccion,
        razon_social: formValue.razon_social,
        activo: formValue.activo
      };

      this.proveedorService.createProveedor(proveedorCreate).subscribe({
        next: () => {
          this.snackBar.open('Proveedor registrado correctamente.', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackBar.open('Ocurrió un error: ' + err.message, 'Cerrar', { duration: 3000 });
          this.isLoading = false;
        },
        complete: () => (this.isLoading = false)
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}