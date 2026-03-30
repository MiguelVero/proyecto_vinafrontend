// src/app/features/pages/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials = {
    nombre_usuario: '',
    password: ''
  };
  loading = false;
  error = '';

  // Método para determinar la ruta inicial según el rol
  private getDefaultRouteByRole(user: any): string {
    const role = user?.id_rol ?? user?.role ?? 0;
    
    switch (Number(role)) {
      case 1: // Administrador
        return '/ventas/nueva'; // O '/inicio' si prefieres el dashboard
      case 2: // Vendedor
        return '/ventas/nueva';
      case 3: // Repartidor
        return '/repartidor/rutas-asignadas';
      case 4: // Almacenero
        return '/inventario';
      default:
        return '/inicio';
    }
  }

  onSubmit(): void {
    if (!this.credentials.nombre_usuario || !this.credentials.password) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.credentials.nombre_usuario, this.credentials.password)
      .subscribe({
        next: (response) => {
          // Obtener el usuario del response o del servicio
          const user = response.user || this.authService.getCurrentUser();
          
          if (user) {
            const defaultRoute = this.getDefaultRouteByRole(user);
            console.log(`🔀 Redirigiendo a ruta por defecto para rol ${user.role}: ${defaultRoute}`);
            this.router.navigate([defaultRoute]);
          } else {
            // Fallback seguro
            this.router.navigate(['/inicio']);
          }
        },
        error: (error) => {
          this.error = error.error?.error || 'Error al iniciar sesión';
          this.loading = false;
          console.error('Error de login:', error);
        }
      });
  }
}