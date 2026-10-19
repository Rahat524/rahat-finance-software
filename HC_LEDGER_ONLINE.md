# HC Ledger — Excel view

Open the existing finance application, sign in, then choose **Cash Management → HC Ledger — Excel View**. The direct path is `/hc-ledger`.

1. Click **Import Excel** and choose the original HC Ledger L-4 workbook.
2. Review the opening balance and totals after import.
3. Double-click an input cell to edit; Enter saves and Escape cancels. **Add row** appends an entry.
4. Use the date/search filters, hidden-column toggle, and horizontal scrollbar. All 20 original ledger columns are available.
5. **Download Excel** exports the complete workbook. **Print / PDF** prints all filtered entries.

The original Ledger HC headers, widths, navy title/header, summary fields and last-posting-date highlights are retained. Browser fonts, borders and control spacing can differ from desktop Excel.

## Calculation behavior

The first entry represents the opening balance, matching the original workbook. Running balance excludes theft cash, lost & found and Bank Alfalah 66. The top closing balance follows the source workbook's opening + all receipts − all payments. Sale Deposit uses document-date collection/till-closing receipts less PC transfers and returns on Bank Alfalah 40/940 rows. POS Total Sale appears on the last POS entry for each document date. Character Count follows the description text.

The online page edits **Ledger HC**. It keeps the original other sheets inside the private uploaded workbook and includes them on export. Their Excel formulas recalculate in Excel; online editing of Deno HC and Deposit is not included. This workbook is separate from the application's older Head Cash records.

## Data and access

No customer transaction file or financial entry is included in this source change. Upload the workbook after deployment while signed in. Records and the original workbook are saved inside the existing application SQLite database, so the application's database backup includes them. The last 10 prior revisions are kept inside the database.

Existing permissions apply: cash_view to view, cash_import to import/edit, export_data to export. Writes use a session CSRF token and revision checks so a stale browser cannot overwrite another user's changes.

The existing Render free-service configuration uses an ephemeral filesystem. A deploy/restart can remove data unless the application data directory is on persistent storage. For permanent multi-device use, configure persistent storage and backups before relying on the service as the only ledger copy. This update does not provision a paid hosting plan.

## Deployment

This is a Flask backend, so GitHub stores the source; GitHub Pages cannot run it. Deploy the repository to the existing Python hosting service (the repository already includes Render configuration). No additional Python dependency is required. Import the workbook once the new version is live.

The exact ledger route is protected by the existing login. The change also supplies explicit fallback routes for the four existing public UI assets when the source package stores them at repository root instead of static/.

## Validation

Run `python -m unittest test_hc_ledger.py`. Tests cover source-style workbook import, amount expressions, balances, deposit calculations, saved edits, stale revision rejection, CSRF, access permissions and preservation of other sheets during export.
