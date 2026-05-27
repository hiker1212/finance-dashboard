Run TypeScript type checking across the entire monorepo and report all errors in one pass.

Steps:

1. Run the server type check:
   ```
   cd /home/user/finance-dashboard/server && npx tsc --noEmit 2>&1
   ```

2. Run the client type check:
   ```
   cd /home/user/finance-dashboard/client && npx tsc --noEmit 2>&1
   ```

3. Collect the output from both. Then:
   - If both pass with no errors: report "✓ server — no errors" and "✓ client — no errors".
   - If either has errors: show the errors grouped by file, clearly labelled [server] or [client].
   - Count the total number of errors across both.

4. If there are errors and the user has not said "just report", offer to fix them.
   Ask: "Found N error(s). Fix them now?"

Do not modify any files unless the user confirms.
