// src/app/core/services/produccion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RecetaItem {
  id_receta: number;
  id_insumo: number;
  cantidad_necesaria: number;
  insumo_nombre: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  costo_promedio: number;
}

export interface VerificacionProduccion {
  disponible: boolean;
  insumosFaltantes: Array<{
    id_insumo: number;
    nombre: string;
    unidad: string;
    necesarios: number;
    disponibles: number;
    faltante: number;
    costo_unitario: number;
  }>;
  resumen: {
    producto_id: number;
    cantidad_producir: number;
    total_insumos: number;
    insumos_suficientes: number;
  };
  receta: Array<{
    id_insumo: number;
    nombre: string;
    unidad: string;
    cantidad_por_unidad: number;
    cantidad_total: number;
    stock_actual: number;
  }>;
}

export interface ProduccionResponse {
  success: boolean;
  message: string;
  produccion: {
    id_producto: number;
    nombre_producto: string;
    cantidad_producida: number;
    numero_lote: string;
    fecha_caducidad: string;
    fecha_produccion: string;
    costo_total: number;
    costo_unitario: number;
  };
  insumos_consumidos: Array<{
    id_insumo: number;
    nombre: string;
    cantidad: number;
    costo_unitario: number;
    subtotal: number;
  }>;
  stock_actual_producto: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProduccionService {
  private apiUrl = `${environment.apiUrl}/produccion`;

  constructor(private http: HttpClient) {}

  getReceta(id_producto: number): Observable<RecetaItem[]> {
    return this.http.get<RecetaItem[]>(`${this.apiUrl}/receta/${id_producto}`);
  }

  verificarDisponibilidad(id_producto: number, cantidad_producir: number): Observable<VerificacionProduccion> {
    return this.http.post<VerificacionProduccion>(`${this.apiUrl}/verificar`, {
      id_producto,
      cantidad_producir
    });
  }

  ejecutarProduccion(id_producto: number, cantidad_producir: number, descripcion?: string): Observable<ProduccionResponse> {
    return this.http.post<ProduccionResponse>(`${this.apiUrl}/ejecutar`, {
      id_producto,
      cantidad_producir,
      descripcion
    });
  }

  getHistorial(limite: number = 50, pagina: number = 1): Observable<any> {
    return this.http.get(`${this.apiUrl}/historial`, {
      params: {
        limite: limite.toString(),
        pagina: pagina.toString()
      }
    });
  }

  getCostosProduccion(id_producto?: number, fecha_inicio?: string, fecha_fin?: string): Observable<any[]> {
    let params: any = {};
    if (id_producto) params.id_producto = id_producto;
    if (fecha_inicio) params.fecha_inicio = fecha_inicio;
    if (fecha_fin) params.fecha_fin = fecha_fin;
    
    return this.http.get<any[]>(`${this.apiUrl}/costos`, { params });
  }
}