export function toDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  return Number(value);
}

export function money(value: number): string {
  return value.toFixed(2);
}

export function quantity(value: number): string {
  return value.toFixed(3);
}

export function calculateDispensed(
  openingReading: string | number,
  closingReading: string | number,
  meterCapacity?: string | number,
): { dispensed: number; isRollover: boolean } {
  const opening = toDecimal(openingReading);
  const closing = toDecimal(closingReading);
  if (closing >= opening) {
    return { dispensed: closing - opening, isRollover: false };
  }
  // Rollover detected
  const capacity = toDecimal(meterCapacity ?? 99999.999);
  return { dispensed: capacity - opening + closing, isRollover: true };
}

export function calculateExpectedCash(dispensedQuantity: string | number, unitPrice: string | number): number {
  return toDecimal(dispensedQuantity) * toDecimal(unitPrice);
}

export function calculateCashVariance(expectedCash: string | number, actualCash: string | number) {
  const expected = toDecimal(expectedCash);
  const actual = toDecimal(actualCash);
  return {
    variance: actual - expected,
    shortfall: Math.max(expected - actual, 0),
    excess: Math.max(actual - expected, 0),
  };
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const normalize = (start: string, end: string) => {
    const s = timeToMinutes(start);
    let e = timeToMinutes(end);
    if (e <= s) e += 24 * 60;
    return { s, e };
  };
  const a = normalize(startA, endA);
  const b = normalize(startB, endB);
  const candidates = [b, { s: b.s + 24 * 60, e: b.e + 24 * 60 }, { s: b.s - 24 * 60, e: b.e - 24 * 60 }];
  return candidates.some((candidate) => a.s < candidate.e && candidate.s < a.e);
}
