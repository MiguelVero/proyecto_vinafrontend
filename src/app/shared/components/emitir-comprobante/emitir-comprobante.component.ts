// frontend/src/app/shared/components/emitir-comprobante/emitir-comprobante.component.ts
import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SunatService } from '../../../core/services/sunat.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-emitir-comprobante',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <button 
      mat-raised-button 
      [color]="getButtonColor()"
      [disabled]="isDisabled() || procesando"
      (click)="emitirComprobante()"
      [matTooltip]="getTooltipText()"
      class="emitir-btn">
      
      <mat-icon *ngIf="!procesando">receipt_long</mat-icon>
      <mat-spinner *ngIf="procesando" diameter="20" class="spinner"></mat-spinner>
      
      <span class="btn-text">
        {{ getButtonText() }}
      </span>
    </button>
  `,
  styles: [`
    .emitir-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      font-weight: 500;
    }
    
    .spinner {
      margin-right: 8px;
    }
    
    .btn-text {
      white-space: nowrap;
    }
    
    /* Colores para diferentes estados */
    .emitido {
      background-color: #4caf50 !important;
      color: white !important;
    }
    
    .pendiente {
      background-color: #ff9800 !important;
      color: white !important;
    }
    
    .no-pagada {
      background-color: #9e9e9e !important;
      color: white !important;
    }
    
    :host {
      display: inline-block;
    }
  `]
})
export class EmitirComprobanteComponent implements OnInit {
  @Input() idVenta!: number;
  @Input() estadoVenta: number = 0;
  @Input() comprobanteEmitido: number = 0;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Output() comprobanteEmitidoEvent = new EventEmitter<any>();
  
  private sunatService = inject(SunatService);
  
  procesando = false;

  ngOnInit() {
    // Verificar estado inicial
    console.log('Componente EmitirComprobante iniciado:', {
      idVenta: this.idVenta,
      estadoVenta: this.estadoVenta,
      comprobanteEmitido: this.comprobanteEmitido
    });
  }

  isDisabled(): boolean {
    return this.comprobanteEmitido === 1 || this.estadoVenta !== 7;
  }

  getButtonColor(): string {
    if (this.comprobanteEmitido === 1) return 'primary';
    if (this.estadoVenta !== 7) return 'warn';
    return 'accent';
  }

  getButtonText(): string {
    if (this.procesando) return 'Procesando...';
    if (this.comprobanteEmitido === 1) return 'Emitido';
    if (this.estadoVenta !== 7) return 'No pagada';
    return 'Emitir SUNAT';
  }

  getTooltipText(): string {
    if (this.comprobanteEmitido === 1) return 'Comprobante ya emitido';
    if (this.estadoVenta !== 7) return 'La venta debe estar PAGADA para emitir comprobante';
    return 'Emitir comprobante electrónico SUNAT';
  }

  async emitirComprobante() {
    if (this.isDisabled() || this.procesando) return;
    
    const result = await Swal.fire({
      title: '¿Emitir comprobante SUNAT?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Venta ID:</strong> ${this.idVenta}</p>
          <p>Se generará un comprobante electrónico que será enviado a SUNAT.</p>
          <p class="text-warning">⚠️ Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, emitir',
      cancelButtonText: 'Cancelar',
      width: 500
    });

    if (result.isConfirmed) {
      this.procesarEmision();
    }
  }

  private procesarEmision() {
    this.procesando = true;
    
    this.sunatService.emitirComprobante(this.idVenta).subscribe({
      next: (response) => {
        this.procesando = false;
        this.comprobanteEmitido = 1;
        
        Swal.fire({
          title: '¡Comprobante emitido!',
          html: `
            <div style="text-align: left;">
              <p><strong>✅ Éxito:</strong> ${response.message}</p>
              <hr>
              <p><strong>📄 Comprobante:</strong></p>
              <ul style="padding-left: 20px;">
                <li><strong>Tipo:</strong> ${response.data.comprobante.tipo}</li>
                <li><strong>Serie-Número:</strong> ${response.data.comprobante.serie}-${response.data.comprobante.correlativo}</li>
                <li><strong>Nombre:</strong> ${response.data.comprobante.nombre}</li>
                <li><strong>Fecha:</strong> ${new Date(response.data.comprobante.fecha_emision).toLocaleString()}</li>
              </ul>
              <hr>
              <p><strong>📤 Respuesta SUNAT:</strong></p>
              <ul style="padding-left: 20px;">
                <li><strong>Estado:</strong> ${response.data.sunat.estado}</li>
                <li><strong>Código:</strong> ${response.data.sunat.code}</li>
                <li><strong>Descripción:</strong> ${response.data.sunat.description}</li>
                <li><strong>Hash:</strong> <small>${response.data.sunat.hash}</small></li>
              </ul>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          width: 600
        });
        
        // Emitir evento para que el componente padre actualice
        this.comprobanteEmitidoEvent.emit({
          idVenta: this.idVenta,
          comprobanteEmitido: 1,
          datosComprobante: response.data
        });
      },
      error: (error) => {
        this.procesando = false;
        
        Swal.fire({
          title: 'Error al emitir',
          html: `
            <div style="text-align: left;">
              <p><strong>❌ Error:</strong> ${error.error?.error || 'No se pudo emitir el comprobante'}</p>
              ${error.error?.details ? `<p><strong>Detalles:</strong> ${error.error.details}</p>` : ''}
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
        
        console.error('Error al emitir comprobante:', error);
      }
    });
  }
}