# CrafterLady — Live eBay Finds

This plugs real, auto-updating eBay crochet listings into your **existing**
site design — same cards, same filters, same search box you already built.
Nothing about your look changes.

## What's in this folder

- `index.html` — your homepage, with the 8 *fake/placeholder* eBay cards
  removed (your Etsy/Walmart/Michaels placeholder cards are untouched —
  replace those later the same way, if you want).
- `js/ebay-live.js` — loads real eBay listings and inserts them as cards
  matching your exact design, before your existing filter script runs.
- `scripts/fetch-listings.mjs` — searches eBay for crochet items and
  writes them to `data/listings.json`, with your affiliate link attached.
- `.github/workflows/update-listings.yml` — runs the script automatically,
  once a day.
- `data/listings.json` — starts empty; the automation fills it in.

## One-time setup

### 1. Get eBay developer API keys
Go to developer.ebay.com → sign in → create an application → copy the
**Production** Client ID and Client Secret. (This is what you were
working through with the "marketplace deletion notification" exemption —
finish that first if you haven't already.)

### 2. Find your EPN Campaign ID
On your eBay Partner Network dashboard at partnernetwork.ebay.com.

### 3. Add three GitHub repo secrets
On GitHub.com, in your repo: **Settings → Secrets and variables →
Actions → New repository secret**. Add:
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_CAMPAIGN_ID`

### 4. Copy these files into your repo
In GitHub Desktop, open your repo folder and copy in:
```
index.html          (replaces your current one)
js/ebay-live.js      (new file)
scripts/fetch-listings.mjs
data/listings.json
.github/workflows/update-listings.yml
```
Your `css/style.css` and `js/main.js` don't need any changes.

### 5. Commit and push in GitHub Desktop
Write a summary like "Add live eBay crochet finds", commit, push.

### 6. Run it once by hand
On GitHub.com → **Actions** tab → **Update eBay listings** → **Run
workflow**. After it finishes, refresh your live site — real crochet
finds should appear in the eBay-tagged cards.

## Changing what it searches for
Edit the `SEARCHES` list near the top of `scripts/fetch-listings.mjs` —
add, remove, or tweak search terms and category labels. Commit the
change and the next scheduled run picks it up.

## Changing the schedule
Edit the `cron` line in `.github/workflows/update-listings.yml`.
