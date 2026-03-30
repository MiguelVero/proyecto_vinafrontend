// src/app/core/services/repartidor.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Repartidor, RepartidorCreate, RepartidorUpdate } from '../models/repartidor.model';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class RepartidorService {
  private http = inject(HttpClient);
  // ✅ CORREGIDO: Cambiar la URL base
 private apiUrl = `${environment.apiUrl}/repartidores`;
  // Obtener todos los repartidores
  getRepartidores(): Observable<Repartidor[]> {
    return this.http.get<Repartidor[]>(this.apiUrl);
  }

  // Obtener repartidores activos
  getRepartidoresActivos(): Observable<Repartidor[]> {
    return this.http.get<Repartidor[]>(`${this.apiUrl}/activos`);
  }

  // Obtener repartidor por ID
  getRepartidorById(id: number): Observable<Repartidor> {
    return this.http.get<Repartidor>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo repartidor
  createRepartidor(repartidor: RepartidorCreate): Observable<Repartidor> {
    return this.http.post<Repartidor>(this.apiUrl, repartidor);
  }

  // Actualizar repartidor
  updateRepartidor(id: number, repartidor: RepartidorUpdate): Observable<Repartidor> {
    return this.http.put<Repartidor>(`${this.apiUrl}/${id}`, repartidor);
  }

  // Desactivar repartidor
  desactivarRepartidor(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/desactivar`, {});
  }

  // Activar repartidor
  activarRepartidor(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/activar`, {});
  }

  // Eliminar repartidor (solo si no tiene ventas asociadas)
  deleteRepartidor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}