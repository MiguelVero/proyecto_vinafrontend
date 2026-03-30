// frontend/src/app/features/pages/sunat/pages/sunat-principal/sunat-principal.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { saveAs } from 'file-saver';

import { SunatService, ComprobanteSunat } from '../../../../../core/services/sunat.service';
import { TruncatePipe } from '../../../../../pipes/truncate.pipe'; // Ajusta la ruta
import { FormatNumberPipe } from '../../../../../pipes/format-number.pipe'; // ✅ IMPORTAR EL NUEVO PIPE
@Component({
  selector: 'app-sunat-principal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    TruncatePipe,      // ✅ PIPE PARA TRUNCAR TEXTO
    FormatNumberPipe,  // ✅ PIPE PARA FORMATEAR NÚMEROS
    MatTooltipModule,
    MatTabsModule
  ],
  templateUrl: './sunat-principal.component.html',
  styleUrls: ['./sunat-principal.component.css']
})
export class SunatPrincipalComponent implements OnInit {
  private sunatService = inject(SunatService);
  
  // Datos
  comprobantes: ComprobanteSunat[] = [];
  comprobanteSeleccionado: ComprobanteSunat | null = null;
  
  // Filtros
  filtroTipo: string = '';
  filtroEstado: string = '';
  filtroFechaDesde: string = '';
  filtroFechaHasta: string = '';
  searchTerm: string = '';
  
  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalItems: number = 0;
  
  // Estados
  loading: boolean = false;
  error: string = '';
  
displayedColumns: string[] = [
  'id_comprobante',
  'venta',
  'tipo',
  'serie_numero',
  'cliente',
  'documento', // Nueva columna
  'total',
  'estado',
  'fecha_envio',
  'acciones'
];
  
  // Tipos y estados para filtros
  tiposComprobante: any[] = [
    { value: '', label: 'Todos' },
    { value: 'FACTURA', label: 'Factura' },
    { value: 'BOLETA', label: 'Boleta' }
  ];
  
  estadosComprobante: any[] = [
    { value: '', label: 'Todos' },
    { value: 'ACEPTADO', label: 'Aceptado' },
    { value: 'RECHAZADO', label: 'Rechazado' },
    { value: 'PENDIENTE', label: 'Pendiente' }
  ];
// Añade estas propiedades después de las existentes
filtroFechaDesdeObj: Date | null = null;
filtroFechaHastaObj: Date | null = null;




  ngOnInit() {
    this.cargarComprobantes();
  }

// Mejora el método cargarComprobantes para mejor manejo de errores
cargarComprobantes() {
  this.loading = true;
  this.error = '';
  
  const params: any = {
    pagina: this.paginaActual,
    limite: this.itemsPorPagina
  };
  
  if (this.filtroTipo) params.tipo = this.filtroTipo;
  if (this.filtroEstado) params.estado = this.filtroEstado;
  if (this.filtroFechaDesde) params.fecha_desde = this.filtroFechaDesde;
  if (this.filtroFechaHasta) params.fecha_hasta = this.filtroFechaHasta;
  if (this.searchTerm) params.search = this.searchTerm;
  
  console.log('📡 Enviando parámetros:', params); // Para debug
  
  this.sunatService.getComprobantes(params).subscribe({
    next: (response) => {
      console.log('✅ Respuesta recibida:', response);
      this.comprobantes = response.comprobantes || [];
      this.totalItems = response.total || 0;
      this.loading = false;
    },
    error: (error) => {
      console.error('❌ Error:', error);
      this.error = error.error?.error || 'Error al cargar comprobantes';
      this.loading = false;
      this.comprobantes = [];
      this.totalItems = 0;
    }
  });
}

  aplicarFiltros() {
    this.paginaActual = 1;
    this.cargarComprobantes();
  }

// Modifica el método limpiarFiltros
limpiarFiltros() {
  this.filtroTipo = '';
  this.filtroEstado = '';
  this.filtroFechaDesde = '';
  this.filtroFechaHasta = '';
  this.filtroFechaDesdeObj = null;
  this.filtroFechaHastaObj = null;
  this.searchTerm = '';
  this.paginaActual = 1;
  this.cargarComprobantes();
}

  cambiarPagina(event: any) {
    this.paginaActual = event.pageIndex + 1;
    this.itemsPorPagina = event.pageSize;
    this.cargarComprobantes();
  }

  verDetalle(comprobante: ComprobanteSunat) {
    this.comprobanteSeleccionado = comprobante;
  }

  cerrarDetalle() {
    this.comprobanteSeleccionado = null;
  }

  descargarXml(comprobante: ComprobanteSunat) {
    this.sunatService.descargarXml(comprobante.id_comprobante).subscribe({
      next: (blob) => {
        const fecha = new Date().toISOString().split('T')[0];
        saveAs(blob, `comprobante-${comprobante.serie}-${comprobante.numero_secuencial}-${fecha}.xml`);
      },
      error: (error) => {
        console.error('Error descargando XML:', error);
        alert('Error al descargar el XML');
      }
    });
  }

  reenviarComprobante(comprobante: ComprobanteSunat) {
    if (!confirm(`¿Reenviar comprobante ${comprobante.serie}-${comprobante.numero_secuencial} a SUNAT?`)) {
      return;
    }
    
    this.sunatService.reenviarComprobante(comprobante.id_comprobante).subscribe({
      next: (response) => {
        alert('Comprobante reenviado exitosamente');
        this.cargarComprobantes();
      },
      error: (error) => {
        alert('Error al reenviar: ' + (error.error?.error || error.message));
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'ACEPTADO': return 'estado-aceptado';
      case 'RECHAZADO': return 'estado-rechazado';
      case 'PENDIENTE': return 'estado-pendiente';
      default: return 'estado-desconocido';
    }
  }

  getTipoClass(tipo: string): string {
    return tipo === 'FACTURA' ? 'tipo-factura' : 'tipo-boleta';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalItems / this.itemsPorPagina);
  }
  // Métodos para manejar cambios de fecha
onFechaDesdeChange() {
  if (this.filtroFechaDesdeObj) {
    this.filtroFechaDesde = this.formatDateForAPI(this.filtroFechaDesdeObj);
  } else {
    this.filtroFechaDesde = '';
  }
  this.aplicarFiltros();
}

onFechaHastaChange() {
  if (this.filtroFechaHastaObj) {
    this.filtroFechaHasta = this.formatDateForAPI(this.filtroFechaHastaObj);
  } else {
    this.filtroFechaHasta = '';
  }
  this.aplicarFiltros();
}

// Método auxiliar para formatear fecha para API
private formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
// Método para obtener icono según estado
getEstadoIcon(estado: string): string {
  switch (estado) {
    case 'ACEPTADO': return 'check_circle';
    case 'RECHAZADO': return 'cancel';
    case 'PENDIENTE': return 'pending';
    default: return 'help';
  }
}
}