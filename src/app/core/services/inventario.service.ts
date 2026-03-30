// inventario.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private apiUrl = `${environment.apiUrl}/inventario`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }

  getReporteStock(filtros: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reportes/stock`, filtros);
  }

  getProductosStockBajo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/alertas/stock-bajo`);
  }

  getLotesPorCaducar(): Observable<any> {
    return this.http.get(`${this.apiUrl}/alertas/caducidad`);
  }
  // Métodos existentes...

  getValorInventario(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/valor-total`);
  }

  getMovimientosEsteMes(): Observable<any[]> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const finMes = new Date();
    finMes.setMonth(finMes.getMonth() + 1);
    finMes.setDate(0);
    finMes.setHours(23, 59, 59, 999);
    
    return this.http.get<any[]>(`${this.apiUrl}/movimientos`, {
      params: {
        fechaInicio: inicioMes.toISOString(),
        fechaFin: finMes.toISOString()
      }
    });
  }

  getLotesProximosCaducar(dias: number = 30): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lotes-proximos-caducar`, {
      params: { dias: dias.toString() }
    });
  }
  // En inventario.service.ts - agregar estos métodos
getDistribucionCategorias(): Observable<any> {
  return this.http.get(`${this.apiUrl}/distribucion-categorias`);
}

getTendenciaMovimientos(): Observable<any> {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - 30);
  const fechaFin = new Date();
  
  return this.http.get(`${this.apiUrl}/tendencia-movimientos`, {
    params: {
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0]
    }
  });
}
}