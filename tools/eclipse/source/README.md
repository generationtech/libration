# NASA GSFC solar Besselian source

Development-time input for `npm run eclipse:prep`.

## Primary file

- **URL:** https://eclipse.gsfc.nasa.gov/eclipse_besselian_from_mysqldump2.csv
- **Host page:** https://eclipse.gsfc.nasa.gov/SEcat5/SEcatalog.html (listed 2014 Apr 11)
- **Authority:** Espenak, F. & Meeus, J., Five Millennium Canon/Catalog of Solar Eclipses (NASA/TP-2006-214141, NASA/TP-2009-214174)
- **Expected SHA-256:** `44460be3ed5a5c69a7627af6ffa875c82c70872f067e2907d20b49068e792b44`
- **Retrieved:** 2026-08-15

Place the downloaded file at:

```text
tools/eclipse/source/eclipse_besselian_from_mysqldump2.csv
```

Then run `npm run eclipse:prep` from the repository root. The script filters to
`1900-01-01T00:00:00.000Z ≤ T < 2101-01-01T00:00:00.000Z`, emits a compact runtime
asset, and refuses to proceed if the SHA-256 does not match.

Do not scrape EclipseWise. Do not parse NASA HTML/PDF at application startup.
The production bundle uses only the generated JSON under `src/assets/eclipse/`.
