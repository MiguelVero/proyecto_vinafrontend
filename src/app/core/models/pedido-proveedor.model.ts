// src/app/core/models/pedido-proveedor.model.ts - ACTUALIZADO
export interface PedidoProveedor {
  id_pedido: number;
  id_proveedor: number;
  fecha: string;
  id_estado_pedido: number;
  total: number;
  fecha_creacion: string;
  fecha_actualizacion: string;

  // Datos del proveedor y estado
  proveedor?: {
    razon_social: string;
  };
  estado?: {
    id_estado_pedido: number;
    estado: string;
  };
  
  // NUEVO: Array de detalles con insumos
  detalles: PedidoProveedorDetalle[];
}

export interface PedidoProveedorDetalle {
  id_detalle?: number;
  id_insumo: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  insumo?: {
    nombre: string;
    unidad_medida: string;
  };
}

export interface PedidoProveedorCreate {
  id_proveedor: number;
  fecha: string;
  id_estado_pedido: number;
  detalles: Omit<PedidoProveedorDetalle, 'id_detalle' | 'subtotal' | 'insumo'>[];
}

// En src/app/core/models/pedido-proveedor.model.ts
export interface PedidoProveedorUpdate {
  id_estado_pedido?: number;
  // ✅ AGREGAR PARA PERMITIR ACTUALIZACIÓN COMPLETA
  id_proveedor?: number;
  fecha?: string;
  detalles?: Omit<PedidoProveedorDetalle, 'id_detalle' | 'subtotal' | 'insumo'>[];
}