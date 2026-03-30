import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';

import { Cliente } from '../../../core/models/cliente.model';
import { ClienteService } from '../../../core/services/cliente.service';
import { ClienteFormComponent } from '../../../components/cliente-form/cliente-form.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { MapModalComponent } from '../../../components/map-modal/map-modal.component';

@Component({
  selector: 'app-cliente-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule
  ],
  templateUrl: './cliente-list.component.html',
  styleUrl: './cliente-list.component.css',
})
export class ClienteListComponent implements OnInit {
  pageSize = 10;
  currentPage = 0;
  displayedColumns: string[] = [
    'numero',
    'informacion',
    'contacto',
    'direccion',
    'tipo',
    'acciones'
  ];

  dataSource: MatTableDataSource<Cliente> = new MatTableDataSource<Cliente>([]);
  allClientes: Cliente[] = []; // Todos los clientes
  filteredClientes: Cliente[] = []; // Clientes filtrados
  paginatedClientes: Cliente[] = []; // Clientes para la página actual
  isLoading = true;

  constructor(
    private clienteService: ClienteService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    this.isLoading = true;
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        console.log('Clientes cargados:', clientes);
        
        // Guardar todos los datos
        this.allClientes = [...clientes];
        this.filteredClientes = [...clientes];
        
        // Aplicar paginación inicial
        this.applyPagination();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando clientes:', error);
        this.isLoading = false;
        this.showErrorMessage('Error al cargar los clientes');
      }
    });
  }

  // Aplicar paginación
  applyPagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Obtener datos para la página actual
    this.paginatedClientes = this.filteredClientes.slice(startIndex, endIndex);
    
    // Actualizar dataSource
    this.dataSource.data = this.paginatedClientes;
  }

  // Cambiar tamaño de página
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0; // Resetear a primera página
    this.applyPagination();
  }

  // Aplicar filtro
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    if (!filterValue) {
      // Sin filtro, mostrar todos los clientes
      this.filteredClientes = [...this.allClientes];
    } else {
      // Aplicar filtro
      this.filteredClientes = this.allClientes.filter(cliente => 
        (cliente.nombre && cliente.nombre.toLowerCase().includes(filterValue)) ||
        (cliente.dni && cliente.dni.toLowerCase().includes(filterValue)) ||
        (cliente.telefono && cliente.telefono.toLowerCase().includes(filterValue)) ||
        (cliente.direccion && cliente.direccion.toLowerCase().includes(filterValue)) ||
        (cliente.tipo_cliente && cliente.tipo_cliente.toLowerCase().includes(filterValue)) ||
        (cliente.razon_social && cliente.razon_social.toLowerCase().includes(filterValue))
      );
    }
    
    this.currentPage = 0; // Resetear a primera página
    this.applyPagination();
  }

  // Navegación de páginas
  nextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  firstPage(): void {
    this.currentPage = 0;
    this.applyPagination();
  }

  lastPage(): void {
    this.currentPage = this.getTotalPages() - 1;
    this.applyPagination();
  }

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages() - 1;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 0;
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredClientes.length / this.pageSize);
  }

  // Métodos para información de paginación
  getCurrentPageStart(): number {
    if (this.filteredClientes.length === 0) return 0;
    return (this.currentPage * this.pageSize) + 1;
  }

  getCurrentPageEnd(): number {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return Math.min(end, this.filteredClientes.length);
  }

  getTotalFiltered(): number {
    return this.filteredClientes.length;
  }

  getTotalClientes(): number {
    return this.allClientes.length;
  }

  getPageNumber(index: number): number {
    return (this.currentPage * this.pageSize) + index + 1;
  }

  // Métodos de diálogo
  openAddDialog(): void {
    const dialogRef = this.dialog.open(ClienteFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'cliente-form-dialog',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadClientes();
      }
    });
  }

  openEditDialog(cliente: Cliente): void {
    const dialogRef = this.dialog.open(ClienteFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'cliente-form-dialog',
      data: { cliente },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadClientes();
      }
    });
  }

  deleteCliente(cliente: Cliente): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        message: `¿Estás seguro de que deseas eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && cliente.id) {
        this.clienteService.deleteCliente(cliente.id).subscribe({
          next: () => {
            this.loadClientes();
            this.showSuccessMessage('Cliente eliminado correctamente');
          },
          error: (error) => {
            console.error('Error eliminando cliente:', error);
            this.showErrorMessage('Error al eliminar el cliente');
          }
        });
      }
    });
  }

  openMapDialog(cliente: Cliente): void {
    if (!cliente.direccion) {
      this.showErrorMessage('No hay dirección disponible para este cliente');
      return;
    }

    this.dialog.open(MapModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        nombre: cliente.nombre,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        tipo_cliente: cliente.tipo_cliente,
        razon_social: cliente.razon_social,
        coordenadas: cliente['coordenadas']
      }
    });
  }

  getTipoClienteColor(tipoCliente: string): string {
    if (!tipoCliente) return 'basic';
    const tipo = tipoCliente.toLowerCase();
    if (tipo.includes('bodega')) return 'primary';
    if (tipo.includes('restaurante')) return 'accent';
    if (tipo.includes('gimnasio')) return 'warn';
    if (tipo.includes('empresa')) return 'primary';
    if (tipo.includes('persona')) return 'basic';
    return 'basic';
  }

  getTipoDocumentoColor(tipoDocumento: string): string {
    if (!tipoDocumento) return 'basic';
    const tipo = tipoDocumento.toLowerCase();
    if (tipo.includes('dni')) return 'primary';
    if (tipo.includes('ruc')) return 'accent';
    if (tipo.includes('ce')) return 'warn';
    return 'basic';
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}