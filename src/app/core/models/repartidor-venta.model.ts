// src/app/core/models/repartidor-venta.model.ts
export interface RepartidorVenta {
  id_venta: number;
  id_cliente: number;
  fecha: string;
  hora: string;
  total: number;
  id_estado_venta: number;
  estado: string;
  nombre_completo: string;
  telefono: string;
  direccion: string;
  coordenadas?: string;
  razon_social?: string;
    // ✅ AGREGAR ESTAS PROPIEDADES FALTANTES
  id_metodo_pago: number;  // NUEVA
  metodo_pago: string;
   tipo_comprobante_solicitado?: string; // ← AGREGAR ESTE CAMPO
  notas?: string;
  fecha_creacion: string;
  // Nuevos campos para tracking de ruta
  fecha_inicio_ruta?: string;
  fecha_fin_ruta?: string;
  ubicacion_inicio_ruta?: string;
  tracking_activo?: boolean;
  
  // Detalles de la venta
  detalles?: VentaDetalle[];
}

export interface VentaDetalle {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  producto_nombre: string;
  subtotal: number;
}