export interface Persona {
  id_persona?: number;
  tipo_documento?: 'DNI' | 'RUC' | 'CE' | string;
  numero_documento?: string | null;
  nombre_completo: string;
  telefono?: string | null;
  direccion?: string | null;
  coordenadas?: string | null;
  activo?: number | boolean;
  fecha_registro?: string;
}
