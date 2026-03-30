// src/app/components/entregar-dinero-modal/entregar-dinero-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface MetodoPago {
  id: number;
  nombre: string;
  icono: string;
  color: string;
}

export interface EntregarDineroData {
  total: number;
  fecha: string;
  hora: string;
}

@Component({
  selector: 'app-entregar-dinero-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, FormsModule],
  template: `
    <div class="entregar-dinero-modal">
      <!-- Header con icono -->
      <div class="modal-header">
        <div class="header-icon">
          <mat-icon>payments</mat-icon>
        </div>
        <h2 class="header-title">Entregar Dinero al Administrador</h2>
      </div>

      <!-- Cuerpo del modal -->
      <div class="modal-body">
        <!-- Resumen de la entrega -->
        <div class="resumen-card">
          <div class="resumen-header">
            <mat-icon>receipt</mat-icon>
            <span>Resumen de la entrega</span>
          </div>
          
          <div class="resumen-contenido">
            <div class="detalle-item">
              <span class="detalle-label">
                <mat-icon>attach_money</mat-icon> Monto a entregar:
              </span>
              <span class="detalle-valor monto">S/ {{ data.total.toFixed(2) }}</span>
            </div>
            
            <div class="detalle-item">
              <span class="detalle-label">
                <mat-icon>event</mat-icon> Fecha:
              </span>
              <span class="detalle-valor">{{ data.fecha }}</span>
            </div>
            
            <div class="detalle-item">
              <span class="detalle-label">
                <mat-icon>schedule</mat-icon> Hora:
              </span>
              <span class="detalle-valor">{{ data.hora }}</span>
            </div>
          </div>
        </div>

        <!-- Selección de método de pago -->
        <div class="metodo-pago-section">
          <h3 class="section-title">
            <mat-icon>payment</mat-icon>
            Selecciona el método de entrega:
          </h3>
          
          <div class="metodos-grid">
            <!-- En entregar-dinero-modal.component.html, modifica el método-card -->
          <div *ngFor="let metodo of metodosConDescripcion" 
              class="metodo-card"
              [class.selected]="metodoSeleccionado === metodo.id"
              (click)="seleccionarMetodo(metodo.id)">
            <div class="metodo-icon" [style.background]="metodo.color + '20'" [style.color]="metodo.color">
              <mat-icon>{{ metodo.icono }}</mat-icon>
            </div>
            <div class="metodo-info">
              <h4>{{ metodo.nombre }}</h4>
              <p class="metodo-descripcion">{{ metodo.descripcion }}</p>
            </div>
            <div class="metodo-check" *ngIf="metodoSeleccionado === metodo.id">
              <mat-icon style="color: #28a745;">check_circle</mat-icon>
            </div>
          </div>
          </div>
        </div>

        <!-- Nota informativa -->
        <div class="nota-info">
          <mat-icon>info</mat-icon>
          <span>
            Esta acción registrará la entrega del dinero de las ventas del día de hoy 
            y actualizará tu saldo pendiente.
          </span>
        </div>
      </div>

      <!-- Acciones -->
      <div class="modal-actions">
        <button class="btn-cancelar" (click)="cancelar()">
          <mat-icon>close</mat-icon>
          Cancelar
        </button>
        <button class="btn-confirmar" 
                [disabled]="!metodoSeleccionado"
                (click)="confirmar()">
          <mat-icon>check_circle</mat-icon>
          Confirmar Entrega
        </button>
      </div>
    </div>
  `,
 styles: [`
    .entregar-dinero-modal {
      font-family: 'Montserrat', sans-serif;
      max-width: 600px;
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px 12px 0 0;
      color: white;
      flex-shrink: 0;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .header-title {
      margin: 0;
      font-size: clamp(1rem, 4vw, 1.5rem);
      font-weight: 600;
      line-height: 1.2;
    }

    /* Cuerpo - SCROLLABLE */
    .modal-body {
      padding: 24px;
      flex: 1;
      overflow-y: auto;
      max-height: calc(85vh - 140px);
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
      font-size: clamp(1rem, 4vw, 1.2rem);
    }

    /* Sección de método de pago */
    .metodo-pago-section {
      margin-bottom: 20px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: clamp(0.9rem, 3vw, 1rem);
      color: #495057;
      margin-bottom: 15px;
    }

    .section-title mat-icon {
      color: #007bff;
    }

    .metodos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .metodo-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 2px solid #dee2e6;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      background: white;
    }

    .metodo-card:hover {
      border-color: #007bff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .metodo-card.selected {
      border-color: #28a745;
      background: #f0fff4;
    }

    .metodo-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .metodo-icon mat-icon {
      font-size: 20px;
    }

    .metodo-info {
      flex: 1;
    }

    .metodo-info h4 {
      margin: 0;
      font-size: clamp(0.85rem, 3vw, 1rem);
      font-weight: 600;
      color: #495057;
    }

    .metodo-descripcion {
      margin: 4px 0 0 0;
      font-size: clamp(0.7rem, 2.5vw, 0.8rem);
      color: #6c757d;
      line-height: 1.3;
    }

    .metodo-check {
      position: absolute;
      top: -8px;
      right: -8px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
      background: #28a745;
      color: white;
    }

    .btn-confirmar:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .btn-confirmar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      
      .metodos-grid {
        grid-template-columns: 1fr;
      }
      
      .metodo-card {
        padding: 10px;
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
export class EntregarDineroModalComponent {
  metodosPago: MetodoPago[] = [
    { id: 1, nombre: 'Efectivo', icono: 'paid', color: '#28a745' },
    { id: 2, nombre: 'Yape', icono: 'smartphone', color: '#007bff' },
    { id: 3, nombre: 'Transferencia', icono: 'account_balance', color: '#6f42c1' },
    { id: 4, nombre: 'Tarjeta', icono: 'credit_card', color: '#fd7e14' }
  ];


// En la clase, después de metodosPago
get metodosConDescripcion() {
  return [
    { 
      id: 1, 
      nombre: 'Efectivo', 
      icono: 'paid', 
      color: '#28a745',
      descripcion: 'Entrega física de dinero en efectivo'
    },
    { 
      id: 2, 
      nombre: 'Yape', 
      icono: 'smartphone', 
      color: '#007bff',
      descripcion: 'Transferencia por Yape'
    },
    { 
      id: 3, 
      nombre: 'Transferencia', 
      icono: 'account_balance', 
      color: '#6f42c1',
      descripcion: 'Transferencia bancaria'
    },
    { 
      id: 4, 
      nombre: 'Tarjeta', 
      icono: 'credit_card', 
      color: '#fd7e14',
      descripcion: 'Pago con tarjeta de crédito/débito'
    }
  ];
}

  metodoSeleccionado: number = 1; // Por defecto, seleccionar Efectivo

  constructor(
    public dialogRef: MatDialogRef<EntregarDineroModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EntregarDineroData
  ) {}

  seleccionarMetodo(id: number): void {
    this.metodoSeleccionado = id;
  }

  confirmar(): void {
    this.dialogRef.close({
      confirmado: true,
      metodoId: this.metodoSeleccionado,
      metodoNombre: this.metodosPago.find(m => m.id === this.metodoSeleccionado)?.nombre
    });
  }

  cancelar(): void {
    this.dialogRef.close({ confirmado: false });
  }






}