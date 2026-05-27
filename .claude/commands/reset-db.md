Reset the database to a clean empty state.

This deletes all data. Confirm before proceeding.

Steps:

1. Warn the user: "This will permanently delete all transactions, categories, and budgets."
   Ask them to confirm by typing "yes". If they don't confirm, stop.

2. Check if the dev server appears to be running:
   ```
   curl -sf http://localhost:3001/api/categories > /dev/null
   ```
   If it is running, tell the user: "Stop the server first (Ctrl+C in the server terminal), then run /reset-db again."
   Do not delete the database while the server is running.

3. Delete the database file:
   ```
   rm -f /home/user/finance-dashboard/server/data.db
   rm -f /home/user/finance-dashboard/server/data.db-journal
   ```

4. Confirm deletion: check that the file no longer exists.

5. Tell the user: "Database deleted. Start the server with `npm run dev` in server/ — it will recreate the schema automatically on first run. Then run /seed to populate it with test data."
