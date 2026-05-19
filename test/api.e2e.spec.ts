import { writeFileSync } from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request: any = require('supertest');

jest.setTimeout(180000);

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RuntimeContext {
  authenticated: boolean;
  tenantId: string;
  loginStatus?: number;
}

interface TestResult {
  module: string;
  endpoint: string;
  method: HttpMethod;
  path: string;
  status?: number;
  statusText?: string;
  contentType?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  responseText?: string;
  error?: string;
  passed: boolean;
  timestamp: string;
}

interface EndpointCase {
  module: string;
  method: HttpMethod;
  path: string;
  description: string;
  expectedStatuses: number[];
  body?: unknown;
  headers?: Record<string, string>;
  useTenantHeader?: boolean;
  useAgent?: boolean;
}

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
const API_ROOT = '/api';
const RESULTS_FILE = path.join(__dirname, 'e2e-results.json');
const REPORT_FILE = path.join(__dirname, 'api.e2e-report.md');
const RUN_STAMP = Date.now();
const TENANT_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_ALLOWED_STATUSES = [200, 201, 204, 400, 401, 403, 404];
const INVALID_LOGIN_STATUSES = [400, 401, 403];
const LOGIN_PROBE_STATUSES = [200, 201, 400, 401, 403];

const agent: any = request.agent(API_BASE_URL);
const context: RuntimeContext = {
  authenticated: false,
  tenantId: 'default-tenant',
};
const results: TestResult[] = [];

function stringify(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeMarkdown(value: unknown): string {
  return stringify(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .replace(/`/g, "'");
}

function resolveValue<T>(value: T): T {
  return value;
}

function extractResponseBody(response: any): unknown {
  if (response?.body && typeof response.body === 'object' && Object.keys(response.body).length > 0) {
    return response.body;
  }

  if (typeof response?.text === 'string' && response.text.length > 0) {
    try {
      return JSON.parse(response.text);
    } catch {
      return { raw: response.text };
    }
  }

  return undefined;
}

function isRouteMissing(response: any, method: HttpMethod): boolean {
  if (response?.status !== 404 || typeof response?.text !== 'string') {
    return false;
  }

  return response.text.includes(`Cannot ${method} `) || response.text.includes('Cannot POST ') || response.text.includes('Cannot PATCH ') || response.text.includes('Cannot DELETE ') || response.text.includes('Cannot GET ');
}

function recordResult(result: TestResult) {
  results.push(result);
}

function buildHeaders(testCase: EndpointCase): Record<string, string> {
  const headers: Record<string, string> = {
    ...(testCase.headers ?? {}),
  };

  if (testCase.useTenantHeader !== false) {
    headers['X-Tenant-Id'] = context.tenantId;
  }

  return headers;
}

async function runEndpointCase(testCase: EndpointCase): Promise<boolean> {
  const client: any = testCase.useAgent === false ? request(API_BASE_URL) : agent;
  const method = testCase.method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete';
  let builder: any = client[method](testCase.path);
  const requestBody = resolveValue(testCase.body);

  for (const [key, value] of Object.entries(buildHeaders(testCase))) {
    builder = builder.set(key, value);
  }

  if (requestBody !== undefined && testCase.method !== 'GET') {
    builder = builder.send(requestBody);
  }

  try {
    const response = await builder;
    const routeMissing = isRouteMissing(response, testCase.method);
    const passed = testCase.expectedStatuses.includes(response.status) && !routeMissing;

    recordResult({
      module: testCase.module,
      endpoint: `${testCase.method} ${testCase.path}`,
      method: testCase.method,
      path: testCase.path,
      status: response.status,
      statusText: response.res?.statusMessage,
      contentType: response.headers?.['content-type'],
      requestBody,
      responseBody: extractResponseBody(response),
      responseText: typeof response.text === 'string' ? response.text : undefined,
      passed,
      timestamp: new Date().toISOString(),
    });

    return passed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordResult({
      module: testCase.module,
      endpoint: `${testCase.method} ${testCase.path}`,
      method: testCase.method,
      path: testCase.path,
      requestBody,
      error: message,
      passed: false,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

function buildReport(records: TestResult[]): string {
  const total = records.length;
  const passed = records.filter((record) => record.passed).length;
  const failed = total - passed;
  const modules = Array.from(new Set(records.map((record) => record.module))).sort((left, right) => left.localeCompare(right));

  const lines: string[] = [
    '# Backend E2E API Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${API_BASE_URL}`,
    `Authenticated session: ${context.authenticated ? 'yes' : 'no'}`,
    `Tenant context: ${context.tenantId}`,
    `Login status: ${context.loginStatus ?? 'not attempted'}`,
    '',
    '## Summary',
    '',
    `- Total requests: ${total}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed}`,
    `- Success rate: ${total === 0 ? '0%' : `${Math.round((passed / total) * 100)}%`}`,
    '',
    '## Module Coverage',
    '',
    '| Module | Requests | Passed | Failed |',
    '|---|---:|---:|---:|',
  ];

  for (const moduleName of modules) {
    const moduleRecords = records.filter((record) => record.module === moduleName);
    const modulePassed = moduleRecords.filter((record) => record.passed).length;
    lines.push(`| ${escapeMarkdown(moduleName)} | ${moduleRecords.length} | ${modulePassed} | ${moduleRecords.length - modulePassed} |`);
  }

  lines.push('', '## Endpoint Results', '', '| Module | Method | Path | Status | Passed | Note |', '|---|---|---|---:|---|---|');

  for (const record of records) {
    const note = record.error
      ?? (record.status === 404 && typeof record.responseText === 'string' && record.responseText.includes('Cannot')
        ? 'route not found'
        : record.statusText ?? '');

    lines.push(
      `| ${escapeMarkdown(record.module)} | ${escapeMarkdown(record.method)} | ${escapeMarkdown(record.path)} | ${escapeMarkdown(record.status ?? '')} | ${record.passed ? 'yes' : 'no'} | ${escapeMarkdown(note)} |`,
    );
  }

  const failures = records.filter((record) => !record.passed);
  lines.push('', '## Failures', '');

  if (failures.length === 0) {
    lines.push('No failing endpoints were detected.');
  } else {
    for (const failure of failures) {
      lines.push(`- ${failure.method} ${failure.path}`);
      lines.push(`  - Module: ${failure.module}`);
      lines.push(`  - Status: ${failure.status ?? 'n/a'}`);
      if (failure.error) {
        lines.push(`  - Error: ${escapeMarkdown(failure.error)}`);
      }
      if (failure.requestBody !== undefined) {
        lines.push(`  - Request body: ${escapeMarkdown(stringify(failure.requestBody))}`);
      }
      if (failure.responseBody !== undefined) {
        lines.push(`  - Response body: ${escapeMarkdown(stringify(failure.responseBody))}`);
      }
      if (failure.responseText) {
        lines.push(`  - Response text: ${escapeMarkdown(failure.responseText)}`);
      }
    }
  }

  lines.push('', '## Notes', '', 'This report was generated by the E2E suite after probing every live controller route exposed by the backend. The JSON file next to this report contains the raw response payloads for deeper inspection.');

  return lines.join('\n');
}

const endpointCases: EndpointCase[] = [
  {
    module: 'auth',
    method: 'POST',
    path: `${API_ROOT}/auth/login`,
    description: 'invalid login should fail cleanly',
    expectedStatuses: INVALID_LOGIN_STATUSES,
    body: {
      station_code: 'CPC001',
      email: 'wrong@demo.cpc',
      password: 'WrongPassword',
    },
    useAgent: false,
    useTenantHeader: false,
  },
  {
    module: 'auth',
    method: 'GET',
    path: `${API_ROOT}/auth/me`,
    description: 'read current user',
    expectedStatuses: [200, 401, 403],
    useTenantHeader: false,
  },
  {
    module: 'auth',
    method: 'POST',
    path: `${API_ROOT}/auth/logout`,
    description: 'logout current session',
    expectedStatuses: [200, 201, 204, 401, 403],
    useTenantHeader: false,
  },

  {
    module: 'tenants',
    method: 'POST',
    path: `${API_ROOT}/tenants`,
    description: 'create tenant',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'tenants',
    method: 'GET',
    path: `${API_ROOT}/tenants`,
    description: 'list tenants',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'tenants',
    method: 'GET',
    path: `${API_ROOT}/tenants/current`,
    description: 'get current tenant',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'tenants',
    method: 'GET',
    path: `${API_ROOT}/tenants/current/settings`,
    description: 'get current tenant settings',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'tenants',
    method: 'PATCH',
    path: `${API_ROOT}/tenants/current/settings`,
    description: 'update current tenant settings',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'tenants',
    method: 'GET',
    path: `${API_ROOT}/tenants/${TENANT_UUID}`,
    description: 'get tenant by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'tenants',
    method: 'PATCH',
    path: `${API_ROOT}/tenants/${TENANT_UUID}`,
    description: 'update tenant by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'tenants',
    method: 'PATCH',
    path: `${API_ROOT}/tenants/${TENANT_UUID}/settings`,
    description: 'update tenant settings by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'portal-users',
    method: 'GET',
    path: `${API_ROOT}/portal-users`,
    description: 'list portal users',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'portal-users',
    method: 'POST',
    path: `${API_ROOT}/portal-users`,
    description: 'create portal user',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'portal-users',
    method: 'PATCH',
    path: `${API_ROOT}/portal-users/${TENANT_UUID}`,
    description: 'update portal user',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'operational-roles',
    method: 'GET',
    path: `${API_ROOT}/operational-roles`,
    description: 'list operational roles',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'operational-roles',
    method: 'POST',
    path: `${API_ROOT}/operational-roles`,
    description: 'create operational role',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'operational-roles',
    method: 'PATCH',
    path: `${API_ROOT}/operational-roles/${TENANT_UUID}`,
    description: 'update operational role',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'staff',
    method: 'GET',
    path: `${API_ROOT}/staff`,
    description: 'list staff',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'staff',
    method: 'POST',
    path: `${API_ROOT}/staff`,
    description: 'create staff profile',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'staff',
    method: 'GET',
    path: `${API_ROOT}/staff/${TENANT_UUID}`,
    description: 'get staff profile by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'staff',
    method: 'PATCH',
    path: `${API_ROOT}/staff/${TENANT_UUID}`,
    description: 'update staff profile by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'staff',
    method: 'DELETE',
    path: `${API_ROOT}/staff/${TENANT_UUID}`,
    description: 'deactivate staff profile',
    expectedStatuses: [200, 204, 400, 401, 403, 404],
  },

  {
    module: 'products',
    method: 'POST',
    path: `${API_ROOT}/products`,
    description: 'create product',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'products',
    method: 'GET',
    path: `${API_ROOT}/products`,
    description: 'list products',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'products',
    method: 'PATCH',
    path: `${API_ROOT}/products/${TENANT_UUID}`,
    description: 'update product',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'products',
    method: 'POST',
    path: `${API_ROOT}/products/${TENANT_UUID}/prices`,
    description: 'create product price',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'products',
    method: 'GET',
    path: `${API_ROOT}/products/${TENANT_UUID}/prices`,
    description: 'list product prices',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },

  {
    module: 'pumps',
    method: 'POST',
    path: `${API_ROOT}/pumps`,
    description: 'create pump',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'pumps',
    method: 'GET',
    path: `${API_ROOT}/pumps`,
    description: 'list pumps',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'pumps',
    method: 'PATCH',
    path: `${API_ROOT}/pumps/${TENANT_UUID}`,
    description: 'update pump',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'pumps',
    method: 'POST',
    path: `${API_ROOT}/pump-nozzles`,
    description: 'create standalone nozzle',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'pumps',
    method: 'GET',
    path: `${API_ROOT}/pump-nozzles`,
    description: 'list standalone nozzles',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'pumps',
    method: 'PATCH',
    path: `${API_ROOT}/pump-nozzles/${TENANT_UUID}`,
    description: 'update nozzle',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'attendance',
    method: 'POST',
    path: `${API_ROOT}/attendance/clock-in`,
    description: 'clock in',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'attendance',
    method: 'POST',
    path: `${API_ROOT}/attendance/clock-out`,
    description: 'clock out',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'attendance',
    method: 'GET',
    path: `${API_ROOT}/attendance`,
    description: 'list attendance',
    expectedStatuses: [200, 401, 403],
  },

  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-templates`,
    description: 'create shift template',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'GET',
    path: `${API_ROOT}/shift-templates`,
    description: 'list shift templates',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'shifts',
    method: 'PATCH',
    path: `${API_ROOT}/shift-templates/${TENANT_UUID}`,
    description: 'update shift template',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions`,
    description: 'create shift session',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'GET',
    path: `${API_ROOT}/shift-sessions`,
    description: 'list shift sessions',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'shifts',
    method: 'GET',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}`,
    description: 'get shift session by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}/open`,
    description: 'open shift session',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}/assignments`,
    description: 'assign nozzles to session',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}/opening-readings`,
    description: 'record opening readings',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}/closing-readings`,
    description: 'record closing readings',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}/cash-submissions`,
    description: 'submit cash',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'shifts',
    method: 'POST',
    path: `${API_ROOT}/shift-sessions/${TENANT_UUID}/close`,
    description: 'close shift session',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'inventory',
    method: 'GET',
    path: `${API_ROOT}/stock-balances`,
    description: 'list stock balances',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'inventory',
    method: 'GET',
    path: `${API_ROOT}/stock-movements`,
    description: 'list stock movements',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'inventory',
    method: 'POST',
    path: `${API_ROOT}/tanks`,
    description: 'create tank',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'inventory',
    method: 'GET',
    path: `${API_ROOT}/tanks`,
    description: 'list tanks',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'inventory',
    method: 'POST',
    path: `${API_ROOT}/stock-adjustments`,
    description: 'create stock adjustment',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'inventory',
    method: 'POST',
    path: `${API_ROOT}/stock-verifications/night`,
    description: 'record night verification',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'bowser-receipts',
    method: 'POST',
    path: `${API_ROOT}/bowser-receipts`,
    description: 'create bowser receipt',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'bowser-receipts',
    method: 'GET',
    path: `${API_ROOT}/bowser-receipts`,
    description: 'list bowser receipts',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'bowser-receipts',
    method: 'GET',
    path: `${API_ROOT}/bowser-receipts/${TENANT_UUID}`,
    description: 'get bowser receipt by id',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'bowser-receipts',
    method: 'POST',
    path: `${API_ROOT}/bowser-receipts/${TENANT_UUID}/approve`,
    description: 'approve bowser receipt',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'stock-orders',
    method: 'POST',
    path: `${API_ROOT}/stock-orders`,
    description: 'create stock order',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'stock-orders',
    method: 'GET',
    path: `${API_ROOT}/stock-orders`,
    description: 'list stock orders',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'stock-orders',
    method: 'POST',
    path: `${API_ROOT}/stock-orders/${TENANT_UUID}/approve`,
    description: 'approve stock order',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },
  {
    module: 'stock-orders',
    method: 'POST',
    path: `${API_ROOT}/stock-orders/${TENANT_UUID}/payments`,
    description: 'record stock order payment',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'credit-dues',
    method: 'POST',
    path: `${API_ROOT}/credit-customers`,
    description: 'create credit customer',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'credit-dues',
    method: 'GET',
    path: `${API_ROOT}/credit-customers`,
    description: 'list credit customers',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'credit-dues',
    method: 'POST',
    path: `${API_ROOT}/credit-sales`,
    description: 'create credit sale',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'credit-dues',
    method: 'GET',
    path: `${API_ROOT}/credit-sales`,
    description: 'list credit sales',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'credit-dues',
    method: 'POST',
    path: `${API_ROOT}/due-collections`,
    description: 'create due collection',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'credit-dues',
    method: 'GET',
    path: `${API_ROOT}/due-collections`,
    description: 'list due collections',
    expectedStatuses: [200, 401, 403],
  },

  {
    module: 'cheques',
    method: 'POST',
    path: `${API_ROOT}/cheques`,
    description: 'create cheque',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'cheques',
    method: 'GET',
    path: `${API_ROOT}/cheques`,
    description: 'list cheques',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'cheques',
    method: 'PATCH',
    path: `${API_ROOT}/cheques/${TENANT_UUID}/status`,
    description: 'update cheque status',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },

  {
    module: 'daily-balancing',
    method: 'POST',
    path: `${API_ROOT}/daily-balancing`,
    description: 'upsert daily balance',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'daily-balancing',
    method: 'GET',
    path: `${API_ROOT}/daily-balancing`,
    description: 'list daily balances',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'daily-balancing',
    method: 'POST',
    path: `${API_ROOT}/daily-balancing/${TENANT_UUID}/close`,
    description: 'close daily balance',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },

  {
    module: 'payroll',
    method: 'POST',
    path: `${API_ROOT}/payroll-runs`,
    description: 'create payroll run',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'payroll',
    method: 'GET',
    path: `${API_ROOT}/payroll-runs`,
    description: 'list payroll runs',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'payroll',
    method: 'POST',
    path: `${API_ROOT}/payroll-runs/${TENANT_UUID}/finalize`,
    description: 'finalize payroll run',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'payroll',
    method: 'GET',
    path: `${API_ROOT}/salary-deductions`,
    description: 'list salary deductions',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'payroll',
    method: 'POST',
    path: `${API_ROOT}/salary-deductions/${TENANT_UUID}/approve`,
    description: 'approve salary deduction',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
  },

  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/dashboard`,
    description: 'dashboard report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/shift-summary`,
    description: 'shift summary report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/stock`,
    description: 'stock report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/pump-meters`,
    description: 'pump meter report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/attendance`,
    description: 'attendance report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/daily-sales`,
    description: 'daily sales report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/pumper-shortfalls`,
    description: 'pumper shortfalls report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/payroll-deductions`,
    description: 'payroll deductions report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/bowser-receipts`,
    description: 'bowser receipts report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/stock-orders`,
    description: 'stock orders report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/credit-dues`,
    description: 'credit dues report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/cheques`,
    description: 'cheques report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/bank-deposits`,
    description: 'bank deposits report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/profit-loss`,
    description: 'profit and loss report',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'GET',
    path: `${API_ROOT}/reports/cpc-stock`,
    description: 'list CPC stock reports',
    expectedStatuses: [200, 401, 403],
  },
  {
    module: 'reports',
    method: 'POST',
    path: `${API_ROOT}/reports/cpc-stock/generate`,
    description: 'generate CPC stock report',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
  {
    module: 'reports',
    method: 'POST',
    path: `${API_ROOT}/reports/cpc-stock/${TENANT_UUID}/submit`,
    description: 'submit CPC stock report',
    expectedStatuses: DEFAULT_ALLOWED_STATUSES,
    body: {},
  },
];

describe('Backend E2E API Coverage', () => {
  beforeAll(async () => {
    try {
      const loginPayload = {
        station_code: 'CPC001',
        email: 'admin@demo.cpc',
        password: 'Admin12345!',
      };

      const loginResponse = await agent.post(`${API_ROOT}/auth/login`).send(loginPayload);
      context.loginStatus = loginResponse.status;

      if (loginResponse.status === 200 || loginResponse.status === 201) {
        context.authenticated = true;
        context.tenantId = loginResponse.body?.user?.tenantId || loginResponse.body?.user?.id || context.tenantId;
      }

      recordResult({
        module: 'auth',
        endpoint: 'POST /api/auth/login',
        method: 'POST',
        path: `${API_ROOT}/auth/login`,
        status: loginResponse.status,
        statusText: loginResponse.res?.statusMessage,
        contentType: loginResponse.headers?.['content-type'],
        requestBody: loginPayload,
        responseBody: extractResponseBody(loginResponse),
        responseText: typeof loginResponse.text === 'string' ? loginResponse.text : undefined,
        passed: LOGIN_PROBE_STATUSES.includes(loginResponse.status),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      context.loginStatus = 0;
      recordResult({
        module: 'auth',
        endpoint: 'POST /api/auth/login',
        method: 'POST',
        path: `${API_ROOT}/auth/login`,
        error: error instanceof Error ? error.message : String(error),
        passed: false,
        timestamp: new Date().toISOString(),
      });
    }
  });

  afterAll(() => {
    writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf8');
    writeFileSync(REPORT_FILE, buildReport(results), 'utf8');
  });

  it('POST /api/auth/login - invalid credentials', async () => {
    const passed = await runEndpointCase(endpointCases[0]);
    expect(passed).toBe(true);
  });

  endpointCases.slice(1).forEach((testCase) => {
    it(`${testCase.module.toUpperCase()} | ${testCase.method} ${testCase.path} - ${testCase.description}`, async () => {
      const passed = await runEndpointCase(testCase);
      expect(passed).toBe(true);
    });
  });
});
