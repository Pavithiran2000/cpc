import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function toSnake(s: string): string {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

export function transform(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;
  if (Array.isArray(val)) return val.map(transform);
  if (typeof val === 'object') {
    const out: Record<string, unknown> = Object.create(null);
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(k)) continue;
      out[toSnake(k)] = transform(v);
    }
    return out;
  }
  return val;
}

@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(transform));
  }
}
