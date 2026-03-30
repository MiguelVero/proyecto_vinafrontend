// src/app/core/models/categoria.model.ts
export interface Categoria {
  id_categoria: number;
  nombre: string;
}

export interface CategoriaCreate {
  nombre: string;
}

export interface CategoriaUpdate {
  nombre?: string;
}
