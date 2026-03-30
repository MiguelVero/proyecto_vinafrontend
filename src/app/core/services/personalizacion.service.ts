// ============================================
// SERVICIO DE PERSONALIZACIÓN - VERSIÓN CORREGIDA
// ============================================
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { EmpresaConfig } from './empresa.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonalizacionService {
  private http = inject(HttpClient);
  
  private apiUrl = `${environment.apiUrl}/empresa`;
  private backendUrl = environment.apiUrl.replace('/api', '');

  private configSignal = signal<EmpresaConfig | null>(null);
  public config = this.configSignal.asReadonly();
  
  private lastUpdate = signal<number>(Date.now());

  // Helper para construir URLs de manera consistente
  private buildLogoUrl(ruta: string | null | undefined): string {
    if (!ruta) return '';
    
    // Asegurar que la ruta no tenga barras duplicadas
    let cleanRuta = ruta;
    if (cleanRuta.startsWith('/')) {
      cleanRuta = cleanRuta.substring(1);
    }
    
    return `${this.backendUrl}/${cleanRuta}?t=${this.lastUpdate()}`;
  }

  public logoLoginUrl = computed(() => {
    const config = this.configSignal();
    return this.buildLogoUrl(config?.logo_login);
  });

  public logoNavbarUrl = computed(() => {
    const config = this.configSignal();
    return this.buildLogoUrl(config?.logo_navbar);
  });

  constructor() {
    console.log('🚀 PersonalizacionService inicializado');
    console.log('🌍 Ambiente:', environment.production ? 'PRODUCCIÓN' : 'DESARROLLO');
    console.log('🔗 API URL:', this.apiUrl);
    console.log('🔗 Backend URL:', this.backendUrl);
    
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.http.get<EmpresaConfig>(`${this.apiUrl}/config`).subscribe({
      next: (config) => {
        this.configSignal.set(config);
        this.lastUpdate.set(Date.now());
        console.log('✅ Configuración cargada:', config);
        console.log('🔍 Logo URL:', this.logoLoginUrl());
      },
      error: (error) => {
        if (error.status !== 401) {
          console.error('❌ Error al cargar configuración:', error);
        }
        this.configSignal.set({
          id_config: 1,
          nombre: 'VIÑA',
          ruc: '20605757451',
          eslogan: 'Agua de calidad',
          direccion: 'Av. Principal',
          telefono: '959203847',
          logo_url: null,
          logo_texto: '💧',
          web: 'www.aguavina.com',
          email: 'ventas@aguavina.com',
          activo: 1,
          fecha_actualizacion: new Date().toISOString(),
          nombre_sistema: 'VIÑA'
        });
        this.lastUpdate.set(Date.now());
      }
    });
  }

  getConfig(): Observable<EmpresaConfig> {
    return this.http.get<EmpresaConfig>(`${this.apiUrl}/config`).pipe(
      tap(config => {
        this.configSignal.set(config);
        this.lastUpdate.set(Date.now());
      }),
      catchError(error => {
        console.error('Error al obtener configuración:', error);
        return of({
          id_config: 1,
          nombre: 'VIÑA',
          ruc: '20605757451',
          eslogan: 'Agua de calidad',
          direccion: 'Av. Principal',
          telefono: '959203847',
          logo_url: null,
          logo_texto: '💧',
          web: 'www.aguavina.com',
          email: 'ventas@aguavina.com',
          activo: 1,
          fecha_actualizacion: new Date().toISOString(),
          nombre_sistema: 'VIÑA'
        } as EmpresaConfig);
      })
    );
  }

  updateConfig(config: Partial<EmpresaConfig>): Observable<any> {
    return this.http.put(`${this.apiUrl}/config`, config).pipe(
      tap(() => this.cargarConfiguracion())
    );
  }

// En personalizacion.service.ts - MODIFICAR uploadLogo
uploadLogo(file: File, tipo: 'login' | 'navbar'): Observable<any> {
  const formData = new FormData();
  formData.append('logo', file);
  formData.append('tipo', tipo);

  return this.http.post(`${this.apiUrl}/upload-logo`, formData).pipe(
    tap((response: any) => {
      console.log('✅ Logo subido, respuesta:', response);
      
      // Forzar recarga de configuración
      this.cargarConfiguracion();
      
      // Actualizar lastUpdate para forzar cambio en URLs
      this.lastUpdate.set(Date.now());
      
      console.log('🔄 URL actualizada:', this.logoLoginUrl());
    })
  );
}

  getLogoUrl(tipo: 'login' | 'navbar'): string {
    return tipo === 'login' ? this.logoLoginUrl() : this.logoNavbarUrl();
  }

  getNombreSistema(): string {
    return this.configSignal()?.nombre_sistema || 'VIÑA';
  }
}