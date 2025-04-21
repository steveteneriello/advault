RUN - node SCRAPI/b-keyword-feeder/keyword-feeder.js PAC-2 "city disaster recovery" or to target geo only with keyword
node SCRAPI/b-keyword-feeder/keyword-feeder.js PAC-2 "disaster recovery"

### 📜 U.S. Sales Territories, Income Tiers, and Batch Logic Recap

#### ✅ Final Sales Territories (All 50 States Covered)

| Sales Territory   | States                                                                 |
|-------------------|------------------------------------------------------------------------|
| New England       | ME, NH, VT, MA, RI, CT                                                 |
| New York          | NY                                                                     |
| Mid-Atlantic      | NJ, PA, VA, MD                                                         |
| Great Lakes       | IL, IN, OH, WI, MI, MN                                                 |
| Mid-America       | IA, MO, NE, KS, AR, OK                                                 |
| Gulf              | FL, AL, LA, MS, TX                                                     |
| Bible Belt        | GA, SC, NC, TN, KY, WV, AR                                             |
| Mountain          | CO, UT, NM, NV, ID, MT, WY, ND, SD, AZ                                 |
| Pacific North     | WA, OR                                                                 |
| California        | CA                                                                     |
| Remote            | AK, HI                                                                 |

---

#### 💰 Final Income Tiers (Based on `income_household_median`)

| Tier | Income Range          | Label         |
|------|------------------------|---------------|
| 1    | > $125,000             | Elite         |
| 2    | $90,001 – $125,000    | Affluent      |
| 3    | $75,001 – $90,000     | Upper-Mid     |
| 4    | $60,001 – $75,000     | Mid           |
| 5    | $40,001 – $60,000     | Lower-Mid     |
| 6    | ≤ $40,000            | Low Income    |
| 8    | Null/Blank/Invalid     | Missing       |

---

#### ♻️ Batch Logic (Stored in `location_data`)

- Batches are assigned using:
  - `zone`
  - `income_tier`
  - Target batch size: ~1,000 cities
- Fields added:
  - `batch_id` (e.g. "PAC-1")
  - `batch_label` (e.g. "Pacific Batch 1")

### 📋 Batch ID Reference Table

| Batch ID | Batch Label |
|----------|--------------|
| ALA-1 | Alaska Batch 1 |
| CEN-1 | Central Batch 1 |
| CEN-10 | Central Batch 10 |
| CEN-11 | Central Batch 11 |
| CEN-12 | Central Batch 12 |
| CEN-13 | Central Batch 13 |
| CEN-14 | Central Batch 14 |
| CEN-15 | Central Batch 15 |
| CEN-2 | Central Batch 2 |
| CEN-3 | Central Batch 3 |
| CEN-4 | Central Batch 4 |
| CEN-5 | Central Batch 5 |
| CEN-6 | Central Batch 6 |
| CEN-7 | Central Batch 7 |
| CEN-8 | Central Batch 8 |
| CEN-9 | Central Batch 9 |
| EAS-1 | Eastern Batch 1 |
| EAS-10 | Eastern Batch 10 |
| EAS-11 | Eastern Batch 11 |
| EAS-12 | Eastern Batch 12 |
| EAS-13 | Eastern Batch 13 |
| EAS-14 | Eastern Batch 14 |
| EAS-15 | Eastern Batch 15 |
| EAS-16 | Eastern Batch 16 |
| EAS-17 | Eastern Batch 17 |
| EAS-18 | Eastern Batch 18 |
| EAS-19 | Eastern Batch 19 |
| EAS-2 | Eastern Batch 2 |
| EAS-3 | Eastern Batch 3 |
| EAS-4 | Eastern Batch 4 |
| EAS-5 | Eastern Batch 5 |
| EAS-6 | Eastern Batch 6 |
| EAS-7 | Eastern Batch 7 |
| EAS-8 | Eastern Batch 8 |
| EAS-9 | Eastern Batch 9 |
| HAW-1 | Hawaii Batch 1 |
| MOU-1 | Mountain Batch 1 |
| MOU-2 | Mountain Batch 2 |
| MOU-3 | Mountain Batch 3 |
| PAC-1 | Pacific Batch 1 |
| PAC-2 | Pacific Batch 2 |
| PAC-3 | Pacific Batch 3 |

---

#### 📦 Keyword Feeder Integration

- Updated `keyword-feeder.js`:
  - CLI usage: `node data/keyword-feeder.js <batch_id> "<keyword>"`
  - Supports `city` and `CITY` placeholders
  - Outputs directly to `data/master-queries.json`
- Uses `batch_id` to pull matching cities from `location_data`
- Supports up to 100k rows with `.range(0, 99999)`

---

Let me know if you'd like to:
- Create a permanent `batch_lookup` table
- Automate keyword creation across all batches
- Auto-run `npm run scrapi` post-feed
- Visualize batches in a dashboard

🔥 You're now batch-ready, zip-code-sniper precise, and primed for full-funnel automation.

