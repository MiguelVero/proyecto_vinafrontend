import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('UsuarioService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`).pipe(
      catchError(this.handleError)
    );
  }

  getUser(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createUser(payload: any) {
    return this.http.post(`${this.apiUrl}/usuarios`, payload).pipe(
      catchError(this.handleError)
    );
  }

  updateRole(id: number, id_rol: number) {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/rol`, { id_rol }).pipe(
      catchError(this.handleError)
    );
  }

  toggleActive(id: number, activo: boolean) {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/activo`, { activo: activo ? 1 : 0 }).pipe(
      catchError(this.handleError)
    );
  }

  changePassword(id: number, payload: any) {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/password`, payload).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener personas disponibles para asignar usuario (endpoint del backend)
  getPersonasDisponibles() {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/personas-disponibles`).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number) {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`).pipe(
      catchError(this.handleError)
    );
  }
  // En usuario.service.ts - agregar este método
updateUser(id: number, payload: any) {
  return this.http.patch(`${this.apiUrl}/usuarios/${id}`, payload).pipe(
    catchError(this.handleError)
  );
}
}
