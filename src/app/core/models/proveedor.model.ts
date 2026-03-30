// src/app/core/models/proveedor.model.ts
export interface Proveedor {
  id_proveedor: number;
  id_persona: number;
  razon_social: string;
  activo: boolean;
  fecha_registro: string;
  
  // Datos de persona (JOIN)
  nombre_completo: string;
  tipo_documento: string;
  numero_documento: string;
  telefono?: string;
  direccion?: string;
}

export interface ProveedorCreate {
  // Datos de persona
  tipo_documento: string;
  numero_documento: string;
  nombre_completo: string;
  telefono?: string;
  direccion?: string;
  
  // Datos de proveedor
  razon_social: string;
  activo?: boolean;
}

export interface ProveedorUpdate {
  // Datos de persona (opcionales para edición)
  nombre_completo?: string;
  telefono?: string;
  direccion?: string;
  
  // Datos de proveedor (opcionales para edición)
  razon_social?: string;
  activo?: boolean;
}