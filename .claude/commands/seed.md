Seed the database with realistic finance data so the dashboard has something to display.

The server must be running on port 3001. If it's not running, say so and stop.

Steps:

1. First, check the server is up:
   ```
   curl -sf http://localhost:3001/api/categories > /dev/null
   ```
   If it fails, tell the user to run `npm run dev` in the `server/` directory and stop.

2. Create these five categories (skip any that already exist — a 409 or duplicate name is fine, just continue):
   - Food & Groceries, color #10b981
   - Transport, color #3b82f6
   - Entertainment, color #8b5cf6
   - Utilities, color #f59e0b
   - Health, color #ef4444

   POST each to http://localhost:3001/api/categories with `Content-Type: application/json`.
   Capture the returned IDs — you'll need them for transactions and budgets.

3. Set monthly budgets for each category (upsert via PUT):
   - Food & Groceries: 600
   - Transport: 200
   - Entertainment: 150
   - Utilities: 180
   - Health: 100

   PUT to http://localhost:3001/api/budgets/:categoryId with `{ "monthly_limit": <amount> }`.

4. Create transactions across the past 3 months. Use real-looking descriptions and amounts.
   Generate at least 8 transactions per month — a mix of income and expenses spread across categories.
   Use dates in YYYY-MM-DD format. Make sure the months are the 3 most recent months relative to today.

   Example transactions (vary them across months, randomise amounts slightly):
   - Salary (income, ~3200), Freelance work (income, ~800)
   - Supermarket (Food, ~85), Coffee shop (Food, ~12), Restaurant (Food, ~45)
   - Uber (Transport, ~22), Monthly bus pass (Transport, ~60)
   - Netflix (Entertainment, ~15), Cinema (Entertainment, ~28)
   - Electricity bill (Utilities, ~90), Internet (Utilities, ~45)
   - Pharmacy (Health, ~35), Gym membership (Health, ~40)

   POST each to http://localhost:3001/api/transactions.

5. After seeding, print a summary: how many categories, budgets, and transactions were created.

Optional: if `$ARGUMENTS` is a number (e.g. `/seed 6`), seed that many months instead of 3.
