// src/app/features/pages/configuracion/personalizacion/personalizacion.component.ts
import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PersonalizacionService } from '../../../../core/services/personalizacion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LogoComponent } from '../../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-personalizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  templateUrl: './personalizacion.component.html',
  styleUrls: ['./personalizacion.component.css']
})
export class PersonalizacionComponent implements OnInit {
  @ViewChild('fileInputLogin') fileInputLogin!: ElementRef;
  @ViewChild('fileInputNavbar') fileInputNavbar!: ElementRef;

  // ✅ HACER PÚBLICO PARA ACCEDER DESDE EL TEMPLATE
  public personalizacionService = inject(PersonalizacionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  config: any = {
    nombre_sistema: '',
    logo_texto: '💧',
    logo_login: '',
    logo_navbar: '',
    nombre: '',
    ruc: '',
    eslogan: '',
    direccion: '',
    telefono: '',
    email: '',
    web: ''
  };

  loading = true;
  saving = false;
  uploading = { login: false, navbar: false };
  error = '';
  success = '';

  previewLogin: string | null = null;
  previewNavbar: string | null = null;

  ngOnInit() {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/inicio']);
      return;
    }
    this.cargarConfig();
  }

  cargarConfig() {
    this.loading = true;
    this.personalizacionService.getConfig().subscribe({
      next: (data) => {
        this.config = { ...this.config, ...data };
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
    this.saving = true;
    this.error = '';
    this.success = '';

    this.personalizacionService.updateConfig(this.config).subscribe({
      next: () => {
        this.success = '✅ Configuración guardada correctamente';
        this.saving = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = '❌ Error al guardar la configuración';
        console.error(err);
        this.saving = false;
      }
    });
  }

 // En personalizacion.component.ts - MEJORAR onFileSelected
onFileSelected(event: any, tipo: 'login' | 'navbar') {
  const file = event.target.files[0];
  if (!file) return;

  // Mostrar preview local inmediatamente
  const reader = new FileReader();
  reader.onload = (e: any) => {
    if (tipo === 'login') {
      this.previewLogin = e.target.result;
    } else {
      this.previewNavbar = e.target.result;
    }
  };
  reader.readAsDataURL(file);

  this.uploading[tipo] = true;
  this.error = '';

  this.personalizacionService.uploadLogo(file, tipo).subscribe({
    next: (response) => {
      this.uploading[tipo] = false;
      this.success = `✅ Logo para ${tipo === 'login' ? 'login' : 'barra'} actualizado`;
      
      // Actualizar la configuración
      if (tipo === 'login') {
        this.config.logo_login = response.ruta;
        // Limpiar preview local después de un tiempo
        setTimeout(() => {
          this.previewLogin = null;
        }, 2000);
      } else {
        this.config.logo_navbar = response.ruta;
        setTimeout(() => {
          this.previewNavbar = null;
        }, 2000);
      }
      
      setTimeout(() => this.success = '', 3000);
      
      if (tipo === 'login') {
        this.fileInputLogin.nativeElement.value = '';
      } else {
        this.fileInputNavbar.nativeElement.value = '';
      }
    },
    error: (err) => {
      this.uploading[tipo] = false;
      this.error = err.error?.error || 'Error al subir el logo';
      console.error(err);
      
      if (tipo === 'login') {
        this.previewLogin = null;
      } else {
        this.previewNavbar = null;
      }
    }
  });
}

  cancelarPreview(tipo: 'login' | 'navbar') {
    if (tipo === 'login') {
      this.previewLogin = null;
      this.fileInputLogin.nativeElement.value = '';
    } else {
      this.previewNavbar = null;
      this.fileInputNavbar.nativeElement.value = '';
    }
  }

volver() {
  // Si el usuario vino desde configuración, volver allí
  const fromConfig = localStorage.getItem('from_configuracion');
  
  if (fromConfig) {
    localStorage.removeItem('from_configuracion');
    this.router.navigate(['/configuracion']);
  } else {
    this.router.navigate(['/inicio']);
  }
}

// AÑADE un método para establecer origen
setOrigenConfiguracion() {
  localStorage.setItem('from_configuracion', 'true');
}
}