# 🚀 REFERENCIA RÁPIDA - Comandos y Links

## 🔗 URLs Principales

```
Login:           http://localhost:4200/login
Dashboard:       http://localhost:4200/dashboard
Módulo SUNAT:    http://localhost:4200/sunat
Backend SUNAT:   http://localhost:4000/api/sunat/
Documentación:   /src/app/features/pages/sunat/README.md
```

---

## 💻 Comandos Terminal (PowerShell)

### Inicio Rápido
```powershell
# 1. Iniciar servidor Angular (puerto 4200)
npm start

# 2. Iniciar servidor backend si está en el proyecto
npm run start:server
# O manualmente: node backend/server.js

# 3. Ejecutar tests
npm test

# 4. Build para producción
npm run build
```

### Verificación Rápida
```powershell
# Ver estructura SUNAT
tree /F src/app/features/pages/sunat

# Contar líneas de código SUNAT
(Get-ChildItem -Path "src/app/features/pages/sunat" -Recurse -Include "*.ts" -File | 
 Measure-Object -Line -Sum).Sum

# Buscar en archivos SUNAT
Select-String -Path "src/app/features/pages/sunat" -Pattern "export" -Recurse

# Verificar imports en app.routes.ts
Select-String -Path "src/app/app.routes.ts" "SunatPrincipalComponent" -A5 -B5
```

### Limpieza y Reset
```powershell
# Limpiar node_modules y reinstalar
Remove-Item -Path "node_modules" -Recurse -Force
npm install

# Limpiar caché Angular
Remove-Item -Path ".angular" -Recurse -Force

# Forzar rebuild completo
npm run build -- --watch=false
```

---

## 📚 Estructura de Carpetas

```
src/app/features/pages/sunat/
├── components/                          # 6 componentes reutilizables
│   ├── comprobantes-list/              # Tabla principal con filtros
│   ├── comprobante-detail/             # Modal de detalle con 4 tabs
│   ├── configuracion-sunat/            # Formulario de admin
│   ├── estado-badge/                   # Badge de estado con color
│   ├── generar-comprobante-modal/      # Modal para generar
│   └── sunat-info-widget/              # Widget para venta-detalle
│
├── pages/                               # Página principal
│   └── sunat-principal/                # Página con tabs
│
├── services/                            # Servicios HTTP
│   └── sunat.service.ts               # 8 métodos + helpers
│
├── models/                              # Interfaces y Enums
│   └── comprobante.model.ts           # 5 interfaces + 2 enums
│
├── pipes/                               # Pipes personalizados
│   └── numero-comprobante.pipe.ts      # Formatea números
│
└── docs/                                # Documentación
    ├── README.md                        # Guía general
    ├── FAQ.md                          # 20 preguntas
    ├── EJEMPLO_COMPLETO.ts             # Ejemplos de uso
    └── SUNAT_INSTALACION_RAPIDA.md    # Quick start
```

---

## 🎨 Importar Material en Componentes

```typescript
// Template básico para nuevo componente SUNAT
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    // ... agregar más según necesites
  ],
  templateUrl: './mi-componente.component.html',
  styleUrls: ['./mi-componente.component.css']
})
export class MiComponenteComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  ngOnInit() {
    // Lógica aquí
  }
}
```

---

## 🔌 Integrar Widget SUNAT en Venta-Detalle

```typescript
// En venta-detalle.component.ts
import { SunatInfoWidgetComponent } from '../../../sunat/components/sunat-info-widget/sunat-info-widget.component';

@Component({
  selector: 'app-venta-detalle',
  standalone: true,
  imports: [
    CommonModule,
    // ... otros imports
    SunatInfoWidgetComponent  // ← Agregar aquí
  ],
  templateUrl: './venta-detalle.component.html'
})
export class VentaDetalleComponent {
  venta: any; // Tu objeto venta
}
```

```html
<!-- En venta-detalle.component.html -->
<div class="venta-container">
  <!-- Tu contenido de venta -->
  
  <!-- Widget SUNAT al final -->
  <app-sunat-info-widget 
    *ngIf="venta"
    [idVenta]="venta.id_venta"
    [cliente]="venta.cliente"
    [total]="venta.total"
    [detalles]="venta.detalles">
  </app-sunat-info-widget>
</div>
```

---

## 🔑 Enums Disponibles

```typescript
// Estados de comprobante
export enum EstadoComprobante {
  GENERADO = 'GENERADO',
  PENDIENTE = 'PENDIENTE',
  ENVIADO = 'ENVIADO',
  ACEPTADO = 'ACEPTADO',
  RECHAZADO = 'RECHAZADO',
  ERROR = 'ERROR',
  SIMULADO = 'SIMULADO'
}

// Tipos de comprobante
export enum TipoComprobante {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA'
}
```

---

## 📞 Métodos del Servicio

```typescript
// sunat.service.ts proporciona:

// 1. Generar comprobante desde venta
sunat.generarComprobanteDesdeVenta(idVenta)
  .subscribe(comprobante => { ... })

// 2. Enviar comprobante a SUNAT
sunat.enviarComprobante(idComprobante)
  .subscribe(respuesta => { ... })

// 3. Obtener detalle de comprobante
sunat.obtenerComprobante(idComprobante)
  .subscribe(detalle => { ... })

// 4. Listar con filtros
sunat.listarComprobantes({
  tipo: 'BOLETA',
  estado: 'ACEPTADO',
  fechaInicio: '2024-01-01',
  fechaFin: '2024-12-31'
}).subscribe(lista => { ... })

// 5. Descargar XML
sunat.descargarXml(idComprobante, 'nombre_archivo.xml')

// 6. Reintentar envío
sunat.reintentarEnvio(idComprobante)
  .subscribe(resultado => { ... })

// 7. Obtener configuración (admin)
sunat.obtenerConfiguracion()
  .subscribe(config => { ... })

// 8. Actualizar configuración (admin)
sunat.actualizarConfiguracion(configuracion)
  .subscribe(resultado => { ... })
```

---

## 🎨 Colores por Estado

```css
/* Copiar a tu CSS si necesitas */
.estado-generado { background-color: #e3f2fd; color: #1976d2; }
.estado-pendiente { background-color: #fff3e0; color: #f57c00; }
.estado-enviado { background-color: #f3e5f5; color: #7b1fa2; }
.estado-aceptado { background-color: #e8f5e9; color: #388e3c; }
.estado-rechazado { background-color: #ffebee; color: #d32f2f; }
.estado-error { background-color: #ffcdd2; color: #c62828; }
.estado-simulado { background-color: #f1f8e9; color: #558b2f; }
```

---

## 🧪 Test de Endpoint Backend

```typescript
// Probar en consola del navegador

// 1. Listar comprobantes
fetch('http://localhost:4000/api/sunat/', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(data => console.log(data))

// 2. Obtener uno específico
fetch('http://localhost:4000/api/sunat/1', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(data => console.log(data))

// 3. Generar comprobante
fetch('http://localhost:4000/api/sunat/generar-comprobante/1', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ tipo: 'BOLETA' })
})
.then(r => r.json())
.then(data => console.log(data))
```

---

## 📝 Patrón de Servicio (ejemplo adicional)

```typescript
// Si necesitas crear otro servicio similar
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MiServicio {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:4000/api/mi-recurso';
  
  private datosSubject = new BehaviorSubject<any[]>([]);
  datos$ = this.datosSubject.asObservable();
  
  listar(filtros?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params = params.set(key, filtros[key]);
      });
    }
    return this.http.get<any[]>(this.baseUrl, { params });
  }
  
  obtener(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
  
  crear(datos: any): Observable<any> {
    return this.http.post(this.baseUrl, datos);
  }
  
  actualizar(id: number, datos: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, datos);
  }
  
  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
```

---

## 🔐 Información de Roles

```typescript
// Roles disponibles en el sistema
export enum UserRole {
  ADMIN = 1,        // Acceso total, puede ver configuración
  VENDEDOR = 2,     // Puede ver y generar comprobantes
  REPARTIDOR = 3,   // No tiene acceso a SUNAT
  ALMACENERO = 4    // No tiene acceso a SUNAT
}

// Verificar rol
if (this.authService.hasRole([1, 2])) {
  // Usuario es admin o vendedor
}

// En rutas
data: { 
  requiredModule: 'sunat', 
  expectedRoles: [1, 2] 
}
```

---

## 🎯 Flujos Principales

### Flujo: Generar Comprobante
```
1. Usuario abre venta
   ↓
2. Click en "Generar Comprobante" (widget SUNAT)
   ↓
3. Se abre modal con tipo (Boleta/Factura)
   ↓
4. Click "Generar"
   ↓
5. POST /api/sunat/generar-comprobante/:id
   ↓
6. Retorna comprobante con estado GENERADO
   ↓
7. Widget se actualiza mostrando el comprobante
   ↓
8. Comprobante aparece en lista /sunat
```

### Flujo: Ver Detalle
```
1. Usuario abre lista en /sunat
   ↓
2. Click en fila o botón "Ver Detalle"
   ↓
3. Se abre modal con 4 tabs
   ↓
4. Tab 1: Info general (comprobante, cliente, totales)
   ↓
5. Tab 2: Timeline (pasos del proceso)
   ↓
6. Tab 3: XML (contenido formateado)
   ↓
7. Tab 4: Respuesta SUNAT (JSON de respuesta)
```

### Flujo: Admin Configura SUNAT
```
1. Admin abre /sunat
   ↓
2. Click en tab "Configuración"
   ↓
3. Completa form: RUC, Empresa, Series, etc.
   ↓
4. Toggle "Modo Simulación" si no tiene certificado
   ↓
5. Click "Guardar"
   ↓
6. PATCH /api/sunat/configuracion/actualizar
   ↓
7. Configuración guardada
   ↓
8. Success message
```

---

## 🚨 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot find module 'SunatPrincipalComponent'` | Rutas no actualizadas | Verificar import en app.routes.ts |
| `401 Unauthorized` | Token inválido o expirado | Hacer login nuevamente |
| `404 Not Found` | Endpoint backend no existe | Verificar backend en localhost:4000 |
| `Table is empty` | Sin datos en BD | Verificar datos en backend |
| `Estilos no se aplican` | Rutas CSS incorrectas | Verificar styleUrls relativos |
| `Modal no abre` | Component no en imports | Agregar a imports array |
| `Filtros no funcionan` | debounceTime mal config | Verificar RxJS operators |

---

## 💡 Tips Útiles

### Debugging
```typescript
// En consola del navegador (F12)

// Ver si el servicio está inyectado
ng.probe(document.querySelector('app-sunat-principal')).componentInstance.sunat

// Ver estado de formulario
ng.probe(document.querySelector('app-configuracion-sunat')).componentInstance.form.value

// Ver observable en tiempo real
ng.probe(document.querySelector('app-comprobantes-list')).componentInstance.comprobantes$
```

### Performance
- Tabla con 1000+ registros → Usar virtual scroll
- Filtros en tiempo real → Aumentar debounceTime a 1000ms
- Muchas suscripciones → Usar takeUntilDestroyed()

### Mejor Práctica
```typescript
// Siempre limpiar observables
private destroy$ = new Subject<void>();

ngOnInit() {
  this.sunat.comprobantes$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => { ... });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

---

## 📞 Contacto / Soporte

Si necesitas ayuda:

1. **Revisar documentación**: `/SUNAT_README.md`
2. **Ver ejemplos**: `/EJEMPLO_COMPLETO.ts`
3. **Leer FAQ**: `/FAQ.md`
4. **Quick start**: `/SUNAT_INSTALACION_RAPIDA.md`
5. **Respuestas 7 preguntas**: `/SUNAT_RESPUESTAS_7_PREGUNTAS.md`

---

## 📌 Checklist Rápido (Antes de empezar)

- [ ] Backend corriendo en `localhost:4000`
- [ ] Angular App corriendo en `localhost:4200`
- [ ] Token JWT válido en localStorage
- [ ] Carpeta `/sunat` copiada a `src/app/features/pages/`
- [ ] `app.routes.ts` actualizado con ruta SUNAT
- [ ] Sin errores en consola (F12)
- [ ] Puedo acceder a `http://localhost:4200/sunat`

---

**Referencia rápida actualizada. ¡Que disfrutes del módulo SUNAT! 🚀**
