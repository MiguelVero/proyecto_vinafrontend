import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MovimientoStockService } from '../../../core/services/movimiento-stock.service';
import { MovimientoStockFormComponent } from '../../../components/movimiento-stock-form/movimiento-stock-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { MovimientoStock } from '../../../core/models/movimiento-stock.model';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MovimientoStockUnificadoFormComponent } from '../../../components/movimiento-stock-unificado-form/movimiento-stock-unificado-form.component';
import { MatDatepickerModule } from '@angular/material/datepicker'; // ✅ Añadir
import { MatNativeDateModule } from '@angular/material/core'; // ✅ Añadir
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleMovimientoModalComponent } from '../../../components/detalle-movimiento-modal/detalle-movimiento-modal.component';
import { AuthService } from '../../../core/services/auth.service';
@Component({
  selector: 'app-movimiento-stock-list',
  templateUrl: './movimiento-stock-list.component.html',
  styleUrls: ['./movimiento-stock-list.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule, 
    MatNativeDateModule,
    MatTooltipModule
  ]
})
export class MovimientoStockListComponent implements OnInit, AfterViewInit {
  // En la clase MovimientoStockListComponent, actualizar displayedColumns:
displayedColumns: string[] = ['id', 'producto', 'tipo', 'lote', 'cantidad', 'fecha', 'acciones'];
  dataSource = new MatTableDataSource<MovimientoStock>([]);
  isLoading = true;
  // Agregar estas propiedades
filtroActivo: {
  tipos: string[],
  fechaInicio: Date | null,
  fechaFin: Date | null
} = {
  tipos: [],
  fechaInicio: null,
  fechaFin: null
};

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private movimientoService: MovimientoStockService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {}


  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }

 // En el método loadMovimientos() del componente
loadMovimientos(): void {
  this.isLoading = true;
  this.movimientoService.getMovimientos().subscribe({
    next: rows => { 
      console.log('📦 Movimientos cargados:', rows); // ✅ DEBUG: Ver datos
      this.dataSource.data = rows; 
      this.isLoading = false; 
    },
    error: () => { this.isLoading = false; this.showError('Error al cargar movimientos'); }
  });
}
// Modificar applyFilter para usar el filtro combinado
applyFilter(event: Event): void {
  const searchTerm = (event.target as HTMLInputElement).value;
  this.filtroActivo.fechaInicio = null;
  this.filtroActivo.fechaFin = null;
  this.filtroActivo.tipos = [];
  this.aplicarFiltrosCombinados();
}

 addMovimiento(): void {
  const dialogRef = this.dialog.open(MovimientoStockFormComponent, { 
    width: '500px',
    maxWidth: '95vw',
    maxHeight: '85vh', // ✅ LIMITAR ALTURA MÁXIMA
    panelClass: 'movimiento-stock-dialog' // ✅ CLASE PARA ESTILOS GLOBALES
  });
  
  dialogRef.afterClosed().subscribe(res => { 
    if (res) this.loadMovimientos(); 
  });
}

editMovimiento(movimiento: MovimientoStock): void {
  const dialogRef = this.dialog.open(MovimientoStockFormComponent, { 
    width: '500px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    panelClass: 'movimiento-stock-dialog',
    data: movimiento // ✅ CORREGIDO: Enviar el objeto directamente, no {movimiento}
  });
  dialogRef.afterClosed().subscribe(res => { 
    if(res) this.loadMovimientos(); 
  });
}
  deleteMovimiento(movimiento: MovimientoStock): void {
    const nombreProducto = movimiento.producto?.nombre ?? 'desconocido';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { width: '420px', data: { message: `Eliminar movimiento del producto "${nombreProducto}"?` } });
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.movimientoService.deleteMovimiento(movimiento.id_movimiento!).subscribe({
          next: () => { this.showSuccess('Movimiento eliminado'); this.loadMovimientos(); },
          error: () => this.showError('Error al eliminar movimiento')
        });
      }
    });
  }

  private showSuccess(msg: string) { this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] }); }
  private showError(msg: string) { this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] }); }
// En movimiento-stock-list.component.ts - agregar estos métodos
displayedColumnsProfessional: string[] = [
  'id', 'fecha', 'producto', 'tipo', 'cantidad', 'lote', 'usuario', 'acciones'
];

mostrarFiltrosAvanzados = false;

// En el constructor o ngOnInit, configurar el filterPredicate
ngOnInit(): void { 
  this.loadMovimientos();
  window.addEventListener('inventario-actualizado', () => {
    this.loadMovimientos();
  });
  
  // Configurar el filterPredicate personalizado
  this.dataSource.filterPredicate = this.filtrarMovimientos();
}


// Método para crear el filterPredicate
private filtrarMovimientos() {
  return (data: MovimientoStock, filter: string): boolean => {
    // Si no hay filtro, mostrar todos
    if (!filter) return true;
    
    try {
      const filtros = JSON.parse(filter);
      
      // Filtro por tipo
      if (filtros.tipos && filtros.tipos.length > 0) {
        if (!filtros.tipos.includes(data.tipo_movimiento)) {
          return false;
        }
      }
      
      // Filtro por fecha
      if (filtros.fechaInicio && filtros.fechaFin) {
        const fechaMov = new Date(data.fecha);
        const fechaInicio = new Date(filtros.fechaInicio);
        const fechaFin = new Date(filtros.fechaFin);
        
        // Ajustar fechas para comparación correcta
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin.setHours(23, 59, 59, 999);
        
        if (fechaMov < fechaInicio || fechaMov > fechaFin) {
          return false;
        }
      }
      
      // Filtro por búsqueda (si existe)
      if (filtros.searchTerm) {
        const term = filtros.searchTerm.toLowerCase();
        const productoNombre = data.producto?.nombre?.toLowerCase() || '';
        const loteNumero = data.lote?.numero_lote?.toLowerCase() || '';
        const descripcion = data.descripcion?.toLowerCase() || '';
        
        if (!productoNombre.includes(term) && 
            !loteNumero.includes(term) && 
            !descripcion.includes(term)) {
          return false;
        }
      }
      
      return true;
    } catch (e) {
      return true;
    }
  };
}

















toggleFiltrosAvanzados(): void {
  this.mostrarFiltrosAvanzados = !this.mostrarFiltrosAvanzados;
}

getTipoIcon(tipo: string): string {
  const iconMap: { [key: string]: string } = {
    'ingreso': 'arrow_downward',
    'egreso': 'arrow_upward', 
    'ajuste': 'autorenew',
    'devolucion': 'refresh'
  };
  return iconMap[tipo] || 'help';
}

getTipoText(tipo: string): string {
  const textMap: { [key: string]: string } = {
    'ingreso': 'Ingreso',
    'egreso': 'Egreso',
    'ajuste': 'Ajuste',
    'devolucion': 'Devolución'
  };
  return textMap[tipo] || tipo;
}

getMovimientosHoy(): any[] {
  const hoy = new Date().toDateString();
  return this.dataSource.data.filter(mov => 
    new Date(mov.fecha).toDateString() === hoy
  );
}

getIngresosMes(): any[] {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  
  return this.dataSource.data.filter(mov => 
    new Date(mov.fecha) >= inicioMes && mov.tipo_movimiento === 'ingreso'
  );
}

getTotalIngresos(): number {
  return this.dataSource.data
    .filter(mov => mov.tipo_movimiento === 'ingreso')
    .reduce((sum, mov) => sum + mov.cantidad, 0);
}

getTotalEgresos(): number {
  return this.dataSource.data
    .filter(mov => mov.tipo_movimiento === 'egreso')
    .reduce((sum, mov) => sum + mov.cantidad, 0);
}

getPromedioDiario(): number {
  const movimientosUltimaSemana = this.dataSource.data.filter(mov => {
    const fechaMov = new Date(mov.fecha);
    const unaSemanaAtras = new Date();
    unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);
    return fechaMov >= unaSemanaAtras;
  });
  
  return movimientosUltimaSemana.length > 0 
    ? Math.round(movimientosUltimaSemana.length / 7) 
    : 0;
}

getBalanceTotal(): number {
  return this.dataSource.filteredData.reduce((balance, mov) => {
    if (mov.tipo_movimiento === 'ingreso') {
      return balance + mov.cantidad;
    } else if (mov.tipo_movimiento === 'egreso') {
      return balance - mov.cantidad;
    }
    return balance;
  }, 0);
}

// Método aplicarFiltroTipo mejorado
aplicarFiltroTipo(tipos: string[]): void {
  this.filtroActivo.tipos = tipos || [];
  this.aplicarFiltrosCombinados();
}
// Método aplicarFiltroFecha implementado
aplicarFiltroFecha(): void {
  // Obtener los inputs de fecha directamente
  const startInput = document.querySelector('input[matStartDate]') as HTMLInputElement;
  const endInput = document.querySelector('input[matEndDate]') as HTMLInputElement;
  
  if (startInput && endInput && startInput.value && endInput.value) {
    // Convertir las fechas del formato DD/MM/YYYY a Date objects
    const fechaInicio = this.convertirFechaString(startInput.value);
    const fechaFin = this.convertirFechaString(endInput.value);
    
    if (fechaInicio && fechaFin) {
      this.filtroActivo.fechaInicio = fechaInicio;
      this.filtroActivo.fechaFin = fechaFin;
      this.aplicarFiltrosCombinados();
    }
  }
}


// Método auxiliar para convertir string DD/MM/YYYY a Date
private convertirFechaString(fechaStr: string): Date | null {
  if (!fechaStr) return null;
  
  try {
    // Si viene en formato DD/MM/YYYY
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const dia = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1; // Los meses en JS son 0-11
      const anio = parseInt(partes[2], 10);
      return new Date(anio, mes, dia);
    }
    
    // Si ya es un objeto Date o string ISO
    const fecha = new Date(fechaStr);
    return isNaN(fecha.getTime()) ? null : fecha;
  } catch (e) {
    console.error('Error convirtiendo fecha:', e);
    return null;
  }
}

// Modificar limpiarFiltros
limpiarFiltros(): void {
  // Resetear filtros activos
  this.filtroActivo = {
    tipos: [],
    fechaInicio: null,
    fechaFin: null
  };
  
  // Limpiar inputs de fecha
  const startInput = document.querySelector('input[matStartDate]') as HTMLInputElement;
  const endInput = document.querySelector('input[matEndDate]') as HTMLInputElement;
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  
  // Limpiar input de búsqueda
  const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
  if (searchInput) searchInput.value = '';
  
  // 🔥 NUEVO: Resetear el select de tipo de movimiento
  setTimeout(() => {
    // Forzar actualización del select
    const tipoSelect = document.querySelector('mat-select[placeholder="Tipo de Movimiento"]') as any;
    
    // Limpiar el valor del select programáticamente
    this.filtroActivo.tipos = [];
    
    // Cerrar paneles abiertos
    document.querySelectorAll('.cdk-overlay-container .mat-select-panel').forEach(panel => {
      panel.remove();
    });
  }, 100);
  
  // Aplicar filtros vacíos
  this.aplicarFiltrosCombinados();
  
  // Opcional: No cerrar los filtros avanzados
  // this.mostrarFiltrosAvanzados = false;
  
  console.log('🧹 Filtros de movimientos limpiados');
}


exportarExcel(): void {
  // Implementar exportación a Excel
}

recargarDatos(): void {
  this.loadMovimientos();
}



crearMovimientoUnificado(): void {
  const dialogRef = this.dialog.open(MovimientoStockUnificadoFormComponent, {
    width: '650px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    panelClass: 'movimiento-unificado-dialog'
  });
    dialogRef.afterClosed().subscribe((result: any) => {
    if (result) {
      this.loadMovimientos();
    }
  });
}

// Nuevo método para combinar filtros
aplicarFiltrosCombinados(): void {
  // Obtener el término de búsqueda actual
  const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
  const searchTerm = searchInput?.value || '';
  
  const filtroCombinado = {
    tipos: this.filtroActivo.tipos,
    fechaInicio: this.filtroActivo.fechaInicio,
    fechaFin: this.filtroActivo.fechaFin,
    searchTerm: searchTerm.trim().toLowerCase()
  };
  
  this.dataSource.filter = JSON.stringify(filtroCombinado);
  
  // Debug: Mostrar resultado
  console.log('🔍 Filtro aplicado:', filtroCombinado);
  console.log('📊 Resultados:', this.dataSource.filteredData.length);
}

// Reemplaza el método getTipoIcon (o crea uno nuevo para cantidad)

getCantidadIcon(movimiento: MovimientoStock): string {
  // Para EGRESO: flecha hacia arriba (rojo)
  // Para INGRESO: flecha hacia abajo (verde)
  // Para AJUSTE: flecha hacia arriba/abajo según sea positivo/negativo? (mejor usar autorenew)
  
  if (movimiento.tipo_movimiento === 'egreso') {
    return 'arrow_upward'; // Flecha hacia arriba para egreso
  } else if (movimiento.tipo_movimiento === 'ingreso') {
    return 'arrow_downward'; // Flecha hacia abajo para ingreso
  } else if (movimiento.tipo_movimiento === 'ajuste') {
    // Para ajustes, podemos usar un ícono neutral
    return 'autorenew';
  } else if (movimiento.tipo_movimiento === 'devolucion') {
    return 'refresh';
  }
  return 'help';
}

// También necesitas determinar la clase CSS para la cantidad
getCantidadClass(movimiento: MovimientoStock): string {
  if (movimiento.tipo_movimiento === 'ingreso' || movimiento.tipo_movimiento === 'devolucion') {
    return 'positiva'; // Verde para ingresos
  } else {
    return 'negativa'; // Rojo para egresos y ajustes
  }
}

/**puedeAnular(movimiento: any): boolean {
  if (movimiento.descripcion && movimiento.descripcion.includes('ANULACIÓN del movimiento')) {
    return false;
  }
  if (movimiento.anulado) {
    return false;
  }
  const fechaMov = new Date(movimiento.fecha);
  const ahora = new Date();
  const diffHoras = (ahora.getTime() - fechaMov.getTime()) / (1000 * 60 * 60);
  
  return diffHoras <= 24;
}**/

/**anularMovimiento(movimiento: any): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '450px',
    data: {
      title: '⚠️ Anular Movimiento',
      message: `¿Estás seguro de ANULAR este movimiento?<br><br>
                <strong>Producto:</strong> ${movimiento.producto?.nombre}<br>
                <strong>Tipo:</strong> ${movimiento.tipo_movimiento}<br>
                <strong>Cantidad:</strong> ${movimiento.cantidad}<br><br>
                Esto revertirá el efecto en el stock y creará un movimiento de anulación.`,
      confirmText: 'Sí, Anular',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'warning'
    }
  });
  
  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.movimientoService.anularMovimiento(movimiento.id_movimiento).subscribe({
        next: () => {
          this.showSuccess('Movimiento anulado correctamente');
          this.loadMovimientos();
        },
        error: (err) => {
          console.error('Error al anular movimiento:', err);
          this.showError('Error al anular movimiento');
        }
      });
    }
  });
}**/

// Agregar el método
verDetallesMovimiento(movimiento: MovimientoStock): void {
  this.dialog.open(DetalleMovimientoModalComponent, {
    width: '600px',
    maxWidth: '95vw',
    data: movimiento,
    panelClass: 'detalle-modal-panel'
  });
}
}
