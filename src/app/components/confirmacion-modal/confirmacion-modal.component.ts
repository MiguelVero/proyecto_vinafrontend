// src/app/components/confirmacion-modal/confirmacion-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmacionData {
  titulo: string;
  mensaje: string;
  detalles?: Array<{ label: string, valor: string, icono?: string }>;
  total?: string;
  metodo?: string;
  fecha?: string;
  monto?: number;
  tipo?: 'regularizacion' | 'entrega' | 'eliminar' | 'warning';
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirmacion-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirmacion-modal">
      <!-- Header con icono según tipo -->
      <div class="modal-header" [ngClass]="data.tipo || 'confirmacion'">
        <div class="header-icon">
          <mat-icon [ngSwitch]="data.tipo">
            <ng-container *ngSwitchCase="'regularizacion'">event_available</ng-container>
            <ng-container *ngSwitchCase="'entrega'">handshake</ng-container>
            <ng-container *ngSwitchCase="'eliminar'">warning</ng-container>
            <ng-container *ngSwitchDefault>help_outline</ng-container>
          </mat-icon>
        </div>
        <h2 class="header-title">{{ data.titulo || 'Confirmar Acción' }}</h2>
      </div>

      <!-- Cuerpo del modal -->
      <div class="modal-body">
        <p class="mensaje-principal">{{ data.mensaje }}</p>

        <!-- Tarjeta de resumen para regularización -->
        <div class="resumen-card" *ngIf="data.tipo === 'regularizacion' || data.detalles">
          <div class="resumen-header">
            <mat-icon>receipt</mat-icon>
            <span>Resumen de la regularización</span>
          </div>
          
          <div class="resumen-contenido">
            <!-- Detalles personalizados -->
            <div class="detalle-item" *ngFor="let detalle of data.detalles">
              <span class="detalle-label">
                <mat-icon *ngIf="detalle.icono">{{ detalle.icono }}</mat-icon>
                {{ detalle.label }}:
              </span>
              <span class="detalle-valor">{{ detalle.valor }}</span>
            </div>

            <!-- Si no hay detalles personalizados, mostrar el formato por defecto -->
            <ng-container *ngIf="!data.detalles?.length">
              <div class="detalle-item" *ngIf="data.fecha">
                <span class="detalle-label"><mat-icon>calendar_today</mat-icon> Fecha:</span>
                <span class="detalle-valor">{{ data.fecha }}</span>
              </div>
              <div class="detalle-item" *ngIf="data.monto !== undefined">
                <span class="detalle-label"><mat-icon>attach_money</mat-icon> Monto:</span>
                <span class="detalle-valor monto">S/ {{ data.monto.toFixed(2) }}</span>
              </div>
              <div class="detalle-item" *ngIf="data.metodo">
                <span class="detalle-label"><mat-icon>payment</mat-icon> Método:</span>
                <span class="detalle-valor metodo" [ngClass]="'metodo-' + data.metodo">
                  <mat-icon [ngSwitch]="data.metodo">
                    <ng-container *ngSwitchCase="'efectivo'">paid</ng-container>
                    <ng-container *ngSwitchCase="'transferencia'">account_balance</ng-container>
                    <ng-container *ngSwitchCase="'yape'">smartphone</ng-container>
                    <ng-container *ngSwitchDefault>payment</ng-container>
                  </mat-icon>
                  {{ formatearMetodo(data.metodo) }}
                </span>
              </div>
            </ng-container>

            <!-- Total destacado -->
            <div class="total-destacado" *ngIf="data.total">
              <span>{{ data.total }}</span>
            </div>
          </div>
        </div>

        <!-- Nota informativa -->
        <div class="nota-info">
          <mat-icon>info</mat-icon>
          <span>Esta acción registrará la regularización en el historial y actualizará el dinero pendiente.</span>
        </div>
      </div>

      <!-- Acciones del modal -->
      <div class="modal-actions">
        <button class="btn-cancelar" (click)="cancelar()">
          <mat-icon>close</mat-icon>
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button class="btn-confirmar" [ngClass]="data.tipo || 'confirmacion'" (click)="confirmar()">
          <mat-icon>check_circle</mat-icon>
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmacion-modal {
      font-family: 'Montserrat', sans-serif;
      max-width: 550px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px 24px;
      border-radius: 12px 12px 0 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      flex-shrink: 0;
    }

    .modal-header.regularizacion {
      background: linear-gradient(135deg, #fff3cd 0%, #ffe69b 100%);
      border-bottom: 3px solid #ffc107;
    }

    .modal-header.entrega {
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      border-bottom: 3px solid #28a745;
    }

    .modal-header.warning {
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      border-bottom: 3px solid #dc3545;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }

    .header-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .modal-header.regularizacion .header-icon mat-icon {
      color: #ffc107;
    }

    .modal-header.entrega .header-icon mat-icon {
      color: #28a745;
    }

    .modal-header.warning .header-icon mat-icon {
      color: #dc3545;
    }

    .header-title {
      margin: 0;
      font-size: clamp(1rem, 4vw, 1.5rem);
      font-weight: 600;
      color: #495057;
      line-height: 1.2;
    }

    /* Cuerpo - SCROLLABLE */
    .modal-body {
      padding: 24px;
      flex: 1;
      overflow-y: auto;
      max-height: calc(85vh - 140px);
    }

    .mensaje-principal {
      font-size: clamp(0.9rem, 3vw, 1rem);
      color: #6c757d;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    /* Tarjeta de resumen */
    .resumen-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      border: 1px solid #dee2e6;
    }

    .resumen-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 15px;
      color: #495057;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .resumen-header mat-icon {
      color: #007bff;
    }

    .resumen-contenido {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detalle-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px dashed #dee2e6;
      flex-wrap: wrap;
      gap: 8px;
    }

    .detalle-item:last-child {
      border-bottom: none;
    }

    .detalle-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #6c757d;
      font-size: clamp(0.8rem, 3vw, 0.95rem);
    }

    .detalle-label mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .detalle-valor {
      font-weight: 600;
      color: #495057;
      font-size: clamp(0.9rem, 3vw, 1rem);
    }

    .detalle-valor.monto {
      color: #28a745;
      font-size: clamp(1rem, 4vw, 1.1rem);
    }

    .detalle-valor.metodo {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.9rem;
    }

    .metodo-efectivo {
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
    }

    .metodo-transferencia {
      background: rgba(23, 162, 184, 0.1);
      color: #17a2b8;
    }

    .metodo-yape {
      background: rgba(111, 66, 193, 0.1);
      color: #6f42c1;
    }

    .total-destacado {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #dee2e6;
      text-align: right;
      font-weight: 700;
      font-size: clamp(1rem, 4vw, 1.2rem);
      color: #28a745;
    }

    /* Nota informativa */
    .nota-info {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background: #e7f3ff;
      border-radius: 8px;
      border-left: 4px solid #007bff;
      margin-top: 20px;
    }

    .nota-info mat-icon {
      color: #007bff;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nota-info span {
      color: #004085;
      font-size: clamp(0.8rem, 2.5vw, 0.9rem);
      line-height: 1.4;
    }

    /* Acciones */
    .modal-actions {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
      flex-shrink: 0;
    }

    .btn-cancelar, .btn-confirmar {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: clamp(0.85rem, 3vw, 1rem);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-cancelar {
      background: #6c757d;
      color: white;
    }

    .btn-cancelar:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .btn-confirmar {
      background: #007bff;
      color: white;
    }

    .btn-confirmar.regularizacion {
      background: #ffc107;
      color: #856404;
    }

    .btn-confirmar.entrega {
      background: #28a745;
      color: white;
    }

    .btn-confirmar.warning {
      background: #dc3545;
      color: white;
    }

    .btn-confirmar:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-confirmar.regularizacion:hover {
      background: #e0a800;
    }

    .btn-confirmar.entrega:hover {
      background: #218838;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .modal-header {
        padding: 16px 20px;
      }
      
      .modal-body {
        padding: 20px;
      }
      
      .modal-actions {
        padding: 16px 20px;
        flex-direction: column;
        gap: 10px;
      }
      
      .btn-cancelar, .btn-confirmar {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .modal-header {
        padding: 12px 16px;
      }
      
      .modal-body {
        padding: 16px;
      }
      
      .resumen-card {
        padding: 12px;
      }
      
      .detalle-item {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }
      
      .detalle-label {
        gap: 4px;
      }
    }
  `]
})
export class ConfirmacionModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmacionData
  ) {}

  formatearMetodo(metodo: string): string {
    const metodos: {[key: string]: string} = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia',
      'yape': 'Yape',
      'tarjeta': 'Tarjeta'
    };
    return metodos[metodo] || metodo;
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}