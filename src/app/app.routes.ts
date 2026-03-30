// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './features/pages/login/login.component';
import { RegisterComponent } from './features/pages/register/register.component';
import { ClienteListComponent } from './features/pages/cliente-list/cliente-list.component';
import { ProductoListComponent } from './features/pages/producto-list/producto-list.component';
import { HomeComponent } from './features/pages/inicio/home.component';
import { NuevaVentaComponent } from './features/pages/ventas/nueva-venta/nueva-venta.component';
import { PanelVentasComponent } from './features/pages/ventas/panel-ventas/panel-ventas.component';
import { DetalleVentaComponent } from './features/pages/ventas/detalle-venta/detalle-venta.component';
import { AsignacionRutasComponent } from './features/pages/ventas/asignacion-rutas/asignacion-rutas.component';
import { UsuarioListComponent } from './features/pages/usuario-list/usuario-list.component';
import { PersonaListComponent } from './features/pages/persona-list/persona-list.component';
import { RepartidorListComponent } from './features/pages/repartidor-list/repartidor-list.component';
import { RutasAsignadasComponent } from './features/pages/repartidor/rutas-asignadas/rutas-asignadas.component';
import { EntregasPendientesComponent } from './features/pages/repartidor/entregas-pendientes/entregas-pendientes.component';
import { HistorialEntregasComponent } from './features/pages/repartidor/historial-entregas/historial-entregas.component';
import { DetalleVentaRepartidorComponent } from './features/pages/repartidor/detalle-venta-repartidor/detalle-venta-repartidor.component';
import { ProveedorListComponent } from './features/pages/proveedor-list/proveedor-list.component';
import { PedidoProveedorListComponent } from './features/pages/pedido-proveedor-list/pedido-proveedor-list.component';
import { CategoriaListComponent } from './features/pages/categoria-list/categoria-list.component';
import { MarcaListComponent } from './features/pages/marca-list/marca-list.component';
import { LoteListComponent } from './features/pages/lote-list/lote-list.component';
import { MovimientoStockListComponent } from './features/pages/movimiento-stock-list/movimiento-stock-list.component';
import { InventarioDashboardComponent } from './features/pages/inventario/inventario-dashboard/inventario-dashboard.component';
import { InventarioReportesComponent } from './features/pages/inventario/inventario-reportes/inventario-reportes.component';
import { InventarioUnificadoComponent } from './features/pages/inventario/inventario-unificado/inventario-unificado.component';
import { SunatPrincipalComponent } from './features/pages/sunat/pages/sunat-principal/sunat-principal.component';
//import { EmpresaConfigComponent } from './features/pages/configuracion/empresa-config/empresa-config.component';
// Guards para standalone
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { PersonalizacionComponent } from './features/pages/configuracion/personalizacion/personalizacion.component';
import { InsumoListComponent } from './features/pages/insumo-list/insumo-list.component';
import { RecargaRapidaComponent } from './components/recarga-rapida/recarga-rapida.component';
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Rutas protegidas
  { 
    path: 'inicio', 
    component: HomeComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'clientes', 
    component: ClienteListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'clientes', expectedRoles: [1, 2] }
  },
  { 
    path: 'productos',
    component: ProductoListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'productos', expectedRoles: [1, 2, 4] }
  },
  
  // Módulo de Ventas
  {
    path: 'ventas/nueva',
    component: NuevaVentaComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'ventas_nueva', expectedRoles: [1, 2] }
  },
  {
    path: 'ventas/asignacion-rutas',
    component: AsignacionRutasComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'ventas_asignacion_rutas', expectedRoles: [1, 2] }
  },
  { 
    path: 'ventas/:id', 
    component: DetalleVentaComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: [1, 2] }
  },
  {
    path: 'ventas',
    component: PanelVentasComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'ventas', expectedRoles: [1, 2] }
  }
   ,
    // Nueva ruta para recarga de bidones
  {
    path: 'recargas',
    component: RecargaRapidaComponent,
    canActivate: [authGuard],
    data: { expectedRoles: [1, 2] } // Admin y Vendedor
  },
   /**{
  path: 'configuracion/empresa',
  component: EmpresaConfigComponent,
  canActivate: [authGuard, roleGuard],
  data: { requiredModule: 'empresa', expectedRoles: [1] } // Solo admin
},**/
  
{
  path: 'configuracion/personalizacion',
  component: PersonalizacionComponent,
  canActivate: [authGuard, roleGuard],
  data: { requiredModule: 'empresa', expectedRoles: [1] } // Solo admin
},
  {
    path: 'usuarios',
    component: UsuarioListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'usuarios', expectedRoles: [1] }
  },
  {
    path: 'repartidores',
    component: RepartidorListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'repartidores', expectedRoles: [1] }
  },
  {
    path: 'personas',
    component: PersonaListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'personas', expectedRoles: [1, 2] }
  },

  // Rutas de Repartidor
  {
    path: 'repartidor/rutas-asignadas',
    component: RutasAsignadasComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'rutas_asignadas', expectedRoles: [3] }
  },
  {
    path: 'repartidor/entregas-pendientes',
    component: EntregasPendientesComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'entregas_pendientes', expectedRoles: [3] }
  },
  {
    path: 'repartidor/historial-entregas',
    component: HistorialEntregasComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'historial_entregas', expectedRoles: [3] }
  },
  {
    path: 'repartidor/venta/:id',
    component: DetalleVentaRepartidorComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: [3] }
  },

  // =============================================
  // ✅ SECCIÓN ACTUALIZADA: RUTAS DE INVENTARIO
  // =============================================

  // ✅ NUEVA RUTA PRINCIPAL: Dashboard Unificado
  {
    path: 'inventario',
    component: InventarioUnificadoComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'inventario', expectedRoles: [4] }
  },

  // ✅ RUTAS DE COMPATIBILIDAD: Acceso directo a componentes individuales
  {
    path: 'inventario/movimientos',
    component: MovimientoStockListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'inventario_movimiento', expectedRoles: [4] }
  },
  
  {
    path: 'inventario/lotes',
    component: LoteListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'lotes', expectedRoles: [4] }
  },

  // ✅ MANTENER: Dashboard individual (para compatibilidad)
  {
    path: 'inventario/dashboard',
    component: InventarioDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'inventario', expectedRoles: [4] }
  },

  // ✅ MANTENER: Rutas existentes sin cambios
  {
    path: 'inventario/reportes',
    component: InventarioReportesComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'inventario_reportes', expectedRoles: [4] }
  },
{
  path: 'insumos',
  component: InsumoListComponent,
  canActivate: [authGuard, roleGuard],
  data: { requiredModule: 'pedido_proveedor', expectedRoles: [1, 4] }
},
  // ✅ MANTENER: Rutas administrativas (sin cambios)
  {
    path: 'proveedores',
    component: ProveedorListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'proveedores', expectedRoles: [4] }
  },
  {
    path: 'pedidos-proveedor',
    component: PedidoProveedorListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'pedido_proveedor', expectedRoles: [4] }
  },
  {
    path: 'categorias',
    component: CategoriaListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'categorias', expectedRoles: [4] }
  },
  {
    path: 'marcas',
    component: MarcaListComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'marcas', expectedRoles: [4] }
  },

  // =============================================
  // ✅ NUEVA SECCIÓN: RUTAS SUNAT
  // =============================================
  
  {
    path: 'sunat',
    component: SunatPrincipalComponent,
    canActivate: [authGuard, roleGuard],
    data: { requiredModule: 'sunat', expectedRoles: [1, 2] }
  },

  { path: '**', redirectTo: '/login' }
];