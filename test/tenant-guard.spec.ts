import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { PortalRole } from '../src/common/enums/portal-role.enum';

function context(request: Record<string, unknown>): ExecutionContext {
  class TestController {}
  const handler = () => undefined;
  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  it('sets tenant from JWT user and removes request tenant overrides', () => {
    const guard = new TenantGuard(new Reflector());
    const request: {
      user: { id: string; tenantId: string; portalRole: PortalRole; email: string };
      body: Record<string, string>;
      query: Record<string, string>;
      tenantId?: string;
    } = {
      user: { id: 'user-id', tenantId: 'tenant-a', portalRole: PortalRole.Admin, email: 'admin@test' },
      body: { tenant_id: 'tenant-b', name: 'x' },
      query: { tenant_id: 'tenant-c' },
    };
    expect(guard.canActivate(context(request))).toBe(true);
    expect(request.tenantId).toBe('tenant-a');
    expect(request.body).toEqual({ name: 'x' });
    expect(request.query).toEqual({});
  });

  it('rejects requests without authenticated tenant context', () => {
    const guard = new TenantGuard(new Reflector());
    expect(() => guard.canActivate(context({ user: { id: 'user-id' } }))).toThrow(ForbiddenException);
  });
});
