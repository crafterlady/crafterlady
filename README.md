# Crafterlady Crochet Finds

Automatically pulls crochet listings (yarn, hooks, patterns, kits, amigurumi
supplies, and more) from eBay and displays them on your site with your
affiliate link already attached. Runs itself once set up — nothing to
search for or update by hand.

Visitors see a full grid of finds by default (no search required), and a
search box lets them narrow it down — e.g. typing "hook" or "yarn worsted"
filters the same list instantly, no extra page loads.

## How it works

1. A GitHub Action runs once a day (or whenever you trigger it manually).
2. It calls eBay's Browse API, searching for the categories in
   `scripts/fetch-listings.mjs`, and tags every result with your EPN
   Campaign ID so clicks/sales are tracked to you.
3. It saves the results to `data/listings.json` and commits it.
4. The widget script on your site reads that file and renders the cards —
   no server, no build step.

## One-time setup

### 1. Get eBay developer API keys

You already have your EPN affiliate account. This is a separate, free
step — the API keys are what let the automation *search* eBay (separate
from the affiliate link tracking itself).

1. Go to https://developer.ebay.com and sign in with your eBay account.
2. Create an application (any name is fine, e.g. "Crafterlady Site").
3. Under **Production keys**, copy your **Client ID** and **Client Secret**.
   You won't paste these into any file — they go into GitHub secrets (below).

### 2. Find your EPN Campaign ID

Log into partnernetwork.ebay.com → your Campaign ID is shown on the
dashboard (it's a long number, not the same as your eBay username).

### 3. Add your keys as GitHub repo secrets

In your `crafterlady` repo on GitHub.com (not GitHub Desktop):

1. Go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add each of these three:
   - `EBAY_CLIENT_ID`
   - `EBAY_CLIENT_SECRET`
   - `EBAY_CAMPAIGN_ID`

These stay private — they're never exposed on your live site.

### 4. Copy these files into your repo

Copy this whole folder structure into your `crafterlady` repo (pull in
GitHub Desktop afterward like normal):

```
.github/workflows/update-listings.yml
scripts/fetch-listings.mjs
data/listings.json
widget/listings-widget.css
widget/listings-widget.js
```

### 5. Embed the widget on a page

Open `widget/embed-snippet.html` and copy its contents into whichever page
you want the "Finds We Love" section to show up on (e.g. your homepage or a
dedicated shop page).

### 6. Run it once by hand

You don't need to wait for the daily schedule the first time:

1. In your repo on GitHub.com, go to the **Actions** tab.
2. Click **Update eBay listings** in the sidebar.
3. Click **Run workflow**.

After it finishes (about a minute), `data/listings.json` will have real
items and your site will show them next time it loads.

## Changing what it searches for

Open `scripts/fetch-listings.mjs` and edit the `SEARCHES` list near the top
— change the search terms, add/remove groups (e.g. add "Blankets" or
"Baby items"), or adjust how many items per group. Commit the change and
the next scheduled run picks it up. All groups get merged into one
searchable pool on the site.

## Changing the schedule

Open `.github/workflows/update-listings.yml` and edit the `cron` line.
It's currently set to run daily at 13:00 UTC.
