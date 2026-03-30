// pedido-proveedor.service.ts - ACTUALIZADO PARA NUEVA ESTRUCTURA
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PedidoProveedor, PedidoProveedorCreate, PedidoProveedorUpdate } from '../models/pedido-proveedor.model';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class PedidoProveedorService {
  private apiUrl = `${environment.apiUrl}/pedidos-proveedor`;

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    console.error('PedidoProveedorService error:', error);
    let message = 'Error en el servidor';
    if (error.status === 0) message = 'No se puede conectar al servidor';
    else if (error.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }

  getPedidos(): Observable<PedidoProveedor[]> {
    return this.http.get<PedidoProveedor[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getPedidoById(id: number): Observable<PedidoProveedor> {
    return this.http.get<PedidoProveedor>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createPedido(payload: PedidoProveedorCreate): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload).pipe(catchError(this.handleError));
  }

  // En pedido-proveedor.service.ts - ya debería estar bien, pero verifica
updatePedido(id: number, payload: PedidoProveedorUpdate): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(catchError(this.handleError));
}

  deletePedido(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  getEstadosPedido(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estados`).pipe(catchError(this.handleError));
  }
}