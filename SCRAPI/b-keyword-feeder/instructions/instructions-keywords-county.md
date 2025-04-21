TOP 3 MOST POPULATED CITIES IN EACH COUNTY IN US (min 5000) FOR BROAD KEYWORD COUNTY COVERAGE
node SCRAPI/b-keyword-feeder/keyword-feeder.js COUNTY-EAS-1 "disaster restoration"




# County Assignment Usage Guide

This guide explains how to use the `county_assignment` field in the `location_data` table, and how to interpret the naming conventions used.

---

## 🧠 What is `county_assignment`?

This field assigns each city a batch label that groups locations by:
- **U.S. Time Zone**
- **Maximum of 1,000 cities per batch**

Each label follows this format:

```
COUNTY-<ZONE>-<BATCH_NUMBER>
```

---

## 🔠 Label Format Explained

| Label Example      | Description                               |
|--------------------|-------------------------------------------|
| `COUNTY-EAS-1`     | First batch of up to 1,000 cities in the Eastern time zone |
| `COUNTY-CEN-2`     | Second batch in Central time zone         |
| `COUNTY-MNT-1`     | First batch in Mountain time zone         |
| `COUNTY-PAC-3`     | Third batch in Pacific time zone          |
| `COUNTY-ALA-1`     | Alaska batch                              |
| `COUNTY-HAW-1`     | Hawaii batch                              |

---

## 🛠️ How to Use in Queries

You can filter rows like this:

```sql
SELECT *
FROM location_data
WHERE county_assignment = 'COUNTY-EAS-1';
```

Or generate a full `master-queries.json` with:

```sql
SELECT
  'CITY plumber' AS query,
  city || ', ' || state_name || ', United States' AS geo_location
FROM location_data
WHERE county_assignment = 'COUNTY-CEN-2';
```

---

## 🔄 Updating Assignments

Assignments were applied using a script based on population size and time zone. To reassign or adjust:
1. Edit the `county_assignment` logic in your script.
2. Regenerate and upload an updated SQL file (like the one provided).

---

## 📌 Notes

- These assignments are intended for **batch scraping and keyword loading** in tools like `keyword-feeder.js`.
- This structure prevents exceeding the 1,000 lookup limit per run.
- You can use `batch_id` or `tier` in your scripts for programmatic control.

