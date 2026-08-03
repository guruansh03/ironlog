import { toTrend, average, arrayMax, normalize, byDateFill } from '../analytics';

describe('analytics utilities', () => {
  describe('toTrend', () => {
    it('returns 0 for less than 2 values', () => {
      expect(toTrend([])).toBe(0);
      expect(toTrend([5])).toBe(0);
    });

    it('calculates positive trend', () => {
      expect(toTrend([10, 20])).toBe(100);
    });

    it('calculates negative trend', () => {
      expect(toTrend([20, 10])).toBe(-50);
    });

    it('handles zero first value', () => {
      expect(toTrend([0, 10])).toBe(100);
      expect(toTrend([0, 0])).toBe(0);
    });
  });

  describe('average', () => {
    it('returns 0 for empty array', () => {
      expect(average([])).toBe(0);
    });

    it('calculates average correctly', () => {
      expect(average([2, 4, 6])).toBe(4);
    });
  });

  describe('arrayMax', () => {
    it('returns 0 for empty array', () => {
      expect(arrayMax([])).toBe(0);
    });

    it('finds maximum value', () => {
      expect(arrayMax([3, 1, 9, 2])).toBe(9);
    });
  });

  describe('normalize', () => {
    it('returns empty array for empty input', () => {
      expect(normalize([])).toEqual([]);
    });

    it('returns zeros when max is 0 or negative', () => {
      expect(normalize([0, 0])).toEqual([0, 0]);
      expect(normalize([-5, -2])).toEqual([0, 0]);
    });

    it('normalizes to max of 1', () => {
      expect(normalize([10, 20, 30])).toEqual([1 / 3, 2 / 3, 1]);
    });
  });

  describe('byDateFill', () => {
    it('fills missing dates with 0', () => {
      const records = [{ date: '2024-01-01', value: 5 }];
      const days = ['2024-01-01', '2024-01-02'];
      expect(byDateFill(records, days)).toEqual([5, 0]);
    });

    it('returns values in correct order', () => {
      const records = [
        { date: '2024-01-02', value: 3 },
        { date: '2024-01-01', value: 7 },
      ];
      const days = ['2024-01-01', '2024-01-02'];
      expect(byDateFill(records, days)).toEqual([7, 3]);
    });
  });
});
