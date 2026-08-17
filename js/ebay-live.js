/** 
 * Fetches data/listings.json (kept fresh by the GitHub Action) and injects 
 * real eBay finds as .deal-card elements — using the exact same HTML 
 * structure and CSS classes as the rest of the site, so they filter and 
 * search correctly alongside the Etsy/Walmart/Michaels placeholder cards. 
 * 
 * Runs BEFORE setupGridFilters() (see the inline script at the bottom of 
 * index.html) so the filters/search see these cards from the start. 
 * 
 * data-ebay-category on #dealGrid can be a single category ("Vintage Books") 
 * or a comma-separated list ("Aunt Lydia's,Lizbeth,Coats,DMC,South Maid,Herrschners") 
 * to show several categories together on one page. Leave it off (like the 
 * homepage) to show everything. 
 */ 
window.injectEbayFinds = async function injectEbayFinds() { 
  const grid = document.getElementById('dealGrid'); 
  if (!grid) return; 
  
  const categoryFilter = grid.dataset.ebayCategory || null; 
  const categoryList = categoryFilter ? categoryFilter.split(',').map((c) => c.trim()) : null; 
  
  let data; 
  try { 
    const res = await fetch('data/listings.json', { cache: 'no-store' }); 
    if (!res.ok) throw new Error(`Failed to load listings (${res.status})`); 
    data = await res.json(); 
  } catch (err) { 
    console.error('Could not load eBay listings:', err); 
    return; // leave the grid as-is (other marketplace cards still show, if any) 
  } 
  
  let items = data.items || []; 
  if (categoryList) { 
    items = items.filter((item) => categoryList.includes(item.category)); 
  } 
  
  if (!items.length) { 
    grid.innerHTML = ` 
      <div class="col-12 text-center py-5 text-muted"> 
        <h3 class="h5" style="color:var(--ink);">No finds yet</h3> 
        <p class="mb-0">Check back soon — new finds are added daily.</p> 
      </div> 
    `; 
    return; 
  } 
  
  const html = items.map(renderCard).join(''); 
  grid.insertAdjacentHTML('afterbegin', html); 
}; 

function escapeHtml(str) { 
  const div = document.createElement('div'); 
  div.textContent = str == null ? '' : String(str); 
  return div.innerHTML; 
} 

function renderCard(item) { 
  // 1. Strip the '$' sign and turn the text price into a math number
  const basePriceText = item.price ? String(item.price).replace(/[^0-9.]/g, '') : '0'; 
  const basePrice = parseFloat(basePriceText) || 0; 

  // 2. Look for shipping cost inside the item data and turn it into a number
  let shippingCost = 0; 
  if (item.shippingOptions && item.shippingOptions[0] && item.shippingOptions[0].shippingCost) { 
    shippingCost = parseFloat(item.shippingOptions[0].shippingCost.value) || 0; 
  } 

  // 3. Add them together and format it back into a standard price string (e.g., "$53.50")
  const totalCombinedPrice = "$" + (basePrice + shippingCost).toFixed(2); 

  // 4. Build the price row using the new combined total
  const priceRow = item.originalPrice ? ` 
    <span class="fw-bold">${escapeHtml(totalCombinedPrice)}</span> 
    <span class="text-muted text-decoration-line-through small">${escapeHtml(item.originalPrice)}</span> 
    ${item.discountLabel ? `<span class="badge badge-save ms-auto">${escapeHtml(item.discountLabel)}</span>` : ''} 
  ` : `<span class="fw-bold">${escapeHtml(totalCombinedPrice)}</span>`; 

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
