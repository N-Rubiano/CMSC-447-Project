import { describe, it, expect } from 'vitest';
import {
  resolveStampColor,
  pctToCanvas,
  getStampRadius,
  hexToRgba,
  hitTestStamp,
} from '../services/stampRenderer';

describe('stampRenderer utilities', () => {
  describe('resolveStampColor', () => {
    it('returns custom color when specified on stamp', () => {
      const stamp = { color: '#123456', status: 'open' };
      expect(resolveStampColor(stamp)).toBe('#123456');
    });

    it('returns correct color for open status', () => {
      const stamp = { status: 'open' };
      expect(resolveStampColor(stamp)).toBe('#EF4444');
    });

    it('returns correct color for closed status', () => {
      const stamp = { status: 'closed' };
      expect(resolveStampColor(stamp)).toBe('#22C55E');
    });

    it('returns correct color for pending status', () => {
      const stamp = { status: 'pending' };
      expect(resolveStampColor(stamp)).toBe('#F59E0B');
    });

    it('falls back to default color for unknown or missing status', () => {
      expect(resolveStampColor({})).toBe('#EF4444');
      expect(resolveStampColor({ status: 'unknown' })).toBe('#EF4444');
    });
  });

  describe('pctToCanvas', () => {
    it('accurately converts normalized percentages to pixel values', () => {
      const result = pctToCanvas(50, 25, 1000, 800);
      expect(result).toEqual({ cx: 500, cy: 200 });
    });

    it('handles 0% and 100% boundary coordinates', () => {
      expect(pctToCanvas(0, 0, 1920, 1080)).toEqual({ cx: 0, cy: 0 });
      expect(pctToCanvas(100, 100, 1920, 1080)).toEqual({ cx: 1920, cy: 1080 });
    });
  });

  describe('getStampRadius', () => {
    it('clamps radius to minimum 18px on small screens', () => {
      expect(getStampRadius(200)).toBe(18);
    });

    it('clamps radius to maximum 52px on massive screens', () => {
      expect(getStampRadius(5000)).toBe(52);
    });

    it('computes proportional radius for medium canvas sizes', () => {
      // 2.5% of 1000 = 25
      expect(getStampRadius(1000)).toBe(25);
    });
  });

  describe('hexToRgba', () => {
    it('converts 6-digit hex string to rgba format with specified alpha', () => {
      expect(hexToRgba('#EF4444', 0.5)).toBe('rgba(239,68,68,0.5)');
    });

    it('defaults alpha to 1 when omitted', () => {
      expect(hexToRgba('#000000')).toBe('rgba(0,0,0,1)');
    });
  });

  describe('hitTestStamp', () => {
    const stamps = [
      { id: 'stamp-1', x_pct: 20, y_pct: 30 },
      { id: 'stamp-2', x_pct: 80, y_pct: 70 },
    ];

    it('detects click directly on a stamp', () => {
      const hit = hitTestStamp(stamps, 20.5, 30.2, 1000, 800);
      expect(hit).not.toBeNull();
      expect(hit.id).toBe('stamp-1');
    });

    it('returns null when clicking empty space', () => {
      const hit = hitTestStamp(stamps, 50, 50, 1000, 800);
      expect(hit).toBeNull();
    });
  });
});
