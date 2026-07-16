// inventario-reportes.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InventarioService } from '../../../../core/services/inventario.service';
import { ExportService } from '../../../../core/services/export.service';

// ✅ Definir el tipo de opción
interface TipoReporteOption {
  value: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-inventario-reportes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './inventario-reportes.component.html',
  styleUrls: ['./inventario-reportes.component.css']
})
export class InventarioReportesComponent implements OnInit {
  filtrosForm: FormGroup;
  datosCargados = false;
  cargando = false;
  exportando = false;
  fechaGeneracion: Date = new Date();
  
  metricas = {
    totalProductos: 0,
    valorTotal: 0,
    totalMovimientos: 0
  };

  datosReporte: any[] = [];
  productosConProblemas = 0;
  filtrosAplicados: any = {};
  tipoReporteAnterior: string = '';

  // ✅ Opciones con ícono y texto
  opcionesReporte: TipoReporteOption[] = [
    { value: 'stock-general', icon: 'inventory_2', label: 'Stock General - Todos los productos' },
    { value: 'stock-bajo', icon: 'warning', label: 'Stock Bajo - Productos bajo mínimo' },
    { value: 'agotado', icon: 'cancel', label: 'Productos Agotados' }
  ];

  constructor(
    private fb: FormBuilder,
    private inventarioService: InventarioService,
    private exportService: ExportService,
    private snackBar: MatSnackBar
  ) {
    // ✅ Inicializar con el primer objeto
    this.filtrosForm = this.fb.group({
      tipoReporte: [this.opcionesReporte[0]]
    });
  }

  ngOnInit() {
    this.generarReporte();
  }

  /**
   * ✅ Función para comparar objetos en el select
   */
  compareOptions(opt1: TipoReporteOption, opt2: TipoReporteOption): boolean {
    return opt1 && opt2 ? opt1.value === opt2.value : opt1 === opt2;
  }

  /**
   * ✅ Se ejecuta cuando cambia el tipo de reporte
   */
  onTipoReporteChange(): void {
    const selected = this.filtrosForm.get('tipoReporte')?.value;
    const nuevoTipo = selected?.value;
    
    if (nuevoTipo !== this.tipoReporteAnterior) {
      this.tipoReporteAnterior = nuevoTipo;
      this.generarReporte();
    }
  }

  generarReporte() {
    if (this.filtrosForm.invalid) {
      this.snackBar.open('Por favor selecciona un tipo de reporte', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.cargando = true;
    this.fechaGeneracion = new Date();
    
    // ✅ Obtener el valor del objeto seleccionado
    const selected = this.filtrosForm.get('tipoReporte')?.value;
    const tipoReporte = selected?.value || 'stock-general';
    this.filtrosAplicados = { tipoReporte };

    const filtrosParaBackend = {
      tipoReporte: tipoReporte
    };

    console.log('📊 Generando reporte con filtros:', filtrosParaBackend);

    this.inventarioService.getReporteStock(filtrosParaBackend).subscribe({
      next: async (response: any) => {
        this.cargando = false;
        this.datosCargados = true;
        await this.procesarDatosReporte(response);
        // ✅ SIN MENSAJE DE ÉXITO - el usuario ve los datos cargados
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al generar reporte:', error);
        this.snackBar.open('❌ Error al generar el reporte', 'Cerrar', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private async procesarDatosReporte(response: any) {
    console.log('📦 Respuesta del backend:', response);
    
    this.metricas = {
      totalProductos: response.metricas?.total_productos || 0,
      valorTotal: parseFloat(response.metricas?.valor_total) || 0,
      totalMovimientos: response.metricas?.total_movimientos || 0
    };

    this.datosReporte = response.productos?.map((producto: any) => ({
      producto: producto.nombre,
      descripcion: producto.descripcion,
      stockActual: producto.stock,
      stockMinimo: producto.stock_minimo,
      precio: producto.precio,
      estado: producto.estado_stock,
      categoria: producto.categoria,
      marca: producto.marca,
      valorTotal: producto.valor_total
    })) || [];

    this.productosConProblemas = this.datosReporte.filter(item => 
      item.estado === 'bajo' || item.estado === 'agotado'
    ).length;

    console.log('📊 Métricas procesadas:', this.metricas);
    console.log('📊 Productos con problemas:', this.productosConProblemas);
  }

  // ===== MÉTODOS DE EXPORTACIÓN =====
  async exportarPDF() {
    if (!this.datosCargados) {
      this.snackBar.open('⚠️ Primero genere un reporte', 'Cerrar', { 
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.exportando = true;
    
    try {
      await this.exportService.exportToPDF(
        'tabla-reporte',
        this.generarNombreArchivo('inventario'),
        this.generarTituloReporte(),
        this.metricas
      );
      
      // ✅ SIN MENSAJE DE ÉXITO - el PDF se descarga y el usuario lo ve
    } catch (error) {
      console.warn('Error en exportación PDF avanzada, usando método simple:', error);
      
      try {
        this.exportService.exportSimplePDF(
          this.datosReporte,
          this.generarNombreArchivo('inventario'),
          this.generarTituloReporte(),
          this.metricas
        );
        
        // ✅ SIN MENSAJE DE ÉXITO - el PDF se descarga y el usuario lo ve
      } catch (simpleError) {
        console.error('Error en exportación PDF simple:', simpleError);
        this.snackBar.open('❌ Error al exportar PDF', 'Cerrar', { 
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    } finally {
      this.exportando = false;
    }
  }

  exportarExcel() {
    if (!this.datosCargados) {
      this.snackBar.open('⚠️ Primero genere un reporte', 'Cerrar', { 
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.exportando = true;

    try {
      this.exportService.exportToExcel(
        this.datosReporte,
        this.generarNombreArchivo('inventario'),
        this.generarNombreHoja()
      );
      
      // ✅ SIN MENSAJE DE ÉXITO - el Excel se descarga y el usuario lo ve
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      this.snackBar.open('❌ Error al exportar Excel', 'Cerrar', { 
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.exportando = false;
    }
  }

  private generarNombreArchivo(base: string): string {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    
    let tipoReporte = 'general';
    switch(this.filtrosAplicados.tipoReporte) {
      case 'stock-bajo': tipoReporte = 'stock-bajo'; break;
      case 'agotado': tipoReporte = 'agotados'; break;
    }
    
    return `${base}_${tipoReporte}_${timestamp}`;
  }

  private generarTituloReporte(): string {
    let titulo = 'Reporte de Inventario - ';
    
    switch(this.filtrosAplicados.tipoReporte) {
      case 'stock-general':
        titulo += 'Stock General';
        break;
      case 'stock-bajo':
        titulo += 'Stock Bajo';
        break;
      case 'agotado':
        titulo += 'Productos Agotados';
        break;
      default:
        titulo += 'Inventario';
    }

    return titulo;
  }

  private generarNombreHoja(): string {
    switch(this.filtrosAplicados.tipoReporte) {
      case 'stock-general': return 'Stock General';
      case 'stock-bajo': return 'Stock Bajo';
      case 'agotado': return 'Productos Agotados';
      default: return 'Inventario';
    }
  }

  // ===== MÉTODOS AUXILIARES =====
  getRowClass(item: any): string {
    return `row-${item.estado}`;
  }

  getStockClass(item: any): string {
    return item.stockActual <= item.stockMinimo ? 'stock-bajo' : 'stock-normal';
  }

  getEstadoIcon(estado: string): string {
    switch(estado) {
      case 'normal': return 'check_circle';
      case 'bajo': return 'warning';
      case 'agotado': return 'cancel';
      default: return 'help';
    }
  }

  getEstadoText(estado: string): string {
    switch(estado) {
      case 'normal': return 'OK';
      case 'bajo': return 'BAJO';
      case 'agotado': return 'AGOTADO';
      default: return estado.toUpperCase();
    }
  }

  contarPorEstado(estado: string): number {
    return this.datosReporte.filter(item => item.estado === estado).length;
  }
}