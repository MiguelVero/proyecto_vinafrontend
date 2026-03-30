// src/app/components/detalle-lote-modal/detalle-lote-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Lote } from '../../core/models/lote.model';

@Component({
  selector: 'app-detalle-lote-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressBarModule
  ],
  template: `
    <div class="detalle-modal">
      <div class="modal-header" [class]="getHeaderClass()">
        <div class="header-content">
          <mat-icon class="header-icon">inventory</mat-icon>
          <h2>Detalle del Lote #{{ data.id_lote }}</h2>
        </div>
        <button mat-icon-button (click)="cerrar()" class="btn-cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="modal-body">
        <!-- Información General -->
        <div class="info-section">
          <h3>📦 Información del Producto</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Producto:</span>
              <span class="value producto">{{ data.producto?.nombre }}</span>
            </div>
            
            <div class="info-item" *ngIf="data.producto?.marca">
              <span class="label">Marca:</span>
              <span class="value">{{ data.producto?.marca }}</span>  <!-- ✅ Usar ?. -->
            </div>
            
            <div class="info-item" *ngIf="data.producto?.categoria">
              <span class="label">Categoría:</span>
               <span class="value">{{ data.producto?.categoria }}</span>  <!-- ✅ Usar ?. -->
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Información del Lote -->
        <div class="info-section">
          <h3>🏷️ Datos del Lote</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Número de Lote:</span>
              <span class="value lote">{{ data.numero_lote }}</span>
            </div>
            
            <div class="info-item">
              <span class="label">Fecha de Caducidad:</span>
              <span class="value" [class]="getCaducidadClass()">
                {{ data.fecha_caducidad | date:'dd/MM/yyyy' }}
                <span class="dias-restante">
                  ({{ getDiasRestantes() }} días restantes)
                </span>
              </span>
            </div>
            
            <div class="info-item">
              <span class="label">Estado de Caducidad:</span>
              <span class="estado-badge caducidad" [class]="getDiasClass()">
                <mat-icon>{{ getCaducidadIcon() }}</mat-icon>
                {{ getCaducidadTexto() }}
              </span>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Información de Stock -->
        <div class="info-section">
          <h3>📊 Información de Stock</h3>
          <div class="stock-info">
            <div class="stock-numbers">
              <span class="stock-actual">{{ data.cantidad_actual }}</span>
              <span class="stock-separator">/</span>
              <span class="stock-inicial">{{ data.cantidad_inicial }}</span>
              <span class="stock-porcentaje">({{ getPorcentajeStock() }}%)</span>
            </div>
            
            <mat-progress-bar
              mode="determinate"
              [value]="getPorcentajeStock()"
              [color]="getProgressColor()">
            </mat-progress-bar>

            <div class="stock-detalle">
              <div class="stock-item">
                <span class="stock-label">Stock Actual:</span>
                <span class="stock-value" [class]="getStockClass()">
                  {{ getStockTexto() }}
                </span>
              </div>
              
              <div class="stock-item" *ngIf="data.cantidad_actual === 0">
                <span class="stock-label">Estado:</span>
                <span class="stock-value agotado">
                  <mat-icon>block</mat-icon>
                  Lote agotado
                </span>
              </div>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Metadatos -->
        <div class="info-section">
          <h3>📅 Fechas</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Fecha de Creación:</span>
              <span class="value">{{ data.fecha_creacion | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            
            <div class="info-item">
              <span class="label">Estado:</span>
              <span class="estado-badge" [class.activo]="data.activo" [class.inactivo]="!data.activo">
                <mat-icon>{{ data.activo ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ data.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button mat-raised-button color="primary" (click)="cerrar()">
          <mat-icon>check</mat-icon>
          Cerrar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .detalle-modal {
  min-width: min(90vw, 500px);  /* ✅ CAMBIADO: 90vw en móviles, máximo 500px */
  max-width: 95vw;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

    .modal-header {
  padding: clamp(1rem, 3vw, 1.5rem);  /* ✅ CAMBIADO: responsive padding */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

    .modal-header.warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .modal-header.danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    .header-content h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .btn-cerrar {
      color: white;
    }

    .modal-body {
  padding: clamp(1rem, 3vw, 1.5rem);  /* ✅ CAMBIADO: responsive padding */
  overflow-y: auto;  /* ✅ AGREGADO: permite scroll si el contenido es muy grande */
  flex: 1;
}
    .info-section {
      margin-bottom: 1.5rem;
    }

    .info-section h3 {
      margin: 0 0 1rem 0;
      color: #475569;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

   .info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));  /* ✅ CAMBIADO */
  gap: clamp(0.75rem, 2vw, 1rem);
}
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .label {
      font-size: 0.8rem;
      color: #64748b;
    }

    .value {
      font-size: 1rem;
      font-weight: 500;
      color: #1e293b;
    }

    .value.producto {
      font-weight: 600;
    }

    .value.lote {
      font-family: 'Courier New', monospace;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .dias-restante {
      font-size: 0.8rem;
      color: #64748b;
      margin-left: 8px;
    }

    .estado-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .estado-badge.caducidad {
      background: #f1f5f9;
      color: #475569;
    }

    .estado-badge.activo {
      background: #d1fae5;
      color: #065f46;
    }

    .estado-badge.inactivo {
      background: #fee2e2;
      color: #991b1b;
    }

    .stock-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stock-numbers {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1e293b;
    }

    .stock-actual {
      color: #10b981;
    }

    .stock-inicial {
      color: #64748b;
    }

    .stock-porcentaje {
      font-size: 0.9rem;
      color: #64748b;
      font-weight: normal;
    }

    .stock-detalle {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .stock-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stock-label {
      font-size: 0.9rem;
      color: #64748b;
      min-width: 100px;
    }

    .stock-value {
      font-size: 1rem;
      font-weight: 500;
    }

    .stock-value.normal {
      color: #10b981;
    }

    .stock-value.bajo {
      color: #f59e0b;
    }

    .stock-value.agotado {
      color: #ef4444;
      display: flex;
      align-items: center;
      gap: 4px;
    }

  .modal-footer {
  padding: clamp(1rem, 3vw, 1.5rem);
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
}

 @media (max-width: 480px) {
  .detalle-modal {
    min-width: 95vw;
    max-height: 95vh;
  }
  
  .info-grid {
    grid-template-columns: 1fr;  /* Una columna en móviles */
  }
  
  .header-content h2 {
    font-size: 1.2rem;  /* Título más pequeño en móviles */
  }
}
  `]
})
export class DetalleLoteModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DetalleLoteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Lote
  ) {}

  getHeaderClass(): string {
    const dias = this.calcularDiasParaCaducar();
    if (dias < 0) return 'danger';
    if (dias <= 7) return 'danger';
    if (dias <= 30) return 'warning';
    return '';
  }

  calcularDiasParaCaducar(): number {
    const hoy = new Date();
    const caducidad = new Date(this.data.fecha_caducidad);
    const diffTime = caducidad.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDiasRestantes(): number {
    return this.calcularDiasParaCaducar();
  }

  getDiasClass(): string {
    const dias = this.calcularDiasParaCaducar();
    if (dias < 0) return 'caducado';
    if (dias <= 7) return 'caducidad-critica';
    if (dias <= 30) return 'caducidad-proxima';
    if (dias <= 90) return 'caducidad-advertencia';
    return 'caducidad-normal';
  }

  getCaducidadTexto(): string {
    const dias = this.calcularDiasParaCaducar();
    if (dias < 0) return 'Caducado';
    if (dias <= 7) return 'Crítica';
    if (dias <= 30) return 'Próxima';
    if (dias <= 90) return 'Advertencia';
    return 'Normal';
  }

  getCaducidadIcon(): string {
    const dias = this.calcularDiasParaCaducar();
    if (dias < 0) return 'error';
    if (dias <= 7) return 'warning';
    if (dias <= 30) return 'schedule';
    return 'event_available';
  }

  getCaducidadClass(): string {
    const dias = this.calcularDiasParaCaducar();
    if (dias < 0) return 'caducado';
    return '';
  }

  getPorcentajeStock(): number {
    return Math.round((this.data.cantidad_actual / this.data.cantidad_inicial) * 100);
  }

  getProgressColor(): string {
    const porcentaje = this.getPorcentajeStock();
    if (this.data.cantidad_actual === 0) return 'warn';
    if (porcentaje <= 20) return 'warn';
    if (porcentaje <= 50) return 'accent';
    return 'primary';
  }

  getStockClass(): string {
    const porcentaje = this.getPorcentajeStock();
    if (this.data.cantidad_actual === 0) return 'agotado';
    if (porcentaje <= 20) return 'bajo';
    return 'normal';
  }

  getStockTexto(): string {
    const porcentaje = this.getPorcentajeStock();
    if (this.data.cantidad_actual === 0) return 'Agotado';
    if (porcentaje <= 20) return 'Stock Bajo';
    if (porcentaje <= 50) return 'Stock Medio';
    return 'Stock Normal';
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}