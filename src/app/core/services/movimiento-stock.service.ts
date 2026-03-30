// src/app/core/services/movimiento-stock.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MovimientoStock, MovimientoStockCreate, MovimientoStockUpdate } from '../models/movimiento-stock.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class MovimientoStockService {
  // ✅ CORREGIDO: URL actualizada para coincidir con el backend
  private apiUrl = `${environment.apiUrl}/movimientos-stock`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('MovimientoStockService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getMovimientos(): Observable<MovimientoStock[]> {
    return this.http.get<MovimientoStock[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getMovimientoById(id: number): Observable<MovimientoStock> {
    return this.http.get<MovimientoStock>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createMovimiento(payload: MovimientoStockCreate): Observable<MovimientoStock> {
    return this.http.post<MovimientoStock>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateMovimiento(id: number, payload: MovimientoStockUpdate): Observable<MovimientoStock> {
    return this.http.put<MovimientoStock>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteMovimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
    /**anularMovimiento(id: number): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/${id}/anular`, {}).pipe(
    catchError(this.handleError)
  );
}**/

}
