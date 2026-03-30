import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dniFormat',
  standalone: true
})

export class DniFormatPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    


    return value;
  }
}
