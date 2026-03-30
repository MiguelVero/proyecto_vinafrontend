// src/app/features/pages/configuracion/empresa-config/empresa-config.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmpresaService, EmpresaConfig } from '../../../../core/services/empresa.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-empresa-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-container">
      <div class="header">
        <h1>
          <i class="fas fa-building"></i>
          Configuración de la Empresa
        </h1>
        <button (click)="volver()" class="btn-back">
          <i class="fas fa-arrow-left"></i>
          Volver
        </button>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Cargando configuración...</p>
      </div>

      <div *ngIf="error" class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        {{ error }}
      </div>

      <form *ngIf="!loading && config" (ngSubmit)="guardar()" class="config-form">
        <!-- Vista previa del comprobante -->
        <div class="preview-section">
          <h2>Vista Previa del Comprobante</h2>
          <div class="comprobante-preview">
            <div class="empresa-header">
              <div class="logo">
                <div class="logo-placeholder">{{ config.logo_texto || '🏢' }}</div>
              </div>
              <div class="empresa-info">
                <h1>{{ config.nombre }}</h1>
                <p class="ruc">RUC: {{ config.ruc }}</p>
                <p class="eslogan">{{ config.eslogan }}</p>
              </div>
            </div>
            <div class="footer-preview">
              <p>{{ config.direccion }}</p>
              <p>Tel: {{ config.telefono }} | Email: {{ config.email }}</p>
              <p>{{ config.web }}</p>
            </div>
          </div>
        </div>

        <!-- Formulario de configuración -->
        <div class="form-section">
          <h2>Datos de la Empresa</h2>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre *</label>
              <input type="text" [(ngModel)]="config.nombre" name="nombre" required class="form-control">
            </div>

            <div class="form-group">
              <label>RUC *</label>
              <input type="text" [(ngModel)]="config.ruc" name="ruc" required maxlength="11" class="form-control">
            </div>

            <div class="form-group full-width">
              <label>Eslogan</label>
              <input type="text" [(ngModel)]="config.eslogan" name="eslogan" class="form-control">
            </div>

            <div class="form-group full-width">
              <label>Dirección *</label>
              <textarea [(ngModel)]="config.direccion" name="direccion" required rows="2" class="form-control"></textarea>
            </div>

            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" [(ngModel)]="config.telefono" name="telefono" class="form-control">
            </div>

            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="config.email" name="email" class="form-control">
            </div>

            <div class="form-group">
              <label>Sitio Web</label>
              <input type="text" [(ngModel)]="config.web" name="web" class="form-control">
            </div>

            <div class="form-group">
              <label>Logo (texto/emoji)</label>
              <input type="text" [(ngModel)]="config.logo_texto" name="logo_texto" maxlength="2" class="form-control" placeholder="💧">
              <small>Puedes usar un emoji o letra</small>
            </div>

            <div class="form-group full-width">
              <label>URL del Logo (opcional)</label>
              <input type="text" [(ngModel)]="config.logo_url" name="logo_url" class="form-control" placeholder="https://...">
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-save" [disabled]="saving">
              <i class="fas" [ngClass]="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
            <button type="button" class="btn-cancel" (click)="cancelar()">
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .config-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2rem;
      color: #2c3e50;
      margin: 0;
    }
    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-back:hover {
      background: #5a6268;
    }
    .loading {
      text-align: center;
      padding: 40px;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #057cbe;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .preview-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .preview-section h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.3rem;
    }
    .comprobante-preview {
      background: #f8f9fa;
      border: 2px dashed #057cbe;
      border-radius: 10px;
      padding: 20px;
    }
    .empresa-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #057cbe;
    }
    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: #057cbe;
      color: white;
      font-size: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .empresa-info h1 {
      font-size: 1.5rem;
      color: #057cbe;
      margin: 0;
    }
    .ruc {
      font-size: 0.85rem;
      color: #333;
      font-weight: bold;
      margin: 2px 0;
    }
    .eslogan {
      font-size: 0.8rem;
      color: #555;
      font-style: italic;
      margin: 0;
    }
    .footer-preview {
      text-align: center;
      font-size: 0.85rem;
      color: #6c757d;
      padding-top: 15px;
      border-top: 1px solid #dee2e6;
    }
    .footer-preview p {
      margin: 2px 0;
    }
    .form-section {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .form-section h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.3rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .form-group label {
      font-weight: 600;
      color: #495057;
    }
    .form-control {
      padding: 10px;
      border: 1px solid #ced4da;
      border-radius: 5px;
      font-size: 1rem;
    }
    .form-control:focus {
      outline: none;
      border-color: #057cbe;
      box-shadow: 0 0 0 3px rgba(5,124,190,0.1);
    }
    .form-group small {
      color: #6c757d;
      font-size: 0.8rem;
    }
    .form-actions {
      margin-top: 30px;
      display: flex;
      gap: 15px;
      justify-content: flex-end;
    }
    .btn-save {
      background: #28a745;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-save:hover:not(:disabled) {
      background: #218838;
    }
    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-cancel {
      background: #6c757d;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1rem;
    }
    .btn-cancel:hover {
      background: #5a6268;
    }
    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EmpresaConfigComponent implements OnInit {
  private empresaService = inject(EmpresaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  config: EmpresaConfig | null = null;
  loading = true;
  saving = false;
  error = '';

  ngOnInit() {
    // Solo admin puede acceder
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/inicio']);
      return;
    }
    this.cargarConfig();
  }

  cargarConfig() {
    this.loading = true;
    this.empresaService.getConfig().subscribe({
      next: (data) => {
        this.config = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar la configuración';
        console.error(err);
        this.loading = false;
      }
    });
  }

  guardar() {
    if (!this.config) return;
    
    this.saving = true;
    this.empresaService.updateConfig(this.config).subscribe({
      next: (response) => {
        this.saving = false;
        alert('✅ Configuración guardada correctamente');
        this.cargarConfig(); // Recargar
      },
      error: (err) => {
        this.saving = false;
        alert('❌ Error al guardar la configuración');
        console.error(err);
      }
    });
  }

  cancelar() {
    this.cargarConfig(); // Restaurar valores originales
  }

  volver() {
    this.router.navigate(['/inicio']);
  }
}