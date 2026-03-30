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

  getInsumos(): Observable<Insumo[]> {// ✅ Tipado explícito
    return this.http.get<Insumo[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getInsumoById(id: number): Observable<Insumo> {// ✅ Tipado explícito
    return this.http.get<Insumo>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createInsumo(payload: InsumoCreate): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateInsumo(id: number, payload: InsumoUpdate): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteInsumo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
}