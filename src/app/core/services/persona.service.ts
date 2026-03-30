import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Persona } from '../models/persona.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class PersonaService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('PersonaService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getAll(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.apiUrl}/personas/${id}`).pipe(catchError(this.handleError));
  }

  search(term: string): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas/search?term=${encodeURIComponent(term)}`).pipe(catchError(this.handleError));
  }

  create(payload: Partial<Persona>) {
    return this.http.post(`${this.apiUrl}/personas`, payload).pipe(catchError(this.handleError));
  }

  update(id: number, payload: Partial<Persona>) {
    return this.http.put(`${this.apiUrl}/personas/${id}`, payload).pipe(catchError(this.handleError));
  }

  delete(id: number) {
    return this.http.delete(`${this.apiUrl}/personas/${id}`).pipe(catchError(this.handleError));
  }
}
