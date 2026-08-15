/**
 * Fetches data/listings.json (kept fresh by the GitHub Action) and injects
 * real eBay finds as .deal-card elements — using the exact same HTML
 * structure and CSS classes as the rest of the site, so they filter and
 * search correctly alongside the Etsy/Walmart/Michaels placeholder cards.
 *
 * data/listings.json is grouped by brand ("sections"), each with its own
 * label and list of listings — e.g. Aunt Lydia's, Lizbeth, Coats, DMC,
 * South Maid, Herrschners. This renders one labeled row of cards per
 * section, in the order they appear in the JSON.
 *
 * Runs BEFORE setupGridFilters() (see the inline script at the bottom of
 * index.html) so the filters/search see these cards from the start.
 */
window.injectEbayFinds = async function injectEbayFinds() {
  const grid = document.getElementById('dealGrid');
  if (!grid) return;
  // On dedicated category pages, add data-ebay-category="Vintage Books" (etc.)
  // to the grid div to show only that section's cards. Leave it off (like
  // the homepage) to show every section.
  const categoryFilter = grid.dataset.ebayCategory || null;
  let data;
  try {
    const res = await fetch('data/listings.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
    data = await res.json();
  } catch (err) {
    console.error('Could not load eBay listings:', err);
    return; // leave the grid as-is (other marketplace cards still show, if any)
  }

  let sections = data.sections || [];
  if (categoryFilter) {
    sections = sections.filter((section) => section.label === categoryFilter);
  }
  // Only keep sections that actually have listings.
  sections = sections.filter((section) => (section.listings || []).length);

  if (!sections.length) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <h3 class="h5" style="color:var(--ink);">No finds yet</h3>
        <p class="mb-0">Check back soon — new finds are added daily.</p>
      </div>
    `;
    return;
  }

  const html = sections.map(renderSection).join('');
  grid.insertAdjacentHTML('afterbegin', html);
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function renderSection(section) {
  const heading = `
    <div class="col-12 ebay-section-heading">
      <h2 class="h5 fw-bold mb-3" style="color:var(--ink);">${escapeHtml(section.label)}</h2>
    </div>
  `;
  const cards = (section.listings || []).map(renderCard).join('');
  return heading + cards;
}

function renderCard(item) {
  const priceRow = item.originalPrice
    ? `
      <span class="fw-bold">${escapeHtml(item.price)}</span>
      <span class="text-muted text-decoration-line-through small">${escapeHtml(item.originalPrice)}</span>
      ${item.discountLabel ? `<span class="badge badge-save ms-auto">${escapeHtml(item.discountLabel)}</span>` : ''}
    `
    : `<span class="fw-bold">${escapeHtml(item.price)}</span>`;
  return `
    <div class="col-12 col-sm-6 col-lg-3 deal-card" data-platform="ebay" data-craft="crochet">
      <div class="card h-100 shadow-sm">
        <div class="deal-img-wrap">
          ${item.image ? `<img src="${escapeHtml(item.image)}" class="deal-img" alt="${escapeHtml(item.title)}" loading="lazy">` : ''}
        </div>
        <div class="card-body d-flex flex-column">
          <span class="badge rounded-pill mb-2 align-self-start badge-ebay">eBay</span>
          <h3 class="h6 fw-bold mb-1 deal-title">${escapeHtml(item.title)}</h3>
          <p class="text-muted small mb-2">${escapeHtml(item.category)}</p>
          <div class="d-flex align-items-baseline gap-2 mb-3 mt-auto">
            ${priceRow}
          </div>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener sponsored" class="btn btn-sm btn-view">View deal</a>
        </div>
      </div>
    </div>
  `;
}
