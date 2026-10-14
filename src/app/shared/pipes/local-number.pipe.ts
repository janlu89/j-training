import { Pipe, PipeTransform } from '@angular/core';

/** Formats a number in the given UI language ("62,5" in Italian, "62.5" in English). */
@Pipe({ name: 'localNumber' })
export class LocalNumberPipe implements PipeTransform {
  transform(value: number, language: string): string {
    return new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value);
  }
}
