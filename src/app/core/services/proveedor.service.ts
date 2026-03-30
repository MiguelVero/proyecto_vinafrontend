// src/app/core/services/proveedor.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Proveedor, ProveedorCreate, ProveedorUpdate } from '../models/proveedor.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private apiUrl = `${environment.apiUrl}/proveedores`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('ProveedorService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getProveedorById(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createProveedor(payload: ProveedorCreate): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateProveedor(id: number, payload: ProveedorUpdate): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteProveedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
}
