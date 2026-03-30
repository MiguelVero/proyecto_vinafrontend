// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Asegurar token/verificación rápida
  authService.checkToken();

  // Prioridad: requiredModule (si está definido -> usar control por módulos)
  const requiredModule = route.data?.['requiredModule'] as string | undefined;
  if (requiredModule) {
    if (authService.hasModuleAccess(requiredModule)) return true;
    // No tiene acceso al módulo -> redirigir al inicio
    router.navigate(['/inicio']);
    return false;
  }

  // Fallback: expectedRoles (control clásico por roles)
  const expectedRoles = route.data?.['expectedRoles'] as number[] | undefined;
  if (Array.isArray(expectedRoles) && expectedRoles.length > 0) {
    const allowed = expectedRoles.some(role => authService.hasRole(role));
    if (allowed) return true;
    router.navigate(['/inicio']);
    return false;
  }

  // Si no se define ni module ni roles se asume que la ruta solo necesita auth (permitir)
  return true;
};