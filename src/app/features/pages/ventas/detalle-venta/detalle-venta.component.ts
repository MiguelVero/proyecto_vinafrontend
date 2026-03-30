// src/app/features/pages/ventas/detalle-venta/detalle-venta.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VentasService, Venta } from '../../../../core/services/ventas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FechaService } from '../../../../core/services/fecha.service'; // ← AÑADIR
import { PersonalizacionService } from '../../../../core/services/personalizacion.service'; // ← IMPORTAR
@Component({
  selector: 'app-detalle-venta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-venta.component.html',
  styleUrls: ['./detalle-venta.component.css']
})
export class DetalleVentaComponent implements OnInit {
  private ventasService = inject(VentasService);
  private authService = inject(AuthService);
  public fechaService = inject(FechaService); // ← AÑADIR
   private personalizacionService = inject(PersonalizacionService); 
  private route = inject(ActivatedRoute);
  public router = inject(Router);

  venta: Venta | null = null;
  loading = false;
  error = '';
  notFound = false;
  



 // AÑADIR método para debug
// También corrige el método ngOnInit:
ngOnInit() {
    this.cargarVenta();
    // Añadir para debug
    setTimeout(() => {
        if (this.venta) {
            console.log('🔍 VERIFICANDO FECHA EN DETALLE:', {
                id: this.venta.id_venta,
                fechaBD: this.venta.fecha,
                fechaFormateada: this.fechaService.formatFechaCompleta(this.venta.fecha), // CAMBIAR
                fechaObj: new Date(this.venta.fecha)
            });
        }
    }, 1000);
}
  cargarVenta() {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (!id) {
      this.error = 'ID de venta no válido';
      return;
    }

    this.loading = true;
    this.error = '';
    this.notFound = false;

    this.ventasService.getVentaById(+id).subscribe({
      next: (venta) => {
        console.log('📦 Venta cargada:', venta);
        this.venta = venta;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 404) {
          this.notFound = true;
          this.error = 'Venta no encontrada';
        } else {
          this.error = 'Error al cargar la venta';
        }
        console.error('Error cargando venta:', error);
      }
    });
  }

  // Obtener clase CSS para el estado
  getEstadoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'Pendiente': 'estado-pendiente',
      'Listo para repartos': 'estado-listo',
      'En ruta': 'estado-ruta',
      'Pagado': 'estado-pagado',
      'Cancelado': 'estado-cancelado'
    };
    return classes[estado] || 'estado-desconocido';
  }

  // En detalle-venta.component.ts - método formatearFecha
// REEMPLAZAR el método formatearFecha en detalle-venta.component.ts


// Añadir también este método para fechas cortas

  // ✅ NUEVO: Formatear hora en formato 12 horas (09:34 AM/PM)
  formatearHora(hora: string): string {
    if (!hora) return 'Hora no disponible';
    
    try {
      // Si la hora viene como '15:38:08'
      const [horas, minutos, segundos] = hora.split(':');
      const fecha = new Date();
      fecha.setHours(parseInt(horas), parseInt(minutos), parseInt(segundos || '0'));
      
      return fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formateando hora:', error, 'Hora original:', hora);
      return hora; // Devolver la hora original si hay error
    }
  }

  // Navegación
// MODIFICA el método volverAPanel()
volverAPanel() {
  // Leer la ruta guardada en localStorage (fallback)
  const previousRoute = localStorage.getItem('previous_ventas_route');
  
  // Intentar leer los query params de retorno
  const returnData = this.route.snapshot.queryParams['return'];
  
  if (returnData) {
    try {
      const data = JSON.parse(returnData);
      
      // Navegar a la ruta anterior con los query params guardados
      this.router.navigate([data.route], {
        queryParams: data.queryParams
      });
      
      // También restaurar página específica si es necesario
      if (data.page) {
        sessionStorage.setItem('ventas_panel_pagina', data.page.toString());
      }
      if (data.items) {
        sessionStorage.setItem('ventas_panel_items', data.items.toString());
      }
      
      // Limpiar después de usar
      localStorage.removeItem('previous_ventas_route');
      return;
    } catch (error) {
      console.error('Error parsing return data:', error);
    }
  }
  
  if (previousRoute) {
    // Limpiar el localStorage después de usarlo
    localStorage.removeItem('previous_ventas_route');
    
    // Navegar a la ruta anterior
    console.log('Volviendo a ruta anterior:', previousRoute);
    this.router.navigate([previousRoute]);
  } else {
    // Si no hay ruta guardada, volver al panel por defecto
    console.log('No hay ruta anterior, volviendo a /ventas');
    this.router.navigate(['/ventas']);
  }
}

  // Método para cambiar estado
  cambiarEstado() {
    if (!this.venta?.id_venta) return;
    
    const nuevoEstado = prompt('Ingrese el nuevo estado (1-8):\n1. Pendiente\n2. Confirmado\n3. En preparación\n4. Listo para repartos\n5. En ruta\n6. Entregado\n7. Pagado\n8. Cancelado');
    
    if (nuevoEstado && +nuevoEstado >= 1 && +nuevoEstado <= 8) {
      this.ventasService.updateEstadoVenta(this.venta.id_venta!, +nuevoEstado).subscribe({
        next: () => {
          alert('✅ Estado actualizado correctamente');
          this.cargarVenta();
        },
        error: (error) => {
          alert('❌ Error al actualizar estado');
          console.error('Error:', error);
        }
      });
    }
  }

  // Solo admin puede cambiar estados
  get puedeCambiarEstado(): boolean {
    return this.authService.isAdmin();
  }

  // ✅ NUEVO: Imprimir comprobante sencillo
// Corrige el método imprimirComprobante para usar el servicio:
// ✅ MÉTODO MODIFICADO PARA INCLUIR EL LOGO
  imprimirComprobante() {
    if (!this.venta) return;

    // 1. Obtener el tipo de comprobante
    const tipoComprobante = this.getTipoComprobanteTexto(this.venta.tipo_comprobante_solicitado);
    
    // 2. Obtener configuración de la empresa
    const config = this.personalizacionService.config();
    const logoUrl = config?.logo_login ? this.personalizacionService.logoLoginUrl() : null;
    const nombreEmpresa = config?.nombre || 'VIÑA';
    const rucEmpresa = config?.ruc || '20605757451';
    const esloganEmpresa = config?.eslogan || 'Agua de calidad para tu hogar';
    const direccionEmpresa = config?.direccion || 'Av. Mercado 111 - UCAYALI - CORONEL PORTILLO - CALLERIA';
    const telefonoEmpresa = config?.telefono || '';
    const emailEmpresa = config?.email || '';
    const logoTexto = config?.logo_texto || '💧';

    // 3. Determinar documento y tipo de cliente
    let documentoCliente = '---';
    let tipoDocumento = 'DNI';
    let nombreCliente = this.venta.nombre_completo || 'Cliente General';
    let razonSocial = this.venta.razon_social || '';
    let mostrarRazonSocial = false;
    
    if (this.venta.tipo_documento === 'RUC' && this.venta.numero_documento) {
      tipoDocumento = 'RUC';
      documentoCliente = this.venta.numero_documento;
      mostrarRazonSocial = true;
      if (!razonSocial && this.venta.nombre_completo) {
        razonSocial = this.venta.nombre_completo;
      }
    } else if (this.venta.tipo_documento === 'DNI' && this.venta.numero_documento) {
      tipoDocumento = 'DNI';
      documentoCliente = this.venta.numero_documento;
      mostrarRazonSocial = false;
    } else {
      tipoDocumento = this.venta.tipo_cliente === 'Empresa' || this.venta.tipo_cliente === 'Bodega' || 
                      this.venta.tipo_cliente === 'Restaurante' ? 'RUC' : 'DNI';
      documentoCliente = '---';
    }

    // 4. Generar serie y número
    let serieNumero = '---';
    if (this.venta.serie_comprobante && this.venta.numero_correlativo) {
      serieNumero = `${this.venta.serie_comprobante}-${this.venta.numero_correlativo.toString().padStart(5, '0')}`;
    } else {
      serieNumero = tipoComprobante.includes('Factura') ? 'F001-00001' : 'B001-00001';
    }

    // 5. Construir el contenido HTML con el logo
    const contenido = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${tipoComprobante} - Venta #${this.venta.id_venta}</title>
          ${this.generarEstiloComprobante()}
      </head>
      <body>
          <div class="comprobante-container">
              <!-- HEADER: Datos de la empresa con LOGO -->
              <div class="empresa-header">
                  <div class="logo">
                      ${logoUrl ? 
                        `<img src="${logoUrl}" alt="${nombreEmpresa}" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                      }
                      <div class="logo-placeholder" ${logoUrl ? 'style="display:none;"' : ''}>
                          ${logoTexto}
                      </div>
                  </div>
                  <div class="empresa-info">
                      <h1>${nombreEmpresa}</h1>
                      <p class="ruc">RUC: ${rucEmpresa}</p>
                      <p class="eslogan">${esloganEmpresa}</p>
                  </div>
              </div>

              <!-- TÍTULO DEL COMPROBANTE -->
              <h2 class="titulo-comprobante">${tipoComprobante}</h2>

              <!-- SERIE Y FECHA -->
              <div class="documento-info">
                  <div class="serie-numero">
                      <span class="label">Serie - Número:</span>
                      <span class="valor">${serieNumero}</span>
                  </div>
                  <div class="fecha-emision">
                      <span class="label">Fecha de Emisión:</span>
                      <span class="valor">${this.fechaService.formatFechaCompleta(this.venta.fecha)} ${this.fechaService.formatHora(this.venta.hora)}</span>
                  </div>
              </div>

              <!-- DATOS DEL CLIENTE -->
              <div class="cliente-section">
                  <h3>Datos del Cliente</h3>
                  <table class="cliente-tabla">
                      <tr>
                          <td class="label">${tipoDocumento}:</td>
                          <td class="valor">${documentoCliente}</td>
                      </tr>
                      ${mostrarRazonSocial && razonSocial ? `
                      <tr>
                          <td class="label">Razón Social:</td>
                          <td class="valor">${razonSocial}</td>
                      </tr>
                      ` : ''}
                      <tr>
                          <td class="label">Cliente:</td>
                          <td class="valor">${nombreCliente}</td>
                      </tr>
                      <tr>
                          <td class="label">Dirección:</td>
                          <td class="valor">${this.venta.direccion || 'No especificada'}</td>
                      </tr>
                      <tr>
                          <td class="label">Teléfono:</td>
                          <td class="valor">${this.venta.telefono || '---'}</td>
                      </tr>
                  </table>
              </div>

              <!-- TABLA DE PRODUCTOS -->
              <div class="productos-section">
                  <h3>Detalle de Productos</h3>
                  <table class="productos-tabla">
                      <thead>
                          <tr>
                              <th>Cant.</th>
                              <th>Producto</th>
                              <th>P. Unit.</th>
                              <th>Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${this.venta.detalles.map((d: any) => `
                          <tr>
                              <td class="center">${d.cantidad}</td>
                              <td>${d.producto_nombre}</td>
                              <td class="right">S/ ${Number(d.precio_unitario).toFixed(2)}</td>
                              <td class="right">S/ ${(Number(d.cantidad) * Number(d.precio_unitario)).toFixed(2)}</td>
                          </tr>
                          `).join('')}
                      </tbody>
                      <tfoot>
                          <tr>
                              <td colspan="3" class="right"><strong>Total a Pagar:</strong></td>
                              <td class="right total"><strong>S/ ${Number(this.venta.total).toFixed(2)}</strong></td>
                          </tr>
                      </tfoot>
                  </table>
              </div>

              <!-- MONTO EN LETRAS -->
              <div class="monto-letras">
                  <p>SON: ${this.numeroALetras(Number(this.venta.total))} SOLES</p>
              </div>

              <!-- INFORMACIÓN ADICIONAL -->
              <div class="info-adicional">
                  <div class="info-row">
                      <span class="label">Vendedor:</span>
                      <span class="valor">${this.venta.vendedor || 'admin'}</span>
                  </div>
                  <div class="info-row">
                      <span class="label">Forma de Pago:</span>
                      <span class="valor">${this.venta.metodo_pago || 'Contado'}</span>
                  </div>
                  ${this.venta.repartidor ? `
                  <div class="info-row">
                      <span class="label">Repartidor:</span>
                      <span class="valor">${this.venta.repartidor}</span>
                  </div>
                  ` : ''}
              </div>

              <!-- PIE DE PÁGINA -->
              <div class="footer">
                  <p class="direccion-empresa">${direccionEmpresa}</p>
                  ${telefonoEmpresa ? `<p class="contacto-empresa">Tel: ${telefonoEmpresa} ${emailEmpresa ? `| Email: ${emailEmpresa}` : ''}</p>` : ''}
                  <p class="gracias">¡Gracias por su compra! 💧</p>
                  <p class="sistema">Sistema de Ventas</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank', 'width=800,height=600');
    ventana?.document.write(contenido);
    ventana?.document.close();

    setTimeout(() => {
      ventana?.print();
      ventana?.close();
    }, 500);
  }

// Método para generar estilos CSS
private generarEstiloComprobante(): string {
    return `
      <style>
          * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Courier New', Courier, monospace;
          }
          
          body {
              background: #f0f0f0;
              display: flex;
              justify-content: center;
              padding: 20px;
          }
          
          .comprobante-container {
              max-width: 600px;
              width: 100%;
              background: white;
              padding: 25px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              border: 1px solid #ccc;
          }

          /* HEADER EMPRESA CON LOGO */
          .empresa-header {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #057cbe;
          }
          
          .logo {
              width: 70px;
              height: 70px;
              flex-shrink: 0;
          }
          
          .logo-img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 8px;
          }
          
          .logo-placeholder {
              width: 70px;
              height: 70px;
              background: #057cbe;
              color: white;
              font-size: 2.5rem;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
          }
          
          .empresa-info {
              flex: 1;
          }
          
          .empresa-info h1 {
              font-size: 1.8rem;
              color: #057cbe;
              margin-bottom: 2px;
          }
          
          .ruc {
              font-size: 0.85rem;
              color: #333;
              font-weight: bold;
          }
          
          .eslogan {
              font-size: 0.8rem;
              color: #555;
              font-style: italic;
          }

          /* TÍTULO */
          .titulo-comprobante {
              text-align: center;
              font-size: 1.4rem;
              font-weight: bold;
              color: #2c3e50;
              margin: 15px 0;
              text-transform: uppercase;
              letter-spacing: 2px;
          }

          /* INFO DOCUMENTO */
          .documento-info {
              display: flex;
              justify-content: space-between;
              background: #f8f9fa;
              padding: 12px;
              border-radius: 5px;
              margin-bottom: 20px;
              font-size: 0.9rem;
              border: 1px solid #dee2e6;
          }
          
          .label {
              font-weight: 600;
              color: #495057;
          }
          
          .valor {
              font-weight: 500;
              color: #2c3e50;
          }

          /* CLIENTE */
          .cliente-section {
              margin-bottom: 20px;
              padding: 12px;
              background: #f8f9fa;
              border-radius: 5px;
              border: 1px solid #dee2e6;
          }
          
          .cliente-section h3 {
              font-size: 1rem;
              color: #057cbe;
              margin-bottom: 8px;
              border-bottom: 1px dashed #057cbe;
              padding-bottom: 4px;
          }
          
          .cliente-tabla {
              width: 100%;
              font-size: 0.9rem;
          }
          
          .cliente-tabla td {
              padding: 4px 0;
          }
          
          .cliente-tabla .label {
              width: 100px;
          }

          /* PRODUCTOS */
          .productos-section {
              margin-bottom: 20px;
          }
          
          .productos-section h3 {
              font-size: 1rem;
              color: #057cbe;
              margin-bottom: 8px;
          }
          
          .productos-tabla {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.9rem;
          }
          
          .productos-tabla th {
              background: #057cbe;
              color: white;
              padding: 8px;
              text-align: left;
          }
          
          .productos-tabla td {
              padding: 8px;
              border-bottom: 1px solid #dee2e6;
          }
          
          .productos-tabla tfoot tr td {
              border-top: 2px solid #057cbe;
              border-bottom: none;
              font-weight: bold;
              padding-top: 10px;
          }
          
          .center { text-align: center; }
          .right { text-align: right; }
          
          .total {
              font-size: 1.1rem;
              color: #28a745;
          }

          /* MONTO EN LETRAS */
          .monto-letras {
              text-align: center;
              font-size: 0.95rem;
              font-weight: bold;
              color: #2c3e50;
              margin: 20px 0;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 5px;
              border: 1px dashed #28a745;
          }

          /* INFO ADICIONAL */
          .info-adicional {
              margin: 20px 0;
              padding: 12px;
              background: #f8f9fa;
              border-radius: 5px;
              border: 1px solid #dee2e6;
              font-size: 0.9rem;
          }
          
          .info-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
          }

          /* FOOTER */
          .footer {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 2px solid #057cbe;
              text-align: center;
              font-size: 0.8rem;
              color: #6c757d;
          }
          
          .direccion-empresa {
              font-weight: 500;
              margin-bottom: 5px;
          }
          
          .contacto-empresa {
              font-size: 0.75rem;
              margin-bottom: 5px;
          }
          
          .gracias {
              font-size: 1rem;
              font-weight: bold;
              color: #057cbe;
              margin: 5px 0;
          }
          
          .sistema {
              font-size: 0.7rem;
          }

          @media print {
              body { background: white; padding: 0; }
              .comprobante-container { box-shadow: none; border: none; }
          }
      </style>
    `;
  }


// Método mejorado para convertir número a letras
private numeroALetras(num: number): string {
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  
  // Array de unidades y decenas
  const unidades = ['CERO', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';
  
  let letras = '';
  
  // Función para convertir números de 1 a 99
  const convertirDosDigitos = (n: number): string => {
    if (n < 10) return unidades[n];
    if (n < 20) return especiales[n - 10];
    if (n < 30 && n > 20) return 'VEINTI' + unidades[n - 20];
    if (n < 100) {
      const decena = Math.floor(n / 10);
      const unidad = n % 10;
      return decenas[decena] + (unidad > 0 ? ' Y ' + unidades[unidad] : '');
    }
    return '';
  };

  // Función para convertir números de 1 a 999
  const convertirTresDigitos = (n: number): string => {
    if (n < 100) return convertirDosDigitos(n);
    
    const centena = Math.floor(n / 100);
    const resto = n % 100;
    
    if (n === 100) return 'CIEN';
    if (resto === 0) return centenas[centena];
    
    return centenas[centena] + ' ' + convertirDosDigitos(resto);
  };

  // Convertir miles
  const miles = Math.floor(entero / 1000);
  const restoMiles = entero % 1000;
  
  if (miles > 0) {
    if (miles === 1) {
      letras = 'MIL';
    } else {
      letras = convertirTresDigitos(miles) + ' MIL';
    }
    
    if (restoMiles > 0) {
      letras += ' ' + convertirTresDigitos(restoMiles);
    }
  } else {
    letras = convertirTresDigitos(entero);
  }
  
  // Convertir la primera letra a mayúscula
  letras = letras.charAt(0) + letras.slice(1).toLowerCase();
  
  return `${letras} CON ${decimal.toString().padStart(2, '0')}/100`;
}








// Mejorar la función getTipoComprobanteTexto
getTipoComprobanteTexto(tipo: string | undefined): string {
  if (!tipo) {
    // Si no hay tipo en la venta, verificar si hay algún comprobante SUNAT
    if (this.venta && this.venta.id_venta) {
      // Podrías hacer una consulta adicional aquí si necesitas
      return 'Sin comprobante';
    }
    return 'Sin comprobante';
  }
  
  switch(tipo.toUpperCase()) { // Usar toUpperCase para mayor seguridad
    case 'FACTURA': return 'Factura Electrónica';
    case 'BOLETA': return 'Boleta Electrónica';
    case 'SIN_COMPROBANTE': return 'Nota de Venta';
    case 'NOTA': return 'Nota de Venta';
    case '': 
    case 'NULL': 
    case 'UNDEFINED': return 'Nota de Venta';
    default: return tipo; // Devolver el valor original si no coincide
  }
}

private getClienteInfo(venta: Venta): { tipoDocumento: string; documento: string; mostrarRazonSocial: boolean; razonSocial: string; nombreCliente: string } {
  const result = {
    tipoDocumento: 'DNI',
    documento: '---',
    mostrarRazonSocial: false,
    razonSocial: '',
    nombreCliente: venta.nombre_completo || 'Cliente General'
  };

  // Si tiene tipo_documento y numero_documento de la persona
  if (venta.tipo_documento && venta.numero_documento) {
    if (venta.tipo_documento === 'RUC') {
      result.tipoDocumento = 'RUC';
      result.documento = venta.numero_documento;
      result.mostrarRazonSocial = true;
      result.razonSocial = venta.razon_social || venta.nombre_completo || '';
    } else if (venta.tipo_documento === 'DNI') {
      result.tipoDocumento = 'DNI';
      result.documento = venta.numero_documento;
    }
  } 
  // Si no tiene, inferir por tipo_cliente
  else {
    const tipoCliente = venta.tipo_cliente;
    if (tipoCliente === 'Empresa' || tipoCliente === 'Bodega' || tipoCliente === 'Restaurante') {
      result.tipoDocumento = 'RUC';
      if (venta.razon_social) {
        result.mostrarRazonSocial = true;
        result.razonSocial = venta.razon_social;
      }
    }
  }

  return result;
}

}