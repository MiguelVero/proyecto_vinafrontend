// src/app/core/models/marca.model.ts
export interface Marca {
  id_marca: number;        // ← Cambiar id_marca por id para coincidir con la BD
  nombre: string;
}

export interface MarcaCreate {
  nombre: string;
}

export interface MarcaUpdate {
  nombre?: string;
}
