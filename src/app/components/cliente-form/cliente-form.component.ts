import { Component, Inject, OnInit } from '@angular/core';
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
import { MatRadioModule } from '@angular/material/radio';

import { Cliente } from '../../core/models/cliente.model';
import { ClienteService } from '../../core/services/cliente.service';
import { GeocodingService } from '../../core/services/geocoding.service';

// Validadores personalizados
export class CustomValidators {
  // Validador para solo letras, espacios y acentos
  static soloLetras(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(control.value) ? null : { soloLetras: true };
  }

  // Validador para solo números
  static soloNumeros(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const regex = /^\d+$/;
    return regex.test(control.value) ? null : { soloNumeros: true };
  }

  // Validador para teléfono peruano (9 dígitos que empiezan con 9)
  static telefonoPeruano(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const regex = /^9\d{8}$/;
    return regex.test(control.value) ? null : { telefonoPeruano: true };
  }

  // Validador para DNI peruano (8 dígitos)
  static dniPeruano(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const regex = /^\d{8}$/;
    return regex.test(control.value) ? null : { dniPeruano: true };
  }

  // Validador para RUC peruano (11 dígitos)
  static rucPeruano(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const regex = /^\d{11}$/;
    return regex.test(control.value) ? null : { rucPeruano: true };
  }

  // Validador para Carnet de Extranjería (9-12 caracteres alfanuméricos)
  static carnetExtranjeria(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const regex = /^[a-zA-Z0-9]{9,12}$/;
    return regex.test(control.value) ? null : { carnetExtranjeria: true };
  }
}

@Component({
  selector: 'app-cliente-form',
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
    MatRadioModule
  ],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.css'],
})
export class ClienteFormComponent implements OnInit {
clearForm() {
throw new Error('Method not implemented.');
}
  clienteForm: FormGroup;
  isEditMode = false;

  // Opciones para selects
  tiposDocumento = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carnet de Extranjería' }
  ];

  tiposCliente = [
    { value: 'Bodega', label: 'Bodega' },
    { value: 'Restaurante', label: 'Restaurante' },
    { value: 'Gimnasio', label: 'Gimnasio' },
    { value: 'Persona', label: 'Persona' },
    { value: 'Empresa', label: 'Empresa' }
  ];

  isLoading = false;
  isGeocoding = false;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private geocodingService: GeocodingService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ClienteFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cliente: Cliente }
  ) {
    this.clienteForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data?.cliente) {
      this.isEditMode = true;
      this.loadFormData(this.data.cliente);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      tipo_documento: ['DNI', Validators.required],
      dni: ['', [Validators.required, this.documentoValidator.bind(this)]],
      nombre: ['', [Validators.required, CustomValidators.soloLetras]],
      telefono: ['', [Validators.required, CustomValidators.soloNumeros, CustomValidators.telefonoPeruano]],
      direccion: ['', Validators.required],
      tipo_cliente: ['Bodega', Validators.required],
      razon_social: [''],
      coordenadas: ['']
    });
  }

  // Validador dinámico para documentos según tipo
  private documentoValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const tipoDocumento = this.clienteForm?.get('tipo_documento')?.value;

    if (!value) {
      return null;
    }

    // Primero validamos que sean solo números para DNI y RUC
    if (tipoDocumento === 'DNI' || tipoDocumento === 'RUC') {
      if (!/^\d+$/.test(value)) {
        return { soloNumeros: true };
      }
    }

    // Luego validamos el formato específico
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
    const dniControl = this.clienteForm.get('dni');
    dniControl?.setValue('');
    dniControl?.updateValueAndValidity();
  }

  // Método para prevenir entrada de caracteres no permitidos
  prevenirCaracteresNoPermitidos(event: any, tipo: 'numero' | 'letra'): void {
    const inputChar = String.fromCharCode(event.charCode);
    
    if (tipo === 'numero') {
      // Solo permitir números
      if (!/^\d+$/.test(inputChar)) {
        event.preventDefault();
      }
    } else if (tipo === 'letra') {
      // Solo permitir letras, espacios y caracteres especiales para nombres
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(inputChar)) {
        event.preventDefault();
      }
    }
  }

  // Método para formatear el teléfono mientras se escribe
  formatearTelefono(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remover todo excepto números
    if (value.length > 9) {
      value = value.substring(0, 9); // Limitar a 9 dígitos
    }
    this.clienteForm.get('telefono')?.setValue(value, { emitEvent: false });
  }

  // Método para formatear el documento mientras se escribe
  formatearDocumento(event: any): void {
    const tipoDocumento = this.clienteForm.get('tipo_documento')?.value;
    let value = event.target.value;
    
    if (tipoDocumento === 'DNI' || tipoDocumento === 'RUC') {
      value = value.replace(/\D/g, ''); // Solo números para DNI y RUC
    }
    
    // Aplicar límites según el tipo de documento
    if (tipoDocumento === 'DNI' && value.length > 8) {
      value = value.substring(0, 8);
    } else if (tipoDocumento === 'RUC' && value.length > 11) {
      value = value.substring(0, 11);
    } else if (tipoDocumento === 'CE' && value.length > 12) {
      value = value.substring(0, 12);
    }
    
    this.clienteForm.get('dni')?.setValue(value, { emitEvent: false });
  }

  public canGeocode(): boolean {
    return this.clienteForm.get('direccion')?.valid as boolean;
  }

  private geocodeAddress(): void {
    if (this.isGeocoding) return;

    const direccion = this.clienteForm.get('direccion')?.value;

    if (direccion) {
      this.isGeocoding = true;

      this.geocodingService
        .geocodeFromAddress(direccion)
        .subscribe({
          next: (coordinates) => {
            this.isGeocoding = false;
            if (coordinates) {
              this.clienteForm.get('coordenadas')?.setValue(
                `${coordinates.lat},${coordinates.lng}`
              );
              this.showMessage('Coordenadas calculadas correctamente', 'success');
            } else {
              this.showMessage('No se pudieron calcular las coordenadas', 'warn');
            }
          },
          error: (error) => {
            this.isGeocoding = false;
            console.error('Error en geocodificación:', error);
            this.showMessage('Error al calcular coordenadas', 'error');
          },
        });
    }
  }

  manualGeocode(): void {
    if (this.canGeocode()) {
      this.geocodeAddress();
    } else {
      this.showMessage('Complete la dirección primero', 'warn');
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warn'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: [`${type}-snackbar`],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  loadFormData(cliente: Cliente): void {
    this.clienteForm.patchValue({
      tipo_documento: cliente.tipo_documento,
      dni: cliente.dni,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      tipo_cliente: cliente.tipo_cliente,
      razon_social: cliente.razon_social || '', // Asegurar que no sea null
      coordenadas: cliente.coordenadas || ''
    });
  }

  getDocumentoError(): string {
    const errors = this.clienteForm.get('dni')?.errors;
    const tipoDocumento = this.clienteForm.get('tipo_documento')?.value;

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
    const errors = this.clienteForm.get('nombre')?.errors;
    
    if (errors?.['required']) {
      return 'El nombre es requerido';
    } else if (errors?.['soloLetras']) {
      return 'Solo se permiten letras y espacios';
    }

    return '';
  }

  getTelefonoError(): string {
    const errors = this.clienteForm.get('telefono')?.errors;
    
    if (errors?.['required']) {
      return 'El teléfono es requerido';
    } else if (errors?.['soloNumeros']) {
      return 'Solo se permiten números';
    } else if (errors?.['telefonoPeruano']) {
      return 'El teléfono debe tener 9 dígitos y empezar con 9';
    }

    return '';
  }

  shouldShowRazonSocial(): boolean {
    const tipoCliente = this.clienteForm.get('tipo_cliente')?.value;
    // Mostrar razón social solo para Empresa y Restaurante
    return true;
  }

  onSubmit(): void {
    if (this.clienteForm.valid) {
      this.isLoading = true;
      const formData = this.clienteForm.value;

      // Limpiar campos opcionales si están vacíos
      if (formData.razon_social && formData.razon_social.trim() === '') {
        formData.razon_social = null;
      }

      // Si las coordenadas están vacías, enviar null
      if (!formData.coordenadas || formData.coordenadas.trim() === '') {
        formData.coordenadas = null;
      }

      const request$ = this.isEditMode
        ? this.clienteService.updateCliente(this.data.cliente.id!, formData)
        : this.clienteService.createCliente(formData);

      request$.subscribe({
        next: () => {
          this.isLoading = false;
          this.dialogRef.close(true);
          this.showMessage(
            this.isEditMode ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente', 
            'success'
          );
        },
        error: (error) => {
          console.error('Error saving client:', error);
          this.isLoading = false;
          
          let errorMessage = 'Error al guardar el cliente';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 400) {
            errorMessage = 'El número de documento ya existe';
          } else if (error.status === 404) {
            errorMessage = 'Cliente no encontrado';
          }
          
          this.showMessage(errorMessage, 'error');
        }
      });
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.clienteForm.controls).forEach(key => {
        this.clienteForm.get(key)?.markAsTouched();
      });
      this.showMessage('Por favor complete todos los campos requeridos correctamente', 'warn');
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}