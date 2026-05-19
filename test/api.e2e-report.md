# Backend E2E API Report

Generated: 2026-05-19T13:42:39.028Z
Base URL: http://localhost:4000
Authenticated session: yes
Tenant context: 5fa3c25a-225c-4da1-b15f-16f09c5171c4
Login status: 201

## Summary

- Total requests: 97
- Passed: 97
- Failed: 0
- Success rate: 100%

## Module Coverage

| Module | Requests | Passed | Failed |
|---|---:|---:|---:|
| attendance | 3 | 3 | 0 |
| auth | 4 | 4 | 0 |
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
| auth | POST | /api/auth/login | 201 | yes | Created |
| auth | POST | /api/auth/login | 401 | yes | Unauthorized |
| auth | GET | /api/auth/me | 200 | yes | OK |
| tenants | POST | /api/tenants | 400 | yes | Bad Request |
| tenants | GET | /api/tenants | 200 | yes | OK |
| tenants | GET | /api/tenants/current | 200 | yes | OK |
| tenants | GET | /api/tenants/current/settings | 200 | yes | OK |
| tenants | PATCH | /api/tenants/current/settings | 400 | yes | Bad Request |
| tenants | GET | /api/tenants/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| tenants | PATCH | /api/tenants/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| tenants | PATCH | /api/tenants/550e8400-e29b-41d4-a716-446655440000/settings | 400 | yes | Bad Request |
| portal-users | GET | /api/portal-users | 200 | yes | OK |
| portal-users | POST | /api/portal-users | 400 | yes | Bad Request |
| portal-users | PATCH | /api/portal-users/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| operational-roles | GET | /api/operational-roles | 200 | yes | OK |
| operational-roles | POST | /api/operational-roles | 400 | yes | Bad Request |
| operational-roles | PATCH | /api/operational-roles/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| staff | GET | /api/staff | 200 | yes | OK |
| staff | POST | /api/staff | 400 | yes | Bad Request |
| staff | GET | /api/staff/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| staff | PATCH | /api/staff/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| staff | DELETE | /api/staff/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| products | POST | /api/products | 400 | yes | Bad Request |
| products | GET | /api/products | 200 | yes | OK |
| products | PATCH | /api/products/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| products | POST | /api/products/550e8400-e29b-41d4-a716-446655440000/prices | 400 | yes | Bad Request |
| products | GET | /api/products/550e8400-e29b-41d4-a716-446655440000/prices | 200 | yes | OK |
| pumps | POST | /api/pumps | 400 | yes | Bad Request |
| pumps | GET | /api/pumps | 200 | yes | OK |
| pumps | PATCH | /api/pumps/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| pumps | POST | /api/pump-nozzles | 400 | yes | Bad Request |
| pumps | GET | /api/pump-nozzles | 200 | yes | OK |
| pumps | PATCH | /api/pump-nozzles/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| attendance | POST | /api/attendance/clock-in | 400 | yes | Bad Request |
| attendance | POST | /api/attendance/clock-out | 400 | yes | Bad Request |
| attendance | GET | /api/attendance | 200 | yes | OK |
| shifts | POST | /api/shift-templates | 400 | yes | Bad Request |
| shifts | GET | /api/shift-templates | 200 | yes | OK |
| shifts | PATCH | /api/shift-templates/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| shifts | POST | /api/shift-sessions | 400 | yes | Bad Request |
| shifts | GET | /api/shift-sessions | 200 | yes | OK |
| shifts | GET | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/open | 404 | yes | Not Found |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/assignments | 400 | yes | Bad Request |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/opening-readings | 400 | yes | Bad Request |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/closing-readings | 400 | yes | Bad Request |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/cash-submissions | 400 | yes | Bad Request |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/close | 400 | yes | Bad Request |
| inventory | GET | /api/stock-balances | 200 | yes | OK |
| inventory | GET | /api/stock-movements | 200 | yes | OK |
| inventory | POST | /api/tanks | 400 | yes | Bad Request |
| inventory | GET | /api/tanks | 200 | yes | OK |
| inventory | POST | /api/stock-adjustments | 400 | yes | Bad Request |
| inventory | POST | /api/stock-verifications/night | 400 | yes | Bad Request |
| bowser-receipts | POST | /api/bowser-receipts | 400 | yes | Bad Request |
| bowser-receipts | GET | /api/bowser-receipts | 200 | yes | OK |
| bowser-receipts | GET | /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000 | 404 | yes | Not Found |
| bowser-receipts | POST | /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000/approve | 404 | yes | Not Found |
| stock-orders | POST | /api/stock-orders | 400 | yes | Bad Request |
| stock-orders | GET | /api/stock-orders | 200 | yes | OK |
| stock-orders | POST | /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/approve | 404 | yes | Not Found |
| stock-orders | POST | /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/payments | 400 | yes | Bad Request |
| credit-dues | POST | /api/credit-customers | 400 | yes | Bad Request |
| credit-dues | GET | /api/credit-customers | 200 | yes | OK |
| credit-dues | POST | /api/credit-sales | 400 | yes | Bad Request |
| credit-dues | GET | /api/credit-sales | 200 | yes | OK |
| credit-dues | POST | /api/due-collections | 400 | yes | Bad Request |
| credit-dues | GET | /api/due-collections | 200 | yes | OK |
| cheques | POST | /api/cheques | 400 | yes | Bad Request |
| cheques | GET | /api/cheques | 200 | yes | OK |
| cheques | PATCH | /api/cheques/550e8400-e29b-41d4-a716-446655440000/status | 400 | yes | Bad Request |
| daily-balancing | POST | /api/daily-balancing | 400 | yes | Bad Request |
| daily-balancing | GET | /api/daily-balancing | 200 | yes | OK |
| daily-balancing | POST | /api/daily-balancing/550e8400-e29b-41d4-a716-446655440000/close | 404 | yes | Not Found |
| payroll | POST | /api/payroll-runs | 400 | yes | Bad Request |
| payroll | GET | /api/payroll-runs | 200 | yes | OK |
| payroll | POST | /api/payroll-runs/550e8400-e29b-41d4-a716-446655440000/finalize | 404 | yes | Not Found |
| payroll | GET | /api/salary-deductions | 200 | yes | OK |
| payroll | POST | /api/salary-deductions/550e8400-e29b-41d4-a716-446655440000/approve | 404 | yes | Not Found |
| reports | GET | /api/reports/dashboard | 200 | yes | OK |
| reports | GET | /api/reports/shift-summary | 200 | yes | OK |
| reports | GET | /api/reports/stock | 200 | yes | OK |
| reports | GET | /api/reports/pump-meters | 200 | yes | OK |
| reports | GET | /api/reports/attendance | 200 | yes | OK |
| reports | GET | /api/reports/daily-sales | 200 | yes | OK |
| reports | GET | /api/reports/pumper-shortfalls | 200 | yes | OK |
| reports | GET | /api/reports/payroll-deductions | 200 | yes | OK |
| reports | GET | /api/reports/bowser-receipts | 200 | yes | OK |
| reports | GET | /api/reports/stock-orders | 200 | yes | OK |
| reports | GET | /api/reports/credit-dues | 200 | yes | OK |
| reports | GET | /api/reports/cheques | 200 | yes | OK |
| reports | GET | /api/reports/bank-deposits | 200 | yes | OK |
| reports | GET | /api/reports/profit-loss | 200 | yes | OK |
| reports | GET | /api/reports/cpc-stock | 200 | yes | OK |
| reports | POST | /api/reports/cpc-stock/generate | 400 | yes | Bad Request |
| reports | POST | /api/reports/cpc-stock/550e8400-e29b-41d4-a716-446655440000/submit | 201 | yes | Created |
| auth | POST | /api/auth/logout | 201 | yes | Created |

## Failures

No failing endpoints were detected.

## Notes

This report was generated by the E2E suite after probing every live controller route exposed by the backend. The JSON file next to this report contains the raw response payloads for deeper inspection.