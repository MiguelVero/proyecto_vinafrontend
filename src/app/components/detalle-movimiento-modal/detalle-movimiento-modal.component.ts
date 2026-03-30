// src/app/components/detalle-movimiento-modal/detalle-movimiento-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MovimientoStock } from '../../core/models/movimiento-stock.model';
import { FechaService } from '../../core/services/fecha.service';

@Component({
  selector: 'app-detalle-movimiento-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="detalle-modal">
      <div class="modal-header" [class]="'header-' + data.tipo_movimiento">
        <div class="header-content">
          <mat-icon class="header-icon">{{ getIcono() }}</mat-icon>
          <h2>Detalle del Movimiento #{{ data.id_movimiento }}</h2>
        </div>
        <button mat-icon-button (click)="cerrar()" class="btn-cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="modal-body">
        <!-- Información General -->
        <div class="info-section">
          <h3>📋 Información General</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Tipo de Movimiento:</span>
              <span class="value" [class]="'tipo-' + data.tipo_movimiento">
                <mat-icon class="tipo-icon">{{ getTipoIcon() }}</mat-icon>
                {{ getTipoTexto() }}
              </span>
            </div>
            
            <div class="info-item">
              <span class="label">Producto:</span>
              <span class="value producto">{{ data.producto?.nombre }}</span>
            </div>
            
            <div class="info-item">
              <span class="label">Cantidad:</span>
              <span class="value cantidad" [class]="data.cantidad > 0 ? 'positiva' : 'negativa'">
                <mat-icon>{{ data.cantidad > 0 ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                {{ data.cantidad > 0 ? '+' : '' }}{{ data.cantidad }} unidades
              </span>
            </div>
            
            <div class="info-item">
              <span class="label">Stock Actual:</span>
              <span class="value">{{ data.producto?.stock || 0 }} unidades</span>
            </div>
            
            <div class="info-item">
              <span class="label">Fecha y Hora:</span>
              <span class="value">{{ fechaService.formatFechaCompleta(data.fecha) }} - {{ data.fecha | date:'HH:mm' }}</span>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Información del Lote -->
        <div class="info-section" *ngIf="data.lote">
          <h3>🏷️ Información del Lote</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Número de Lote:</span>
              <span class="value lote">{{ data.lote.numero_lote }}</span>
            </div>
            
            <div class="info-item">
              <span class="label">Fecha de Caducidad:</span>
              <span class="value" [class.caducado]="isCaducado(data.lote.fecha_caducidad)">
                {{ data.lote.fecha_caducidad | date:'dd/MM/yyyy' }}
                <span class="dias-restante" *ngIf="!isCaducado(data.lote.fecha_caducidad)">
                  ({{ calcularDiasRestantes(data.lote.fecha_caducidad) }} días restantes)
                </span>
                <span class="dias-restante caducado" *ngIf="isCaducado(data.lote.fecha_caducidad)">
                  (Producto caducado)
                </span>
              </span>
            </div>
          </div>
        </div>

        <div class="info-section" *ngIf="!data.lote">
          <h3>🏷️ Información del Lote</h3>
          <p class="sin-lote">Este movimiento no está asociado a ningún lote específico.</p>
        </div>

        <mat-divider></mat-divider>

        <!-- Usuario y Descripción -->
        <div class="info-section">
          <h3>👤 Usuario</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Nombre:</span>
              <span class="value">{{ data.usuario?.nombre || 'Sistema' }}</span>
            </div>
            
            <div class="info-item" *ngIf="data.usuario?.username">
              <span class="label">Username:</span>
              <span class="value">@{{ data.usuario?.username }}</span>  <!-- ✅ Usar ?. -->
            </div>
          </div>
        </div>

        <div class="info-section" *ngIf="data.descripcion">
          <h3>📝 Descripción</h3>
          <p class="descripcion">{{ data.descripcion }}</p>
        </div>

        <!-- Estado de Anulación -->
        <div class="info-section" *ngIf="data.anulado || isMovimientoAnulacion()">
          <div class="estado-anulado" *ngIf="data.anulado">
            <mat-icon>block</mat-icon>
            <span>Este movimiento ha sido ANULADO</span>
          </div>
          <div class="estado-anulacion" *ngIf="isMovimientoAnulacion()">
            <mat-icon>warning</mat-icon>
            <span>Este es un movimiento de ANULACIÓN</span>
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

    .modal-header.header-ingreso {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .modal-header.header-egreso {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .modal-header.header-ajuste {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .modal-header.header-devolucion {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: white;
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

    .value.cantidad {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .value.cantidad.positiva {
      color: #10b981;
    }

    .value.cantidad.negativa {
      color: #ef4444;
    }

    .value.lote {
      font-family: 'Courier New', monospace;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .value.tipo-ingreso,
    .value.tipo-egreso,
    .value.tipo-ajuste,
    .value.tipo-devolucion {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
    }

    .value.tipo-ingreso {
      background: #d1fae5;
      color: #065f46;
    }

    .value.tipo-egreso {
      background: #fee2e2;
      color: #991b1b;
    }

    .value.tipo-ajuste {
      background: #fef3c7;
      color: #92400e;
    }

    .value.tipo-devolucion {
      background: #e0e7ff;
      color: #3730a3;
    }

    .tipo-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .dias-restante {
      font-size: 0.8rem;
      color: #64748b;
      margin-left: 8px;
    }

    .dias-restante.caducado,
    .caducado {
      color: #ef4444;
    }

    .sin-lote {
      color: #94a3b8;
      font-style: italic;
      margin: 0;
    }

    .descripcion {
      background: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #8b5cf6;
      margin: 0;
    }

    .estado-anulado,
    .estado-anulacion {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 8px;
      background: #fee2e2;
      color: #991b1b;
    }

    .estado-anulacion {
      background: #fef3c7;
      color: #92400e;
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
export class DetalleMovimientoModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DetalleMovimientoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MovimientoStock,
    public fechaService: FechaService
  ) {}

  getIcono(): string {
    const iconMap: { [key: string]: string } = {
      'ingreso': 'arrow_downward',
      'egreso': 'arrow_upward',
      'ajuste': 'autorenew',
      'devolucion': 'refresh'
    };
    return iconMap[this.data.tipo_movimiento] || 'help';
  }

  getTipoIcon(): string {
    return this.getIcono();
  }

  getTipoTexto(): string {
    const textMap: { [key: string]: string } = {
      'ingreso': 'Ingreso',
      'egreso': 'Egreso',
      'ajuste': 'Ajuste',
      'devolucion': 'Devolución'
    };
    return textMap[this.data.tipo_movimiento] || this.data.tipo_movimiento;
  }

  calcularDiasRestantes(fechaCaducidad: string): number {
    const hoy = new Date();
    const caducidad = new Date(fechaCaducidad);
    const diffTime = caducidad.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isCaducado(fechaCaducidad: string): boolean {
    return this.calcularDiasRestantes(fechaCaducidad) < 0;
  }

  isMovimientoAnulacion(): boolean {
    return this.data.descripcion?.includes('ANULACIÓN') || false;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}