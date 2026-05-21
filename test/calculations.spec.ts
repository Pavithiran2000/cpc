import { calculateCashVariance, calculateDispensed, calculateExpectedCash, rangesOverlap } from '../src/common/utils/calculations';

describe('CPC operational calculations', () => {
  it('calculates dispensed litres from meter readings', () => {
    expect(calculateDispensed('100.250', '150.750')).toEqual({
      dispensed: 50.5,
      isRollover: false,
    });
  });

  it('calculates dispensed litres across meter rollover', () => {
    expect(calculateDispensed('99990.000', '20.000', '99999.999')).toEqual({
      dispensed: 29.99899999999616,
      isRollover: true,
    });
  });

  it('calculates expected cash and pumper shortfall variance', () => {
    const expected = calculateExpectedCash(20, 370);
    expect(expected).toBe(7400);
    expect(calculateCashVariance(expected, 7000)).toEqual({
      variance: -400,
      shortfall: 400,
      excess: 0,
    });
  });

  it('calculates pumper excess and exact cash match', () => {
    expect(calculateCashVariance(7400, 7600)).toEqual({
      variance: 200,
      shortfall: 0,
      excess: 200,
    });
    expect(calculateCashVariance(7400, 7400)).toEqual({
      variance: 0,
      shortfall: 0,
      excess: 0,
    });
  });

  it('detects shift overlaps across midnight', () => {
    expect(rangesOverlap('21:00', '06:00', '05:30', '08:00')).toBe(true);
    expect(rangesOverlap('08:00', '13:30', '13:30', '21:00')).toBe(false);
  });
});
