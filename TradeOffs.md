# TRADEOFFS.md

## 1. No async processing

I did not implement Celery or any async task queue.
All file parsing happens synchronously in the HTTP request.

Why I skipped it: Celery requires Redis, a worker process, and
significant configuration overhead. For sample files with 5-10 rows
this is not a problem. The prototype works fine synchronously.

What breaks in production: A client uploading a 50,000 row SAP export
would time out the HTTP request. The file would partially parse or fail.
The fix is to save the file, return immediately with a batch ID, and
process in a background Celery task with status polling on the frontend.

## 2. No real emission factor database

I hardcoded emission factors directly in the parser code.

Why I skipped it: Building a proper emission factor database with
versioning, source citations, and factor lookup by material category
would take weeks. The hardcoded values I used are from DEFRA 2023
which is a legitimate source used in real ESG reporting.

What breaks in production: Emission factors change every year when
DEFRA or GHG Protocol publishes updates. Hardcoded values mean you
have to redeploy to update factors. Also different clients may need
different factor sets (UK vs India grid, market based vs location based
for electricity). The fix is a Factor table with version, source,
category, and effective date fields.

## 3. No role based access control

All users have the same access level. There is no distinction between
analyst, admin, and auditor roles.

Why I skipped it: Django has a permissions system but setting up
role based access with proper tenant scoping would take significant
time. For a prototype with one user the current setup works.

What breaks in production: An auditor should only be able to read
locked records, not approve or reject. An analyst should not be able
to see another tenant's data. An admin should be able to manage users.
The fix is a Role model with permissions per role, enforced in every
API view.