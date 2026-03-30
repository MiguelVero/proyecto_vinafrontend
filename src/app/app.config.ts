// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { LOCALE_ID } from '@angular/core';
import localeEsPe from '@angular/common/locales/es-PE';
import { registerLocaleData } from '@angular/common';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

// Importaciones de Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';

// ✅ AGREGAR ESTAS IMPORTACIONES PARA EL DATEPICKER
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
registerLocaleData(localeEsPe, 'es-PE');

// ✅ FORMATO DE FECHA PERSONALIZADO PARA PERÚ
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-PE' },
    // ✅ AGREGAR ESTOS PROVEEDORES PARA EL DATEPICKER
    { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimations(),
    
    // Proveedores de Material
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDialogModule,
    MatDatepickerModule, // ✅ AGREGAR ESTE MÓDULO
    MatNativeDateModule,
    BreakpointObserver, // ✅ AGREGAR ESTE MÓDULO
   {
      provide: 'BREAKPOINTS',
      useValue: {
        handset: Breakpoints.Handset,
        tablet: Breakpoints.Tablet,
        web: Breakpoints.Web,
        handsetPortrait: Breakpoints.HandsetPortrait,
        tabletPortrait: Breakpoints.TabletPortrait,
        webPortrait: Breakpoints.WebPortrait,
      }
    }
  ]
};