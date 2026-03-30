// src/app/features/pages/register/register.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  usuario: any = {
    nombre_usuario: '',
    email: '',
    password: '',
    id_rol: 2,    // 1 = Admin, 2 = Vendedor (por defecto vendedor)
    id_persona: null
  };

  loading = false;
  error: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.usuario.nombre_usuario || !this.usuario.password || !this.usuario.email) {
      this.error = 'Completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = null;

    // Llamada al backend (asegúrate de tener authService.register implementado)
    this.authService.register(this.usuario).subscribe({
      next: (res: any) => {
        this.loading = false;
        // Si quieres iniciar sesión automático después de registrar:
        // this.authService.setSession(...) o redirigir a login
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error registrando usuario';
        console.error('Error register', err);
      }
    });
  }
}
