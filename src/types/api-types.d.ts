// Tipos para la API del proyecto BCL Backend

export interface ApiResponse<T> {
  statusCode: number;
  body: string;
  headers?: {
    [key: string]: string;
  };
}

export interface CursoProf {
  tipo: string;
  profesor: string;
  curso: string;
  descripcion?: string;
  duracion?: number;
}

export interface HorarioProfesor {
  tipo: string;
  semana_profesor: string;
  dia?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

export interface ReservaClase {
  tipo: string;
  fecha_reserva: string;
  profesor?: string;
  estudiante?: string;
  curso?: string;
  estado?: string;
}

export interface CreateItemRequest {
  tipo: string;
  [key: string]: any;
}

export interface UpdateItemRequest {
  [key: string]: any;
}

export interface DeleteItemRequest {
  id: string;
}

export interface ListItemsResponse {
  items: any[];
  count: number;
}
