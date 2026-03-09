import { TimeFormatPipe } from './time-format.pipe';

describe('TimeFormatPipe', () => {
    let pipe: TimeFormatPipe;

    beforeEach(() => {
        pipe = new TimeFormatPipe();
    });

    it('should create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    it('should convert 0.25 to 15M', () => {
        expect(pipe.transform(0.25)).toBe('15M');
    });

    it('should convert 0.50 to 30M', () => {
        expect(pipe.transform(0.50)).toBe('30M');
    });

    it('should convert 1.00 to 1H', () => {
        expect(pipe.transform(1.00)).toBe('1H');
    });

    it('should convert 1.25 to 1H 15M', () => {
        expect(pipe.transform(1.25)).toBe('1H 15M');
    });

    it('should convert 1.50 to 1H 30M', () => {
        expect(pipe.transform(1.50)).toBe('1H 30M');
    });

    it('should convert 2.75 to 2H 45M', () => {
        expect(pipe.transform(2.75)).toBe('2H 45M');
    });

    it('should handle string input', () => {
        expect(pipe.transform('1.5')).toBe('1H 30M');
    });

    it('should handle null/undefined/empty', () => {
        expect(pipe.transform(null)).toBe('0M');
        expect(pipe.transform(undefined)).toBe('0M');
        expect(pipe.transform('')).toBe('0M');
    });

    it('should handle 0', () => {
        expect(pipe.transform(0)).toBe('0M');
    });
});
