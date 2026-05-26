# MODEL.md

## Why I designed it this way

I had to solve three problems:
- Multiple companies will use this system (multi-tenancy)
- I need to know exactly where every number came from (source tracking)
- Analysts need to sign off before auditors see anything (audit trail)

Every table design decision comes from one of these three needs.

## Tables

### Tenant
Every client company gets a Tenant row. Every other table has a
tenant foreign key. This means company A can never see company B's data.

fields: id, name, slug, created_at

I chose slug instead of just ID in URLs because it is human readable
and easier to debug when something goes wrong.

### IngestionBatch
One row per file upload. I create this record before parsing starts.
If parsing crashes halfway, I still know a file was received.

fields: id, tenant, source_type, uploaded_file, status,
uploaded_by, uploaded_at, row_count, error_log

error_log is JSON because different rows fail for different reasons.
status goes: pending to processing to done or failed.

### RawIngestionLog
One row per row in the uploaded file. I store the original data
exactly as it came in and never modify it.

fields: id, batch, row_number, raw_data (JSON),
parse_status, error_message

Why keep raw data?
If my parser has a bug I can fix it and reprocess without asking
the client to re-upload the file. Also if an auditor asks what the
original file said, I can show them exactly.

I used JSONField for raw_data because SAP, utility, and travel files
all have completely different columns. One flexible field handles all three.

### EmissionRecord
This is the main table. One normalized row per emission event.

fields: id, tenant, batch, raw_log, scope, category, source_type,
activity_value, activity_unit, co2e_kg, period_start, period_end,
facility, vendor, status, reviewed_by, reviewed_at, is_locked,
created_at, updated_at

Why period_start and period_end as separate fields?
Utility bills do not follow calendar months. A bill can run
Jan 18 to Feb 17. If I stored just the month I would lose this
information and could not detect overlapping billing periods.

Why Decimal for co2e_kg and not Float?
Float has rounding errors. When you multiply emission factors across
thousands of rows small errors add up. Decimal is exact.

Why is_locked as a boolean?
Once a row is approved by an analyst it should never change.
is_locked=True makes this impossible to accidentally overwrite.
A separate boolean is more explicit than relying on status alone.

Why does EmissionRecord point back to RawIngestionLog?
Every record traces back to the exact raw row that produced it.
If an auditor asks where a specific number came from I can show
the original file row.

### AuditTrail
Every analyst action gets recorded here permanently.

fields: id, emission_record, action, performed_by,
performed_at, old_values (JSON), new_values (JSON), note

old_values and new_values store the state before and after each action.
Nothing is deleted. This gives a full history for auditors.

## Scope Assignment

I assign scope at parse time based on the data source:

- SAP fuel data = Scope 1 (direct combustion by the company)
- Utility electricity = Scope 2 (purchased energy, indirect)
- Business travel = Scope 3 (indirect, value chain emissions)

This follows the GHG Protocol Corporate Standard.

## Unit Normalization

Everything ends up in kgCO2e.

SAP: I normalize all units to liters first. KG uses density conversion,
GAL is multiplied by 3.785. Then multiply by emission factor.

Utility: Already in kWh. Multiply by grid emission factor.

Flights: I only get IATA airport codes like DEL or BOM. I calculate
distance using the haversine formula on stored airport coordinates.
This is necessary because Concur style exports give origin and
destination codes, not actual distances.

Hotels: Multiply nights by per night emission factor.
Car: Multiply km by per km emission factor.

Emission factors used:
- Diesel: 2.68 kgCO2e per liter (DEFRA 2023)
- Petrol: 2.31 kgCO2e per liter (DEFRA 2023)
- Electricity: 0.233 kgCO2e per kWh (India grid average)
- Flight: 0.255 kgCO2e per km (DEFRA 2023)
- Hotel: 20.6 kgCO2e per night (DEFRA 2023)
- Car: 0.171 kgCO2e per km (DEFRA 2023)

## What I would change with more time

- Proper user to tenant mapping (right now all uploads go to first tenant)
- Async ingestion with Celery for large SAP files
- Real emission factor database instead of hardcoded values
- Pagination for large record sets
- Role based access for analyst vs admin vs auditor