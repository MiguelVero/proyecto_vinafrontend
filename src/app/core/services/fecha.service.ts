// src/app/core/services/fecha.service.ts - VERSIÓN CORREGIDA
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FechaService {
  
  // 🔧 CORREGIDO: Formatear fecha DD/MM/YYYY considerando zona horaria Perú
  formatFechaTabla(fecha: string | Date): string {
    if (!fecha) return '';
    
    try {
      let fechaObj: Date;
      
      if (typeof fecha === 'string') {
        // Si la fecha viene como '2026-01-15' (sin hora), agregar mediodía en Perú
        if (fecha.includes('T')) {
          // Ya tiene timezone info
          fechaObj = new Date(fecha);
        } else {
          // Solo fecha, sin hora - crear en mediodía Perú
          fechaObj = new Date(`${fecha}T12:00:00-05:00`);
        }
      } else {
        fechaObj = fecha;
      }
      
      if (isNaN(fechaObj.getTime())) {
        console.warn('Fecha inválida en formatFechaTabla:', fecha);
        return String(fecha);
      }
      
      // Formatear considerando zona horaria Perú
      const fechaPeru = new Date(fechaObj.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      const dia = fechaPeru.getDate().toString().padStart(2, '0');
      const mes = (fechaPeru.getMonth() + 1).toString().padStart(2, '0');
      const anio = fechaPeru.getFullYear();
      
      return `${dia}/${mes}/${anio}`;
    } catch (error) {
      console.error('Error en formatFechaTabla:', error, 'Fecha:', fecha);
      return String(fecha);
    }
  }
  
  // 🔧 CORREGIDO: Formatear fecha larga
  formatFechaCompleta(fecha: string | Date): string {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      let fechaObj: Date;
      
      if (typeof fecha === 'string') {
        if (fecha.includes('T')) {
          fechaObj = new Date(fecha);
        } else {
          fechaObj = new Date(`${fecha}T12:00:00-05:00`);
        }
      } else {
        fechaObj = fecha;
      }
      
      if (isNaN(fechaObj.getTime())) {
        console.warn('Fecha inválida en formatFechaCompleta:', fecha);
        return String(fecha);
      }
      
      // Usar localización en zona horaria Perú
      return fechaObj.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Lima'
      });
    } catch (error) {
      console.error('Error en formatFechaCompleta:', error, 'Fecha:', fecha);
      return String(fecha);
    }
  }
  
  // 🔧 CORREGIDO: Formatear hora
  formatHora(hora: string): string {
    if (!hora) return '';
    
    try {
      // La hora viene como '23:59:58' o '23:59'
      const [horas, minutos, segundos] = hora.split(':');
      
      // Crear fecha con hora en Perú
      const fecha = new Date();
      // Establecer en zona horaria Perú
      fecha.setUTCHours(
        parseInt(horas) + 5, // Ajustar de UTC a Perú (UTC-5)
        parseInt(minutos) || 0, 
        parseInt(segundos) || 0
      );
      
      return fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Lima'
      });
    } catch (error) {
      console.error('Error en formatHora:', error, 'Hora:', hora);
      return hora;
    }
  }
  
  // 🔧 NUEVO: Método para obtener fecha-hora completa corregida
  formatFechaHora(fecha: string, hora: string): string {
    if (!fecha) return '';
    
    try {
      // Crear fecha completa
      const fechaHora = hora ? `${fecha}T${hora}:00-05:00` : `${fecha}T12:00:00-05:00`;
      const fechaObj = new Date(fechaHora);
      
      if (isNaN(fechaObj.getTime())) {
        return `${fecha} ${hora || ''}`;
      }
      
      return fechaObj.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: hora ? '2-digit' : undefined,
        minute: hora ? '2-digit' : undefined,
        hour12: hora ? true : false,
        timeZone: 'America/Lima'
      });
    } catch (error) {
      console.error('Error en formatFechaHora:', error);
      return `${fecha} ${hora || ''}`;
    }
  }
  
  // 🔧 NUEVO: Formatear fecha para filtros (YYYY-MM-DD)
  formatFechaParaFiltro(fecha: string): string {
    if (!fecha) return '';
    
    try {
      // Asumir que viene como '2026-01-15' de la BD
      const fechaObj = new Date(`${fecha}T12:00:00-05:00`);
      if (isNaN(fechaObj.getTime())) return fecha;
      
      return fechaObj.toLocaleDateString('en-CA', { // Formato YYYY-MM-DD
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Lima'
      });
    } catch (error) {
      console.error('Error en formatFechaParaFiltro:', error, 'Fecha:', fecha);
      return fecha;
    }
  }
  
  // Método de debug
  debugFecha(fecha: any, origen: string) {
    console.log(`🔍 DEBUG FECHA (${origen}):`, {
      valorOriginal: fecha,
      tipo: typeof fecha,
      dateObject: new Date(fecha),
      isoString: new Date(fecha).toISOString(),
      toLocaleStringPE: new Date(fecha).toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      getUTCDate: new Date(fecha).getUTCDate(),
      getDate: new Date(fecha).getDate(),
      timeZoneOffset: new Date(fecha).getTimezoneOffset() / 60
    });
  }
  
  // Formatear fecha para input
  formatFechaInput(fechaInput: string): string {
    if (!fechaInput) return '';
    
    try {
      const fechaObj = new Date(fechaInput);
      if (isNaN(fechaObj.getTime())) return fechaInput;
      
      return fechaObj.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error en formatFechaInput:', error, 'Fecha:', fechaInput);
      return fechaInput;
    }
  }
// En fecha.service.ts - AÑADE este método
extraerSoloFecha(fechaCompleta: string): string {
  if (!fechaCompleta) return '';
  
  try {
    // Si viene con formato ISO (2026-01-15T12:00:00-05:00)
    if (fechaCompleta.includes('T')) {
      return fechaCompleta.substring(0, 10); // "2026-01-15"
    }
    
    // Si ya viene solo como fecha
    if (fechaCompleta.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fechaCompleta;
    }
    
    // Intentar crear fecha y extraer
    const fechaObj = new Date(fechaCompleta);
    if (!isNaN(fechaObj.getTime())) {
      const anio = fechaObj.getFullYear();
      const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
      const dia = fechaObj.getDate().toString().padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }
    
    return fechaCompleta;
  } catch (error) {
    console.error('Error extrayendo fecha:', error, 'Fecha:', fechaCompleta);
    return fechaCompleta;
  }
}






}