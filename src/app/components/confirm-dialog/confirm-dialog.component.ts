// confirm-dialog.component.ts - CORREGIDO
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
  showIcon?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    this.data = {
      title: 'Confirmar acción',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      confirmColor: 'warn',
      icon: 'warning',
      showIcon: true,
      ...data
    };
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getTitleClass(): string {
    switch (this.data.confirmColor) {
      case 'warn': return 'warning';
      case 'primary': return 'primary';
      case 'accent': return 'success';
      default: return 'info';
    }
  }

  // ✅ CORREGIDO: Iconos según el contexto
  getConfirmIcon(): string {
    // Si se proporcionó un ícono específico, usarlo
    if (this.data.icon && this.data.icon !== 'warning') {
      return this.data.icon;
    }
    
    // Si no, usar íconos según el título/color
    const titulo = this.data.title || '';
    
    // Para Desactivar
    if (titulo.includes('Desactivar')) {
      return 'block';
    }
    
    // Para Activar
    if (titulo.includes('Activar')) {
      return 'check_circle';
    }
    
    // Para Eliminar
    if (titulo.includes('Eliminar')) {
      return 'delete';
    }
    
    // Por defecto según color
    switch (this.data.confirmColor) {
      case 'warn': return 'warning';
      case 'primary': return 'check_circle';
      case 'accent': return 'done';
      default: return 'check';
    }
  }
}