# 🚀 Instalación Rápida - Módulo SUNAT

## 1. Verificar Estructura ✅

Los archivos ya están creados en:
```
src/app/features/pages/sunat/
```

Copia la carpeta completa en tu proyecto si es necesario.

## 2. Actualizar Rutas (app.routes.ts)

Ya está hecho. Verifica que existe:

```typescript
import { SunatPrincipalComponent } from './features/pages/sunat/pages/sunat-principal/sunat-principal.component';

export const routes: Routes = [
  // ... rutas existentes ...
  
  {
    path: 'sunat',
    component: SunatPrincipalComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'sunat', expectedRoles: [1, 2] }
  },
];
```

## 3. Verificar Dependencias

Todo usa Angular Material 20.2.11 que ya tienes:

```bash
npm list @angular/material
# Debe mostrar 20.2.11 o superior
```

## 4. Integrar en Header (Opcional)

En tu componente de navegación, agrega:

```html
<a mat-menu-item routerLink="/sunat" 
   *ngIf="authService.isAdmin() || authService.isVendedor()">
  <mat-icon>receipt</mat-icon>
  <span>Comprobantes SUNAT</span>
</a>
```

## 5. Integrar en Detalle de Venta (Recomendado)

**Paso 1**: Importar en `detalle-venta.component.ts`:

```typescript
import { SunatInfoWidgetComponent } from '../../../../sunat/components/sunat-info-widget/sunat-info-widget.component';

@Component({
  selector: 'app-detalle-venta',
  standalone: true,
  imports: [
    CommonModule,
    // ... otros imports ...
    SunatInfoWidgetComponent  // ← Agregar
  ],
  templateUrl: './detalle-venta.component.html',
  styleUrls: ['./detalle-venta.component.css']
})
export class DetalleVentaComponent {
  // ... código existente ...
}
```

**Paso 2**: Agregar en `detalle-venta.component.html`:

```html
<!-- Al final, antes del footer -->
<section class="sunat-section" *ngIf="venta">
  <app-sunat-info-widget 
    [idVenta]="venta.id_venta"
    [cliente]="venta.cliente"
    [total]="venta.total"
    [detalles]="venta.detalles">
  </app-sunat-info-widget>
</section>
```

## 6. Verificar Backend

El backend debe estar ejecutándose:

```bash
# Terminal 1: Backend (ya debe estar)
npm run start:server
# Debe estar en http://localhost:4000

# Terminal 2: Frontend (angular)
npm start
# http://localhost:4200
```

## 7. Iniciar Sesión

1. Ve a `http://localhost:4200/login`
2. Inicia sesión con tu usuario
3. Ve a `/sunat` (aparecerá en el menú si eres admin/vendedor)

## 8. Crear Primer Comprobante

**Opción A - Desde Venta**:
1. Ve a Ventas → Detalles de una venta
2. En la sección SUNAT, haz click en "Generar Comprobante"
3. Selecciona tipo (Boleta/Factura)
4. Haz click en "Generar"

**Opción B - Desde Panel SUNAT**:
1. Ve a `/sunat`
2. Verás la lista vacía inicialmente
3. Ve a una venta y genera desde allí
4. El comprobante aparecerá en la lista

## 9. Configurar SUNAT (Admin)

1. Ve a `/sunat`
2. Abre la pestaña "Configuración" (solo visible para admin)
3. Completa:
   - RUC (11 dígitos)
   - Nombre Empresa
   - Nombre Comercial
   - Dirección
   - Serie Boleta (4 dígitos)
   - Serie Factura (4 dígitos)
4. Modo Simulación: ON (por defecto)
5. Haz click en "Guardar"

## ✨ Características Listas

- ✅ Tabla de comprobantes con paginación
- ✅ Filtros (tipo, estado, cliente, fechas)
- ✅ Estadísticas en tarjetas
- ✅ Badges de colores por estado
- ✅ Ver detalle con XML y respuesta SUNAT
- ✅ Descargar XML
- ✅ Reintentar envío
- ✅ Generar desde venta
- ✅ Configuración SUNAT (admin)
- ✅ Modo simulación

## 🔍 Testing Rápido

### Verificar que funciona

1. Abre la consola del navegador (F12)
2. Ve a `/sunat`
3. Deberías ver:
   - Cards de estadísticas
   - Tabla de comprobantes (vacía inicialmente)
   - Filtros disponibles

### Generar primer comprobante

1. Ve a Ventas → Detalle de venta
2. Haz scroll hasta la sección SUNAT
3. Haz click en "Generar Comprobante"
4. Selecciona tipo
5. Haz click en "Generar Comprobante"
6. Deberías ver: "✅ Comprobante generado exitosamente"

### Ver en lista

1. Ve a `/sunat`
2. El comprobante debe aparecer en la tabla
3. Verifica el estado (GENERADO, PENDIENTE, etc.)

## 📱 Arquitectura

```
App
├── Header
│   └── Link a /sunat
├── Rutas
│   ├── /ventas/:id
│   │   └── SunatInfoWidget
│   └── /sunat
│       └── SunatPrincipalComponent
│           ├── Tab: Comprobantes
│           │   └── ComprobantesListComponent
│           └── Tab: Configuración (Admin)
│               └── ConfiguracionSunatComponent
```

## 🔧 Endpoints Usados

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/sunat/generar-comprobante/:idVenta` | Crear comprobante |
| POST | `/sunat/enviar/:idComprobante` | Enviar a SUNAT |
| GET | `/sunat/:idComprobante` | Obtener detalle |
| GET | `/sunat` | Listar comprobantes |
| GET | `/sunat/:idComprobante/descargar` | Descargar XML |
| POST | `/sunat/:idComprobante/reintentar` | Reintentar envío |
| GET | `/sunat/configuracion/datos` | Obtener config |
| PATCH | `/sunat/configuracion/actualizar` | Guardar config |

## 📋 Checklist Final

- [ ] Carpeta `/sunat` copiada
- [ ] Rutas actualizadas en `app.routes.ts`
- [ ] Backend ejecutándose en `localhost:4000`
- [ ] Frontend ejecutándose en `localhost:4200`
- [ ] Navegación actualizada (opcional)
- [ ] Widget integrado en detalle de venta (recomendado)
- [ ] Primera sesión iniciada
- [ ] Primera configuración SUNAT guardada
- [ ] Primer comprobante generado

## ❓ Si algo no funciona

1. **Revisa la consola** (F12):
   ```javascript
   // Verifica los errores HTTP
   // Busca "Error cargando comprobantes"
   ```

2. **Verifica el backend**:
   ```bash
   curl http://localhost:4000/api/sunat/
   # Debe retornar un JSON con comprobantes
   ```

3. **Verifica el token JWT**:
   ```javascript
   // En consola
   localStorage.getItem('auth_token')
   // Debe haber un token válido
   ```

4. **Revisa los permisos**:
   ```javascript
   // En consola
   // Debes ser admin (id_rol=1) o vendedor (id_rol=2)
   localStorage.getItem('auth_user')
   ```

---

**¡Listo! El módulo SUNAT está instalado y funcional 🎉**

Para más detalles, revisa `README.md` y `FAQ.md` en la carpeta `/sunat`.
