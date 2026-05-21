# Backend E2E API Report

Generated: 2026-05-21T19:27:36.072Z
Base URL: http://localhost:4000
Authenticated session: no
Tenant context: default-tenant
Login status: 0

## Summary

- Total requests: 97
- Passed: 0
- Failed: 97
- Success rate: 0%

## Module Coverage

| Module | Requests | Passed | Failed |
|---|---:|---:|---:|
| attendance | 3 | 0 | 3 |
| auth | 4 | 0 | 4 |
| bowser-receipts | 4 | 0 | 4 |
| cheques | 3 | 0 | 3 |
| credit-dues | 6 | 0 | 6 |
| daily-balancing | 3 | 0 | 3 |
| inventory | 6 | 0 | 6 |
| operational-roles | 3 | 0 | 3 |
| payroll | 5 | 0 | 5 |
| portal-users | 3 | 0 | 3 |
| products | 5 | 0 | 5 |
| pumps | 6 | 0 | 6 |
| reports | 17 | 0 | 17 |
| shifts | 12 | 0 | 12 |
| staff | 5 | 0 | 5 |
| stock-orders | 4 | 0 | 4 |
| tenants | 8 | 0 | 8 |

## Endpoint Results

| Module | Method | Path | Status | Passed | Note |
|---|---|---|---:|---|---|
| auth | POST | /api/auth/login |  | no | AggregateError |
| auth | POST | /api/auth/login |  | no | AggregateError |
| auth | GET | /api/auth/me |  | no | AggregateError |
| tenants | POST | /api/tenants |  | no | AggregateError |
| tenants | GET | /api/tenants |  | no | AggregateError |
| tenants | GET | /api/tenants/current |  | no | AggregateError |
| tenants | GET | /api/tenants/current/settings |  | no | AggregateError |
| tenants | PATCH | /api/tenants/current/settings |  | no | AggregateError |
| tenants | GET | /api/tenants/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| tenants | PATCH | /api/tenants/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| tenants | PATCH | /api/tenants/550e8400-e29b-41d4-a716-446655440000/settings |  | no | AggregateError |
| portal-users | GET | /api/portal-users |  | no | AggregateError |
| portal-users | POST | /api/portal-users |  | no | AggregateError |
| portal-users | PATCH | /api/portal-users/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| operational-roles | GET | /api/operational-roles |  | no | AggregateError |
| operational-roles | POST | /api/operational-roles |  | no | AggregateError |
| operational-roles | PATCH | /api/operational-roles/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| staff | GET | /api/staff |  | no | AggregateError |
| staff | POST | /api/staff |  | no | AggregateError |
| staff | GET | /api/staff/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| staff | PATCH | /api/staff/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| staff | DELETE | /api/staff/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| products | POST | /api/products |  | no | AggregateError |
| products | GET | /api/products |  | no | AggregateError |
| products | PATCH | /api/products/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| products | POST | /api/products/550e8400-e29b-41d4-a716-446655440000/prices |  | no | AggregateError |
| products | GET | /api/products/550e8400-e29b-41d4-a716-446655440000/prices |  | no | AggregateError |
| pumps | POST | /api/pumps |  | no | AggregateError |
| pumps | GET | /api/pumps |  | no | AggregateError |
| pumps | PATCH | /api/pumps/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| pumps | POST | /api/pump-nozzles |  | no | AggregateError |
| pumps | GET | /api/pump-nozzles |  | no | AggregateError |
| pumps | PATCH | /api/pump-nozzles/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| attendance | POST | /api/attendance/clock-in |  | no | AggregateError |
| attendance | POST | /api/attendance/clock-out |  | no | AggregateError |
| attendance | GET | /api/attendance |  | no | AggregateError |
| shifts | POST | /api/shift-templates |  | no | AggregateError |
| shifts | GET | /api/shift-templates |  | no | AggregateError |
| shifts | PATCH | /api/shift-templates/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| shifts | POST | /api/shift-sessions |  | no | AggregateError |
| shifts | GET | /api/shift-sessions |  | no | AggregateError |
| shifts | GET | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/open |  | no | AggregateError |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/assignments |  | no | AggregateError |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/opening-readings |  | no | AggregateError |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/closing-readings |  | no | AggregateError |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/cash-submissions |  | no | AggregateError |
| shifts | POST | /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/close |  | no | AggregateError |
| inventory | GET | /api/stock-balances |  | no | AggregateError |
| inventory | GET | /api/stock-movements |  | no | AggregateError |
| inventory | POST | /api/tanks |  | no | AggregateError |
| inventory | GET | /api/tanks |  | no | AggregateError |
| inventory | POST | /api/stock-adjustments |  | no | AggregateError |
| inventory | POST | /api/stock-verifications/night |  | no | AggregateError |
| bowser-receipts | POST | /api/bowser-receipts |  | no | AggregateError |
| bowser-receipts | GET | /api/bowser-receipts |  | no | AggregateError |
| bowser-receipts | GET | /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000 |  | no | AggregateError |
| bowser-receipts | POST | /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000/approve |  | no | AggregateError |
| stock-orders | POST | /api/stock-orders |  | no | AggregateError |
| stock-orders | GET | /api/stock-orders |  | no | AggregateError |
| stock-orders | POST | /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/approve |  | no | AggregateError |
| stock-orders | POST | /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/payments |  | no | AggregateError |
| credit-dues | POST | /api/credit-customers |  | no | AggregateError |
| credit-dues | GET | /api/credit-customers |  | no | AggregateError |
| credit-dues | POST | /api/credit-sales |  | no | AggregateError |
| credit-dues | GET | /api/credit-sales |  | no | AggregateError |
| credit-dues | POST | /api/due-collections |  | no | AggregateError |
| credit-dues | GET | /api/due-collections |  | no | AggregateError |
| cheques | POST | /api/cheques |  | no | AggregateError |
| cheques | GET | /api/cheques |  | no | AggregateError |
| cheques | PATCH | /api/cheques/550e8400-e29b-41d4-a716-446655440000/status |  | no | AggregateError |
| daily-balancing | POST | /api/daily-balancing |  | no | AggregateError |
| daily-balancing | GET | /api/daily-balancing |  | no | AggregateError |
| daily-balancing | POST | /api/daily-balancing/550e8400-e29b-41d4-a716-446655440000/close |  | no | AggregateError |
| payroll | POST | /api/payroll-runs |  | no | AggregateError |
| payroll | GET | /api/payroll-runs |  | no | AggregateError |
| payroll | POST | /api/payroll-runs/550e8400-e29b-41d4-a716-446655440000/finalize |  | no | AggregateError |
| payroll | GET | /api/salary-deductions |  | no | AggregateError |
| payroll | POST | /api/salary-deductions/550e8400-e29b-41d4-a716-446655440000/approve |  | no | AggregateError |
| reports | GET | /api/reports/dashboard |  | no | AggregateError |
| reports | GET | /api/reports/shift-summary |  | no | AggregateError |
| reports | GET | /api/reports/stock |  | no | AggregateError |
| reports | GET | /api/reports/pump-meters |  | no | AggregateError |
| reports | GET | /api/reports/attendance |  | no | AggregateError |
| reports | GET | /api/reports/daily-sales |  | no | AggregateError |
| reports | GET | /api/reports/pumper-shortfalls |  | no | AggregateError |
| reports | GET | /api/reports/payroll-deductions |  | no | AggregateError |
| reports | GET | /api/reports/bowser-receipts |  | no | AggregateError |
| reports | GET | /api/reports/stock-orders |  | no | AggregateError |
| reports | GET | /api/reports/credit-dues |  | no | AggregateError |
| reports | GET | /api/reports/cheques |  | no | AggregateError |
| reports | GET | /api/reports/bank-deposits |  | no | AggregateError |
| reports | GET | /api/reports/profit-loss |  | no | AggregateError |
| reports | GET | /api/reports/cpc-stock |  | no | AggregateError |
| reports | POST | /api/reports/cpc-stock/generate |  | no | AggregateError |
| reports | POST | /api/reports/cpc-stock/550e8400-e29b-41d4-a716-446655440000/submit |  | no | AggregateError |
| auth | POST | /api/auth/logout |  | no | AggregateError |

## Failures

- POST /api/auth/login
  - Module: auth
  - Status: n/a
  - Error: AggregateError
- POST /api/auth/login
  - Module: auth
  - Status: n/a
  - Error: AggregateError
  - Request body: {"station_code":"CPC001","email":"wrong@demo.cpc","password":"WrongPassword"}
- GET /api/auth/me
  - Module: auth
  - Status: n/a
  - Error: AggregateError
- POST /api/tenants
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/tenants
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
- GET /api/tenants/current
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
- GET /api/tenants/current/settings
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
- PATCH /api/tenants/current/settings
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/tenants/550e8400-e29b-41d4-a716-446655440000
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
- PATCH /api/tenants/550e8400-e29b-41d4-a716-446655440000
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- PATCH /api/tenants/550e8400-e29b-41d4-a716-446655440000/settings
  - Module: tenants
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/portal-users
  - Module: portal-users
  - Status: n/a
  - Error: AggregateError
- POST /api/portal-users
  - Module: portal-users
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- PATCH /api/portal-users/550e8400-e29b-41d4-a716-446655440000
  - Module: portal-users
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/operational-roles
  - Module: operational-roles
  - Status: n/a
  - Error: AggregateError
- POST /api/operational-roles
  - Module: operational-roles
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- PATCH /api/operational-roles/550e8400-e29b-41d4-a716-446655440000
  - Module: operational-roles
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/staff
  - Module: staff
  - Status: n/a
  - Error: AggregateError
- POST /api/staff
  - Module: staff
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/staff/550e8400-e29b-41d4-a716-446655440000
  - Module: staff
  - Status: n/a
  - Error: AggregateError
- PATCH /api/staff/550e8400-e29b-41d4-a716-446655440000
  - Module: staff
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- DELETE /api/staff/550e8400-e29b-41d4-a716-446655440000
  - Module: staff
  - Status: n/a
  - Error: AggregateError
- POST /api/products
  - Module: products
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/products
  - Module: products
  - Status: n/a
  - Error: AggregateError
- PATCH /api/products/550e8400-e29b-41d4-a716-446655440000
  - Module: products
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/products/550e8400-e29b-41d4-a716-446655440000/prices
  - Module: products
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/products/550e8400-e29b-41d4-a716-446655440000/prices
  - Module: products
  - Status: n/a
  - Error: AggregateError
- POST /api/pumps
  - Module: pumps
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/pumps
  - Module: pumps
  - Status: n/a
  - Error: AggregateError
- PATCH /api/pumps/550e8400-e29b-41d4-a716-446655440000
  - Module: pumps
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/pump-nozzles
  - Module: pumps
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/pump-nozzles
  - Module: pumps
  - Status: n/a
  - Error: AggregateError
- PATCH /api/pump-nozzles/550e8400-e29b-41d4-a716-446655440000
  - Module: pumps
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/attendance/clock-in
  - Module: attendance
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/attendance/clock-out
  - Module: attendance
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/attendance
  - Module: attendance
  - Status: n/a
  - Error: AggregateError
- POST /api/shift-templates
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/shift-templates
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
- PATCH /api/shift-templates/550e8400-e29b-41d4-a716-446655440000
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/shift-sessions
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/shift-sessions
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
- GET /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
- POST /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/open
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
- POST /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/assignments
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/opening-readings
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/closing-readings
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/cash-submissions
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/shift-sessions/550e8400-e29b-41d4-a716-446655440000/close
  - Module: shifts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/stock-balances
  - Module: inventory
  - Status: n/a
  - Error: AggregateError
- GET /api/stock-movements
  - Module: inventory
  - Status: n/a
  - Error: AggregateError
- POST /api/tanks
  - Module: inventory
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/tanks
  - Module: inventory
  - Status: n/a
  - Error: AggregateError
- POST /api/stock-adjustments
  - Module: inventory
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/stock-verifications/night
  - Module: inventory
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/bowser-receipts
  - Module: bowser-receipts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/bowser-receipts
  - Module: bowser-receipts
  - Status: n/a
  - Error: AggregateError
- GET /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000
  - Module: bowser-receipts
  - Status: n/a
  - Error: AggregateError
- POST /api/bowser-receipts/550e8400-e29b-41d4-a716-446655440000/approve
  - Module: bowser-receipts
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/stock-orders
  - Module: stock-orders
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/stock-orders
  - Module: stock-orders
  - Status: n/a
  - Error: AggregateError
- POST /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/approve
  - Module: stock-orders
  - Status: n/a
  - Error: AggregateError
- POST /api/stock-orders/550e8400-e29b-41d4-a716-446655440000/payments
  - Module: stock-orders
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/credit-customers
  - Module: credit-dues
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/credit-customers
  - Module: credit-dues
  - Status: n/a
  - Error: AggregateError
- POST /api/credit-sales
  - Module: credit-dues
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/credit-sales
  - Module: credit-dues
  - Status: n/a
  - Error: AggregateError
- POST /api/due-collections
  - Module: credit-dues
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/due-collections
  - Module: credit-dues
  - Status: n/a
  - Error: AggregateError
- POST /api/cheques
  - Module: cheques
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/cheques
  - Module: cheques
  - Status: n/a
  - Error: AggregateError
- PATCH /api/cheques/550e8400-e29b-41d4-a716-446655440000/status
  - Module: cheques
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/daily-balancing
  - Module: daily-balancing
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/daily-balancing
  - Module: daily-balancing
  - Status: n/a
  - Error: AggregateError
- POST /api/daily-balancing/550e8400-e29b-41d4-a716-446655440000/close
  - Module: daily-balancing
  - Status: n/a
  - Error: AggregateError
- POST /api/payroll-runs
  - Module: payroll
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/payroll-runs
  - Module: payroll
  - Status: n/a
  - Error: AggregateError
- POST /api/payroll-runs/550e8400-e29b-41d4-a716-446655440000/finalize
  - Module: payroll
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- GET /api/salary-deductions
  - Module: payroll
  - Status: n/a
  - Error: AggregateError
- POST /api/salary-deductions/550e8400-e29b-41d4-a716-446655440000/approve
  - Module: payroll
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/dashboard
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/shift-summary
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/stock
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/pump-meters
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/attendance
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/daily-sales
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/pumper-shortfalls
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/payroll-deductions
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/bowser-receipts
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/stock-orders
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/credit-dues
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/cheques
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/bank-deposits
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/profit-loss
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- GET /api/reports/cpc-stock
  - Module: reports
  - Status: n/a
  - Error: AggregateError
- POST /api/reports/cpc-stock/generate
  - Module: reports
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/reports/cpc-stock/550e8400-e29b-41d4-a716-446655440000/submit
  - Module: reports
  - Status: n/a
  - Error: AggregateError
  - Request body: {}
- POST /api/auth/logout
  - Module: auth
  - Status: n/a
  - Error: AggregateError

## Notes

This report was generated by the E2E suite after probing every live controller route exposed by the backend. The JSON file next to this report contains the raw response payloads for deeper inspection.