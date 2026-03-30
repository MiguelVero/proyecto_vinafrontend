// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Usuario, Rol } from '../models/usuario.model';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    nombre: string;
    role: number;
    roleName: string;
    modulos: string[];  // Nuevo campo
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/auth`; // ✅ AHORA USA ENVIRONMENT
  
  private STORAGE_KEY = 'auth_token';
  private USER_KEY = 'auth_user';
  private LOGIN_EVENT_KEY = 'auth_login_event';
  private LOGOUT_EVENT_KEY = 'auth_logout_event';

  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Nuevo método para verificar acceso a módulo
// En auth.service.ts - mejorar el método
hasModuleAccess(modulo: string): boolean {
  const user = this.currentUserSubject.value;
  if (!user) return false;
  
  // Verificar tanto los módulos como el rol como fallback
  const modulos = (user as any)?.modulos as string[] | undefined;
  
  if (Array.isArray(modulos)) {
    return modulos.includes(modulo);
  }
  
  // Fallback: si no hay módulos, verificar por rol
  return this.checkAccessByRole(modulo, user);
}

private checkAccessByRole(modulo: string, user: Usuario): boolean {
  const role = (user as any).id_rol ?? (user as any).role ?? 0;
  
  // Mapear módulos por rol (como lo haces en HomeComponent)
  switch (Number(role)) {
    case 1: // Admin
      return ['usuarios', 'personas', 'clientes', 'productos', 
              'ventas_nueva', 'ventas', 'ventas_asignacion_rutas','empresa','sunat','insumos','recargas'].includes(modulo);
    case 2: // Vendedor
    // 
      return ['clientes','productos', 'ventas_nueva', 'ventas','ventas_asignacion_rutas','sunat','recargas'].includes(modulo);
    case 3: // Repartidor
      return ['rutas_asignadas', 'entregas_pendientes', 'historial_entregas'].includes(modulo);
   case 4: // Almacenero
      // Añadimos módulos específicos de almacén: lotes, proveedores, pedidos a proveedor, categorías y marcas
      return ['inventario', 'productos', 'inventario_movimiento', 'inventario_reportes',
          'lotes', 'proveedores', 'pedido_proveedor', 'categorias', 'marcas'].includes(modulo);
    default:
      return false;
  }
}
  constructor() {
    this.setupCrossTabCommunication();
    this.initializeAuth();
  }

  // 🔥 NUEVO MÉTODO AGREGADO
  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const userData = localStorage.getItem(this.USER_KEY);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('🔐 Sesión recuperada de localStorage');
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.checkToken(); // Verificar con el backend
      }
    } else if (token) {
      // Solo hay token, verificar con backend
      this.checkToken();
    } else {
      console.log('🔐 No hay sesión activa');
      this.currentUserSubject.next(null);
    }
  }

  login(nombre_usuario: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { 
      nombre_usuario, 
      password 
    }).pipe(
      tap(response => {
        this.setSession(response);
        this.broadcastLogin();
      })
    );
  }

  register(data: any) {
  return this.http.post(`${this.apiUrl}/register`, data);
}


  private setSession(response: AuthResponse): void {
    console.log('🔐 Respuesta completa del login:', response);
    localStorage.setItem(this.STORAGE_KEY, response.token);
    // Normalizar y mapear campos que provienen del backend (login puede no incluir 'modulos' ni usar las mismas claves)
    const rawUser: any = response.user as any;
    const usuario: Usuario = {
      id_usuario: rawUser.id ?? rawUser.id_usuario,
      username: rawUser.username ?? rawUser.nombre_usuario,
      nombre: rawUser.nombre ?? rawUser.nombre_completo ?? rawUser.username,
      email: rawUser.email ?? null,
      id_rol: rawUser.role ?? rawUser.id_rol,
      role: rawUser.role ?? rawUser.id_rol,
      id_persona: rawUser.id_persona ?? rawUser.id_persona ?? 0,
      activo: rawUser.activo ?? 1,
      roleName: rawUser.roleName ?? rawUser.rol ?? '',
      modulos: rawUser.modulos ?? [],
      ultimo_acceso: rawUser.ultimo_acceso ? new Date(rawUser.ultimo_acceso) : undefined,
      fecha_creacion: rawUser.fecha_creacion ? new Date(rawUser.fecha_creacion) : new Date(),
      fecha_actualizacion: rawUser.fecha_actualizacion ? new Date(rawUser.fecha_actualizacion) : new Date()
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
    this.currentUserSubject.next(usuario);
    console.log('🔐 Sesión iniciada y guardada (normalizada)');

    // Llamar a checkToken para obtener la versión completa del usuario (incluyendo 'modulos')
    // especialmente porque el endpoint /login no siempre incluye 'modulos'.
    setTimeout(() => this.checkToken(), 100);
  }

    // Normaliza cualquier objeto user que venga del backend a la interfaz Usuario usada internamente
    private normalizeUser(rawUser: any): Usuario {
      return {
        id_usuario: rawUser.id_usuario ?? rawUser.id ?? 0,
        username: rawUser.username ?? rawUser.nombre_usuario ?? '',
        nombre: rawUser.nombre ?? rawUser.nombre_completo ?? rawUser.username ?? '',
        email: rawUser.email ?? null,
        id_rol: rawUser.id_rol ?? rawUser.role ?? 0,
        role: rawUser.role ?? rawUser.id_rol ?? 0,
        id_persona: rawUser.id_persona ?? 0,
        activo: rawUser.activo ?? 1,
        roleName: rawUser.roleName ?? rawUser.rol ?? '',
        modulos: rawUser.modulos ?? [],
        ultimo_acceso: rawUser.ultimo_acceso ? new Date(rawUser.ultimo_acceso) : undefined,
        fecha_creacion: rawUser.fecha_creacion ? new Date(rawUser.fecha_creacion) : new Date(),
        fecha_actualizacion: rawUser.fecha_actualizacion ? new Date(rawUser.fecha_actualizacion) : new Date()
      };
    }

  public logout(): void {
    this.clearSession();
    this.broadcastLogout();
  }

  private clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    console.log('🔐 Sesión cerrada');
  }

  public getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  // ... el resto de tus métodos existentes se mantienen igual
  private setupCrossTabCommunication(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      console.log('🔄 Evento storage detectado:', event.key, event.newValue);
      
      if (event.key === this.LOGIN_EVENT_KEY && event.newValue) {
        // Login en otra pestaña
        console.log('🔐 Login detectado en otra pestaña');
        this.handleCrossTabLogin();
      } else if (event.key === this.LOGOUT_EVENT_KEY && event.newValue === 'true') {
        // Logout en otra pestaña
        console.log('🔐 Logout detectado en otra pestaña');
        this.clearSession();
        localStorage.removeItem(this.LOGOUT_EVENT_KEY);
      } else if (event.key === this.STORAGE_KEY) {
        // Token cambiado manualmente
        if (event.newValue) {
          console.log('🔐 Token actualizado en otra pestaña');
          setTimeout(() => this.checkToken(), 100);
        } else {
          console.log('🔐 Token removido en otra pestaña');
          this.clearSession();
        }
      }
    });

    // También escuchar eventos de visibilidad de página
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Pestaña se hizo visible, verificar estado
        console.log('👀 Pestaña visible - Verificando autenticación');
        this.checkToken();
      }
    });
  }

  private handleCrossTabLogin(): void {
    const token = this.getToken();
    const userData = localStorage.getItem(this.USER_KEY);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('🔐 Sesión sincronizada desde otra pestaña');
      } catch (error) {
        console.error('Error sincronizando sesión:', error);
        this.checkToken();
      }
    } else {
      console.log('🔐 No hay sesión para sincronizar');
    }
    
    localStorage.removeItem(this.LOGIN_EVENT_KEY);
  }

  private broadcastLogin(): void {
    // Notificar a otras pestañas del login
    localStorage.setItem(this.LOGIN_EVENT_KEY, Date.now().toString());
    setTimeout(() => {
      localStorage.removeItem(this.LOGIN_EVENT_KEY);
    }, 1000);
  }

  private broadcastLogout(): void {
    // Notificar a otras pestañas del logout
    localStorage.setItem(this.LOGOUT_EVENT_KEY, 'true');
    setTimeout(() => {
      localStorage.removeItem(this.LOGOUT_EVENT_KEY);
    }, 1000);
  }

  checkToken(): void {
    const token = this.getToken();
    if (token) {
      this.http.get<{valid: boolean, user: Usuario}>(`${this.apiUrl}/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          if (response.valid) {
            // Normalizar la respuesta del backend antes de guardarla
            const normalized = this.normalizeUser(response.user as any);
            localStorage.setItem(this.USER_KEY, JSON.stringify(normalized));
            this.currentUserSubject.next(normalized);
          } else {
            this.clearSession();
          }
        },
        error: () => this.clearSession()
      });
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  hasRole(role: number): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    const actual = (user as any).id_rol ?? (user as any).role ?? 0;
    return Number(actual) === Number(role);
  }

  isAdmin(): boolean {
    return this.hasRole(1);
  }

  isVendedor(): boolean {
    return this.hasRole(2);
  }
}