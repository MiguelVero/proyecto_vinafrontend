import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CategoriaListComponent } from '../../categoria-list/categoria-list.component';
import { MarcaListComponent } from '../../marca-list/marca-list.component';

@Component({
  selector: 'app-catalogos-unificados',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    CategoriaListComponent, // Importamos el componente de categorías
    MarcaListComponent      // Importamos el componente de marcas
  ],
  templateUrl: './catalogos-unificados.component.html',
  styleUrls: ['./catalogos-unificados.component.css']
})
export class CatalogosUnificadosComponent {
  // Este componente actuará como contenedor de pestañas
}