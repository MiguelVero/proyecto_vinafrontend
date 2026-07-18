// src/app/core/services/insumo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Insumo, InsumoCreate, InsumoUpdate } from '../models/insumo.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InsumoService {
  private apiUrl = `${environment.apiUrl}/insumos`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('InsumoService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  // ✅ Obtener TODOS los insumos (para gestión)
  getInsumos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  // ✅ NUEVO: Obtener SOLO insumos activos (para pedidos y producción)
  getInsumosActivos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.apiUrl}?soloActivos=true`)
      .pipe(catchError(this.handleError));
  }

  getInsumoById(id: number): Observable<Insumo> {
    return this.http.get<Insumo>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createInsumo(payload: InsumoCreate): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateInsumo(id: number, payload: InsumoUpdate): Observable<any> {
    const dataToSend = {
      nombre: payload.nombre || '',
      descripcion: payload.descripcion || '',
      unidad_medida: payload.unidad_medida || 'unidades',
      stock_minimo: payload.stock_minimo !== undefined ? payload.stock_minimo : 0,
      activo: payload.activo !== undefined ? payload.activo : true
    };
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, dataToSend)
      .pipe(catchError(this.handleError));
  }

  deleteInsumo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
}