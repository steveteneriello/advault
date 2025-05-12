#!/usr/bin/env node

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const cheerio = require('cheerio');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { createClient } = require('@supabase/supabase-js');

// CLI setup
const argv = yargs(hideBin(process.argv))
  .option('keyword', { alias: 'k', type: 'string', demandOption: true })
  .option('location', { alias: 'l', type: 'string', default: 'United States' })
  .option('debug', { alias: 'd', type: 'boolean', default: false })
  .help().argv;

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Proxy request through Oxylabs
function requestThroughProxy(url, headers = {}, returnBuffer = false) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`).toString('base64');

    const options = {
      host: 'unblock.oxylabs.io',
      port: 60000,
      path: url,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Proxy-Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          data: returnBuffer ? buffer : buffer.toString('utf8')
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Extract ads from DOM
function extractAds($, position) {
  const ads = [];

  $('div[data-text-ad="1"]').each((i, el) => {
    const container = $(el);
    const isBottom = container.parents('#bottomads').length > 0;
    if ((position === 'top' && isBottom) || (position === 'bottom' && !isBottom)) return;

    const title = container.find('div[role="heading"]').first().text().trim();
    const url = container.find('a').first().attr('href') || '';
    const displayUrl = container.find('cite').first().text().trim();
    const description = container.find('div[data-dtld="true"]').first().text().trim();

    const advertiserMatch = displayUrl.match(/(?:www\.)?([^\/]+)/i);
    const advertiser = advertiserMatch ? advertiserMatch[1] : '';

    const sitelinks = [];
    container.find('a[data-pcu]').each((j, link) => {
      const text = $(link).text().trim();
      const href = $(link).attr('href');
      if (text && href && j > 0) {
        sitelinks.push({ title: text, url: href });
      }
    });

    const extensions = [];
    container.find('div:not([role])').each((_, ext) => {
      const text = $(ext).text().trim();
      if (text.length >= 4 && text.length <= 100) {
        extensions.push(text);
      }
    });

    if (title && url) {
      ads.push({
        title,
        url,
        display_url: displayUrl,
        description,
        position: i + 1,
        container_type: 'standard',
        advertiser,
        ad_position: position,
        sitelinks: sitelinks.length ? sitelinks : undefined,
        extensions: extensions.length ? extensions : undefined
      });
    }
  });

  return ads;
}

// Scrape & insert into Supabase
async function scrapeAndInsert() {
  try {
    const { keyword, location, debug } = argv;
    const timestamp = new Date().toISOString();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=us&hl=en&pws=0`;
    const headers = { 'x-oxylabs-geo-location': location };

    if (debug) console.log(`🔍 Scraping: ${searchUrl}`);

    const { data: html, statusCode } = await requestThroughProxy(searchUrl, headers);
    if (statusCode !== 200) throw new Error(`Fetch failed with status: ${statusCode}`);

    const $ = cheerio.load(html);
    const topAds = extractAds($, 'top');
    const bottomAds = extractAds($, 'bottom');
    const allAds = [...topAds, ...bottomAds];

    // Build raw SERP snapshot
    const rawJson = {
      keyword,
      location,
      timestamp,
      ads: {
        top: topAds,
        bottom: bottomAds
      },
      meta: {
        url: searchUrl,
        language: $('html').attr('lang') || 'unknown'
      }
    };

    // Upload screenshot to Supabase Storage
    let screenshotPath = null;
    try {
      const screenshotHeaders = {
        'x-oxylabs-geo-location': location,
        'X-Oxylabs-Render': 'png'
      };
      const screenshotResponse = await requestThroughProxy(searchUrl, screenshotHeaders, true);
      if (screenshotResponse.statusCode === 200) {
        const timestampNow = Date.now();
        const fileName = `serp_${timestampNow}.png`;
        const filePath = `renders/${fileName}`;
        const bucket = 'serp-images';

        const { error: uploadError } = await supabase
          .storage
          .from(bucket)
          .upload(filePath, screenshotResponse.data, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('❌ Screenshot upload failed:', uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          screenshotPath = publicUrlData?.publicUrl;
          if (debug) console.log(`📸 Screenshot uploaded to: ${screenshotPath}`);
        }
      }
    } catch (err) {
      console.warn('❌ Screenshot error:', err.message);
    }

    if (!allAds.length) {
      console.warn('⚠️ No ads found.');
      return;
    }

    const inserts = allAds.map(ad => ({
      keyword,
      location,
      ad_position: ad.ad_position,
      position: ad.position,
      advertiser: ad.advertiser,
      title: ad.title,
      url: ad.url,
      display_url: ad.display_url,
      description: ad.description,
      raw_ad: ad,
      raw_json: rawJson,
      screenshot_path: screenshotPath,
      created_at: timestamp
    }));

    const { error } = await supabase.from('google_search_ads').insert(inserts);
    if (error) {
      console.error('❌ Supabase insert failed:', error.message);
    } else {
      console.log(`✅ Inserted ${inserts.length} ads into Supabase.`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

async function scrapeAndInsert({ keyword, location, debug = false }) {
  // Your scraping logic...
}
module.exports = { scrapeAndInsert };

