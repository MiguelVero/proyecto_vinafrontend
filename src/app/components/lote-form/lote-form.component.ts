import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoteService } from '../../core/services/lote.service';
import { Lote, LoteCreate } from '../../core/models/lote.model';
import { ProductService } from '../../core/services/producto.service';
import { Product } from '../../core/models/producto.model';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { 
  MatNativeDateModule, 
  DateAdapter, 
  MAT_DATE_FORMATS, 
  MAT_DATE_LOCALE,
  NativeDateAdapter 
} from '@angular/material/core';
import { CommonModule } from '@angular/common';

// ✅ NUEVO: Configuración personalizada del DateAdapter
export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return date.toDateString();
  }
}

// ✅ NUEVO: Configuración de formatos de fecha
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
  display: {
    dateInput: 'input',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  }
};

@Component({
  selector: 'app-lote-form',
  templateUrl: './lote-form.component.html',
  styleUrls: ['./lote-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    // ✅ NUEVO: Proveedores corregidos para el DatePicker
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: CustomDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
  ]
})
export class LoteFormComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  titulo = '';
  productos: Product[] = [];

  constructor(
    private fb: FormBuilder,
    private loteService: LoteService,
    private productoService: ProductService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<LoteFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Lote,
    private dateAdapter: DateAdapter<Date> // ✅ Ahora estará disponible
  ) {
    // Configurar locale español
    this.dateAdapter.setLocale('es-ES');

    this.form = this.fb.group({
      id_lote: [data?.id_lote || 0],
      id_producto: [data?.id_producto || null, Validators.required],
      numero_lote: [data?.numero_lote || '', [Validators.required, Validators.minLength(3)]],
      fecha_caducidad: [this.parseDateFromBackend(data?.fecha_caducidad) || null, Validators.required],
      cantidad_inicial: [data?.cantidad_inicial || 0, [Validators.required, Validators.min(1)]],
      cantidad_actual: [data?.cantidad_actual || 0],
      activo: [data?.activo ?? true]
    });

    this.titulo = data && data.id_lote ? 'Editar Lote' : 'Nuevo Lote';
    
    console.log('📋 Datos lote recibidos:', this.data);
    console.log('📋 Fecha caducidad original:', this.data?.fecha_caducidad);
    console.log('📋 Fecha parseada:', this.parseDateFromBackend(this.data?.fecha_caducidad));
  }

  // ✅ CORREGIDO: Método mejorado para parsear fechas del backend
  private parseDateFromBackend(dateString: string | undefined): Date | null {
    if (!dateString) return null;
    
    try {
      let date: Date;
      
      // Si la fecha incluye 'T' (formato ISO), manejamos la zona horaria
      if (dateString.includes('T')) {
        // Para formato ISO como '2026-03-30T05:00:00.000Z'
        date = new Date(dateString);
        
        // Ajustar por diferencia de zona horaria
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        date = new Date(date.getTime() + timezoneOffset);
      } else {
        // Para formato simple 'YYYY-MM-DD'
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      
      console.log('📅 Parseando fecha:', {
        original: dateString,
        resultado: date,
        fechaLocal: date.toLocaleDateString('es-ES')
      });
      
      return date;
    } catch (error) {
      console.error('❌ Error parseando fecha:', error, dateString);
      return null;
    }
  }

  // ✅ CORREGIDO: Método para formatear fecha para backend
  private formatDateForBackend(date: Date | null): string {
    if (!date) return '';
    
    try {
      // Usar el método más confiable para evitar problemas de zona horaria
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log('📤 Fecha formateada para backend:', {
        fechaOriginal: date,
        fechaLocal: date.toLocaleDateString('es-ES'),
        fechaFormateada: formattedDate
      });
      
      return formattedDate;
    } catch (error) {
      console.error('❌ Error formateando fecha para backend:', error);
      return '';
    }
  }

  ngOnInit(): void {
    this.cargarProductos();
    
    // ✅ CORREGIDO: Patch values mejorado
    if (this.data?.id_lote) {
      setTimeout(() => {
        const fechaParseada = this.parseDateFromBackend(this.data.fecha_caducidad);
        console.log('🔄 Aplicando patchValues con fecha:', fechaParseada);
        
        this.form.patchValue({
          id_producto: this.data.id_producto,
          numero_lote: this.data.numero_lote,
          fecha_caducidad: fechaParseada,
          cantidad_inicial: this.data.cantidad_inicial,
          cantidad_actual: this.data.cantidad_actual,
          activo: this.data.activo
        });
      }, 100);
    }
  }

  cargarProductos(): void {
    this.productoService.getProducts().subscribe({
      next: (data) => (this.productos = data),
      error: (err) => console.error('Error cargando productos:', err)
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.marcarCamposInvalidos();
      this.snackBar.open('Por favor complete todos los campos requeridos.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.form.value;
    
    console.log('📦 Datos del formulario:', formValue);
    console.log('📅 Fecha caducidad (Date object):', formValue.fecha_caducidad);
    
    // ✅ CORREGIDO: Formatear fecha para backend
    const fechaCaducidadFormateada = this.formatDateForBackend(formValue.fecha_caducidad);
    console.log('📤 Fecha caducidad formateada:', fechaCaducidadFormateada);
    
    if (formValue.id_lote) {
      // Actualizar lote existente
      const loteUpdate = {
        id_producto: formValue.id_producto,
        numero_lote: formValue.numero_lote,
        fecha_caducidad: fechaCaducidadFormateada,
        cantidad_actual: formValue.cantidad_actual,
        activo: formValue.activo
      };
      
      console.log('🔄 Datos para actualizar:', loteUpdate);
      
      this.loteService.updateLote(formValue.id_lote, loteUpdate).subscribe({
        next: () => {
          this.snackBar.open('Lote actualizado correctamente.', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('❌ Error completo:', err);
          this.snackBar.open('Error al actualizar el lote: ' + err.message, 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        },
        complete: () => (this.isLoading = false)
      });
    } else {
      // Crear nuevo lote
      const loteCreate: LoteCreate = {
        id_producto: formValue.id_producto,
        numero_lote: formValue.numero_lote,
        fecha_caducidad: fechaCaducidadFormateada,
        cantidad_inicial: formValue.cantidad_inicial
      };
      
      console.log('🚀 Datos que se enviarán al backend:', loteCreate);
      
      this.loteService.createLote(loteCreate).subscribe({
        next: () => {
          this.snackBar.open('Lote registrado correctamente.', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('❌ Error completo:', err);
          this.snackBar.open('Error al crear el lote: ' + err.message, 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        },
        complete: () => (this.isLoading = false)
      });
    }
  }

  // ✅ NUEVO: Método para marcar campos inválidos
  private marcarCamposInvalidos(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}