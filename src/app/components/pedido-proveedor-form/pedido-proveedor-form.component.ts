// pedido-proveedor-form.component.ts - CORREGIDO
import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PedidoProveedorCreate, PedidoProveedor, PedidoProveedorDetalle } from '../../core/models/pedido-proveedor.model';
import { PedidoProveedorService } from '../../core/services/pedido-proveedor.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { InsumoService } from '../../core/services/insumo.service';
import { Insumo } from '../../core/models/insumo.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface EstadoPedido {
  id_estado_pedido: number;
  estado: string;
}

@Component({
  selector: 'app-pedido-proveedor-form',
  templateUrl: './pedido-proveedor-form.component.html',
  styleUrls: ['./pedido-proveedor-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ]
})
export class PedidoProveedorFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  proveedores: Proveedor[] = [];
  insumos: Insumo[] = [];
  estados: EstadoPedido[] = [];
  isEditMode = false;
  isLoading = false;
    // AGREGAR ESTAS PROPIEDADES PARA EL DATEPICKER
  minDate: Date;
  maxDate: Date;

  private destroy$ = new Subject<void>();

 // En el constructor de pedido-proveedor-form.component.ts
constructor(
  private fb: FormBuilder,
  private pedidoService: PedidoProveedorService,
  private proveedorService: ProveedorService,
  private insumoService: InsumoService,
  private snackBar: MatSnackBar,
  public dialogRef: MatDialogRef<PedidoProveedorFormComponent>,
  @Inject(MAT_DIALOG_DATA) public data: { pedido?: PedidoProveedor }
) { 
  this.isEditMode = !!data?.pedido;
  
  // ✅ CONFIGURACIÓN CORRECTA DE FECHAS
  const today = new Date();
  this.minDate = new Date(today); // Hoy como fecha mínima
  this.maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()); // 1 año en el futuro
}

  ngOnInit(): void {
    this.initForm();
    this.loadProveedores();
    this.loadInsumos();
    this.loadEstados();
    
    if (this.isEditMode && this.data.pedido) {
      this.loadPedidoData(this.data.pedido);
    } else {
      // Agregar un detalle vacío por defecto
      this.agregarDetalle();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Getters para facilitar el acceso a los FormArrays
  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  getDetalleControl(index: number, controlName: string) {
    return this.detalles.at(index).get(controlName);
  }

// Y en initForm(), cambia:
// Asegurar que en creación siempre sea "Solicitado"
initForm(): void {
  this.form = this.fb.group({
    id_proveedor: [null, Validators.required],
    fecha: [this.getCurrentDate(), [Validators.required]],
    id_estado_pedido: [1, Validators.required], // ✅ SIEMPRE 1 en creación
    total: [0, Validators.min(0)],
    detalles: this.fb.array([])
  });

  this.detalles.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => this.calcularTotal());
}
  crearDetalleFormGroup(detalle?: any): FormGroup {
    return this.fb.group({
      id_insumo: [detalle?.id_insumo || null, Validators.required],
      cantidad: [detalle?.cantidad || 1, [Validators.required, Validators.min(1)]],
      costo_unitario: [detalle?.costo_unitario || 0, [Validators.required, Validators.min(0)]],
      subtotal: [{ value: detalle?.subtotal || 0, disabled: true }]
    });
  }

 // Mejorar la adición de detalles
agregarDetalle(): void {
  this.detalles.push(this.crearDetalleFormGroup());
  
  // Scroll al nuevo elemento después de un breve delay
  setTimeout(() => {
    const detallesContainer = document.querySelector('.detalles-container');
    if (detallesContainer) {
      detallesContainer.scrollTop = detallesContainer.scrollHeight;
    }
  }, 100);
}
  eliminarDetalle(index: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(index);
    }
  }

 actualizarSubtotal(index: number): void {
  const detalleGroup = this.detalles.at(index) as FormGroup;
  const cantidad = detalleGroup.get('cantidad')?.value || 0;
  const costo = detalleGroup.get('costo_unitario')?.value || 0;
  const subtotal = cantidad * costo;
  
  detalleGroup.get('subtotal')?.setValue(subtotal, { emitEvent: false });
  this.calcularTotal();
  
  // Forzar detección de cambios para actualizar la UI
  this.detalles.updateValueAndValidity();
}

  calcularTotal(): void {
    let total = 0;
    this.detalles.controls.forEach(detalle => {
      const detalleGroup = detalle as FormGroup;
      const subtotal = detalleGroup.get('subtotal')?.value || 0;
      total += Number(subtotal); // ✅ Convertir a número
    });
    this.form.get('total')?.setValue(Number(total.toFixed(2)), { emitEvent: false }); // ✅ Asegurar número con 2 decimales
  }

  loadPedidoData(pedido: PedidoProveedor): void {
    this.form.patchValue({
      id_proveedor: pedido.id_proveedor,
      fecha: pedido.fecha,
      id_estado_pedido: pedido.id_estado_pedido,
      total: Number(pedido.total) || 0 // ✅ Convertir a número
    });

    // Limpiar detalles existentes y cargar los del pedido
    while (this.detalles.length !== 0) {
      this.detalles.removeAt(0);
    }

    pedido.detalles.forEach(detalle => {
      this.detalles.push(this.crearDetalleFormGroup({
        id_insumo: detalle.id_insumo,
        cantidad: detalle.cantidad,
        costo_unitario: detalle.costo_unitario,
        subtotal: detalle.subtotal
      }));
    });
  }

  loadProveedores(): void {
    this.proveedorService.getProveedores().subscribe({
      next: data => this.proveedores = data,
      error: () => this.showError('Error al cargar proveedores')
    });
  }

  loadInsumos(): void {
    this.insumoService.getInsumos().subscribe({
      next: data => this.insumos = data,
      error: () => this.showError('Error al cargar insumos')
    });
  }

  loadEstados(): void {
    this.pedidoService.getEstadosPedido().subscribe({
      next: data => this.estados = data,
      error: () => {
        // Fallback si hay error
        this.estados = [
          { id_estado_pedido: 1, estado: 'Solicitado' },
          { id_estado_pedido: 2, estado: 'Confirmado' },
          { id_estado_pedido: 3, estado: 'En camino' },
          { id_estado_pedido: 4, estado: 'Recibido' },
          { id_estado_pedido: 5, estado: 'Cancelado' }
        ];
      }
    });
  }

// En pedido-proveedor-form.component.ts - ACTUALIZAR EL MÉTODO SUBMIT
submit(): void {
  if (this.form.invalid || this.detalles.length === 0) {
    this.markFormGroupTouched();
    if (this.detalles.length === 0) {
      this.showError('Debe agregar al menos un insumo al pedido');
    }
    return;
  }

  this.isLoading = true;

  const formValue = this.form.getRawValue();
  
  // Preparar detalles para el backend (sin subtotal)
  const detallesParaBackend = formValue.detalles.map((detalle: any) => ({
    id_insumo: detalle.id_insumo,
    cantidad: detalle.cantidad,
    costo_unitario: detalle.costo_unitario
  }));

  // ✅ PAYLOAD COMPLETO PARA ACTUALIZACIÓN
  const payload: any = {
    id_proveedor: formValue.id_proveedor,
    fecha: formValue.fecha,
    id_estado_pedido: formValue.id_estado_pedido,
    detalles: detallesParaBackend
  };

  const request = this.isEditMode 
    ? this.pedidoService.updatePedido(this.data.pedido!.id_pedido, payload)
    : this.pedidoService.createPedido(payload);

  request.subscribe({
    next: (response) => {
      this.isLoading = false;
      this.showSuccess(
        this.isEditMode 
          ? 'Pedido actualizado correctamente' 
          : 'Pedido creado correctamente'
      );
      this.dialogRef.close(true);
    },
    error: (error) => {
      this.isLoading = false;
      this.showError(error.message || 'Error al guardar el pedido');
    }
  });
}

// Agregar estos métodos en la clase PedidoProveedorFormComponent

getUnidadMedida(index: number): string {
  const idInsumo = this.getDetalleControl(index, 'id_insumo')?.value;
  if (!idInsumo) return 'und';
  
  const insumo = this.insumos.find(i => i.id_insumo === idInsumo);
  return insumo?.unidad_medida || 'und';
}

getNombreInsumo(index: number): string {
  const idInsumo = this.getDetalleControl(index, 'id_insumo')?.value;
  if (!idInsumo) return '';
  
  const insumo = this.insumos.find(i => i.id_insumo === idInsumo);
  return insumo?.nombre || '';
}


  // ✅ MÉTODO CORREGIDO - USAR FormGroup en lugar de AbstractControl
  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });

    // Marcar todos los detalles como touched
    this.detalles.controls.forEach((detalle, index) => {
      const detalleGroup = this.detalles.at(index) as FormGroup;
      Object.keys(detalleGroup.controls).forEach(controlName => {
        detalleGroup.get(controlName)?.markAsTouched();
      });
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['success-snackbar'] 
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { 
      duration: 5000, 
      panelClass: ['error-snackbar'] 
    });
  }

// AGREGAR ESTE MÉTODO para obtener la fecha correcta
// En pedido-proveedor-form.component.ts - REEMPLAZAR EL MÉTODO getCurrentDate
// En pedido-proveedor-form.component.ts - REEMPLAZAR EL MÉTODO getCurrentDate
private getCurrentDate(): Date {
  const now = new Date();
  // ✅ ESTO GARANTIZA QUE SIEMPRE USE LA FECHA ACTUAL
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Agregar este método en la clase
getTotalFormateado(): string {
  const total = this.form.get('total')?.value;
  if (total === null || total === undefined || isNaN(total)) {
    return 'S/ 0.00';
  }
  
  // Asegurar que sea número y formatear
  const numero = Number(total);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}

// Método para verificar si se puede editar
puedeEditarPedido(): boolean {
  if (!this.isEditMode || !this.data.pedido) {
    return true; // Siempre se puede crear nuevo pedido
  }
  
  const estadoActual = this.data.pedido.id_estado_pedido;
  
  // ✅ SOLO impedir edición en estados finales
  const estadosNoEditables = [4, 5]; // Recibido, Cancelado
  
  return !estadosNoEditables.includes(estadoActual);
}

// Método para obtener el estado actual formateado
getEstadoActual(): string {
  if (!this.data.pedido) return 'Solicitado';
  
  const estado = this.estados.find(e => e.id_estado_pedido === this.data.pedido!.id_estado_pedido);
  return estado?.estado || 'Desconocido';
}
  onCancel(): void {
    this.dialogRef.close(false);
  }
}