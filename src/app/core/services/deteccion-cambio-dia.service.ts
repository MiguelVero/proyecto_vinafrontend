// src/app/core/services/deteccion-cambio-dia.service.ts
import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { EntregaDineroService } from './entrega-dinero.service';

@Injectable({
  providedIn: 'root'
})
export class DeteccionCambioDiaService implements OnDestroy {
  private router = inject(Router);
  private entregaDineroService = inject(EntregaDineroService);
  
  private ultimoDiaConocido: string = '';
  private intervalId: any;
  
  constructor() {
    // Solicitar permiso para notificaciones
    this.solicitarPermisoNotificaciones();
    this.iniciarMonitorCambioDia();
  }
  
  private solicitarPermisoNotificaciones() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  
  iniciarMonitorCambioDia() {
    // Verificar cada minuto si cambió el día
    this.intervalId = setInterval(() => {
      this.verificarCambioDia();
    }, 60000); // Cada minuto
    
    // Verificar inmediatamente
    this.verificarCambioDia();
  }
  
  private verificarCambioDia() {
    const hoy = new Date().toISOString().split('T')[0];
    
    if (!this.ultimoDiaConocido) {
      this.ultimoDiaConocido = hoy;
      return;
    }
    
    if (this.ultimoDiaConocido !== hoy) {
      console.log('🔄 Cambio de día detectado:', this.ultimoDiaConocido, '→', hoy);
      this.ultimoDiaConocido = hoy;
      
      // Ejecutar acciones por cambio de día
      this.accionesCambioDia();
    }
  }
  
  private accionesCambioDia() {
    // 1. Verificar si hay dinero pendiente del día anterior
    this.verificarDineroPendienteAnterior();
    
    // 2. Notificar al usuario
    this.notificarCambioDia();
    
    // 3. Recargar datos si está en página de repartidor
    if (this.router.url.includes('/repartidor')) {
      setTimeout(() => {
        // Disparar evento para que componentes recarguen
        window.dispatchEvent(new Event('cambioDia'));
      }, 1000);
    }
  }
  
  private verificarDineroPendienteAnterior() {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().split('T')[0];
    
    // Llamar al backend para verificar si hay entregas pendientes
    this.entregaDineroService.getDineroPendienteTotal().subscribe({
      next: (response) => {
        if (response.success && response.data.total_pendiente > 0) {
          // Mostrar notificación al usuario
          this.mostrarNotificacionPendiente(response.data.total_pendiente);
        }
      },
      error: (error) => {
        console.error('Error verificando dinero pendiente:', error);
      }
    });
  }
  
  private mostrarNotificacionPendiente(monto: number) {
    // Usar notificaciones del navegador si están disponibles
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⚠️ Dinero Pendiente', {
          body: `Tienes S/ ${monto.toFixed(2)} pendiente de entrega del día anterior.`,
          // Usar icono SVG base64 como alternativa
          icon: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffc107">
              <circle cx="12" cy="12" r="10" fill="#fff"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          `)
        });
      } catch (error) {
        console.warn('No se pudo mostrar notificación:', error);
      }
    }
    
    // También mostrar alerta en la aplicación
    if (this.router.url.includes('/repartidor')) {
      setTimeout(() => {
        const alerta = confirm(
          `⚠️ ATENCIÓN: Cambio de día detectado\n\n` +
          `Tienes S/ ${monto.toFixed(2)} pendiente de entrega del día anterior.\n\n` +
          `¿Deseas ver el detalle del dinero pendiente?`
        );
        
        if (alerta) {
          // Disparar evento para que el componente muestre los detalles
          const event = new CustomEvent('mostrarDineroPendiente', {
            detail: { monto: monto }
          });
          window.dispatchEvent(event);
        }
      }, 2000);
    }
  }
  
  private notificarCambioDia() {
    console.log('📅 El sistema ha detectado cambio de día. Actualizando datos...');
    
    // Enviar evento a todos los componentes
    const event = new CustomEvent('sistema:cambioDia', {
      detail: { 
        fechaAnterior: this.ultimoDiaConocido, 
        fechaActual: new Date().toISOString().split('T')[0] 
      }
    });
    window.dispatchEvent(event);
  }
  
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}