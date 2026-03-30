// src/app/components/sunat/emitir-comprobante/emitir-comprobante.component.ts
import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SunatService } from '../../../core/services/sunat.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-emitir-comprobante',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Vista normal (escritorio) -->
    <button 
      *ngIf="!isMobileView"
      [disabled]="disabled || procesando"
      (click)="emitirComprobante()"
      class="btn {{btnClass}}"
      [title]="ventaInfo"
      [ngClass]="{'btn-loading': procesando}">
      
      <i *ngIf="!procesando" class="fas fa-file-invoice"></i>
      <i *ngIf="procesando" class="fas fa-spinner fa-spin"></i>
      
      {{ btnText }}
    </button>
    
    <!-- Vista móvil compacta -->
    <button 
      *ngIf="isMobileView"
      [disabled]="disabled || procesando"
      (click)="emitirComprobante()"
      class="btn {{mobileBtnClass}}"
      [title]="ventaInfo"
      [ngClass]="{'btn-loading': procesando}">
      
      <i *ngIf="!procesando" class="fas" [ngClass]="mobileIcon"></i>
      <i *ngIf="procesando" class="fas fa-spinner fa-spin"></i>
      
      {{ mobileBtnText }}
    </button>
  `,
  styles: [`
    button {
      transition: all 0.3s ease;
      min-height: 36px;
      min-width: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }
    
    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    .btn-success {
      background: #28a745;
      color: white;
    }
    
    .btn-success:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
    }
    
    .btn-warning {
      background: #ffc107;
      color: #212529;
    }
    
    .btn-warning:hover:not(:disabled) {
      background: #e0a800;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }
    
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
    
    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      min-height: 32px;
      min-width: 32px;
    }
    
    .btn-loading {
      position: relative;
      opacity: 0.8;
    }
    
    /* Vista móvil */
    .mobile-btn-compact {
      padding: 0.25rem;
      min-width: 40px;
      font-size: 0.7rem;
    }
    
    .mobile-btn-compact .fas {
      margin: 0;
    }
    
    /* Responsive */
    @media (max-width: 480px) {
      button {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
      }
    }
    
    @media (max-width: 320px) {
      button {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
      }
    }
  `]
})
export class EmitirComprobanteComponent implements OnInit {
  @Input() idVenta!: number;
  @Input() estadoVenta: number = 0;
  @Input() comprobanteEmitido: number = 0;
  @Input() tipoComprobanteSolicitado: string = '';
  @Input() btnClass: string = 'btn-success btn-sm';
  @Input() btnText: string = 'Emitir SUNAT';
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Output() comprobanteEmitidoEvent = new EventEmitter<any>();
  
  private sunatService = inject(SunatService);
  
  procesando = false;
  ventaInfo = '';
  disabled = false;
  isMobileView = false;
  mobileBtnClass = '';
  mobileBtnText = '';
  mobileIcon = 'fa-file-invoice';

  ngOnInit() {
    this.detectMobileView();
    this.actualizarInfoVenta();
    window.addEventListener('resize', () => this.detectMobileView());
  }

  private detectMobileView() {
    this.isMobileView = window.innerWidth <= 768;
    this.updateMobileStyles();
  }

  private updateMobileStyles() {
    if (this.isMobileView) {
      this.mobileBtnClass = this.btnClass.replace('btn-sm', 'btn-xs') + ' mobile-btn-compact';
      this.mobileBtnText = this.btnText.length > 8 ? 'SUNAT' : this.btnText;
      
      if (this.btnText.includes('Emitido')) {
        this.mobileIcon = 'fa-check-circle';
      } else if (this.btnText.includes('No requiere')) {
        this.mobileIcon = 'fa-ban';
      } else if (this.btnText.includes('No pagada')) {
        this.mobileIcon = 'fa-clock';
      } else {
        this.mobileIcon = 'fa-file-invoice';
      }
    }
  }

  private actualizarInfoVenta() {
    // Verificar el tipo de comprobante solicitado
    if (this.tipoComprobanteSolicitado === 'SIN_COMPROBANTE') {
      this.ventaInfo = 'Esta venta no requiere comprobante SUNAT (Nota de venta)';
      this.disabled = true;
      this.btnClass = 'btn-secondary btn-sm';
      this.btnText = 'No requiere';
      this.updateMobileStyles();
      return;
    }
    
    if (this.comprobanteEmitido === 1) {
      this.ventaInfo = 'Comprobante ya emitido';
      this.disabled = true;
      this.btnClass = 'btn-secondary btn-sm';
      this.btnText = 'Emitido';
    } else if (this.estadoVenta !== 7) {
      this.ventaInfo = 'La venta debe estar PAGADA para emitir comprobante';
      this.disabled = true;
      this.btnClass = 'btn-warning btn-sm';
      this.btnText = 'No pagada';
    } else {
      this.ventaInfo = 'Emitir comprobante electrónico';
      this.disabled = false;
      this.btnClass = 'btn-success btn-sm';
      this.btnText = 'Emitir SUNAT';
    }
    
    this.updateMobileStyles();
  }

  async emitirComprobante() {
    if (!this.idVenta || this.procesando || this.comprobanteEmitido === 1) return;
    
    const result = await Swal.fire({
      title: '¿Emitir comprobante?',
      text: 'Se generará un comprobante electrónico para esta venta',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, emitir',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'swal-responsive'
      }
    });

    if (result.isConfirmed) {
      this.procesarEmision();
    }
  }

  private procesarEmision() {
    this.procesando = true;
    this.btnText = 'Procesando...';
    this.mobileBtnText = '...';
    
    this.sunatService.emitirComprobante(this.idVenta).subscribe({
      next: (response) => {
        this.procesando = false;
        this.comprobanteEmitido = 1;
        
        const correlativo = response.data?.comprobante?.correlativo || '00000001';
        
        Swal.fire({
          title: '¡Comprobante emitido!',
          html: `
            <div class="swal-content-responsive">
              <p><strong>Tipo:</strong> ${response.data.comprobante.tipo}</p>
              <p><strong>Serie-Número:</strong> ${response.data.comprobante.serie}-${correlativo}</p>
              <p><strong>Estado SUNAT:</strong> ${response.data.sunat.estado}</p>
              <p><strong>Hash:</strong> <small>${response.data.sunat.hash?.substring(0, 20)}...</small></p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          customClass: {
            popup: 'swal-responsive',
            htmlContainer: 'swal-text-responsive'
          }
        });
        
        this.comprobanteEmitidoEvent.emit(response.data);
        this.actualizarInfoVenta();
      },
      error: (error) => {
        this.procesando = false;
        this.btnText = 'Emitir SUNAT';
        this.mobileBtnText = 'SUNAT';
        
        Swal.fire({
          title: 'Error al emitir',
          text: error.error?.error || 'No se pudo emitir el comprobante',
          icon: 'error',
          confirmButtonText: 'Entendido',
          customClass: {
            popup: 'swal-responsive'
          }
        });
      }
    });
  }
}