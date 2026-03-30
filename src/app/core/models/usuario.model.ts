// src/app/core/models/usuario.model.ts
export interface Usuario {
  id_usuario: number;
  username: string;
  nombre: string;      
  email?: string;
  id_rol: number;
  role: number;         // Alias para id_rol para compatibilidad
  id_persona: number;
  activo: boolean;
  roleName: string;   
   modulos: string[];  // Nombre descriptivo del rol
  ultimo_acceso?: Date;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface Rol {
  id_rol: number;
  rol: string;
}

// Constantes de roles
export const ROLES = {
  ADMIN: 1,
  VENDEDOR: 2,
  REPARTIDOR: 3,
  ALMACENERO: 4
} as const;