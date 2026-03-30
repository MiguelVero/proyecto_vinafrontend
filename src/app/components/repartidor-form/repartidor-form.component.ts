import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { Repartidor, RepartidorCreate } from '../../core/models/repartidor.model';
import { RepartidorService } from '../../core/services/repartidor.service';
import { PersonaService } from '../../core/services/persona.service';
import { Persona } from '../../core/models/persona.model';

@Component({
  selector: 'app-repartidor-form',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './repartidor-form.component.html',
  styleUrls: ['./repartidor-form.component.css']
})
export class RepartidorFormComponent implements OnInit {
  repartidorForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  personas: Persona[] = [];

  constructor(
    private fb: FormBuilder,
    private repartidorService: RepartidorService,
    private personaService: PersonaService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<RepartidorFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { repartidor?: Repartidor }
  ) {
    this.repartidorForm = this.createForm();
    // ✅ CONFIGURACIÓN CORRECTA DE FECHAS
  const today = new Date();
  }

  ngOnInit(): void {
    this.loadPersonas();
    if (this.data?.repartidor) {
      this.isEditMode = true;
      this.loadFormData(this.data.repartidor);
    }
  }

// Y en initForm(), cambia:
initForm(): void {
  this.repartidorForm = this.fb.group({
    id_repartidor: [null, Validators.required],
    fecha_contratacion: [this.getCurrentDate(), [Validators.required]], // ✅ Ahora usa Date
  });
}









  private createForm(): FormGroup {
    return this.fb.group({
      id_persona: [null, Validators.required],
      placa_furgon: ['', Validators.required],
      fecha_contratacion: [''],
      activo: [true]
    });
  }

  loadPersonas(): void {
    this.personaService.getAll().subscribe({
      next: (p) => this.personas = p,
      error: (err) => console.error('Error cargando personas:', err)
    });
  }

  loadFormData(r: Repartidor): void {
    this.repartidorForm.patchValue({
      id_persona: r.id_persona,
      placa_furgon: r.placa_furgon,
      fecha_contratacion: r.fecha_contratacion || '',
      activo: r.activo
    });
  }

  clearForm(): void {
    this.repartidorForm.reset({
      id_persona: null,
      placa_furgon: '',
      fecha_contratacion: '',
      activo: true
    });
  }

  onSubmit(): void {
    if (this.repartidorForm.valid) {
      this.isLoading = true;
      const payload: RepartidorCreate = this.repartidorForm.value;

      const request$ = this.isEditMode && this.data.repartidor
        ? this.repartidorService.updateRepartidor(this.data.repartidor.id_repartidor, payload)
        : this.repartidorService.createRepartidor(payload);

      request$.subscribe({
        next: () => {
          this.isLoading = false;
          this.dialogRef.close(true);
          this.snackBar.open(this.isEditMode ? 'Repartidor actualizado' : 'Repartidor creado', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
        },
        error: (err) => {
          console.error('Error guardando repartidor:', err);
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al guardar repartidor';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
    } else {
      Object.keys(this.repartidorForm.controls).forEach(k => this.repartidorForm.get(k)?.markAsTouched());
      this.snackBar.open('Complete los campos requeridos', 'Cerrar', { duration: 3000, panelClass: ['warn-snackbar'] });
    }
  }

private getCurrentDate(): Date {
  const now = new Date();
  // ✅ ESTO GARANTIZA QUE SIEMPRE USE LA FECHA ACTUAL
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}



  onCancel(): void {
    this.dialogRef.close(false);
  }
}
