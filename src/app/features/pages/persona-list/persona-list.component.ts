import { Component, OnInit, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PersonaService } from '../../../core/services/persona.service';
import { PersonaFormComponent } from '../../../components/persona-form/persona-form.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/services/auth.service';
@Component({
  selector: 'app-persona-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './persona-list.component.html',
  styleUrls: ['./persona-list.component.css']
})
export class PersonaListComponent implements OnInit {
  pageSize = 10;
  currentPage = 0;
  displayedColumns: string[] = ['id', 'documento', 'informacion', 'direccion', 'contacto', 'acciones'];
  
  dataSource = new MatTableDataSource<any>([]);
  allPersonas: any[] = []; // Todas las personas
  filteredPersonas: any[] = []; // Personas filtradas
  paginatedPersonas: any[] = []; // Personas de la página actual
  isLoading = true;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableWrapper') tableWrapper!: ElementRef;

  constructor(
    private personaService: PersonaService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPersonas();
     // Ajustar columnas según permisos
    if (!this.authService.isAdmin()) {
      this.displayedColumns = this.displayedColumns.filter(col => col !== 'acciones');
    }
  }





  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.cdr.detectChanges();
  }

  // Cargar personas
  loadPersonas(): void {
    this.isLoading = true;
    this.personaService.getAll().subscribe({
      next: (personas) => { 
        console.log('Personas cargadas:', personas);
        this.allPersonas = [...personas];
        this.filteredPersonas = [...personas];
        this.applyPagination();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { 
        console.error('Error cargando personas:', err); 
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Aplicar paginación
  applyPagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    this.paginatedPersonas = this.filteredPersonas.slice(startIndex, endIndex);
    this.dataSource.data = this.paginatedPersonas;
  }

  // Cambiar tamaño de página
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  // Aplicar filtro - IGUAL QUE EN CATEGORÍAS
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    if (!filterValue) {
      // Si no hay filtro, mostrar todas
      this.filteredPersonas = [...this.allPersonas];
    } else {
      // Aplicar filtro manualmente
      this.filteredPersonas = this.allPersonas.filter(persona => {
        const searchString = 
          (persona.nombre_completo || '').toLowerCase() + ' ' +
          (persona.numero_documento || '').toLowerCase() + ' ' +
          (persona.telefono || '').toLowerCase() + ' ' +
          (persona.email || '').toLowerCase() + ' ' +
          (persona.id_persona || '').toString();
        
        return searchString.includes(filterValue);
      });
    }
    
    this.currentPage = 0;
    this.applyPagination();
  }

  // Métodos de navegación
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

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages() - 1;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 0;
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredPersonas.length / this.pageSize);
  }

  getStartIndex(): number {
    return this.currentPage * this.pageSize;
  }

  getEndIndex(): number {
    const end = this.getStartIndex() + this.pageSize;
    return Math.min(end, this.filteredPersonas.length);
  }

  getTotalFiltered(): number {
    return this.filteredPersonas.length;
  }

  getTotalPersonas(): number {
    return this.allPersonas.length;
  }

  // ======================
  // MÉTODOS DE DIALOGOS
  // ======================

  addPersona(): void {
    const dialogRef = this.dialog.open(PersonaFormComponent, { 
      width: '520px', 
      maxWidth: '95vw', 
      autoFocus: false 
    });
    
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.id_persona) {
        this.showSuccess('Persona creada exitosamente');
        this.loadPersonas();
      }
    });
  }

  editPersona(persona: any): void {
    const dialogRef = this.dialog.open(PersonaFormComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { persona }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.id_persona) {
        this.showSuccess('Persona actualizada exitosamente');
        this.loadPersonas();
      }
    });
  }

  deletePersona(persona: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'confirm-dialog',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de eliminar a la persona <strong>${persona.nombre_completo}</strong> (${persona.numero_documento})? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'warning',
        confirmIcon: 'delete',
        showIcon: true
      } as ConfirmDialogData
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.personaService.delete(persona.id_persona).subscribe({
          next: () => { 
            this.showSuccess('Persona eliminada exitosamente'); 
            this.loadPersonas(); 
          },
          error: (e) => { 
            this.showError('Error al eliminar persona'); 
            console.error(e); 
            this.isLoading = false;
          }
        });
      }
    });
  }

  // ======================
  // MÉTODOS AUXILIARES
  // ======================

  // Determinar tipo de documento por longitud
  getTipoDocumento(numeroDocumento: string): string {
    if (!numeroDocumento) return '';
    
    const doc = numeroDocumento.trim();
    
    // DNI peruano: 8 dígitos
    if (/^\d{8}$/.test(doc)) {
      return 'DNI';
    }
    
    // RUC peruano: 11 dígitos
    if (/^\d{11}$/.test(doc)) {
      return 'RUC';
    }
    
    // Carnet de extranjería: generalmente 9-12 caracteres alfanuméricos
    if (/^[A-Za-z0-9]{9,12}$/.test(doc)) {
      return 'CE';
    }
    
    return '';
  }

  // Formatear fecha para mostrar
  formatDate(value: any): string {
    if (!value) return '-';
    
    try {
      if (typeof value === 'string') {
        if (value.includes('T')) {
          const date = new Date(value);
          return date.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
        return value;
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', value, error);
      return '-';
    }
  }

  // ======================
  // MÉTODOS DE NOTIFICACIÓN
  // ======================
  
  private showSuccess(msg: string) { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 3000, 
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    }); 
  }
  
  private showError(msg: string) { 
    this.snackBar.open(msg, 'Cerrar', { 
      duration: 5000, 
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    }); 
  }
}