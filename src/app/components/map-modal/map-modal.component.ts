import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // ← Agregar esta importación
import { GeocodingService } from '../../core/services/geocoding.service';
import { lastValueFrom } from 'rxjs'; // ← Usar lastValueFrom en lugar de toPromise

// Importar Leaflet correctamente
import * as L from 'leaflet';

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

@Component({
  selector: 'app-map-modal',
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule,
    MatProgressSpinnerModule // ← Agregar al array de imports
  ],
  templateUrl: './map-modal.component.html',
  styleUrl: './map-modal.component.css'
})
export class MapModalComponent implements AfterViewInit {
  private map: any;
  private marker: any;
  public uniqueId: string;
  public isLoading = true;
  public errorMessage: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<MapModalComponent>,
    private geocodingService: GeocodingService,
    @Inject(MAT_DIALOG_DATA) public data: {
      nombre: string;
      direccion: string;
      telefono: string;
      tipo_cliente: string;
      razon_social?: string;
      coordenadas?: string;
    }
  ) {
    this.uniqueId = this.generateUniqueId();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private generateUniqueId(): string {
    return 'map-' + Math.random().toString(36).substr(2, 9);
  }

  private async initMap(): Promise<void> {
    try {
      let coordinates: { lat: number; lng: number } | null = null;

      // Si ya tenemos coordenadas, las usamos
      if (this.data.coordenadas) {
        coordinates = this.parseCoordinates(this.data.coordenadas);
      }

      // Si no hay coordenadas, intentamos geocodificar la dirección
      if (!coordinates && this.data.direccion) {
        // Usar lastValueFrom en lugar de toPromise (que está deprecado)
        coordinates = await lastValueFrom(
          this.geocodingService.geocodeFromAddress(this.data.direccion)
        );
      }

      if (coordinates) {
        this.createMap(coordinates);
      } else {
        this.handleMapError('No se pudo determinar la ubicación');
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      this.handleMapError('Error al cargar el mapa');
    }
  }

  private createMap(coordinates: { lat: number; lng: number }): void {
    // Crear el mapa
    this.map = L.map(`map-${this.uniqueId}`).setView([coordinates.lat, coordinates.lng], 15);

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Crear contenido del popup
    const popupContent = this.createPopupContent();

    // Agregar marcador
    this.marker = L.marker([coordinates.lat, coordinates.lng])
      .addTo(this.map)
      .bindPopup(popupContent)
      .openPopup();

    // Ajustar el viewport
    setTimeout(() => {
      this.map.invalidateSize();
      this.isLoading = false;
    }, 100);
  }

  private createPopupContent(): string {
    return `
      <div class="popup-content">
        <strong>${this.data.nombre}</strong><br>
        ${this.data.razon_social ? `<em>${this.data.razon_social}</em><br>` : ''}
        <strong>Tipo:</strong> ${this.data.tipo_cliente}<br>
        <strong>Dirección:</strong> ${this.data.direccion}<br>
        ${this.data.telefono ? `<strong>Teléfono:</strong> ${this.data.telefono}` : ''}
      </div>
    `;
  }

  private handleMapError(message: string): void {
    this.errorMessage = message;
    this.isLoading = false;
    
    // Crear un mapa por defecto (Lima, Perú)
    const defaultCoordinates = { lat: -12.046374, lng: -77.042793 };
    this.createMap(defaultCoordinates);
    
    // Mostrar mensaje de advertencia
    if (this.map) {
      L.popup()
        .setLatLng(defaultCoordinates)
        .setContent(`
          <div class="popup-content">
            <strong>Ubicación aproximada</strong><br>
            <em>${message}</em><br>
            Mostrando ubicación por defecto (Lima, Perú)
          </div>
        `)
        .openOn(this.map);
    }
  }

  private parseCoordinates(coordenadas: string): { lat: number; lng: number } | null {
    if (!coordenadas) return null;

    try {
      const [latStr, lngStr] = coordenadas.split(',');
      const lat = parseFloat(latStr.trim());
      const lng = parseFloat(lngStr.trim());

      if (isNaN(lat) || isNaN(lng)) {
        return null;
      }

      return { lat, lng };
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return null;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}