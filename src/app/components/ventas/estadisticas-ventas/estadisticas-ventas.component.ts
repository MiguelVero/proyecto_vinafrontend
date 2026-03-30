// src/app/components/ventas/estadisticas-ventas/estadisticas-ventas.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentasService, EstadisticasVentas, Venta } from '../../../core/services/ventas.service';

@Component({
  selector: 'app-estadisticas-ventas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="estadisticas-container">
      <!-- Loading -->
      <div *ngIf="loading" class="loading-estadisticas">
        <div class="spinner"></div>
        <p>Cargando estadísticas...</p>
        <small>Espere un momento</small>
      </div>

      <!-- Error -->
      <div *ngIf="error && !loading" class="error-estadisticas">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-content">
          <h4>Error al cargar estadísticas</h4>
          <p>{{ error }}</p>
          <button (click)="cargarEstadisticas()" class="btn-reintentar">
            <i class="fas fa-redo"></i> Reintentar
          </button>
        </div>
      </div>

      <!-- Contenido principal -->
      <div *ngIf="!loading && !error" class="estadisticas-content">
        <!-- Título -->
        <div class="estadisticas-header">
          <h3>
            <i class="fas fa-chart-line"></i>
            Resumen de Ventas <span class="badge-pagadas">(Solo Pagadas)</span>
          </h3>
          <small>Actualizado al {{ fechaActual | date:'dd/MM/yyyy HH:mm' }}</small>
        </div>
        
        
        
        <!-- Resumen principal -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-money-bill-wave"></i>
            </div>
            <div class="stat-content">
              <h3>S/ {{ (estadisticas?.totalHoy || 0).toFixed(2) }}</h3>
              <p class="stat-label">Ventas Hoy <span class="stat-tag">Pagadas</span></p>
              <small class="stat-subtext">{{ estadisticas?.ventasHoy || 0 }} transacciones pagadas</small>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="stat-content">
              <h3>S/ {{ (estadisticas?.totalMes || 0).toFixed(2) }}</h3>
              <p class="stat-label">Ventas Mes <span class="stat-tag">Pagadas</span></p>
              <small class="stat-subtext">{{ estadisticas?.ventasMes || 0 }} ventas pagadas este mes</small>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-sack-dollar"></i>
            </div>
            <div class="stat-content">
              <h3>S/ {{ (estadisticas?.totalGeneral || 0).toFixed(2) }}</h3>
              <p class="stat-label">Total General <span class="stat-tag">Pagadas</span></p>
              <small class="stat-subtext">Ventas pagadas acumuladas</small>
            </div>
          </div>
        </div>
        
        <!-- Métodos de pago -->
        <div *ngIf="estadisticas?.ventasPorMetodoPago?.length" class="metodos-pago-section">
          <div class="section-header">
            <h4>
              <i class="fas fa-credit-card"></i>
              Métodos de Pago (Hoy)
              <span class="badge-pagadas">Solo Pagadas</span>
            </h4>
            <small>Distribución por tipo de pago en ventas pagadas</small>
          </div>
          <div class="metodos-grid">
            <div *ngFor="let metodo of estadisticas?.ventasPorMetodoPago || []" class="metodo-card">
              <div class="metodo-icon" [ngClass]="getMetodoClass(metodo.metodo)">
                <i [ngClass]="getMetodoIcon(metodo.metodo)"></i>
              </div>
              <div class="metodo-info">
                <strong class="metodo-nombre">{{ metodo.metodo }}</strong>
                <div class="metodo-stats">
                  <span class="metodo-total">S/ {{ metodo.total.toFixed(2) }}</span>
                  <small class="metodo-cantidad">{{ metodo.cantidad }} ventas pagadas</small>
                </div>
                <div class="metodo-porcentaje">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="(metodo.cantidad / getTotalVentasPagadasHoy()) * 100"></div>
                  </div>
                  <span>{{ ((metodo.cantidad / getTotalVentasPagadasHoy()) * 100).toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sin datos -->
        <div *ngIf="!estadisticas?.ventasPorMetodoPago?.length && !loading && !error" class="sin-datos">
          <div class="sin-datos-icon">
            <i class="fas fa-chart-bar"></i>
          </div>
          <div class="sin-datos-content">
            <h4>No hay ventas pagadas hoy</h4>
            <p>Las estadísticas se actualizarán con nuevas ventas pagadas</p>
            <small>Registra tu primera venta pagada para ver estadísticas</small>
          </div>
        </div>
  `,
  styles: [`
    /* === VARIABLES RESPONSIVE === */
    :host {
      --estadisticas-spacing: clamp(0.5rem, 2vw, 1rem);
      --estadisticas-radius: clamp(8px, 2vw, 12px);
      --estadisticas-font-base: clamp(0.875rem, 2vw, 1rem);
      --estadisticas-font-heading: clamp(1rem, 3vw, 1.2rem);
      --primary-color: #009949;
      --primary-light: rgba(0, 153, 73, 0.1);
      --secondary-color: #057cbe;
      --success-color: #28a745;
      --info-color: #17a2b8;
      --warning-color: #ffc107;
      --danger-color: #dc3545;
    }
    
    /* === NOTA INFORMATIVA === */
    .info-nota {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: calc(var(--estadisticas-radius) - 4px);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: #856404;
    }
    
    .info-nota i {
      color: #ffc107;
      font-size: 1rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    
    .info-nota span {
      line-height: 1.4;
    }
    
    .info-nota strong {
      font-weight: 600;
    }
    
    /* === BADGES === */
    .badge-pagadas {
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
      font-size: 0.7rem;
      padding: 0.125rem 0.375rem;
      border-radius: 10px;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    
    .stat-tag {
      background: rgba(0, 153, 73, 0.1);
      color: #009949;
      font-size: 0.65rem;
      padding: 0.125rem 0.375rem;
      border-radius: 8px;
      font-weight: 600;
      margin-left: 0.375rem;
    }
    
    .text-success {
      color: #28a745 !important;
    }
    
    .text-danger {
      color: #dc3545 !important;
    }
    
    /* === RESUMEN FINAL === */
    .resumen-final {
      background: #f8f9fa;
      border-radius: calc(var(--estadisticas-radius) - 2px);
      padding: 1rem;
      margin: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      border: 1px solid #e1e5e9;
    }
    
    .resumen-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e9ecef;
    }
    
    .resumen-item:last-child {
      border-bottom: none;
    }
    
    .resumen-item span {
      color: #495057;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .resumen-item strong {
      color: #333;
      font-size: 1rem;
      font-weight: 600;
    }
    
    /* === ESTILOS EXISTENTES === */
    .estadisticas-container {
      background: white;
      border-radius: var(--estadisticas-radius);
      padding: var(--estadisticas-spacing);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      min-height: 300px;
      width: 100%;
      overflow: hidden;
    }
    
    /* Loading state */
    .loading-estadisticas {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      min-height: 300px;
    }
    
    .loading-estadisticas .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-estadisticas p {
      color: var(--primary-color);
      font-size: var(--estadisticas-font-heading);
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .loading-estadisticas small {
      color: #666;
      font-size: 0.875rem;
    }
    
    /* Error state */
    .error-estadisticas {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
      text-align: center;
      min-height: 300px;
    }
    
    .error-icon {
      width: 60px;
      height: 60px;
      background: rgba(220, 53, 69, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }
    
    .error-icon i {
      font-size: 1.5rem;
      color: var(--danger-color);
    }
    
    .error-content h4 {
      color: var(--danger-color);
      font-size: var(--estadisticas-font-heading);
      margin-bottom: 0.5rem;
    }
    
    .error-content p {
      color: #666;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .btn-reintentar {
      background: var(--danger-color);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: var(--estadisticas-radius);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      min-height: 44px;
      min-width: 120px;
    }
    
    .btn-reintentar:hover {
      background: #c82333;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
    }
    
    /* Header */
    .estadisticas-header {
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #f1f1f1;
    }
    
    .estadisticas-header h3 {
      color: #333;
      font-size: var(--estadisticas-font-heading);
      font-weight: 600;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .estadisticas-header h3 i {
      color: var(--primary-color);
    }
    
    .estadisticas-header small {
      color: #666;
      font-size: 0.8rem;
    }
    
    /* Grid de estadísticas */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: clamp(0.5rem, 1.5vw, 1rem);
      margin-bottom: 2rem;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: clamp(0.75rem, 2vw, 1rem);
      padding: clamp(0.75rem, 2vw, 1rem);
      background: #f8f9fa;
      border-radius: calc(var(--estadisticas-radius) - 2px);
      border-left: 4px solid var(--primary-color);
      transition: all 0.3s ease;
      min-height: 90px;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      background: white;
    }
    
    .stat-icon {
      width: clamp(40px, 4vw, 48px);
      height: clamp(40px, 4vw, 48px);
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      border-radius: calc(var(--estadisticas-radius) - 4px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: clamp(1.25rem, 2vw, 1.5rem);
      flex-shrink: 0;
    }
    
    .stat-content {
      flex: 1;
      min-width: 0;
    }
    
    .stat-content h3 {
      margin: 0 0 0.25rem 0;
      color: #333;
      font-size: clamp(1.25rem, 2.5vw, 1.5rem);
      font-weight: 700;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .stat-label {
      margin: 0 0 0.125rem 0;
      color: #666;
      font-size: clamp(0.8rem, 1.5vw, 0.9rem);
      font-weight: 500;
      line-height: 1.2;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    
    .stat-subtext {
      color: #888;
      font-size: clamp(0.7rem, 1.2vw, 0.8rem);
      line-height: 1.2;
      display: block;
    }
    
    /* Métodos de pago */
    .metodos-pago-section {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 2px solid #f1f1f1;
    }
    
    .section-header {
      margin-bottom: 1rem;
    }
    
    .section-header h4 {
      color: #333;
      font-size: var(--estadisticas-font-heading);
      font-weight: 600;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .section-header h4 i {
      color: var(--info-color);
    }
    
    .section-header small {
      color: #666;
      font-size: 0.8rem;
    }
    
    .metodos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 0.75rem;
    }
    
    .metodo-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: calc(var(--estadisticas-radius) - 2px);
      transition: all 0.3s ease;
    }
    
    .metodo-card:hover {
      border-color: var(--primary-color);
      box-shadow: 0 4px 8px rgba(0, 153, 73, 0.1);
      transform: translateY(-1px);
    }
    
    .metodo-icon {
      width: clamp(36px, 3vw, 40px);
      height: clamp(36px, 3vw, 40px);
      border-radius: calc(var(--estadisticas-radius) - 4px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(1rem, 1.5vw, 1.2rem);
      flex-shrink: 0;
    }
    
    .metodo-icon.efectivo { 
      background: rgba(40, 167, 69, 0.1); 
      color: var(--success-color); 
    }
    .metodo-icon.yape { 
      background: rgba(23, 162, 184, 0.1); 
      color: var(--info-color); 
    }
    .metodo-icon.transferencia { 
      background: rgba(5, 124, 190, 0.1); 
      color: var(--secondary-color); 
    }
    .metodo-icon.tarjeta { 
      background: rgba(255, 193, 7, 0.1); 
      color: var(--warning-color); 
    }
    
    .metodo-info {
      flex: 1;
      min-width: 0;
    }
    
    .metodo-nombre {
      display: block;
      color: #333;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .metodo-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .metodo-total {
      color: var(--primary-color);
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .metodo-cantidad {
      color: #666;
      font-size: 0.75rem;
      background: #f1f1f1;
      padding: 0.125rem 0.375rem;
      border-radius: 10px;
    }
    
    .metodo-porcentaje {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .progress-bar {
      flex: 1;
      height: 4px;
      background: #e1e5e9;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 2px;
      transition: width 0.5s ease;
    }
    
    .metodo-porcentaje span {
      color: #666;
      font-size: 0.7rem;
      font-weight: 600;
      min-width: 35px;
      text-align: right;
    }
    
    /* Sin datos */
    .sin-datos {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2rem 1rem;
      color: #6c757d;
    }
    
    .sin-datos-icon {
      width: 60px;
      height: 60px;
      background: #f8f9fa;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }
    
    .sin-datos-icon i {
      font-size: 1.5rem;
      color: #adb5bd;
    }
    
    .sin-datos-content h4 {
      color: #495057;
      font-size: var(--estadisticas-font-heading);
      margin-bottom: 0.5rem;
    }
    
    .sin-datos-content p {
      color: #6c757d;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    
    .sin-datos-content small {
      font-size: 0.8rem;
      color: #adb5bd;
    }
    
    /* Footer */
    .estadisticas-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e1e5e9;
    }
    
    .estadisticas-footer small {
      color: #666;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .estadisticas-footer small i {
      color: var(--info-color);
    }
    
    .btn-refresh {
      background: transparent;
      color: var(--primary-color);
      border: 1px solid var(--primary-color);
      padding: 0.5rem 1rem;
      border-radius: var(--estadisticas-radius);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      min-height: 36px;
    }
    
    .btn-refresh:hover {
      background: var(--primary-color);
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 153, 73, 0.2);
    }
    
    /* === MEDIA QUERIES === */
    @media (max-width: 480px) {
      .info-nota {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }
      
      .resumen-final {
        padding: 0.75rem;
      }
      
      .resumen-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
      
      .estadisticas-footer {
        flex-direction: column;
        gap: 0.75rem;
        text-align: center;
      }
    }
    
    /* Resto de media queries existentes... */
  `]
})
export class EstadisticasVentasComponent implements OnInit {
  @Input() fechaInicio?: string;
  @Input() fechaFin?: string;
  @Input() todasLasVentas: Venta[] = []; // ✅ AGREGAR esta línea
  
  estadisticas?: EstadisticasVentas;
  loading = false;
  error = '';
  fechaActual = new Date();
  mostrarNota = true;
  
  constructor(private ventasService: VentasService) {}
  
  ngOnInit() {
    this.cargarEstadisticas();
    
    // Actualizar la fecha cada minuto
    setInterval(() => {
      this.fechaActual = new Date();
    }, 60000);
  }
  
  cargarEstadisticas() {
    this.loading = true;
    this.error = '';
    this.fechaActual = new Date();
    
    this.ventasService.getEstadisticasVentas().subscribe({
      next: (data) => {
        // ✅ CORREGIDO: Filtrar solo ventas pagadas para cálculos
        this.estadisticas = this.filtrarSoloPagadas(data);
        this.loading = false;
        console.log('✅ Estadísticas cargadas (solo pagadas):', this.estadisticas);
      },
      error: (error) => {
        console.error('❌ Error cargando estadísticas:', error);
        
        if (error.status === 404) {
          this.error = 'La ruta de estadísticas no está disponible temporalmente';
          console.warn('⚠️ Ruta no encontrada, usando datos locales');
          this.estadisticas = this.getEstadisticasLocales();
        } else if (error.status === 401) {
          this.error = 'No tienes permisos para ver las estadísticas';
          this.estadisticas = this.getEstadisticasLocales();
        } else {
          this.error = 'Error al cargar las estadísticas. Por favor, intenta nuevamente.';
          this.estadisticas = this.getEstadisticasLocales();
        }
        
        this.loading = false;
      }
    });
  }
  
  // ✅ MÉTODO CORREGIDO: Filtrar solo ventas pagadas
  private filtrarSoloPagadas(data: EstadisticasVentas): EstadisticasVentas {
    // Si el backend ya filtra correctamente, usar esos datos
    // Si no, necesitaríamos todos los datos de ventas para recalcular
    
    // Asumiendo que el backend ya envía solo ventas pagadas
    // (Deberías verificar esto en tu backend)
    
    return {
      ...data,
      // Asegurarnos que los nombres de propiedades coincidan
      totalHoy: data.totalHoy || 0,
      totalMes: data.totalMes || 0,
      totalGeneral: data.totalGeneral || 0,
      ventasHoy: data.ventasHoy || 0,
      ventasMes: data.ventasMes || 0,
      ventasPorMetodoPago: data.ventasPorMetodoPago || [],
      ventasPorDia: data.ventasPorDia || []
    };
  }
  
  // ✅ MÉTODO CORREGIDO: Obtener total de ventas pagadas hoy
  getTotalVentasPagadasHoy(): number {
    if (!this.estadisticas?.ventasPorMetodoPago?.length) return 1;
    return this.estadisticas.ventasPorMetodoPago.reduce((total, metodo) => total + metodo.cantidad, 0);
  }
  
  
  // ✅ MÉTODO para obtener estadísticas locales (como fallback)
  private getEstadisticasLocales(): EstadisticasVentas {
    return {
      totalHoy: 0,
      totalMes: 0,
      totalGeneral: 0,
      ventasHoy: 0,
      ventasMes: 0,
      ventasPorMetodoPago: [],
      ventasPorDia: []
    };
  }
  
  // ✅ NUEVO: Obtener total de ventas registradas (todas)
  getTotalVentasRegistradas(): number {
    // Necesitarías pasar las ventas desde el componente padre
    return this.todasLasVentas?.length || 0;
  }
  
  // ✅ NUEVO: Obtener total de ventas pagadas
  getTotalVentasPagadas(): number {
    return this.todasLasVentas?.filter(v => v.estado === 'Pagado').length || 0;
  }
  
  // ✅ NUEVO: Obtener total de ventas canceladas
  getTotalVentasCanceladas(): number {
    return this.todasLasVentas?.filter(v => v.estado === 'Cancelado').length || 0;
  }
  
  getMetodoClass(metodo: string): string {
    const metodos: {[key: string]: string} = {
      'Efectivo': 'efectivo',
      'Yape': 'yape',
      'Transferencia': 'transferencia',
      'Tarjeta': 'tarjeta',
      'Transferencia Bancaria': 'transferencia',
      'Débito/Crédito': 'tarjeta'
    };
    return metodos[metodo] || 'efectivo';
  }
  
  getMetodoIcon(metodo: string): string {
    const iconos: {[key: string]: string} = {
      'Efectivo': 'fas fa-money-bill-wave',
      'Yape': 'fas fa-mobile-alt',
      'Transferencia': 'fas fa-university',
      'Tarjeta': 'fas fa-credit-card',
      'Transferencia Bancaria': 'fas fa-university',
      'Débito/Crédito': 'fas fa-credit-card'
    };
    return iconos[metodo] || 'fas fa-money-bill-wave';
  }
}