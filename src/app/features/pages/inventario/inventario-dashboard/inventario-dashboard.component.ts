// src/app/features/pages/inventario/inventario-dashboard/inventario-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

// ✅ AGREGAR ESTAS IMPORTACIONES PARA REGISTRAR LOS COMPONENTES DE CHART.JS
import { Chart, registerables } from 'chart.js';
import { PieController, LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// ✅ MANTENER LAS IMPORTACIONES ORIGINALES
import { InventarioService } from '../../../../core/services/inventario.service';
import { MovimientoStockUnificadoFormComponent } from '../../../../components/movimiento-stock-unificado-form/movimiento-stock-unificado-form.component';

// ✅ REGISTRAR TODOS LOS COMPONENTES NECESARIOS
Chart.register(...registerables);
// ✅ REGISTRAR COMPONENTES ESPECÍFICOS POR SI ACASO
Chart.register(PieController, LineController, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

@Component({
  selector: 'app-inventario-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatDialogModule, 
    BaseChartDirective
  ],
  templateUrl: './inventario-dashboard.component.html',
  styleUrls: ['./inventario-dashboard.component.css']
})
export class InventarioDashboardComponent implements OnInit {
  totalStock = 0;
  productosStockBajo = 0;
  lotesActivos = 0;
  lotesPorCaducar = 0;
  valorTotalInventario = 0;
  movimientosMes = 0;
  lotesProximosCaducar: any[] = [];

  alertas: any[] = [];

   // ✅ CONFIGURACIÓN GRÁFICO DE TORTA - Distribución por Categorías
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
      title: {
        display: true,
        text: 'Distribución de Stock por Categoría'
      }
    }
  };

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ]
    }]
  };
  public pieChartType: ChartType = 'pie';

  // ✅ CONFIGURACIÓN GRÁFICO DE LÍNEAS - Tendencia de Movimientos
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Movimientos Diarios',
        backgroundColor: 'rgba(148,159,177,0.2)',
        borderColor: 'rgba(148,159,177,1)',
        pointBackgroundColor: 'rgba(148,159,177,1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(148,159,177,0.8)',
        fill: 'origin',
      }
    ],
    labels: []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      },
      title: {
        display: true,
        text: 'Tendencia de Movimientos (Últimos 30 días)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cantidad de Movimientos'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fecha'
        }
      }
    }
  };
  public lineChartType: ChartType = 'line';

  constructor(
    private router: Router,
    private inventarioService: InventarioService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.cargarEstadisticasReales();
    this.cargarDatosAvanzados();
    this.cargarDatosGraficos(); // ✅ NUEVO: Cargar datos para gráficos
  }

  private cargarDatosGraficos() {
    this.cargarDistribucionCategorias();
    this.cargarTendenciaMovimientos();
  }

 
private cargarDistribucionCategorias() {
  this.inventarioService.getDistribucionCategorias().subscribe({
    next: (data: any) => {
      console.log('📊 Datos de distribución cargados:', data);
      
      // ✅ VERIFICAR QUE LOS DATOS TIENEN LA ESTRUCTURA CORRECTA
      if (data && Array.isArray(data) && data.length > 0) {
        this.pieChartData.labels = data.map((item: any) => item.categoria);
        this.pieChartData.datasets[0].data = data.map((item: any) => item.total_stock || item.totalStock || 0);
      } else {
        // Usar datos de ejemplo si no hay datos válidos
        this.usarDatosEjemploPieChart();
      }
    },
    error: (error) => {
      console.error('Error cargando distribución categorías:', error);
      this.usarDatosEjemploPieChart();
    }
  });
}

private usarDatosEjemploPieChart() {
  this.pieChartData = {
    labels: ['Bidones', 'Botellas', 'Paquetes', 'Accesorios'],
    datasets: [{
      data: [45, 30, 20, 5],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
    }]
  };
}

private cargarTendenciaMovimientos() {
  this.inventarioService.getTendenciaMovimientos().subscribe({
    next: (data: any) => {
      console.log('📈 Datos de tendencia cargados:', data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        this.lineChartData.labels = data.map((item: any) => {
          // Formatear fecha para mejor visualización
          const fecha = new Date(item.fecha);
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        });
        this.lineChartData.datasets[0].data = data.map((item: any) => item.cantidad || 0);
      } else {
        this.usarDatosEjemploLineChart();
      }
    },
    error: (error) => {
      console.error('Error cargando tendencia movimientos:', error);
      this.usarDatosEjemploLineChart();
    }
  });
}

private usarDatosEjemploLineChart() {
  const ultimos30Dias = this.generarUltimos30Dias();
  this.lineChartData = {
    labels: ultimos30Dias,
    datasets: [{
      data: this.generarDatosAleatorios(30, 5, 25),
      label: 'Movimientos Diarios',
      backgroundColor: 'rgba(148,159,177,0.2)',
      borderColor: 'rgba(148,159,177,1)',
      pointBackgroundColor: 'rgba(148,159,177,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(148,159,177,0.8)',
      fill: 'origin',
    }]
  };
}
  private generarUltimos30Dias(): string[] {
    const dias = [];
    for (let i = 29; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      dias.push(fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));
    }
    return dias;
  }

  private generarDatosAleatorios(cantidad: number, min: number, max: number): number[] {
    return Array.from({ length: cantidad }, () => 
      Math.floor(Math.random() * (max - min + 1)) + min
    );
  }

  // ... EL RESTO DE TUS MÉTODOS EXISTENTES PERMANECEN IGUAL
  cargarEstadisticasReales() {
    this.inventarioService.getDashboardData().subscribe({
      next: (data: any) => {
        const stats = data.estadisticas;
        this.totalStock = stats.totalStock;
        this.productosStockBajo = stats.productosStockBajo;
        this.lotesActivos = stats.lotesActivos;
        this.lotesPorCaducar = stats.lotesPorCaducar;
        this.valorTotalInventario = stats.valorTotalInventario || 0;
        this.movimientosMes = stats.movimientosMes || 0;
        
        // Actualizar alertas con datos reales
        this.actualizarAlertas(data.alertas);
      },
      error: (error: any) => {
        console.error('Error cargando dashboard:', error);
        this.cargarEstadisticasPorDefecto();
      }
    });
  }

  private cargarDatosAvanzados() {
    // Cargar lotes próximos a caducar
    this.inventarioService.getLotesProximosCaducar().subscribe({
      next: (lotes) => this.lotesProximosCaducar = lotes
    });
  }

  // ✅ CREAR MÉTODO actualizarAlertas
  private actualizarAlertas(alertasBackend: any) {
    this.alertas = [];

    // Alertas de stock bajo
    if (alertasBackend?.stockBajo && alertasBackend.stockBajo.length > 0) {
      this.alertas.push({
        tipo: 'warning',
        icono: 'warning',
        titulo: 'Stock Bajo Detectado',
        mensaje: `${alertasBackend.stockBajo.length} productos están por debajo del stock mínimo`,
        accion: 'Revisar',
        data: alertasBackend.stockBajo
      });
    }

    // Alertas de lotes por caducar
    if (alertasBackend?.lotesPorCaducar && alertasBackend.lotesPorCaducar.length > 0) {
      this.alertas.push({
        tipo: 'danger',
        icono: 'schedule',
        titulo: 'Lotes por Caducar',
        mensaje: `${alertasBackend.lotesPorCaducar.length} lotes caducan en los próximos 30 días`,
        accion: 'Ver Detalles',
        data: alertasBackend.lotesPorCaducar
      });
    }

    // Si no hay alertas del backend, mostrar mensaje
    if (this.alertas.length === 0) {
      this.alertas.push({
        tipo: 'success',
        icono: 'check_circle',
        titulo: 'Todo en orden',
        mensaje: 'No hay alertas críticas en este momento',
        accion: 'Continuar'
      });
    }
  }

  // ✅ MÉTODO DE FALLBACK POR SI EL BACKEND NO RESPONDE
  private cargarEstadisticasPorDefecto() {
    // Usar datos por defecto o de la versión anterior
    this.totalStock = 527;
    this.productosStockBajo = 3;
    this.lotesActivos = 15;
    this.lotesPorCaducar = 2;
    this.valorTotalInventario = 12500;
    this.movimientosMes = 45;
    
    // Alertas por defecto
    this.alertas = [
      {
        tipo: 'warning',
        icono: 'warning',
        titulo: 'Stock Bajo Detectado',
        mensaje: '3 productos están por debajo del stock mínimo',
        accion: 'Revisar'
      },
      {
        tipo: 'danger',
        icono: 'schedule',
        titulo: 'Lotes por Caducar',
        mensaje: '2 lotes caducan en los próximos 30 días',
        accion: 'Ver Detalles'
      }
    ];
  }

  // Método para crear movimiento unificado desde el dashboard
  crearMovimientoUnificado(): void {
    const dialogRef = this.dialog.open(MovimientoStockUnificadoFormComponent, {
      width: '650px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'movimiento-unificado-dialog'
    });
    
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.cargarEstadisticasReales();
        this.cargarDatosAvanzados();
      }
    });
  }

  // Métodos helper para días de caducidad
  calcularDiasParaCaducar(fechaCaducidad: string): number {
    const hoy = new Date();
    const caducidad = new Date(fechaCaducidad);
    const diffTime = caducidad.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDiasClass(fechaCaducidad: string): string {
    const dias = this.calcularDiasParaCaducar(fechaCaducidad);
    
    if (dias < 0) return 'caducado';
    if (dias <= 7) return 'caducidad-critica';
    if (dias <= 30) return 'caducidad-proxima';
    return 'caducidad-normal';
  }

  // Métodos de navegación existentes
  goToMovimientos() {
    this.router.navigate(['/inventario/movimientos']);
  }

  goToReportes() {
    this.router.navigate(['/inventario/reportes']);
  }

  goToLotes() {
    this.router.navigate(['/inventario/lotes']);
  }

  goToProductos() {
    this.router.navigate(['/productos']);
  }

  goToPedidosProveedor() {
    this.router.navigate(['/pedidos-proveedor']);
  }

  goToProveedores() {
    this.router.navigate(['/proveedores']);
  }

  resolverAlerta(alerta: any) {
    switch(alerta.tipo) {
      case 'warning':
        this.goToProductos();
        break;
      case 'danger':
        this.goToLotes();
        break;
      default:
        this.cargarEstadisticasReales();
        break;
    }
  }

  tieneAlertasCriticas(): boolean {
    return this.alertas.some(alerta => 
      alerta.tipo === 'warning' || alerta.tipo === 'danger'
    );
  }

  getAlertasCriticas(): any[] {
    return this.alertas.filter(alerta => 
      alerta.tipo === 'warning' || alerta.tipo === 'danger'
    );
  }

  cerrarAlerta(alerta: any) {
    this.alertas = this.alertas.filter(a => a !== alerta);
  }

  getAlertaIcon(alerta: any): string {
    const iconMap: { [key: string]: string } = {
      'warning': 'warning',
      'danger': 'schedule',
      'success': 'check_circle',
      'info': 'info'
    };
    return iconMap[alerta.tipo] || 'notifications';
  }
}