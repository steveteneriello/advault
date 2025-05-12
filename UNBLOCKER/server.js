const express = require('express');
const app = express();
const port = 8080;

app.use(express.json());

const { scrapeAndInsert } = require('./scrape-ads-to-supabase');

app.post('/scrape-ads', async (req, res) => {
  const { keyword, location, debug } = req.body;

  if (!keyword || !location) {
    return res.status(400).json({ error: 'Missing keyword or location' });
  }

  try {
    await scrapeAndInsert({ keyword, location, debug });
    res.json({ success: true });
  } catch (err) {
    console.error('Scraper error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
