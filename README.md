# HC Ledger - Lahore-4

[Deploy HC software to Render](https://render.com/deploy?repo=https://github.com/Rahat524/rahat-finance-software/tree/standalone-hc-service)

This branch creates only a separate HC service. It does not open the corporate software database. Click the deployment link, enter your own HC_PASSWORD on Render and deploy. The username is Rahat. Build/start settings are preconfigured. The service is on Render's free plan; its local database is ephemeral, so download Excel regularly or configure persistent storage before relying on it as the sole ledger copy.

Features: Ledger HC, Deno HC, Deposit, Salary Details, DataSheet, linked totals, salary duplicate detection, original-design Excel import/export and history restore.

25 automated tests pass. Full details are in HC_LEDGER_ONLINE.md.
