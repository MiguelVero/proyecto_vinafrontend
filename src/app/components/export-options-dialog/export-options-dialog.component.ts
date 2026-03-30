// src/app/components/export-options-dialog/export-options-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-export-options-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Exportar Proveedores</h2>
    
    <mat-dialog-content>
      <p>Se exportarán <strong>{{ data.total }}</strong> proveedores.</p>
      <p>Selecciona el formato:</p>
      
      <div class="export-options">
        <button mat-raised-button color="primary" (click)="selectFormat('excel')">
          <mat-icon>table_chart</mat-icon>
          Excel (XLSX)
        </button>
        
        <button mat-raised-button color="accent" (click)="selectFormat('csv')">
          <mat-icon>csv</mat-icon>
          CSV
        </button>
        
        <button mat-raised-button color="warn" (click)="selectFormat('pdf')">
          <mat-icon>picture_as_pdf</mat-icon>
          PDF
        </button>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .export-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 1.5rem 0;
    }
    
    .export-options button {
      justify-content: flex-start;
      padding: 1rem;
      width: 100%;
      transition: transform 0.2s;
    }
    
    .export-options button:hover {
      transform: translateX(5px);
    }
    
    .export-options button mat-icon {
      margin-right: 0.5rem;
    }
  `]
})
export class ExportOptionsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ExportOptionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { total: number }
  ) {}

  selectFormat(format: string): void {
    this.dialogRef.close(format);
  }
}