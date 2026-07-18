// pedido-proveedor-list.component.ts - VERSIÓN CORREGIDA
import { Component, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider'; // ✅ NUEVO IMPORT

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

import { PedidoProveedorService } from '../../../core/services/pedido-proveedor.service';
import { PedidoProveedorFormComponent } from '../../../components/pedido-proveedor-form/pedido-proveedor-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { PedidoProveedor } from '../../../core/models/pedido-proveedor.model';
import { PedidoDetallesModalComponent } from '../../../components/pedido-detalles-modal/pedido-detalles-modal.component';
import { FormsModule } from '@angular/forms'; // ✅ NUEVO IMPORT
@Component({
  selector: 'app-pedido-proveedor-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // ✅ AGREGADO AQUÍ
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatMenuModule,
    MatCardModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
     MatDividerModule // ✅ AGREGADO AQUÍ
  ],
  templateUrl: './pedido-proveedor-list.component.html',
  styleUrls: ['./pedido-proveedor-list.component.css']
})
// pedido-proveedor-list.component.ts - FILTROS COMPLETAMENTE CORREGIDOS
export class PedidoProveedorListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id_pedido', 'proveedor', 'fecha', 'total', 'estado', 'detalles', 'acciones'];
  dataSource = new MatTableDataSource<PedidoProveedor>([]);
  isLoading = true;
  isMobileView = false;
  
  // ✅ CORREGIDO: Propiedades para filtros
  selectedEstado: number = 0; // 0 = Todos los estados
  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;
  searchTerm: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private pedidoService: PedidoProveedorService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { 
    this.checkScreenSize();
    this.loadPedidos(); 
  }
  
  ngAfterViewInit(): void { 
    this.dataSource.paginator = this.paginator; 
    this.dataSource.sort = this.sort; 
    
    // ✅ CORREGIDO: Configurar filtro personalizado simplificado
    this.dataSource.filterPredicate = this.createFilterPredicate();
  }


  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth < 768;
  }



 // ✅ CORREGIDO: Filtro por estado único
  filterByEstado(estadoId: number): void {
    console.log('🎯 Filtrando por estado:', estadoId);
    this.selectedEstado = estadoId;
    this.applyFilterToDataSource();
  }

  // ✅ CORREGIDO: Filtro por fecha
  filterByDate(): void {
    this.applyFilterToDataSource();
  }

  // ✅ CORREGIDO: Filtro de búsqueda
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchTerm = filterValue.trim().toLowerCase();
    this.applyFilterToDataSource();
  }


 // ✅ CORREGIDO: Filtro de fechas en createFilterPredicate
// ✅ CORREGIDO: Filtro de fechas 
private createFilterPredicate() {
  return (data: PedidoProveedor, filter: string): boolean => {
    const searchTerms = JSON.parse(filter);
    const { searchTerm, estado, fechaInicio, fechaFin } = searchTerms;

    // Filtro por búsqueda textual
    if (searchTerm) {
      const matchesSearch = 
        data.id_pedido.toString().includes(searchTerm) ||
        data.proveedor?.razon_social?.toLowerCase().includes(searchTerm) ||
        data.estado?.estado?.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Filtro por estado único (0 = Todos)
    if (estado !== 0) {
      if (data.id_estado_pedido !== estado) return false;
    }

    // ✅ CORREGIDO: Filtro por fecha
    if (fechaInicio || fechaFin) {
      // La fecha viene del backend como 'YYYY-MM-DD' (sin hora)
      let fechaPedidoStr = data.fecha;
      
      // Si tiene formato ISO con T, extraer solo la fecha
      if (fechaPedidoStr.includes('T')) {
        fechaPedidoStr = fechaPedidoStr.split('T')[0];
      }
      
      const fechaPedido = new Date(fechaPedidoStr + 'T00:00:00-05:00');
      fechaPedido.setHours(0, 0, 0, 0);
      
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        inicio.setHours(0, 0, 0, 0);
        // Incluir la fecha de inicio (>=)
        if (fechaPedido < inicio) return false;
      }

      if (fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
        // Incluir la fecha de fin (<=)
        if (fechaPedido > fin) return false;
      }
    }

    return true;
  };
}


   // ✅ CORREGIDO: Aplicar filtros simplificado
  private applyFilterToDataSource(): void {
    const filterObject = {
      searchTerm: this.searchTerm,
      estado: this.selectedEstado, // ✅ Ahora es número único
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    };
    console.log('📊 Aplicando filtros:', filterObject);
    this.dataSource.filter = JSON.stringify(filterObject);
    
    // Debug: mostrar resultados
    setTimeout(() => {
      console.log('📋 Resultados filtrados:', this.dataSource.filteredData.length);
      console.log('✅ Pedidos encontrados:', this.dataSource.filteredData.map(p => ({
        id: p.id_pedido, 
        estado: p.id_estado_pedido,
        nombreEstado: p.estado?.estado
      })));
    }, 100);
  }

// ✅ CORREGIDO: Limpiar filtros
  clearFilters(): void {
    this.selectedEstado = 0;
    this.fechaInicio = null;
    this.fechaFin = null;
    this.searchTerm = '';
    
    // Limpiar controles de formulario
    const searchInput = document.querySelector('.search-field input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    
    // Resetear datasource
    this.dataSource.filter = '';
  }

 // ✅ NUEVO: Método para debug
  private debugFiltros(): void {
    console.log('🔍 DEBUG FILTROS:');
    console.log('   - Estado seleccionado:', this.selectedEstado);
    console.log('   - Fecha inicio:', this.fechaInicio);
    console.log('   - Fecha fin:', this.fechaFin);
    console.log('   - Término búsqueda:', this.searchTerm);
    
    console.log('📋 DATOS ORIGINALES:');
    this.dataSource.data.forEach(pedido => {
      console.log(`   Pedido ${pedido.id_pedido}: Estado ID = ${pedido.id_estado_pedido}, Estado = ${pedido.estado?.estado}`);
    });
  }

 // Llamar este método después de cargar los datos
  loadPedidos(): void {
    this.isLoading = true;
    this.pedidoService.getPedidos().subscribe({
      next: (rows: PedidoProveedor[]) => { 
        const pedidosConDetalles = rows.map(pedido => ({
          ...pedido,
          detalles: pedido.detalles || []
        }));
        
        this.dataSource.data = pedidosConDetalles;
        this.isLoading = false; 
        
        // Debug después de cargar
        setTimeout(() => {
          this.debugFiltros();
        }, 500);
      },
      error: (error) => { 
        this.isLoading = false; 
        console.error('Error al cargar pedidos:', error);
        this.showError('Error al cargar pedidos'); 
      }
    });
  }
  // ✅ NUEVO MÉTODO: Obtener cantidad de items de forma segura
  getCantidadItems(pedido: PedidoProveedor): number {
    return pedido.detalles?.length || 0;
  }

  getEstadoIcon(estado: string | undefined): string {
    if (!estado) return 'help';
    
    const icons: { [key: string]: string } = {
      'Solicitado': 'pending_actions',
      'Confirmado': 'check_circle',
      'En camino': 'local_shipping',
      'Recibido': 'inventory',
      'Cancelado': 'cancel'
    };
    return icons[estado] || 'help';
  }

  addPedido(): void {
    const dialogRef = this.dialog.open(PedidoProveedorFormComponent, { 
      width: this.isMobileView ? '95vw' : '800px',
      maxWidth: '95vw',
      height: this.isMobileView ? '95vh' : '85vh',
      maxHeight: '95vh',
      panelClass: ['responsive-dialog', 'pedido-proveedor-dialog'],
      autoFocus: false,
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(res => { 
      if(res) this.loadPedidos(); 
    });
  }

  editPedido(pedido: PedidoProveedor): void {
    const dialogRef = this.dialog.open(PedidoProveedorFormComponent, { 
      width: this.isMobileView ? '95vw' : '800px',
      maxWidth: '95vw',
      height: this.isMobileView ? '95vh' : '85vh',
      maxHeight: '95vh',
      panelClass: ['responsive-dialog', 'pedido-proveedor-dialog'],
      autoFocus: false,
      disableClose: true,
      data: { pedido } 
    });
    dialogRef.afterClosed().subscribe(res => { 
      if(res) this.loadPedidos(); 
    });
  }

  deletePedido(pedido: PedidoProveedor): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { 
      width: '450px', 
      data: { 
        title: 'Eliminar Pedido',
        message: `¿Estás seguro de eliminar el pedido #${pedido.id_pedido}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      } 
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.pedidoService.deletePedido(pedido.id_pedido).subscribe({
          next: () => { 
            this.showSuccess('Pedido eliminado correctamente'); 
            this.loadPedidos(); 
          },
          error: () => this.showError('Error al eliminar pedido')
        });
      }
    });
  }

verDetallesModal(pedido: PedidoProveedor): void {
  const dialogRef = this.dialog.open(PedidoDetallesModalComponent, {
    width: this.isMobileView ? '95vw' : '700px', // Ancho reducido para mejor aspecto
    maxWidth: '95vw',
    height: this.isMobileView ? '85vh' : '600px', // Altura fija controlada
    maxHeight: '90vh',
    panelClass: ['responsive-dialog', 'detalles-modal'],
    data: { 
      pedido,
      onEdit: (pedidoToEdit: PedidoProveedor) => {
        this.editPedido(pedidoToEdit);
      }
    }
  });
}
  // ✅ MÉTODO PARA CAMBIAR ESTADO RÁPIDO
  cambiarEstado(pedido: PedidoProveedor, nuevoEstado: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cambiar Estado',
        message: `¿Cambiar estado del pedido #${pedido.id_pedido} a "${this.getEstadoName(nuevoEstado)}"?`,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.pedidoService.updatePedido(pedido.id_pedido, { id_estado_pedido: nuevoEstado })
          .subscribe({
            next: () => {
              this.showSuccess('Estado actualizado correctamente');
              this.loadPedidos();
            },
            error: () => this.showError('Error al actualizar estado')
          });
      }
    });
  }

  getEstadoName(idEstado: number): string {
    const estados: { [key: number]: string } = {
      1: 'Solicitado',
      2: 'Confirmado',
      3: 'En camino',
      4: 'Recibido',
      5: 'Cancelado'
    };
    return estados[idEstado] || 'Desconocido';
  }

  // ✅ MÉTODO ORIGINAL (para compatibilidad)
  verDetalles(pedido: PedidoProveedor): void {
    this.verDetallesModal(pedido);
  }

  private showSuccess(msg: string): void { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['success-snackbar'] 
    }); 
  }

  private showError(msg: string): void { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 5000, 
      panelClass: ['error-snackbar'] 
    }); 
  }
}