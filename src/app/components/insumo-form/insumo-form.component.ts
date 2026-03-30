// src/app/components/insumo-form/insumo-form.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { Insumo, InsumoCreate, InsumoUpdate } from '../../core/models/insumo.model';
import { InsumoService } from '../../core/services/insumo.service';
import { ProveedorService } from '../../core/services/proveedor.service';

@Component({
  selector: 'app-insumo-form',
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
    MatCheckboxModule
  ],
  templateUrl: './insumo-form.component.html',
  styleUrls: ['./insumo-form.component.css']
})
export class InsumoFormComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  isLoading = false;
  proveedores: any[] = [];

  unidadesMedida = [
    'unidades',
    'kg',
    'g',
    'litros',
    'ml',
    'metros',
    'cm',
    'pares',
    'docenas',
    'paquetes',
    'cajas',
    'rollos',
    'hojas'
  ];

  constructor(
    private fb: FormBuilder,
    private insumoService: InsumoService,
    private proveedorService: ProveedorService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<InsumoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { insumo?: Insumo }
  ) {
    this.isEditMode = !!data?.insumo;
    this.form = this.createForm();
  }

  ngOnInit(): void {
    this.loadProveedores();
    if (this.isEditMode && this.data.insumo) {
      this.loadFormData();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      unidad_medida: ['unidades', Validators.required],
      stock_minimo: [0, [Validators.required, Validators.min(0)]],
      costo_promedio: [0, [Validators.required, Validators.min(0)]],
      id_proveedor_principal: [null],
      activo: [true]
    });
  }

  loadProveedores(): void {
    this.proveedorService.getProveedores().subscribe({
      next: (data) => {
        this.proveedores = data.filter(p => p.activo);
      },
      error: (error) => {
        console.error('Error loading proveedores:', error);
      }
    });
  }

  loadFormData(): void {
    if (this.data.insumo) {
      this.form.patchValue({
        nombre: this.data.insumo.nombre,
        descripcion: this.data.insumo.descripcion,
        unidad_medida: this.data.insumo.unidad_medida,
        stock_minimo: this.data.insumo.stock_minimo,
        costo_promedio: this.data.insumo.costo_promedio,
        id_proveedor_principal: this.data.insumo.id_proveedor_principal,
        activo: this.data.insumo.activo
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      this.snackBar.open('Complete todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.form.value;

    if (this.isEditMode && this.data.insumo) {
      const payload: InsumoUpdate = {
        nombre: formValue.nombre,
        descripcion: formValue.descripcion,
        unidad_medida: formValue.unidad_medida,
        stock_minimo: formValue.stock_minimo,
        costo_promedio: formValue.costo_promedio,
        id_proveedor_principal: formValue.id_proveedor_principal,
        activo: formValue.activo
      };

      this.insumoService.updateInsumo(this.data.insumo.id_insumo, payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Insumo actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating insumo:', error);
          this.snackBar.open('Error al actualizar insumo', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      const payload: InsumoCreate = {
        nombre: formValue.nombre,
        descripcion: formValue.descripcion,
        unidad_medida: formValue.unidad_medida,
        stock_minimo: formValue.stock_minimo,
        costo_promedio: formValue.costo_promedio,
        id_proveedor_principal: formValue.id_proveedor_principal
      };

      this.insumoService.createInsumo(payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Insumo creado correctamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error creating insumo:', error);
          this.snackBar.open('Error al crear insumo', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}