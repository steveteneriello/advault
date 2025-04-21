node SCRAPI/b-keyword-feeder/keyword-feeder.js TOP-500 "disaster restoration"


## 🔍 Top 500 Populated City Assignment – Supabase SQL Instructions

This guide details how to identify and label the **top 500 most populated cities** in the United States using your existing `location_data` table. This is particularly useful for organizing priority cities for scraping, advertising campaigns, or performance tracking within your AdVault system.

### ✅ Table Assumptions

Your table `location_data` includes:
- `city` — name of the city
- `state_name` — name of the U.S. state
- `population` — **stored as text**, representing city population

---

### 🧠 Step 1: Preview Top 500 Most Populated Cities

```sql
SELECT city, state_name, population
FROM location_data
WHERE population IS NOT NULL AND population ~ '^\d+$'
ORDER BY population::INTEGER DESC
LIMIT 500;
```

This query:
- Filters out `NULL` and non-numeric population values
- Casts `population` to an integer for sorting
- Returns the top 500 results in descending order

---

### 📇 Step 2: Assign `TOP-500` Label to Those Cities

```sql
UPDATE location_data
SET batch_label = 'TOP-500'
WHERE (city, state_name) IN (
  SELECT city, state_name
  FROM location_data
  WHERE population IS NOT NULL AND population ~ '^\d+$'
  ORDER BY population::INTEGER DESC
  LIMIT 500
);
```

This update:
- Applies a `TOP-500` label in the `batch_label` field
- Matches by both `city` and `state_name` to ensure uniqueness

---

### 📂 Suggested Use Case

You can now query for `batch_label = 'TOP-500'` when building:

- `master-queries.json` files
- Batch ad scraping jobs
- Regional campaign groupings

---

Let me know if you'd like to:
- Export the top 500 list to CSV or JSON
- Assign additional metadata (zone, tier, etc.)
- Create a script that feeds this directly into the AdVault automation system

