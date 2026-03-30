// pedido-detalles-modal.component.ts - CORREGIDO
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PedidoProveedor } from '../../core/models/pedido-proveedor.model';

export interface PedidoDetallesModalData {
  pedido: PedidoProveedor;
  onEdit?: (pedido: PedidoProveedor) => void; // ✅ NUEVO: Callback para editar
}

@Component({
  selector: 'app-pedido-detalles-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './pedido-detalles-modal.component.html',
  styleUrls: ['./pedido-detalles-modal.component.css']
})
export class PedidoDetallesModalComponent {

  constructor(
    public dialogRef: MatDialogRef<PedidoDetallesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PedidoDetallesModalData
  ) {
 // Debug para verificar datos
    console.log('📦 Datos recibidos en modal:', data.pedido);
    if (data.pedido.detalles) {
      console.log('🔍 Detalles del pedido:');
      data.pedido.detalles.forEach((detalle, index) => {
        console.log(`   Item ${index + 1}:`, {
          nombre: detalle.insumo?.nombre,
          unidad: detalle.insumo?.unidad_medida,
          cantidad: detalle.cantidad,
          costo: detalle.costo_unitario
        });
      });
    }
  }

  getEstadoIcon(estado: string | undefined): string {
    if (!estado) return 'help';
    
    const icons: { [key: string]: string } = {
      'Solicitado': 'pending_actions',
      'Confirmado': 'check_circle',
      'En camino': 'local_shipping',
      'Recibido': 'inventory',
      'Cancelado': 'cancel'
    };
    return icons[estado] || 'help';
  }

  onClose(): void {
    this.dialogRef.close(false);
  }

  onEdit(): void {
     if (this.data.onEdit) {
      // ✅ Si hay callback, ejecutarlo
      this.data.onEdit(this.data.pedido);
    }
    this.dialogRef.close('edit');
  }
}