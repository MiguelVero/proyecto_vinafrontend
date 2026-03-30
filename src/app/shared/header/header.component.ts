import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    LogoComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  userRole: number = 0;
  modulosPermitidos: string[] = [];
  isMenuOpen: boolean = false;
  isMobile: boolean = false;
  windowWidth: number = window.innerWidth;
  
  // Para manejar menús expandibles en móvil (opcional)
  expandedMenus: { [key: string]: boolean } = {};
  
  private subscriptions: Subscription[] = [];
  private escapeKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private breakpointService: BreakpointService
  ) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.windowWidth = window.innerWidth;
    this.isMobile = this.windowWidth <= 1024;
    
    // Si cambiamos a escritorio y el menú está abierto, cerrarlo
    if (!this.isMobile && this.isMenuOpen) {
      this.closeMenu();
    }
  }

  ngOnInit() {
    // Inicializar estado móvil
    this.isMobile = this.windowWidth <= 1024;
    
    // Suscribirse al usuario actual
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // Normalizar la propiedad de rol
        const role = (user as any).id_rol ?? (user as any).role ?? 0;
        this.userRole = Number(role);

        // Si el backend no envía 'modulos', asignar por rol
        if ((user as any).modulos && Array.isArray((user as any).modulos)) {
          this.modulosPermitidos = (user as any).modulos || [];
        } else {
          // Asignar módulos por rol
          switch (Number(role)) {
            case 1: // Administrador
              this.modulosPermitidos = [
                'usuarios', 'personas', 'clientes', 'productos',
                'ventas_nueva', 'ventas', 'ventas_asignacion_rutas', 'repartidores', 'sunat'
              ];
              break;
            case 2: // Vendedor
              this.modulosPermitidos = [
                'clientes', 'productos', 'ventas_nueva', 'ventas', 'ventas_asignacion_rutas', 'sunat'
              ];
              break;
            case 3: // Repartidor
              this.modulosPermitidos = [
                'rutas_asignadas', 'entregas_pendientes', 'historial_entregas'
              ];
              break;
            case 4: // Almacenero
              this.modulosPermitidos = [
                'inventario', 'productos', 'inventario_movimiento', 'inventario_reportes',
                'lotes', 'proveedores', 'pedido_proveedor', 'categorias', 'marcas'
              ];
              break;
            default:
              this.modulosPermitidos = [];
          }
        }
      }
    });

    // Suscribirse a cambios en el breakpoint
    const breakpointSub = this.breakpointService.currentBreakpoint$.subscribe(() => {
      this.isMobile = this.breakpointService.isMobile() || this.windowWidth <= 1024;
      // Cerrar menú si se cambia a desktop
      if (!this.isMobile && this.isMenuOpen) {
        this.closeMenu();
      }
    });
    this.subscriptions.push(breakpointSub);

    // Cerrar menú al navegar
    this.closeMenuOnNavigation();
    
    // Detectar clics fuera del menú
    this.setupClickOutsideListener();
    
    // Configurar listener para tecla Escape
    this.setupEscapeKeyListener();
  }

  private setupEscapeKeyListener(): void {
    this.escapeKeyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
        event.preventDefault();
      }
    };
    
    document.addEventListener('keydown', this.escapeKeyHandler);
  }

  ngOnDestroy() {
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Asegurarse de restaurar el overflow del body
    document.body.style.overflow = '';
    
    // Remover listener de tecla Escape
    if (this.escapeKeyHandler) {
      document.removeEventListener('keydown', this.escapeKeyHandler);
    }
  }

  // Control de acceso
  tieneAcceso(modulo: string): boolean {
    return this.modulosPermitidos.includes(modulo);
  }

  tieneAccesoAGestion(): boolean {
    return this.tieneAcceso('usuarios') || 
           this.tieneAcceso('personas') || 
           this.tieneAcceso('clientes') || 
           this.tieneAcceso('repartidores');
  }

  tieneAccesoAVentas(): boolean {
    return this.tieneAcceso('ventas_nueva') || this.tieneAcceso('ventas');
  }

  tieneAccesoARutas(): boolean {
    return this.tieneAcceso('ventas_asignacion_rutas') || 
           this.tieneAcceso('rutas_asignadas');
  }

  tieneAccesoAEntregas(): boolean {
    return this.tieneAcceso('entregas_pendientes') || 
           this.tieneAcceso('historial_entregas');
  }

  tieneAccesoAInventario(): boolean {
    return this.tieneAcceso('inventario') || 
           this.tieneAcceso('inventario_movimiento') || 
           this.tieneAcceso('inventario_reportes') ||
           this.tieneAcceso('lotes') ||
           this.tieneAcceso('proveedores') ||
           this.tieneAcceso('pedido_proveedor') ||
           this.tieneAcceso('categorias') ||
           this.tieneAcceso('marcas');
  }

  // Control del menú hamburguesa
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    this.updateBodyOverflow();
    
    // Si estamos en móvil y cerrando el menú, resetear menús expandidos
    if (this.isMobile && !this.isMenuOpen) {
      this.expandedMenus = {};
    }
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.updateBodyOverflow();
    this.expandedMenus = {}; // Resetear menús expandidos
  }

  private updateBodyOverflow(): void {
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('no-scroll');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('no-scroll');
    }
  }

  private closeMenuOnNavigation(): void {
    const routerSub = this.router.events.subscribe(() => {
      if (this.isMenuOpen) {
        this.closeMenu();
      }
    });
    this.subscriptions.push(routerSub);
  }

  private setupClickOutsideListener(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const isClickInsideMenu = target.closest('.nav-links') || 
                                target.closest('.menu-toggle') ||
                                target.closest('.user-actions');
      
      if (this.isMenuOpen && !isClickInsideMenu && !target.closest('.mat-menu-panel')) {
        this.closeMenu();
      }
    });
  }

  // Métodos de navegación (todos cierran el menú)
  irAlInicio(): void {
    this.router.navigate(['/inicio']);
    this.closeMenu();
  }

  goToUsuarios(): void {
    if (this.tieneAcceso('usuarios')) {
      this.router.navigate(['/usuarios']);
      this.closeMenu();
    }
  }

  goToPersonas(): void {
    if (this.tieneAcceso('personas')) {
      this.router.navigate(['/personas']);
      this.closeMenu();
    }
  }

  goToClientes(): void {
    if (this.tieneAcceso('clientes')) {
      this.router.navigate(['/clientes']);
      this.closeMenu();
    }
  }

  goToProductos(): void {
    if (this.tieneAcceso('productos')) {
      this.router.navigate(['/productos']);
      this.closeMenu();
    }
  }

  nuevaVenta(): void {
    if (this.tieneAcceso('ventas_nueva')) {
      this.router.navigate(['/ventas/nueva']);
      this.closeMenu();
    }
  }

  goToVentas(): void {
    if (this.tieneAcceso('ventas')) {
      this.router.navigate(['/ventas']);
      this.closeMenu();
    }
  }

  goToRutas(): void {
    if (this.tieneAcceso('ventas_asignacion_rutas')) {
      this.router.navigate(['/ventas/asignacion-rutas']);
      this.closeMenu();
    }
  }

  goToRepartidores(): void {
    if (this.tieneAcceso('repartidores')) {
      this.router.navigate(['/repartidores']);
      this.closeMenu();
    }
  }

  goToRutasAsignadas(): void {
    if (this.tieneAcceso('rutas_asignadas')) {
      this.router.navigate(['/repartidor/rutas-asignadas']);
      this.closeMenu();
    }
  }

  goToEntregas(): void {
    if (this.tieneAcceso('entregas_pendientes')) {
      this.router.navigate(['/repartidor/entregas-pendientes']);
      this.closeMenu();
    }
  }

  verHistorialEntregas(): void {
    if (this.tieneAcceso('historial_entregas')) {
      this.router.navigate(['/repartidor/historial-entregas']);
      this.closeMenu();
    }
  }

  goToInventarioUnificado(): void {
    if (this.tieneAcceso('inventario')) {
      this.router.navigate(['/inventario']);
      this.closeMenu();
    }
  }

  goToInventario(): void {
    if (this.tieneAcceso('inventario')) {
      this.router.navigate(['/inventario']);
      this.closeMenu();
    }
  }

  registrarMovimiento(): void {
    if (this.tieneAcceso('inventario_movimiento')) {
      this.router.navigate(['/inventario/movimiento']);
      this.closeMenu();
    }
  }

  verReportes(): void {
    if (this.tieneAcceso('inventario_reportes')) {
      this.router.navigate(['/inventario/reportes']);
      this.closeMenu();
    }
  }

  goToProveedores(): void {
    if (this.tieneAcceso('proveedores')) {
      this.router.navigate(['/proveedores']);
      this.closeMenu();
    }
  }

  goPedidosProveedor(): void {
    if (this.tieneAcceso('pedido_proveedor')) {
      this.router.navigate(['/pedidos-proveedor']);
      this.closeMenu();
    }
  }

  goCategorias(): void {
    if (this.tieneAcceso('categorias')) {
      this.router.navigate(['/categorias']);
      this.closeMenu();
    }
  }

  goMarcas(): void {
    if (this.tieneAcceso('marcas')) {
      this.router.navigate(['/marcas']);
      this.closeMenu();
    }
  }
  /**goToConfiguracionEmpresa(): void {
  if (this.tieneAcceso('empresa')) {
    this.router.navigate(['/configuracion/empresa']);
    this.closeMenu();
  }
}**/

goToPersonalizacion(): void {
  if (this.userRole === 1) {
    this.router.navigate(['/configuracion/personalizacion']);
    this.closeMenu();
  }
}
goInsumos(): void {
  if (this.tieneAcceso('pedido_proveedor')) {
    this.router.navigate(['/insumos']);
    this.closeMenu();
  }
}
goToRecargas(): void {
  if (this.tieneAcceso('ventas_nueva')) {
    this.router.navigate(['/recargas']);
    this.closeMenu();
  }
}
isAdmin(): boolean {
  return this.userRole === 1;
}
  goToSunat(): void {
    if (this.tieneAcceso('sunat')) {
      this.router.navigate(['/sunat']);
      this.closeMenu();
    }
  }

  // Función para expandir/colapsar menús en móvil (opcional)
  toggleMobileMenu(menuKey: string): void {
    if (!this.isMobile) return;
    
    // Cerrar otros menús si está abierto
    if (!this.expandedMenus[menuKey]) {
      Object.keys(this.expandedMenus).forEach(key => {
        this.expandedMenus[key] = false;
      });
    }
    
    this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
  }

  // Autenticación
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get nombreUsuario(): string {
    return this.authService.getCurrentUser()?.nombre || '';
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}