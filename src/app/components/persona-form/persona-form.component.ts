import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PersonaService } from '../../core/services/persona.service';

// Reutilizamos los mismos validadores personalizados
class CustomValidators {
  static soloLetras(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(control.value) ? null : { soloLetras: true };
  }

  static soloNumeros(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^\d+$/;
    return regex.test(control.value) ? null : { soloNumeros: true };
  }

  static telefonoPeruano(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^9\d{8}$/;
    return regex.test(control.value) ? null : { telefonoPeruano: true };
  }

  static dniPeruano(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^\d{8}$/;
    return regex.test(control.value) ? null : { dniPeruano: true };
  }

  static rucPeruano(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^\d{11}$/;
    return regex.test(control.value) ? null : { rucPeruano: true };
  }

  static carnetExtranjeria(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^[a-zA-Z0-9]{9,12}$/;
    return regex.test(control.value) ? null : { carnetExtranjeria: true };
  }
}

@Component({
  selector: 'app-persona-form',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './persona-form.component.html',
  styleUrls: ['./persona-form.component.css']
})
export class PersonaFormComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  isEditMode = false;

  tipos = ['DNI', 'RUC', 'CE'];

  constructor(
    private fb: FormBuilder,
    private personaService: PersonaService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<PersonaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { persona?: any } | null
  ) {
    this.form = this.fb.group({
      tipo_documento: ['DNI', Validators.required],
      numero_documento: ['', [Validators.required, this.documentoValidator.bind(this)]],
      nombre_completo: ['', [Validators.required, CustomValidators.soloLetras]],
      telefono: ['', [CustomValidators.soloNumeros, CustomValidators.telefonoPeruano]],
      direccion: [''],
      coordenadas: ['']
    });
  }

  ngOnInit(): void {
    if (this.data && this.data.persona) {
      this.isEditMode = true;
      const p = this.data.persona;
      this.form.patchValue({
        tipo_documento: p.tipo_documento || 'DNI',
        numero_documento: p.numero_documento || '',
        nombre_completo: p.nombre_completo || '',
        telefono: p.telefono || '',
        direccion: p.direccion || '',
        coordenadas: p.coordenadas || ''
      });
    }
  }

  // Validador dinámico para documentos
  private documentoValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const tipoDocumento = this.form?.get('tipo_documento')?.value;

    if (!value) {
      return null;
    }

    if (tipoDocumento === 'DNI' || tipoDocumento === 'RUC') {
      if (!/^\d+$/.test(value)) {
        return { soloNumeros: true };
      }
    }

    if (tipoDocumento === 'DNI') {
      return CustomValidators.dniPeruano(control);
    } else if (tipoDocumento === 'RUC') {
      return CustomValidators.rucPeruano(control);
    } else if (tipoDocumento === 'CE') {
      return CustomValidators.carnetExtranjeria(control);
    }

    return null;
  }

  onTipoDocumentoChange(): void {
    const docControl = this.form.get('numero_documento');
    docControl?.setValue('');
    docControl?.updateValueAndValidity();
  }

  getDocumentoError(): string {
    const errors = this.form.get('numero_documento')?.errors;
    const tipoDocumento = this.form.get('tipo_documento')?.value;

    if (errors?.['required']) {
      return 'El número de documento es requerido';
    } else if (errors?.['soloNumeros']) {
      return 'Solo se permiten números';
    } else if (errors?.['dniPeruano']) {
      return 'El DNI debe tener 8 dígitos';
    } else if (errors?.['rucPeruano']) {
      return 'El RUC debe tener 11 dígitos';
    } else if (errors?.['carnetExtranjeria']) {
      return 'El Carnet de Extranjería debe tener 9-12 caracteres alfanuméricos';
    }

    return '';
  }

  getNombreError(): string {
    const errors = this.form.get('nombre_completo')?.errors;
    
    if (errors?.['required']) {
      return 'El nombre es requerido';
    } else if (errors?.['soloLetras']) {
      return 'Solo se permiten letras y espacios';
    }

    return '';
  }

  getTelefonoError(): string {
    const errors = this.form.get('telefono')?.errors;
    
    if (errors?.['soloNumeros']) {
      return 'Solo se permiten números';
    } else if (errors?.['telefonoPeruano']) {
      return 'El teléfono debe tener 9 dígitos y empezar con 9';
    }

    return '';
  }

  prevenirCaracteresNoPermitidos(event: any, tipo: 'numero' | 'letra'): void {
    const inputChar = String.fromCharCode(event.charCode);
    
    if (tipo === 'numero') {
      if (!/^\d+$/.test(inputChar)) {
        event.preventDefault();
      }
    } else if (tipo === 'letra') {
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(inputChar)) {
        event.preventDefault();
      }
    }
  }

  formatearTelefono(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 9) {
      value = value.substring(0, 9);
    }
    this.form.get('telefono')?.setValue(value, { emitEvent: false });
  }

  formatearDocumento(event: any): void {
    const tipoDocumento = this.form.get('tipo_documento')?.value;
    let value = event.target.value;
    
    if (tipoDocumento === 'DNI' || tipoDocumento === 'RUC') {
      value = value.replace(/\D/g, '');
    }
    
    if (tipoDocumento === 'DNI' && value.length > 8) {
      value = value.substring(0, 8);
    } else if (tipoDocumento === 'RUC' && value.length > 11) {
      value = value.substring(0, 11);
    } else if (tipoDocumento === 'CE' && value.length > 12) {
      value = value.substring(0, 12);
    }
    
    this.form.get('numero_documento')?.setValue(value, { emitEvent: false });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const payload = this.form.value;

    if (this.isEditMode && this.data?.persona?.id_persona) {
      const id = this.data.persona.id_persona;
      this.personaService.update(id, payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.dialogRef.close({ id_persona: id, nombre_completo: payload.nombre_completo });
          this.snackBar.open('Persona actualizada', 'Cerrar', { duration: 2500 });
        },
        error: (err) => {
          console.error('Error actualizando persona:', err);
          this.isLoading = false;
          this.snackBar.open(err?.message || 'Error actualizando persona', 'Cerrar', { duration: 4000 });
        }
      });
    } else {
      this.personaService.create(payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          const id = res?.id_persona || res?.insertId || null;
          this.dialogRef.close({ id_persona: id, nombre_completo: payload.nombre_completo });
          this.snackBar.open('Persona creada', 'Cerrar', { duration: 2500 });
        },
        error: (err) => {
          console.error('Error creando persona:', err);
          this.isLoading = false;
          this.snackBar.open(err?.message || 'Error creando persona', 'Cerrar', { duration: 4000 });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  clearForm(): void {
    this.form.reset({
      tipo_documento: 'DNI',
      numero_documento: '',
      nombre_completo: '',
      telefono: '',
      direccion: '',
      coordenadas: ''
    });
  }
}