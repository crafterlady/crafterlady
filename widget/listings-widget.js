/**
 * Crochet finds widget.
 * Drop the container markup (see embed-snippet.html) anywhere on a page,
 * include this script + listings-widget.css, and it renders itself.
 *
 * Shows every fetched item by default. The search box filters that same
 * list client-side as the visitor types — no extra API calls, no keys
 * exposed in the browser.
 */
(function () {
  const DATA_URL = '/data/listings.json'; // adjust path if your repo layout differs
  const DEFAULT_LIMIT = 60; // how many cards to show before searching

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function renderCard(item) {
    return `
      <a class="cl-finds__card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener sponsored">
        <div class="cl-finds__img-wrap">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">` : ''}
        </div>
        <p class="cl-finds__item-title">${escapeHtml(item.title)}</p>
        ${item.price ? `<span class="cl-finds__price">${escapeHtml(item.price)}</span>` : ''}
      </a>
    `;
  }

  function renderGrid(items, gridEl, emptyMessage) {
    if (!items.length) {
      gridEl.innerHTML = `<p class="cl-finds__empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }
    gridEl.innerHTML = items.map(renderCard).join('');
  }

  function matches(item, query) {
    const haystack = `${item.title} ${item.tag || ''}`.toLowerCase();
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((word) => haystack.includes(word));
  }

  async function init(container) {
    container.innerHTML = `
      <h2 class="cl-finds__title">Crochet Finds</h2>
      <p class="cl-finds__subtitle">Hand-picked crochet yarn, hooks, patterns &amp; kits, updated daily.</p>
      <input
        type="search"
        class="cl-finds__search"
        placeholder="Search yarn, hooks, patterns, kits…"
        aria-label="Search crochet finds"
      >
      <div class="cl-finds__grid" data-cl-grid></div>
      <p class="cl-finds__updated" data-cl-updated></p>
    `;

    const gridEl = container.querySelector('[data-cl-grid]');
    const updatedEl = container.querySelector('[data-cl-updated]');
    const searchEl = container.querySelector('.cl-finds__search');

    let allItems = [];

    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
      const data = await res.json();
      allItems = data.items || [];

      renderGrid(allItems.slice(0, DEFAULT_LIMIT), gridEl, 'No finds right now — check back soon.');

      if (data.generatedAt) {
        const updated = new Date(data.generatedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        updatedEl.textContent = `Updated ${updated}`;
      }
    } catch (err) {
      console.error(err);
      gridEl.innerHTML = `<p class="cl-finds__error">Couldn't load finds right now — please refresh.</p>`;
      return;
    }

    searchEl.addEventListener('input', () => {
      const query = searchEl.value.trim();
      if (!query) {
        renderGrid(allItems.slice(0, DEFAULT_LIMIT), gridEl, 'No finds right now — check back soon.');
        return;
      }
      const filtered = allItems.filter((item) => matches(item, query));
      renderGrid(filtered, gridEl, `No matches for "${query}" — try a different search.`);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-cl-finds]').forEach(init);
  });
})();
