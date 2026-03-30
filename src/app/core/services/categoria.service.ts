// src/app/core/services/categoria.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Categoria, CategoriaCreate, CategoriaUpdate } from '../models/categoria.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('CategoriaService error:', error);
    let message = 'Error en el servidor';
    
    if (error.status === 0) {
      message = 'No se puede conectar al servidor';
    } else if (error.error?.message) {
      message = error.error.message;
    } else if (error.status === 409) {
      message = 'Ya existe una categoría con este nombre';
    } else if (error.status === 404) {
      message = 'Categoría no encontrada';
    }
    
    return throwError(() => new Error(message));
  }

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getCategoriaById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createCategoria(payload: CategoriaCreate): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  updateCategoria(id: number, payload: CategoriaUpdate): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
  }

  deleteCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }
}