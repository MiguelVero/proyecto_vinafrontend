# Instrucciones para Agentes IA - Frontend AguasItem

Este documento proporciona instrucciones específicas para que los agentes de IA trabajen eficientemente con este proyecto Angular.

## Arquitectura del Proyecto

### Estructura Principal
- `src/app/features/pages/`: Páginas principales de la aplicación organizadas por funcionalidad
- `src/app/components/`: Componentes reutilizables (formularios, diálogos, modales)
- `src/app/core/`: Modelos de datos y servicios principales
- `src/app/shared/`: Componentes compartidos (header, footer)
- `src/app/guards/`: Guards de autenticación y roles
- `src/app/interceptors/`: Interceptores HTTP para manejo de autenticación

### Módulos y Funcionalidades

#### 1. Módulo de Autenticación
- **Login** (`/login`): Gestión de inicio de sesión
- **Registro** (`/register`): Registro de nuevos usuarios
- Implementa guards para protección de rutas

#### 2. Módulo de Clientes
- **Lista de Clientes** (`/clientes`): Gestión de clientes
- Incluye formulario de creación/edición
- Accesible para roles: Admin(1) y Vendedor(2)

#### 3. Módulo de Productos
- **Lista de Productos** (`/productos`): Catálogo de productos
- Accesible para todos los usuarios autenticados
- Incluye gestión de inventario

#### 4. Módulo de Ventas
- **Panel de Ventas** (`/ventas`): Vista general de ventas
- **Nueva Venta** (`/ventas/nueva`): Creación de ventas
- **Detalle de Venta** (`/ventas/:id`): Vista detallada
- **Asignación de Rutas** (`/ventas/asignacion-rutas`): Solo para Admin
- Roles permitidos: Admin(1) y Vendedor(2)

#### 5. Gestión de Usuarios
- **Lista de Usuarios** (`/usuarios`): Gestión de usuarios del sistema
- Exclusivo para administradores (rol 1)
- Incluye gestión de roles y permisos

#### 6. Gestión de Personas
- **Lista de Personas** (`/personas`): Gestión general de personas
- Accesible para Admin(1) y Vendedor(2)
- Base para clientes y usuarios

### Patrones Clave
1. **Arquitectura por Características**: La aplicación está organizada en módulos por funcionalidad en `/features/pages/`
2. **Modelo de Servicios**: Los servicios en `/core/services/` manejan la lógica de negocio y comunicación con el backend
3. **Formularios**: Componentes de formulario reutilizables en `/components/` con validación personalizada

## Flujos de Desarrollo

### Servidor de Desarrollo
```bash
npm start             # Inicia el frontend en http://localhost:4200
npm run start:server  # Inicia el servidor mock en http://localhost:3000
```

### Convenciones de Código
- Usar PascalCase para nombres de componentes (ej: `ClienteFormComponent`)
- Usar camelCase para nombres de servicios y métodos
- Los modelos de datos se definen en `/core/models/` con interfaces TypeScript
- Los servicios siguen el patrón singleton y se proveen en el root

### Patrones de Integración
1. **Autenticación**: 
   - Implementada en `auth.service.ts` y `auth.interceptor.ts`
   - Usar `authGuard` para proteger rutas

2. **Manejo de Formularios**:
   - Los componentes form usan `@Input()` para recibir datos
   - Implementan validación personalizada desde `utils/validators.ts`

3. **Comunicación con Backend**:
   - Todos los servicios extienden patrones base de CRUD
   - Usar interceptores para manejo global de errores/autenticación

## Puntos de Atención
- La aplicación usa un mock server (json-server) para desarrollo
- Los formularios implementan validación personalizada para DNI y teléfono
- El sistema tiene roles de usuario que afectan la navegación
- Las rutas están protegidas con guards de autenticación y roles

## Ejemplos de Patrones

### Modelo de Datos
```typescript
// core/models/cliente.model.ts
export interface Cliente {
  id: number;
  nombre: string;
  // ...
}
```

### Servicio Típico
```typescript
// core/services/cliente.service.ts
@Injectable({ providedIn: 'root' })
export class ClienteService {
  // Implementar métodos CRUD estándar
}
```

### Componente de Formulario
```typescript
// components/cliente-form/cliente-form.component.ts
@Component({...})
export class ClienteFormComponent {
  @Input() cliente: Cliente;
  // Implementar validación y manejo de eventos
}
```