# HC durable storage setup

The isolated Supabase schema hc_ledger has been provisioned in the existing free project.

Before changing Render settings, download the current HC workbook. Switching databases does not copy the old ephemeral SQLite file.

In Supabase Connect choose Session pooler and copy the complete PostgreSQL connection string. Replace the password placeholder privately, URL-encoding reserved password characters.

In the HC Render service Environment, set HC_DATABASE_URL to that private connection string. Never commit it or put it in browser JavaScript. Deploy the standalone-hc-service branch. Then import the saved Excel workbook once into the empty HC database. Check row count and totals before continuing.

All subsequent updates retain the remote workbook and its last ten revisions. Database connection failures never silently fall back to local empty storage. The old corporate service is separate.

Supabase free plan has usage limits and inactivity pausing; this is not an unlimited backup guarantee. Keep periodic Excel exports.
