// src/app/core/models/insumo.model.ts
export interface Insumo {
  id_insumo: number;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  costo_promedio: number;
  id_proveedor_principal?: number;
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  
  // Datos de relaciones (populados por el backend)
  proveedor_principal?: {
    razon_social: string;
  };
}

export interface InsumoCreate {
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  stock_minimo: number;
  costo_promedio: number;
  id_proveedor_principal?: number;
}

export interface InsumoUpdate {
  nombre?: string;
  descripcion?: string;
  unidad_medida?: string;
  stock_minimo?: number;
  costo_promedio?: number;
  id_proveedor_principal?: number;
  activo?: boolean;
}