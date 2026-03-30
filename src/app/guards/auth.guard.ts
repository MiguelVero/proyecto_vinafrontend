// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { firstValueFrom, timeout, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already logged in -> allow
  if (authService.isLoggedIn()) return true;

  // Otherwise, trigger a token check and wait a short time for the result.
  authService.checkToken(); // dispara verificación en segundo plano

  // Esperar hasta 1000ms a que currentUser$ emita un usuario no-null
  return firstValueFrom(
    authService.currentUser$
      .pipe(
        timeout({
          each: 1000,
          with: () => of(null) // si timeout, emite null
        })
      )
  ).then(user => {
    if (user) {
      return true;
    } else {
      // No autenticado -> redirigir al login
      router.navigate(['/login']);
      return false;
    }
  }).catch(() => {
    router.navigate(['/login']);
    return false;
  });
};