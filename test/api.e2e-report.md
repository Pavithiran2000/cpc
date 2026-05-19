# Backend E2E API Report

Generated: 2026-04-30T23:26:41.764Z
Base URL: http://localhost:4000
Authenticated session: no
Tenant context: default-tenant
Login status: 500

## Summary

- Total requests: 97
- Passed: 96
- Failed: 1
- Success rate: 99%

## Module Coverage

| Module | Requests | Passed | Failed |
|---|---:|---:|---:|
| attendance | 3 | 3 | 0 |
| auth | 4 | 3 | 1 |
| bowser-receipts | 4 | 4 | 0 |
| cheques | 3 | 3 | 0 |
| credit-dues | 6 | 6 | 0 |
| daily-balancing | 3 | 3 | 0 |
| inventory | 6 | 6 | 0 |
| operational-roles | 3 | 3 | 0 |
| payroll | 5 | 5 | 0 |
| portal-users | 3 | 3 | 0 |
| products | 5 | 5 | 0 |
| pumps | 6 | 6 | 0 |
| reports | 17 | 17 | 0 |
| shifts | 12 | 12 | 0 |
| staff | 5 | 5 | 0 |
| stock-orders | 4 | 4 | 0 |
| tenants | 8 | 8 | 0 |

## Endpoint Results

| Module | Method | Path | Status | Passed | Note |
|---|---|---|---:|---|---|
| auth | POST | /api/auth/login | 500 | no | Internal Server Error |
| auth | POST | /api/auth/login | 401 | yes | Unauthorized |
| auth | GET | /api/auth/me | 401 | yes | Unauthorized |
| auth | POST | /api/auth/logout | 401 | yes | Unauthorized |
| tenants | POST | /api/tenants | 401 | yes | Unauthorized |
| tenants | GET | /api/tenants | 401 | yes | Unauthorized |
| tenants | GET | /api/tenants/current | 401 | yes | Unauthorized |
| tenants | GET | /api/tenants/current/settings | 401 | yes | Unauthorized |
| tenants | PATCH | /api/tenants/current/settings | 401 | yes | Unauthorized |
| tenants | GET | /api/tenants/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| tenants | PATCH | /api/tenants/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| tenants | PATCH | /api/tenants/550e8400-e29b-41d4-a716-446655440000/settings | 401 | yes | Unauthorized |
| portal-users | GET | /api/portal-users | 401 | yes | Unauthorized |
| portal-users | POST | /api/portal-users | 401 | yes | Unauthorized |
| portal-users | PATCH | /api/portal-users/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| operational-roles | GET | /api/operational-roles | 401 | yes | Unauthorized |
| operational-roles | POST | /api/operational-roles | 401 | yes | Unauthorized |
| operational-roles | PATCH | /api/operational-roles/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| staff | GET | /api/staff | 401 | yes | Unauthorized |
| staff | POST | /api/staff | 401 | yes | Unauthorized |
| staff | GET | /api/staff/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| staff | PATCH | /api/staff/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| staff | DELETE | /api/staff/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| products | POST | /api/products | 401 | yes | Unauthorized |
| products | GET | /api/products | 401 | yes | Unauthorized |
| products | PATCH | /api/products/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| products | POST | /api/products/550e8400-e29b-41d4-a716-446655440000/prices | 401 | yes | Unauthorized |
| products | GET | /api/products/550e8400-e29b-41d4-a716-446655440000/prices | 401 | yes | Unauthorized |
| pumps | POST | /api/pumps | 401 | yes | Unauthorized |
| pumps | GET | /api/pumps | 401 | yes | Unauthorized |
| pumps | PATCH | /api/pumps/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| pumps | POST | /api/pump-nozzles | 401 | yes | Unauthorized |
| pumps | GET | /api/pump-nozzles | 401 | yes | Unauthorized |
| pumps | PATCH | /api/pump-nozzles/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| attendance | POST | /api/attendance/clock-in | 401 | yes | Unauthorized |
| attendance | POST | /api/attendance/clock-out | 401 | yes | Unauthorized |
| attendance | GET | /api/attendance | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-templates | 401 | yes | Unauthorized |
| shifts | GET | /api/shift-templates | 401 | yes | Unauthorized |
| shifts | PATCH | /api/shift-templates/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions | 401 | yes | Unauthorized |
| shifts | GET | /api/shift-sessions | 401 | yes | Unauthorized |
| shifts | GET | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/open | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/assignments | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/opening-readings | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/closing-readings | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/cash-submissions | 401 | yes | Unauthorized |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/close | 401 | yes | Unauthorized |
| inventory | GET | /api/stock-balances | 401 | yes | Unauthorized |
| inventory | GET | /api/stock-movements | 401 | yes | Unauthorized |
| inventory | POST | /api/tanks | 401 | yes | Unauthorized |
| inventory | GET | /api/tanks | 401 | yes | Unauthorized |
| inventory | POST | /api/stock-adjustments | 401 | yes | Unauthorized |
| inventory | POST | /api/stock-verifications/night | 401 | yes | Unauthorized |
| bowser-receipts | POST | /api/bowser-receipts | 401 | yes | Unauthorized |
| bowser-receipts | GET | /api/bowser-receipts | 401 | yes | Unauthorized |
| bowser-receipts | GET | /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000 | 401 | yes | Unauthorized |
| bowser-receipts | POST | /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000/approve | 401 | yes | Unauthorized |
| stock-orders | POST | /api/stock-orders | 401 | yes | Unauthorized |
| stock-orders | GET | /api/stock-orders | 401 | yes | Unauthorized |
| stock-orders | POST | /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/approve | 401 | yes | Unauthorized |
| stock-orders | POST | /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/payments | 401 | yes | Unauthorized |
| credit-dues | POST | /api/credit-customers | 401 | yes | Unauthorized |
| credit-dues | GET | /api/credit-customers | 401 | yes | Unauthorized |
| credit-dues | POST | /api/credit-sales | 401 | yes | Unauthorized |
| credit-dues | GET | /api/credit-sales | 401 | yes | Unauthorized |
| credit-dues | POST | /api/due-collections | 401 | yes | Unauthorized |
| credit-dues | GET | /api/due-collections | 401 | yes | Unauthorized |
| cheques | POST | /api/cheques | 401 | yes | Unauthorized |
| cheques | GET | /api/cheques | 401 | yes | Unauthorized |
| cheques | PATCH | /api/cheques/550e8400-e29b-41d4-a716-446655440000/status | 401 | yes | Unauthorized |
| daily-balancing | POST | /api/daily-balancing | 401 | yes | Unauthorized |
| daily-balancing | GET | /api/daily-balancing | 401 | yes | Unauthorized |
| daily-balancing | POST | /api/daily-balancing/550e8400-e29b-41d4-a716-446655440000/close | 401 | yes | Unauthorized |
| payroll | POST | /api/payroll-runs | 401 | yes | Unauthorized |
| payroll | GET | /api/payroll-runs | 401 | yes | Unauthorized |
| payroll | POST | /api/payroll-runs/550e8400-e29b-41d4-a716-446655440000/finalize | 401 | yes | Unauthorized |
| payroll | GET | /api/salary-deductions | 401 | yes | Unauthorized |
| payroll | POST | /api/salary-deductions/550e8400-e29b-41d4-a716-446655440000/approve | 401 | yes | Unauthorized |
| reports | GET | /api/reports/dashboard | 401 | yes | Unauthorized |
| reports | GET | /api/reports/shift-summary | 401 | yes | Unauthorized |
| reports | GET | /api/reports/stock | 401 | yes | Unauthorized |
| reports | GET | /api/reports/pump-meters | 401 | yes | Unauthorized |
| reports | GET | /api/reports/attendance | 401 | yes | Unauthorized |
| reports | GET | /api/reports/daily-sales | 401 | yes | Unauthorized |
| reports | GET | /api/reports/pumper-shortfalls | 401 | yes | Unauthorized |
| reports | GET | /api/reports/payroll-deductions | 401 | yes | Unauthorized |
| reports | GET | /api/reports/bowser-receipts | 401 | yes | Unauthorized |
| reports | GET | /api/reports/stock-orders | 401 | yes | Unauthorized |
| reports | GET | /api/reports/credit-dues | 401 | yes | Unauthorized |
| reports | GET | /api/reports/cheques | 401 | yes | Unauthorized |
| reports | GET | /api/reports/bank-deposits | 401 | yes | Unauthorized |
| reports | GET | /api/reports/profit-loss | 401 | yes | Unauthorized |
| reports | GET | /api/reports/cpc-stock | 401 | yes | Unauthorized |
| reports | POST | /api/reports/cpc-stock/generate | 401 | yes | Unauthorized |
| reports | POST | /api/reports/cpc-stock/550e8400-e29b-41d4-a716-446655440000/submit | 401 | yes | Unauthorized |

## Failures

- POST /api/auth/login
  - Module: auth
  - Status: 500
  - Request body: {"station_code":"CPC001","email":"admin@demo.cpc","password":"Admin12345!"}
  - Response body: {"statusCode":500,"message":"Internal server error"}
  - Response text: {"statusCode":500,"message":"Internal server error"}

## Notes

This report was generated by the E2E suite after probing every live controller route exposed by the backend. The JSON file next to this report contains the raw response payloads for deeper inspection.