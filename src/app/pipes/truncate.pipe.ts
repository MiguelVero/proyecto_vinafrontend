// frontend/src/app/pipes/truncate.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit: number = 25, completeWords: boolean = false, ellipsis: string = '...'): string {
    // Maneja null, undefined o string vacío
    if (!value) return '';
    
    // Si value no es string, conviértelo
    const stringValue = String(value);
    
    if (stringValue.length <= limit) return stringValue;

    if (completeWords) {
      limit = stringValue.substr(0, limit).lastIndexOf(' ');
      // Si no encuentra espacio, usa el límite original
      if (limit <= 0) limit = 25;
    }

    return stringValue.substr(0, limit) + ellipsis;
  }
}