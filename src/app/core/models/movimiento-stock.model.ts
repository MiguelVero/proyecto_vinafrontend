// src/app/core/models/movimiento-stock.model.ts
export interface MovimientoStock {
  id_movimiento: number;
  id_producto: number;
  tipo_movimiento: 'ingreso' | 'egreso' | 'ajuste' | 'devolucion'; // ✅ QUITAR 'venta'
  cantidad: number;
  fecha: string;
  descripcion?: string;
  id_usuario?: number;
  id_lote?: number; // ✅ NUEVO: Relación con lote
  anulado?: boolean;
  // Datos relacionados (JOIN)
  producto?: {
    nombre: string;
    stock?: number; 
  };
  usuario?: {
    id_usuario: number;
    username: string;
    nombre: string;
  };
  lote?: { // ✅ NUEVO: Info del lote
    numero_lote: string;
    fecha_caducidad: string;
  };
}

export interface MovimientoStockCreate {
  id_producto: number;
  tipo_movimiento: 'ingreso' | 'egreso' | 'ajuste' | 'devolucion'; // ✅ QUITAR 'venta'
  cantidad: number;
  descripcion?: string;
  id_usuario?: number;
  id_lote?: number; // ✅ NUEVO
}

export interface MovimientoStockUpdate {
  tipo_movimiento?: 'ingreso' | 'egreso' | 'ajuste'  | 'devolucion';
  cantidad?: number;
  descripcion?: string;
}
