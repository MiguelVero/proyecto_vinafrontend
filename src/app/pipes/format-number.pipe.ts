import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatNumber',
  standalone: true
})
export class FormatNumberPipe implements PipeTransform {
  transform(value: any, decimals: number = 0): string {
    if (value === null || value === undefined) return '0';
    
    // Convertir a número
    const num = Number(value);
    
    if (isNaN(num)) return '0';
    
    // Formatear sin decimales si es un entero, con decimales si tiene
    if (Number.isInteger(num)) {
      return num.toString();
    } else {
      return num.toFixed(decimals);
    }
  }
}