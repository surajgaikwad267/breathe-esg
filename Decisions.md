# DECISIONS.md

## SAP: Why flat file CSV instead of IDoc or OData

IDoc is SAP's native format but it requires SAP middleware to generate
and parse. No client is going to give a startup direct IDoc access in
a prototype phase. OData requires an active SAP system connection.

Flat file CSV export is what actually happens in practice. A procurement
or sustainability manager exports from SAP transaction MB51 or ME2M and
emails it as a CSV. That is the realistic ingestion path I chose.

The column names I used (BUKRS, WERKS, MATNR, MENGE, MEINS, BLDAT, LIFNR)
are real SAP MM module field names. SAP was built by a German company so
the abbreviations come from German words. MENGE means quantity, WERKS
means plant, BLDAT means document date. I chose latin-1 encoding because
SAP exports often use it, especially for European clients.

What I would ask the PM: Which SAP transaction are clients exporting from?
MB51 gives material movements, ME2M gives purchase orders. The columns
differ slightly.

## Utility: Why CSV portal export instead of PDF or API

PDF parsing is brittle. If the utility changes their template slightly
the parser breaks. Most enterprise utilities in India do offer portal
logins where facilities teams can download CSV exports.

API access exists for some utilities but requires individual agreements
with each utility provider. That is months of work, not 4 days.

CSV portal export is the most realistic option that a facilities team
can actually provide without IT involvement.

Key thing I handled: billing periods do not align to calendar months.
A bill from January 18 to February 17 spans two months. I store
period_start and period_end explicitly instead of just a month field.

What I would ask the PM: Do clients have multi-site utility accounts?
Some enterprises have hundreds of meters across facilities. The current
model handles this but the upload UX assumes one file per upload.

## Travel: Why Concur style CSV instead of API

Navan and Concur both have APIs but they require OAuth setup and
corporate account credentials. A travel manager can export a CSV
in minutes.

The tricky part was flights. Concur exports give you origin and
destination as IATA airport codes like DEL or LHR but not actual
distances. I solved this by storing coordinates for common airports
and calculating distance using the haversine formula.

For airports not in my lookup table I fall back to 1000km as a
default. In production I would use a full IATA database.

What I would ask the PM: Does the client use Concur or Navan?
Their export formats are slightly different. Also do they need
per-employee reporting or just aggregate totals?

## Why SQLite in development and not PostgreSQL

PostgreSQL is the right choice for production. But for local
development SQLite requires zero setup and Django supports it
natively. Railway and PythonAnywhere both provide PostgreSQL
in production which is where it matters.

## Why synchronous parsing instead of Celery

Celery requires Redis and a worker process. For a 4 day prototype
with small sample files, synchronous parsing is fine. The tradeoff
is that large SAP files (thousands of rows) would block the request.
I documented this in TRADEOFFS.md.

## Why no authentication on API endpoints

I removed authentication requirements for the prototype to make
testing easier. In production every endpoint would require JWT
authentication and tenant scoping based on the logged in user.