import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MovimientoStockService } from '../../core/services/movimiento-stock.service';
import { ProductService } from '../../core/services/producto.service';
import { LoteService } from '../../core/services/lote.service'; // ✅ NUEVO
import { MovimientoStock } from '../../core/models/movimiento-stock.model';
import { Product } from '../../core/models/producto.model';
import { Lote } from '../../core/models/lote.model'; // ✅ NUEVO
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-movimiento-stock-form',
  templateUrl: './movimiento-stock-form.component.html',
  styleUrls: ['./movimiento-stock-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ]
})
export class MovimientoStockFormComponent implements OnInit {
  form: FormGroup;
  productos: Product[] = [];
  lotes: Lote[] = []; // ✅ NUEVO: Lotes del producto seleccionado
  isLoading = false;
  titulo = '';

  // ✅ CORREGIDO: Quitar 'venta' de los tipos
  tiposMovimiento = [
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'egreso', label: 'Egreso' },
    { value: 'ajuste', label: 'Ajuste' },
    { value: 'devolucion', label: 'Devolución' }
  ];

  constructor(
    private fb: FormBuilder,
    private movimientoService: MovimientoStockService,
    private productService: ProductService,
    private loteService: LoteService, // ✅ NUEVO
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<MovimientoStockFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MovimientoStock // ✅ Recibe el objeto directamente
  ) {
    this.form = this.fb.group({
      id_movimiento: [data?.id_movimiento || 0],
      id_producto: [data?.id_producto || null, Validators.required],
      tipo_movimiento: [data?.tipo_movimiento || '', Validators.required],
      cantidad: [data?.cantidad || '', [Validators.required, Validators.min(1)]],
      descripcion: [data?.descripcion || ''],
      id_lote: [data?.id_lote || null] // ✅ NUEVO: Campo para lote
    });

    this.titulo = data && data.id_movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento';
     // ✅ DEBUG: Verificar datos recibidos
    console.log('📋 Datos recibidos en formulario:', this.data);
    console.log('📋 ID Movimiento:', this.data?.id_movimiento);
    console.log('📋 Producto ID:', this.data?.id_producto);
    console.log('📋 Lote ID:', this.data?.id_lote);
  }

// ✅ OPTIMIZAR: Cargar lotes con debounce para mejor performance
private loadLotesDebounce = this.debounce((productoId: number) => {
  this.cargarLotesPorProducto(productoId);
}, 300);

// ✅ MÉTODO DEBOUNCE PARA EVITAR MUCHAS LLAMADAS
private debounce(func: Function, wait: number) {
  let timeout: any;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ✅ ACTUALIZAR EL valueChanges del producto
 ngOnInit(): void {
    this.cargarProductos();
    
    // ✅ MEJORADO: Cargar datos después de cargar productos
    if (this.data?.id_producto) {
      // Esperar a que los productos se carguen primero
      this.productService.getProducts().subscribe({
        next: () => {
          this.cargarLotesPorProducto(this.data.id_producto!);
          // ✅ FORZAR ACTUALIZACIÓN DEL FORMULARIO
          setTimeout(() => {
            this.form.patchValue({
              id_producto: this.data.id_producto,
              tipo_movimiento: this.data.tipo_movimiento,
              cantidad: this.data.cantidad,
              descripcion: this.data.descripcion,
              id_lote: this.data.id_lote
            });
          }, 100);
        }
      });
    }

  // ✅ USAR DEBOUNCE PARA MEJOR PERFORMANCE
  this.form.get('id_producto')?.valueChanges.subscribe(productoId => {
    if (productoId) {
      this.loadLotesDebounce(productoId);
    } else {
      this.lotes = [];
      this.form.patchValue({ id_lote: null });
    }
  });

  // Escuchar cambios en el tipo de movimiento
  this.form.get('tipo_movimiento')?.valueChanges.subscribe(tipo => {
    this.actualizarValidacionesLote(tipo);
  });
}
  cargarProductos(): void {
    this.productService.getProducts().subscribe({
      next: (productos) => (this.productos = productos),
      error: (err) => {
        this.snackBar.open('Error al cargar productos: ' + err.message, 'Cerrar', { duration: 3000 });
      }
    });
  }

 // ✅ MEJORAR: Cargar lotes con manejo de estado
cargarLotesPorProducto(productoId: number): void {
  this.loteService.getLotes().subscribe({
    next: (lotes) => {
      // Filtrar lotes activos del producto seleccionado
      this.lotes = lotes.filter(lote => 
        lote.id_producto === productoId && 
        lote.activo && 
        lote.cantidad_actual > 0
      );
      
      console.log(`📦 Lotes cargados para producto ${productoId}:`, this.lotes.length);
    },
    error: (err) => {
      console.error('Error cargando lotes:', err);
      this.lotes = [];
    }
  });
}

  // ✅ NUEVO: Actualizar validaciones según tipo de movimiento
  private actualizarValidacionesLote(tipoMovimiento: string): void {
    const loteControl = this.form.get('id_lote');
    
    if (tipoMovimiento === 'ingreso') {
      // Para ingresos, el lote es opcional (puede crear uno automáticamente)
      loteControl?.clearValidators();
    } else {
      // Para otros movimientos, el lote es requerido
      loteControl?.setValidators(Validators.required);
    }
    
    loteControl?.updateValueAndValidity();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor complete los campos requeridos.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const movimiento = this.form.value as MovimientoStock;

    const request = movimiento.id_movimiento
      ? this.movimientoService.updateMovimiento(movimiento.id_movimiento, movimiento)
      : this.movimientoService.createMovimiento(movimiento);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          movimiento.id_movimiento
            ? 'Movimiento actualizado correctamente.'
            : 'Movimiento registrado correctamente.',
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