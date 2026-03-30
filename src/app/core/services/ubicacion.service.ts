import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, catchError } from 'rxjs';
import { Country, Department, Province, District } from '../models/cliente.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private apiUrl = `${environment.apiUrl}/api/ubicacion`;

  constructor(private http: HttpClient) { }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  getPaises(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.apiUrl}/paises`).pipe(
      catchError(this.handleError)
    );
  }

  getDepartamentosByPais(paisId: number): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departamentos/${paisId}`).pipe(
      catchError(this.handleError)
    );
  }

  getProvinciasByDepartamento(departamentoId: number): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provincias/${departamentoId}`).pipe(
      catchError(this.handleError)
    );
  }

  getDistritosByProvincia(provinciaId: number): Observable<District[]> {
    return this.http.get<District[]>(`${this.apiUrl}/distritos/${provinciaId}`).pipe(
      catchError(this.handleError)
    );
  }
}