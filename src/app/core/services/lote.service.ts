// src/app/core/services/lote.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Lote, LoteCreate, LoteUpdate } from '../models/lote.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class LoteService {
  private apiUrl = `${environment.apiUrl}/lotes`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('LoteService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getLotes(): Observable<Lote[]> {
    return this.http.get<Lote[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getLoteById(id: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createLote(payload: LoteCreate): Observable<Lote> {
    return this.http.post<Lote>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateLote(id: number, payload: LoteUpdate): Observable<Lote> {
    return this.http.put<Lote>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteLote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
}
