// src/app/core/models/produccion.model.ts
export interface Receta {
  id_receta: number;
  id_producto: number;
  id_insumo: number;
  cantidad_necesaria: number;
  activo: boolean;
  insumo?: {
    nombre: string;
    unidad_medida: string;
    stock_actual: number;
    costo_promedio: number;
  };
}

export interface Produccion {
  id_produccion: number;
  id_producto: number;
  cantidad_producida: number;
  numero_lote: string;
  fecha_produccion: string;
  id_usuario: number;
  descripcion?: string;
  producto?: {
    nombre: string;
    precio: number;
  };
  usuario?: {
    nombre_usuario: string;
    nombre_completo: string;
  };
}

export interface CostoProduccion {
  id_produccion: number;
  fecha_produccion: string;
  numero_lote: string;
  cantidad_producida: number;
  producto: string;
  costo_total: number;
  costo_unitario: number;
}