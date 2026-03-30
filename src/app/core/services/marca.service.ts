// src/app/core/services/marca.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Marca, MarcaCreate, MarcaUpdate } from '../models/marca.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class MarcaService {
  private apiUrl = `${environment.apiUrl}/marcas`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('MarcaService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getMarcas(): Observable<Marca[]> {
    return this.http.get<Marca[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getMarcaById(id: number): Observable<Marca> {
    return this.http.get<Marca>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createMarca(payload: MarcaCreate): Observable<Marca> {
    return this.http.post<Marca>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateMarca(id: number, payload: MarcaUpdate): Observable<Marca> {
    return this.http.put<Marca>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteMarca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
}
