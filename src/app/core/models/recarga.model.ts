// frontend_dsi6/src/app/core/models/recarga.model.ts
export interface Recarga {
  id_recarga?: number;
  id_cliente: number;
  id_producto: number;
  cantidad: number;
  total: number;
  id_metodo_pago: number;
  fecha: string;
  hora: string;
  estado: 'PAGADO' | 'PENDIENTE' | 'CANCELADO';
  notas?: string;
  telefono_cliente?: string;
  metodo_pago_texto?: string;
  yape_enviado?: boolean;
  yape_confirmado?: boolean;
  fecha_confirmacion?: string;
}

export interface RecargaCreate {
  id_cliente: number;
  id_producto: number;
  cantidad: number;
  total: number;
  id_metodo_pago: number;
  notas?: string;
}

export interface RecargaResponse {
  success: boolean;
  recarga: Recarga;
  mensaje?: string;
  yape_qr?: string;
  yape_phone?: string;
}