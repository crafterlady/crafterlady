#!/usr/bin/env node
/**
 * Fetches eBay listings via the Browse API and writes them to data/listings.json
 * with your EPN affiliate link already attached to every item.
 *
 * Runs automatically on a schedule via the GitHub Action in
 * .github/workflows/update-listings.yml — you shouldn't need to run this
 * by hand, but you can with:
 *
 *   EBAY_CLIENT_ID=xxx EBAY_CLIENT_SECRET=xxx EBAY_CAMPAIGN_ID=xxx node scripts/fetch-listings.mjs
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const { EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_CAMPAIGN_ID } = process.env;

if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_CAMPAIGN_ID) {
  console.error(
    'Missing required environment variables. Need EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_CAMPAIGN_ID.'
  );
  process.exit(1);
}

// ---- Edit this list any time to change what shows up on the site. ----
// "label" is a sub-category tag (used for optional grouping/search), "query"
// is what gets searched on eBay. All items get merged into one pool that
// visitors can browse or search across.
const SEARCHES = [
  { label: 'Yarn', query: 'crochet yarn', limit: 12 },
  { label: 'Hooks', query: 'crochet hook set', limit: 10 },
  { label: 'Patterns', query: 'crochet pattern PDF', limit: 10 },
  { label: 'Kits', query: 'crochet kit beginner', limit: 10 },
  { label: 'Amigurumi', query: 'amigurumi crochet supplies', limit: 10 },
  { label: 'Stitch Markers & Notions', query: 'crochet stitch markers notions', limit: 8 },
  { label: 'Books & Magazines', query: 'crochet pattern book', limit: 8 },
];

const MARKETPLACE = 'EBAY_US';

async function getAccessToken() {
  const basicAuth = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function searchListings(token, { label, query, limit }) {
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
      // This is what attaches your EPN campaign to every result so clicks
      // and purchases get tracked back to you automatically.
      'X-EBAY-C-ENDUSERCTX': `affiliateCampaignId=${EBAY_CAMPAIGN_ID}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed for "${query}": ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.itemSummaries || []).map((item) => ({
    id: item.itemId,
    tag: label,
    title: item.title,
    price: item.price ? `${item.price.value} ${item.price.currency}` : null,
    image: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || null,
    condition: item.condition || null,
    seller: item.seller?.username || null,
    // itemAffiliateWebUrl comes pre-tagged with your campaign ID when the
    // header above is set. The fallback covers the rare case it's missing.
    url:
      item.itemAffiliateWebUrl ||
      `${item.itemWebUrl}${item.itemWebUrl.includes('?') ? '&' : '?'}campid=${EBAY_CAMPAIGN_ID}`,
  }));
}

async function main() {
  const token = await getAccessToken();
  const items = [];
  const seenIds = new Set();

  for (const search of SEARCHES) {
    console.log(`Fetching: ${search.label} ("${search.query}")`);
    const results = await searchListings(token, search);
    for (const item of results) {
      // Skip duplicates in case the same listing turns up under two searches.
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    items,
  };

  const outDir = path.resolve('data');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'listings.json'), JSON.stringify(output, null, 2));

  console.log(`Wrote ${items.length} listings to data/listings.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
