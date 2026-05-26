# SOURCES.md

## SAP Fuel and Procurement Data

What I researched:
SAP MM module (Materials Management) is where fuel and procurement
data lives in most manufacturing and logistics companies. The standard
way to extract this is via transaction MB51 (material movements) or
ME2M (purchase orders by material). Both produce downloadable reports.

What a real SAP export looks like:
The columns are named using SAP internal field names from the MSEG
and EKPO database tables. These names are German abbreviations because
SAP was founded in Germany. Common fields include:
- BUKRS: Buchungskreis (company code)
- WERKS: Werk (plant or manufacturing site)
- MATNR: Materialnummer (material number)
- MENGE: Menge (quantity)
- MEINS: Mengeneinheit (unit of measure)
- BLDAT: Belegdatum (document date)
- LIFNR: Lieferantennummer (vendor number)

What my sample data looks like and why:
I created 5 rows with realistic plant codes (PL01, PL02, PL03),
material numbers that indicate fuel type (DIESEL-001, PETROL-002),
and dates in DD.MM.YYYY format which is the German date format SAP
defaults to. Units are in L (liters). This matches what an actual
SAP MB51 export looks like.

What would break in production:
- Plant codes mean nothing without a lookup table mapping them to
  actual facility names and locations
- Material numbers are company specific. DIESEL-001 in one company
  might be a completely different material in another
- Some SAP configurations export with German column headers instead
  of the field names I used
- Date formats vary by SAP system locale settings
- Encoding is often latin-1 not UTF-8 which causes issues with
  special characters

## Utility Electricity Data

What I researched:
Enterprise utilities in India like Tata Power, MSEDCL, and BESCOM
provide business customer portals where facilities managers can
download billing history as CSV. The format varies by utility but
common fields include meter ID, facility, billing period, consumption
in kWh, demand in kW, tariff code, and total cost.

Key complexity: billing periods do not align to calendar months.
Utilities bill based on meter read dates which shift slightly each
month. A bill might cover January 18 to February 17. This matters
for emissions reporting which is usually done monthly or quarterly.

What my sample data looks like and why:
I created 5 rows across 3 facilities (Head Office, Warehouse 1,
Factory Floor) with realistic kWh values. Billing periods intentionally
span month boundaries (2024-01-18 to 2024-02-17) to reflect real
utility billing. I included meter IDs, tariff codes, and demand
readings because these appear in real portal exports.

What would break in production:
- Each utility has a different CSV format. A parser for MSEDCL would
  not work for BESCOM without changes
- Some facilities get PDF bills, not CSV. PDF parsing is fragile
- Large enterprises have hundreds of meters. The current upload is
  one file per batch which works but requires multiple uploads
- Grid emission factors vary by state in India. I used a national
  average but Maharashtra and Karnataka have different grid mixes

## Corporate Travel Data

What I researched:
Concur and Navan are the two most common corporate travel platforms
in Indian enterprises. Both support CSV export of trip data from
their reporting modules. Navan calls this their Analytics export.
Concur calls it the Standard Accounting Extract.

Key complexity: flight data only gives you origin and destination
as IATA airport codes. The distance is not provided. To calculate
emissions you need the actual flight distance which requires either
a flight distance API or calculating it yourself from coordinates.

I chose to calculate distance using the haversine formula which
gives great circle distance between two points on a sphere. This is
the standard approach for flight emissions calculations.

What my sample data looks like and why:
I created 6 rows covering the three transport modes: flights between
Indian cities and one international route (BOM to LHR), a hotel stay,
and two ground transport trips. I used real IATA codes for Indian
airports (DEL, BOM, BLR) and London Heathrow (LHR). This tests the
haversine calculation across different distances.

What would break in production:
- My airport coordinate lookup only covers 10 airports. A real
  deployment needs a full IATA database with 9000+ airports
- Haversine gives straight line distance. Real flights have routes
  that are longer. The industry standard is to use a radiative
  forcing multiplier of 1.9x to account for non-CO2 effects at altitude
- Concur and Navan have different column names for the same fields
- Some companies book travel outside these platforms (direct with
  airlines) so data is incomplete
- Hotel emissions depend on the hotel's own carbon reporting which
  most hotels do not provide. I used an industry average per night