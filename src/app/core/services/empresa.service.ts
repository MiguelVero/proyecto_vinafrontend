// src/app/core/services/empresa.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface EmpresaConfig {
  id_config: number;
  nombre: string;
  ruc: string;
  eslogan: string;
  direccion: string;
  telefono: string;
  logo_url: string | null;
  logo_texto: string;
  web: string;
  email: string;
  activo: number;
  fecha_actualizacion: string;
  // Campos para personalización
  logo_login?: string | null;
  logo_navbar?: string | null;
  nombre_sistema?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/empresa`;

  getConfig(): Observable<EmpresaConfig> {
    return this.http.get<EmpresaConfig>(`${this.apiUrl}/config`);
  }

  updateConfig(config: Partial<EmpresaConfig>): Observable<any> {
    return this.http.put(`${this.apiUrl}/config`, config);
  }
}