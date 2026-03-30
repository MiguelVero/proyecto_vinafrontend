import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat',
  standalone: true
})

export class PhoneFormatPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    const cleanValue = value.replace(/\D/g, '');


    return value;
  }
}
