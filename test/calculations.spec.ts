import { calculateCashVariance, calculateDispensed, calculateExpectedCash, rangesOverlap } from '../src/common/utils/calculations';

describe('CPC operational calculations', () => {
  it('calculates dispensed litres from meter readings', () => {
    expect(calculateDispensed('100.250', '150.750')).toBe(50.5);
  });

  it('rejects closing readings lower than opening readings', () => {
    expect(() => calculateDispensed('150.000', '100.000')).toThrow('Closing reading');
  });

  it('calculates expected cash and pumper variance', () => {
    const expected = calculateExpectedCash(20, 370);
    expect(expected).toBe(7400);
    expect(calculateCashVariance(expected, 7000)).toEqual({
      variance: -400,
      shortfall: 400,
      excess: 0,
    });
  });

  it('detects shift overlaps across midnight', () => {
    expect(rangesOverlap('21:00', '06:00', '05:30', '08:00')).toBe(true);
    expect(rangesOverlap('08:00', '13:30', '13:30', '21:00')).toBe(false);
  });
});
