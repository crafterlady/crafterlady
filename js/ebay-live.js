/**
 * Fetches data/listings.json (kept fresh by the GitHub Action) and injects
 * real eBay finds as .deal-card elements — using the exact same HTML
 * structure and CSS classes as the rest of the site, so they filter and
 * search correctly alongside the Etsy/Walmart/Michaels placeholder cards.
 *
 * Runs BEFORE setupGridFilters() (see the inline script at the bottom of
 * index.html) so the filters/search see these cards from the start.
 */
window.injectEbayFinds = async function injectEbayFinds() {
  const grid = document.getElementById('dealGrid');
  if (!grid) return;

  let data;
  try {
    const res = await fetch('data/listings.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
    data = await res.json();
  } catch (err) {
    console.error('Could not load eBay listings:', err);
    return; // leave the grid as-is (other marketplace cards still show)
  }

  const items = data.items || [];
  if (!items.length) return;

  const html = items.map(renderCard).join('');
  grid.insertAdjacentHTML('afterbegin', html);
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
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
        ${item.image ? `<img src="${escapeHtml(item.image)}" class="card-img-top deal-img" alt="${escapeHtml(item.title)}" loading="lazy">` : ''}
        <div class="card-body d-flex flex-column">
          <span class="badge rounded-pill mb-2 align-self-start badge-ebay">eBay</span>
          <h3 class="h6 fw-bold mb-1">${escapeHtml(item.title)}</h3>
          <p class="text-muted small mb-2">${escapeHtml(item.category)}</p>
          ${item.condition ? `<p class="small mb-3">${escapeHtml(item.condition)}</p>` : ''}
          <div class="d-flex align-items-baseline gap-2 mb-3 mt-auto">
            ${priceRow}
          </div>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener sponsored" class="btn btn-sm btn-view">View deal</a>
        </div>
      </div>
    </div>
  `;
}
