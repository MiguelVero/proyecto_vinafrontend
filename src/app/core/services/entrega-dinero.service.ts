// src/app/core/services/entrega-dinero.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
// Interfaces actualizadas
export interface HistorialEntregasResponse {
  success: boolean;
  data: {
    entregas: any[];
    estadisticas?: {
      total_entregas: number;
      monto_total: number;
      primera_entrega?: string;
      ultima_entrega?: string;
    };
    total_registros: number;
  };
}

export interface TotalEntregadoResponse {
  success: boolean;
  data: {
    hoy: {
      total: number;
      entregas: number;
      metodos: string[];
    };
    semana: {
      total: number;
      entregas: number;
    };
    mes: {
      total: number;
      entregas: number;
    };
  };
}

export interface RegistrarEntregaResponse {
  success: boolean;
  message: string;
  data: {
    id_entrega: number;
    total: number;
    metodo_entrega: string;
    fecha_entrega: string;
    fecha_entrega_local?: string;
    estado: string;
    repartidor: {
      id: number;
      nombre: string;
    };
  };
}

export interface DineroPendienteTotalResponse {
  success: boolean;
  data: {
    total_pendiente: number;
    ventas_pendientes: number;
    ventas_por_dia: any[];
    detalle_ventas: any[];
  };
}

export interface RegularizarPendienteResponse {
  success: boolean;
  message: string;
  data: {
    id_entrega: number;
    fecha: string;
    total: number;
    metodo_entrega: string;
  };
}

export interface RegistrarEntregaConVentasResponse {
  success: boolean;
  message: string;
  data: {
    id_entrega: number;
    total: number;
    metodo_entrega: string;
    fecha_entrega: string;
    fecha_entrega_local?: string;
    estado: string;
    tipo_entrega: string;
    ventas_asociadas: number;
    repartidor: {
      id: number;
      nombre: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class EntregaDineroService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/entregas-dinero`;

  constructor() {
    console.log('💰 EntregaDineroService inicializado');
  }

  /**
   * Registrar entrega de dinero al administrador (solo ventas de hoy)
   */
  registrarEntrega(total: number, metodoEntrega: string = 'efectivo'): Observable<RegistrarEntregaResponse> {
    console.log(`💰 Registrando entrega de dinero: S/ ${total} - Método: ${metodoEntrega}`);
    
    const payload = {
      total: total,
      metodo_entrega: metodoEntrega
    };

    return this.http.post<RegistrarEntregaResponse>(`${this.apiUrl}/registrar`, payload).pipe(
      tap(response => {
        console.log('✅ Entrega de dinero registrada:', response);
      }),
      catchError(error => {
        console.error('❌ Error registrando entrega de dinero:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Registrar entrega de dinero incluyendo ventas específicas
   */
  registrarEntregaConVentasEspecificas(
    total: number, 
    metodoEntrega: string = 'efectivo', 
    ventasIds: number[],
    tipoEntrega: string = 'hoy', // 'hoy', 'mixta', 'completa_anterior', 'mixta_completa'
    fechaRegularizacion?: string
  ): Observable<RegistrarEntregaConVentasResponse> {
    console.log(`💰 Registrando entrega tipo "${tipoEntrega}" con ${ventasIds.length} ventas específicas`);
    
    const payload = {
      total: total,
      metodo_entrega: metodoEntrega,
      ventas_ids: ventasIds,
      tipo_entrega: tipoEntrega,
      fecha_regularizacion: fechaRegularizacion
    };

    return this.http.post<RegistrarEntregaConVentasResponse>(`${this.apiUrl}/registrar-con-ventas`, payload).pipe(
      tap(response => {
        console.log(`✅ Entrega tipo "${tipoEntrega}" registrada:`, response);
      }),
      catchError(error => {
        console.error(`❌ Error registrando entrega tipo "${tipoEntrega}":`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener historial de entregas de dinero
   */
  getHistorialEntregas(): Observable<HistorialEntregasResponse> {
    console.log('📋 Solicitando historial de entregas de dinero...');
    
    return this.http.get<HistorialEntregasResponse>(`${this.apiUrl}/historial`).pipe(
      tap(response => {
        console.log(`✅ Historial recibido: ${response.data?.entregas?.length || 0} registros`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo historial de entregas:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener total entregado al administrador (hoy)
   */
  getTotalEntregadoAlAdmin(): Observable<TotalEntregadoResponse> {
    console.log('💰 Solicitando total entregado al admin...');
    
    return this.http.get<TotalEntregadoResponse>(`${this.apiUrl}/total-entregado`).pipe(
      tap(response => {
        console.log(`✅ Total entregado recibido: S/ ${response.data?.hoy?.total || 0}`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo total entregado:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener dinero pendiente de entrega (para el día actual)
   */
  getDineroPendiente(): Observable<{ success: boolean; data: { pendiente: number; ventas_pendientes: number } }> {
    console.log('💰 Solicitando dinero pendiente...');
    
    return this.http.get<{ success: boolean; data: { pendiente: number; ventas_pendientes: number } }>(
      `${this.apiUrl}/pendiente`
    ).pipe(
      tap(response => {
        console.log(`✅ Dinero pendiente: S/ ${response.data?.pendiente || 0}`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo dinero pendiente:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener resumen de entregas de dinero por fecha
   */
  getResumenPorFechas(fechaInicio: string, fechaFin: string): Observable<any[]> {
    console.log(`📊 Solicitando resumen de entregas: ${fechaInicio} a ${fechaFin}`);
    
    return this.http.get<any[]>(`${this.apiUrl}/resumen`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    }).pipe(
      tap(resumen => {
        console.log(`✅ Resumen recibido: ${resumen?.length || 0} días`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo resumen:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener dinero realmente pendiente (ventas pagadas - entregas ya registradas)
   */
  getDineroRealmentePendiente(): Observable<{ pendiente: number, ventas_pendientes: number }> {
    console.log('💰 Solicitando dinero realmente pendiente...');
    
    return this.http.get<{ pendiente: number, ventas_pendientes: number }>(
      `${this.apiUrl}/dinero-realmente-pendiente`
    ).pipe(
      tap(response => {
        console.log(`✅ Dinero realmente pendiente: S/ ${response.pendiente}`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo dinero pendiente:', error);
        return throwError(() => error);
      })
    );
  }

  getEntregasHoy(): Observable<{success: boolean, data: {total_entregado: number, entregas: any[]}}> {
    const hoy = new Date().toISOString().split('T')[0];
    
    return this.http.get<{success: boolean, data: {total_entregado: number, entregas: any[]}}>(
      `${this.apiUrl}/entregas-hoy`
    ).pipe(
      tap(response => {
        if (response.success) {
          console.log(`💰 Entregas hoy: S/ ${response.data?.total_entregado || 0}`);
        }
      }),
      catchError(error => {
        if (error.status === 401) {
          console.warn('⚠️ No autorizado para obtener entregas hoy');
        } else {
          console.error('❌ Error obteniendo entregas de hoy:', error);
        }
        return of({
          success: false,
          data: {
            total_entregado: 0,
            entregas: []
          }
        });
      })
    );
  }

  getEntregasPorFecha(fecha: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/por-fecha`, {
      params: { fecha: fecha }
    }).pipe(
      tap(entregas => {
        console.log(`📅 Entregas para ${fecha}: ${entregas?.length || 0}`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo entregas por fecha:', error);
        return throwError(() => error);
      })
    );
  }

  getDineroPendienteHoy(): Observable<{ pendiente: number, ventas_pendientes: number }> {
    console.log('💰 Solicitando dinero pendiente de HOY...');
    
    return this.http.get<{ pendiente: number, ventas_pendientes: number }>(
      `${this.apiUrl}/pendiente-hoy`
    ).pipe(
      tap(response => {
        console.log(`✅ Dinero pendiente HOY: S/ ${response.pendiente}`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo dinero pendiente hoy:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener TODO el dinero pendiente (de todos los días)
   */
  getDineroPendienteTotal(): Observable<DineroPendienteTotalResponse> {
    console.log('💰 Solicitando dinero pendiente total...');
    
    return this.http.get<DineroPendienteTotalResponse>(`${this.apiUrl}/dinero-pendiente-total`).pipe(
      tap(response => {
        console.log(`✅ Dinero pendiente total: S/ ${response.data?.total_pendiente || 0}`);
      }),
      catchError(error => {
        console.error('❌ Error obteniendo dinero pendiente total:', error);
        if (error.status === 401) {
          console.warn('⚠️ No autorizado para obtener dinero pendiente total');
          return of({
            success: false,
            data: {
              total_pendiente: 0,
              ventas_pendientes: 0,
              ventas_por_dia: [],
              detalle_ventas: []
            }
          });
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Regularizar entregas pendientes de días anteriores
   */
  regularizarPendiente(fecha: string, montoTotal: number, metodoEntrega: string = 'efectivo', ventasIds: number[] = []): Observable<RegularizarPendienteResponse> {
    console.log(`🔄 Regularizando entrega pendiente para fecha ${fecha} - Monto: ${montoTotal}`);
    
    const payload = {
      fecha: fecha,
      monto_total: montoTotal,
      metodo_entrega: metodoEntrega,
      ventas_ids: ventasIds
    };

    return this.http.post<RegularizarPendienteResponse>(`${this.apiUrl}/regularizar-pendiente`, payload).pipe(
      tap(response => {
        console.log('✅ Entrega pendiente regularizada:', response);
      }),
      catchError(error => {
        console.error('❌ Error regularizando entrega pendiente:', error);
        return throwError(() => error);
      })
    );
  }
}