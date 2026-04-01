// frontend_dsi6/src/app/core/services/recarga.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecargaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/recargas`;
  private yapeApiUrl = `${environment.apiUrl}/yape`;

  // Registrar nueva recarga
  registrarRecarga(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

   // ✅ AGREGAR ESTE MÉTODO
  cancelarRecarga(id_venta: number, motivo: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id_venta}/cancelar`, { motivo });
  }

 // Eliminar o comentar este método ya que no se usará
// solicitarCodigoYape(id_venta: number, monto: number): Observable<any> {
//   return this.http.post(`${this.yapeApiUrl}/solicitar-codigo`, { id_venta, monto });
// }

  // Verificar estado de pago Yape (polling cada 3 segundos)
  verificarPagoYape(id_venta: number, timeoutSegundos: number = 120): Observable<any> {
    const startTime = Date.now();
    
    return interval(3000).pipe(
      switchMap(() => this.http.get(`${this.yapeApiUrl}/verificar/${id_venta}`)),
      takeWhile((response: any) => {
        // Continuar mientras no esté pagado y no haya expirado el tiempo
        const tiempoTranscurrido = (Date.now() - startTime) / 1000;
        return !response.pagado && tiempoTranscurrido < timeoutSegundos;
      }, true),
      map((response: any) => {
        const tiempoTranscurrido = (Date.now() - startTime) / 1000;
        return {
          ...response,
          timeout: tiempoTranscurrido >= 120
        };
      })
    );
  }

  // Obtener historial de recargas
  getHistorialRecargas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener recargas del día
  getRecargasHoy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/hoy`);
  }

  // Listar transacciones Yape (admin)
  getTransaccionesYape(limite: number = 50, desde: number = 0): Observable<any> {
    return this.http.get(`${this.yapeApiUrl}/transacciones`, {
      params: { limite: limite.toString(), desde: desde.toString() }
    });
  }
}