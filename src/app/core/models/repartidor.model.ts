// src/app/core/models/repartidor.model.ts
export interface Repartidor {
  id_repartidor: number;
  id_persona: number;
  placa_furgon: string;
  activo: boolean;
  fecha_contratacion: string;
  fecha_creacion: string;
  
  // Datos de la persona (del JOIN)
  persona?: {
    nombre_completo: string;
    telefono: string;
    numero_documento: string;
    direccion?: string;
  };
}

export interface RepartidorCreate {
  id_persona: number;
  placa_furgon: string;
  activo?: boolean;
  fecha_contratacion?: string;
}

export interface RepartidorUpdate {
  placa_furgon?: string;
  activo?: boolean;
  fecha_contratacion?: string;
}