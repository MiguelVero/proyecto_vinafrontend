export interface Cliente {
  id?: number;
  tipo_documento: 'DNI' | 'RUC' | 'CE' | 'NO_ESPECIFICADO';
  dni: string;
  nombre: string;
  telefono: string;
  direccion: string;
  coordenadas?: string;
  tipo_cliente: 'Bodega' | 'Restaurante' | 'Gimnasio' | 'Persona' | 'Empresa';
  razon_social?: string;
  activo?: boolean;
  fecha_registro?: string;
}

// Mantenemos las interfaces de ubicación
export interface Country {
  id: number;
  nombre: string;
}

export interface Department {
  id: number;
  nombre: string;
  paisId: number;
}

export interface Province {
  id: number;
  nombre: string;
  departamentoId: number;
}

export interface District {
  id: number;
  nombre: string;
  provinciaId: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}