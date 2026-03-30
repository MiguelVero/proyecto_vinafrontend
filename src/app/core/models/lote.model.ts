// src/app/core/models/lote.model.ts
export interface Lote {
  id_lote: number;
  id_producto: number;
  numero_lote: string;
  fecha_caducidad: string; // formato 'YYYY-MM-DD'
  cantidad_inicial: number;
  cantidad_actual: number;
  fecha_creacion: string;
  activo: boolean;

  // Datos opcionales del producto (JOIN)
  producto?: {
    nombre: string;
    descripcion?: string;
    precio?: number;
     marca?: string;        // ✅ AGREGAR
    categoria?: string;     // ✅ AGREGAR
  };
}

export interface LoteCreate {
  id_producto: number;
  numero_lote: string;
  fecha_caducidad: string; // Siempre string para el backend
  cantidad_inicial: number;
}

export interface LoteUpdate {
  numero_lote?: string;
  fecha_caducidad?: string; // Siempre string para el backend
  cantidad_actual?: number;
  activo?: boolean;
}
