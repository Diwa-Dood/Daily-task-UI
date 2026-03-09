import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeFormat',
    standalone: true
})
export class TimeFormatPipe implements PipeTransform {
    /**
     * Converts decimal hours (e.g. 1.25) to Hour-Minute format (e.g. 1H 15M).
     * Logic:
     * - hours = floor(decimalTime)
     * - minutes = round((decimalTime - hours) * 60)
     * Display Rules:
     * - If hours = 0 -> show only minutes (e.g. 15M)
     * - If minutes = 0 -> show only hours (e.g. 2H)
     * - Otherwise show both (e.g. 1H 30M)
     * 
     * @param value Decimal hours
     * @returns Formatted string
     */
    transform(value: number | string | undefined | null): string {
        if (value === null || value === undefined || value === '') return '0M';

        const decimalTime = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(decimalTime) || decimalTime === 0) return '0M';

        const hours = Math.floor(decimalTime);
        const minutes = Math.round((decimalTime - hours) * 60);

        if (hours === 0) {
            return `${minutes}M`;
        } else if (minutes === 0) {
            return `${hours}H`;
        } else {
            return `${hours}H ${minutes}M`;
        }
    }
}
