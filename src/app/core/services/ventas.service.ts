// src/app/core/services/ventas.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
// ✅ Interfaces
export interface Venta {
  id_venta?: number;
  id_cliente: number;
  fecha: string;
  hora: string;
  total: number;
  id_metodo_pago: number;
  id_estado_venta: number;
  id_repartidor?: number | null;
  id_vendedor?: number | null;
  notas?: string;
  detalles: VentaDetalle[];
  tipo_comprobante?: string;
  tipo_comprobante_solicitado?: string;
  serie_comprobante?: string | null;  // 👈 Puede venir de comprobante_sunat
  numero_correlativo?: number | null; // 👈 Puede venir de comprobante_sunat
  nombre_completo?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
  metodo_pago?: string;
  vendedor?: string;
  repartidor?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  razon_social?: string;
  tipo_cliente?: string;
  tipo_documento?: string;
  numero_documento?: string;
  coordenadas?: string;
  placa_furgon?: string;
  comprobante_emitido?: number;
}

export interface VentaDetalle {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
  producto_nombre?: string;
}

export interface EstadoVenta {
  id_estado_venta: number;
  estado: string;
}

export interface SiguienteNumeroResponse {
  success: boolean;
  tipo: string;
  serie: string;
  numero_secuencial: number;
  correlativo: string;
  serie_numero: string;
}

export interface EstadisticasVentas {
  totalHoy: number;
  totalMes: number;
  totalGeneral: number;
  ventasHoy: number;
  ventasMes: number;
  ventasPorMetodoPago: {
    metodo: string;
    cantidad: number;
    total: number;
  }[];
  ventasPorDia: {
    fecha: string;
    cantidad: number;
    total: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ventas`;
  private sunatApiUrl = `${environment.apiUrl}/sunat`;

  // ✅ MÉTODOS BÁSICOS
  getVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.apiUrl);
  }

  getVentaById(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${id}`);
  }

  createVenta(venta: Venta): Observable<Venta> {
    return this.http.post<Venta>(this.apiUrl, venta);
  }

  updateEstadoVenta(id: number, id_estado_venta: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/estado`, { id_estado_venta });
  }

  getVentasPorEstado(idEstado: number): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.apiUrl}/estado/${idEstado}`);
  }

  asignarRepartidor(idVenta: number, idRepartidor: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${idVenta}/asignar-repartidor`, {
      id_repartidor: idRepartidor,
      id_estado_venta: 5
    });
  }

  cambiarEstadoVentaConRepartidor(idVenta: number, idEstado: number, idRepartidor?: number): Observable<any> {
    const body: any = { id_estado_venta: idEstado };
    if (idRepartidor) {
      body.id_repartidor = idRepartidor;
    }
    return this.http.patch(`${this.apiUrl}/${idVenta}/estado`, body);
  }

  getSiguienteNumeroComprobante(tipo: string, idCliente: number): Observable<SiguienteNumeroResponse> {
    return this.http.post<SiguienteNumeroResponse>(`${this.sunatApiUrl}/siguiente-numero`, {
      tipo: tipo,
      id_cliente: idCliente
    });
  }

  // ✅ MÉTODOS DE ESTADÍSTICAS - CORREGIDOS
  getEstadisticasVentas(): Observable<EstadisticasVentas> {
    // ✅ URL CORRECTA: /api/ventas/estadisticas/ventas
    return this.http.get<EstadisticasVentas>(`${this.apiUrl}/estadisticas/ventas`).pipe(
      catchError(error => {
        console.error('Error en getEstadisticasVentas:', error);
        // Retornar estadísticas vacías en caso de error
        return of(this.getEstadisticasVacio());
      })
    );
  }

  getTotalPagosPorDia(fecha: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-pagos-dia/${fecha}`).pipe(
      catchError(error => {
        console.error('Error en getTotalPagosPorDia:', error);
        return of(0);
      })
    );
  }

  getResumenVentasPorMetodoPago(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/resumen-metodos-pago`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    }).pipe(
      catchError(error => {
        console.error('Error en getResumenVentasPorMetodoPago:', error);
        return of([]);
      })
    );
  }
cancelarVentaConStock(idVenta: number, motivo: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/${idVenta}/cancelar-con-stock`, { motivo });
}
  // ✅ MÉTODO AUXILIAR PARA ESTADÍSTICAS VACÍAS
  private getEstadisticasVacio(): EstadisticasVentas {
    return {
      totalHoy: 0,
      totalMes: 0,
      totalGeneral: 0,
      ventasHoy: 0,
      ventasMes: 0,
      ventasPorMetodoPago: [],
      ventasPorDia: []
    };
  }

  // ✅ DATOS ESTÁTICOS
  getEstadosVenta(): EstadoVenta[] {
    return [
      { id_estado_venta: 5, estado: 'En ruta' },
      { id_estado_venta: 7, estado: 'Pagado' },
      { id_estado_venta: 8, estado: 'Cancelado' }
    ];
  }

  getMetodosPago(): any[] {
    return [
      { id_metodo_pago: 1, metodo_pago: 'Efectivo' },
      { id_metodo_pago: 2, metodo_pago: 'Yape' },
      { id_metodo_pago: 3, metodo_pago: 'Transferencia' },
      { id_metodo_pago: 4, metodo_pago: 'Tarjeta' }
    ];
  }
}