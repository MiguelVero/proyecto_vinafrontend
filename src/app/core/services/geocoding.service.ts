import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface Coordinates {
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) { }

  geocodeAddress(address: string): Observable<Coordinates | null> {
    if (!address || address.trim().length < 5) {
      return of(null);
    }

    const params = {
      q: address,
      format: 'json',
      limit: '1',
      addressdetails: '1',
      countrycodes: 'pe', // Priorizar Perú
      'accept-language': 'es' // Idioma español
    };

    return this.http.get<any[]>(this.nominatimUrl, { params }).pipe(
      map(response => {
        if (response && response.length > 0) {
          const result = response[0];
          console.log('Geocoding result:', result); // Para debug
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          };
        }
        return null;
      }),
      catchError(error => {
        console.error('Error en geocodificación:', error);
        return of(null);
      })
    );
  }

  geocodeFromAddress(direccion: string): Observable<Coordinates | null> {
    // Para clientes, usamos solo la dirección ya que no tenemos ubicación geográfica en la BD
    return this.geocodeAddress(direccion);
  }

  // Método alternativo para geocodificación inversa (si necesitas obtener dirección desde coordenadas)
  reverseGeocode(lat: number, lng: number): Observable<string | null> {
    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      'accept-language': 'es'
    };

    return this.http.get<any>(`https://nominatim.openstreetmap.org/reverse`, { params }).pipe(
      map(response => {
        if (response && response.display_name) {
          return response.display_name;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error en reverse geocoding:', error);
        return of(null);
      })
    );
  }
}