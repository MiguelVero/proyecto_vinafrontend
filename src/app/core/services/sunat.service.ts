// frontend/src/app/core/services/sunat.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Por esta (si estás en core/services/sunat.service.ts):
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ComprobanteSunat {
  id_comprobante: number;
  id_venta: number;
  tipo: string;
  serie: string;
  numero_secuencial: number;
  estado: string;
  total: number;
  cliente_nombre: string;
  cliente_ruc?: string;    // Para FACTURA
  cliente_dni?: string;     // Para BOLETA
  cliente_documento?: string; // Documento genérico
  cliente_tipo_documento?: string; // Tipo de documento (DNI/RUC)
  fecha_envio: string;
  fecha_generacion: string;
  xml_generado?: string;
  respuesta_sunat?: any;
  serie_numero?: string;
  igv?: number; // AÑADIR ESTA LÍNEA para el modal
}

export interface EmisionResponse {
  success: boolean;
  message: string;
  data: {
    comprobante: {
      tipo: string;
      serie: string;
      correlativo: string;
      nombre: string;
      fecha_emision: string;
    };
    sunat: {
      code: string;
      description: string;
      notes: string[];
      hash: string;
      estado: string;
    };
  };
}


@Injectable({
  providedIn: 'root'
})
export class SunatService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/sunat`;

  // Emitir comprobante
  emitirComprobante(idVenta: number): Observable<EmisionResponse> {
    return this.http.post<EmisionResponse>(`${this.apiUrl}/venta/${idVenta}/emitir`, {});
  }

  // Listar comprobantes
  getComprobantes(params?: any): Observable<{success: boolean, total: number, comprobantes: ComprobanteSunat[]}> {
    return this.http.get<{success: boolean, total: number, comprobantes: ComprobanteSunat[]}>(`${this.apiUrl}/comprobantes`, { 
      params,
      headers: this.getHeaders()
    });
  }

  // Obtener un comprobante específico
  getComprobante(id: number): Observable<{success: boolean, comprobante: ComprobanteSunat}> {
    return this.http.get<{success: boolean, comprobante: ComprobanteSunat}>(`${this.apiUrl}/comprobantes/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Descargar XML
  descargarXml(idComprobante: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/comprobantes/${idComprobante}/xml`, { 
      responseType: 'blob',
      headers: this.getHeaders()
    });
  }

  // Reenviar a SUNAT
  reenviarComprobante(idComprobante: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/comprobantes/${idComprobante}/reenviar`, {}, {
      headers: this.getHeaders()
    });
  }

  // Headers con token
  private getHeaders() {
    const token = this.authService.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}