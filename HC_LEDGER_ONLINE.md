# HC workbook online

Sign in to the existing finance app and choose Cash Management > HC Ledger - Excel View, or open /hc-ledger.

Import the original HC Ledger .xlsx once. The workbook tabs provide:

- Ledger HC: all 20 source columns, dependent Payment/Receipt accounts, frequently used accounts first, date/search filters, chronological display, editing, new rows and recoverable deletion. Payment amounts display with a minus sign; underlying values stay positive for cash calculations.
- Deno HC: note counts (5000, 1000, 500, 100, 75, 50, 20, 10, 5, 2, 1), fake notes and pending amounts. Cash, grand total, linked SAP closing balance and variance update immediately.
- Deposit: bank-deposit rows from the ledger with editable note counts and counted/deposited differences. Counts stay tied to their ledger entry when its date changes.
- Salary Details: imported salary records, editable inputs, salary type dropdown, automatic Paid/Un-paid status, separate totals, 50-character narration and duplicate highlighting. A payable entry and its unclaimed counterpart are distinct; only the second identical employee/type/period/amount entry is marked duplicate.
- DataSheet: editable Payment and Receipt account lists, used by the ledger dropdowns.

Double-click an input cell or press Enter to edit. Enter saves, Escape cancels. Computed cells are read-only. Add row/entry opens the entry form. Deno HC also has an editable report date. Search and pagination keep larger workbooks responsive. Print / PDF includes all filtered rows.

## Calculations

The first HC row is reserved for the opening balance. Running balance retains the source exclusions for Theft Cash, Lost & Found and Bank Alfalah 66. Monetary balances and limit comparisons are rounded to two decimal places.

Daily Sale Deposit is collection/till-closing receipts less HC-to-PC transfers, returns, SALARIES PAYABLE, ADVANCE SALARY PAYABLE and FINAL SETTLEMENT PAYABLE payments on the same document date. A bank entry whose description contains UNCL (including Unclimd) is classified as an unclaimed deposit and has no Sale Deposit value.

The top summary separates unclaimed received, deposited and remaining. Remaining Amount includes outstanding Theft/Lost & Found and unclaimed funds; Bank-66 deposits are not deducted twice.

## Export and recovery

Download Excel writes the complete workbook, including linked-sheet edits. Other original sheets and formatting are retained where applicable. Deno HC and Deposit formulas link to the exported ledger; calculated values recalculate in Excel. The online calculations do not depend on Excel being open.

History / Restore on Ledger HC lists the last 10 prior revisions. Restoring creates a new revision and retains the current state. Import, edits, linked sheets and restore share the same optimistic revision check to prevent stale clients overwriting newer work.

Existing login and permissions apply: cash_view for reads, cash_import for writes/restore and export_data for downloads. Writes require the session CSRF token. No transaction workbook is included in source control.

## Hosting

Gunicorn startup initializes only a missing database schema and does not replace an already initialized database. APP_DATA_DIR can point to an existing persistent data directory; the previous data location remains the default when it is unset. Do not change this variable on an existing installation without migrating its database and backups.

Render's existing free configuration has ephemeral storage. Restarts or deployments can remove runtime data unless persistent storage is configured. Use the application's database backup and Excel download; this change does not provision paid storage or migrate production data.

/healthz reports the deployed build marker without disclosing ledger data.

## Verification

Run python -m unittest test_hc_ledger test_hc_completion. Tests cover import/export, calculations, linked sheet edits, salary duplicates/status, expression safety, permissions, CSRF, stale revisions, history restore and Gunicorn startup. Browser code can also be checked with node --check hc_ledger.js and node --check hc_sheets.js.

## Separate HC deployment

Use render-hc.yaml as a new Render service with hc_app:app. This standalone app never imports app.py and never opens the existing corporate_scrap.db or its data directory. It uses only its own HC_DATA_DIR/hc_workbook.db. Set HC_USERNAME and HC_PASSWORD through service environment variables; no password is stored in source. The existing Render service and render.yaml remain unchanged. The free service still needs persistent storage or regular Excel exports to survive future restarts.
