#!/usr/bin/env node
/**
 * Fetches crochet listings from eBay's Browse API and writes them to
 * data/listings.json in the shape js/ebay-live.js expects, with your
 * EPN affiliate link already attached to every item.
 *
 * Runs automatically via .github/workflows/update-listings.yml.
 * Manual run: EBAY_CLIENT_ID=xxx EBAY_CLIENT_SECRET=xxx EBAY_CAMPAIGN_ID=xxx node scripts/fetch-listings.mjs
 */

import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const { EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_CAMPAIGN_ID } = process.env;

if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_CAMPAIGN_ID) {
  console.error(
    'Missing required environment variables. Need EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_CAMPAIGN_ID.'
  );
  process.exit(1);
}

// ---- Edit this list any time to change what gets fetched. ----
// "category" matches the style of labels already used on the site
// (e.g. "Crochet Hooks", "Yarn") and becomes the small text under
// each card's title.
const SEARCHES = [
  { category: 'Crochet Hooks', query: 'crochet hook set', limit: 6, maxPrice: 20 },
  { category: 'Yarn', query: 'crochet yarn', limit: 6, maxPrice: 20 },
  { category: 'Crochet Cotton', query: 'crochet cotton', limit: 6, maxPrice: 20 },
  { category: 'Notions', query: 'crochet stitch markers notions', limit: 6, maxPrice: 20 },
  { category: 'Patterns', query: 'crochet pattern PDF', limit: 6, maxPrice: 20 },
  { category: 'Kits', query: 'amigurumi crochet kit', limit: 6, maxPrice: 20 },
  { category: 'Books & Magazines', query: 'crochet pattern book', limit: 6, maxPrice: 20 },
  { category: 'Vintage Books', query: 'vintage crochet book lot', limit: 10, maxPrice: 40 },
  { category: 'Vintage Hooks', query: 'vintage crochet hook', limit: 8, maxPrice: 60 },
];

const MARKETPLACE = 'EBAY_US';
const IMAGE_SIZE = 250; // every saved photo is exactly this many pixels square
const IMAGES_DIR = path.resolve('data', 'images');

async function saveCroppedImage(url, itemId) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const outPath = path.join(IMAGES_DIR, `${itemId}.jpg`);
    await sharp(buffer)
      .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82 })
      .toFile(outPath);

    return `data/images/${itemId}.jpg`;
  } catch (err) {
    console.warn(`Could not process image for ${itemId}: ${err.message}`);
    return null; // falls back to no image for this item
  }
}

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

function formatMoney(amount) {
  if (!amount) return null;
  const value = Number(amount.value);
  if (Number.isNaN(value)) return null;
  return `$${value.toFixed(2)}`;
}

async function searchListings(token, { category, query, limit, maxPrice }) {
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
      // Attaches your EPN campaign to every result so purchases are
      // tracked back to you automatically.
      'X-EBAY-C-ENDUSERCTX': `affiliateCampaignId=${EBAY_CAMPAIGN_ID}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Search failed for "${query}": ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.itemSummaries || [])
    .map((item) => {
      const itemPrice = Number(item.price?.value) || 0;
      const shippingCost = Number(item.shippingOptions?.[0]?.shippingCost?.value) || 0;
      const totalPrice = itemPrice + shippingCost;
      const originalPrice = formatMoney(item.marketingPrice?.originalPrice);
      const discountPct = item.marketingPrice?.discountPercentage;
      const image = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || null;

      return {
        id: item.itemId,
        category,
        title: item.title,
        condition: item.condition || null,
        totalPrice, // numeric, used for filtering/sorting
        price: `$${totalPrice.toFixed(2)}`, // what's actually displayed — item + shipping combined
        shippingCost,
        originalPrice: originalPrice && originalPrice !== `$${itemPrice.toFixed(2)}` ? originalPrice : null,
        discountLabel: discountPct ? `${discountPct}% off` : null,
        image,
        url:
          item.itemAffiliateWebUrl ||
          `${item.itemWebUrl}${item.itemWebUrl.includes('?') ? '&' : '?'}campid=${EBAY_CAMPAIGN_ID}`,
      };
    })
    .filter((item) => item.totalPrice <= maxPrice);
}

async function main() {
  const token = await getAccessToken();
  const items = [];
  const seenIds = new Set();

  for (const search of SEARCHES) {
    console.log(`Fetching: ${search.category} ("${search.query}")`);
    const results = await searchListings(token, search);
    for (const item of results) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }
  }

  // Start with a clean images folder each run, so yesterday's photos
  // (for items that are no longer in today's results) don't pile up.
  await rm(IMAGES_DIR, { recursive: true, force: true });
  await mkdir(IMAGES_DIR, { recursive: true });

  console.log(`Downloading and cropping ${items.length} photos to ${IMAGE_SIZE}x${IMAGE_SIZE}...`);
  for (const item of items) {
    if (item.image) {
      item.image = await saveCroppedImage(item.image, item.id);
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
