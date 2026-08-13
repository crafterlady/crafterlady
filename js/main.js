/* ============================================================
   CrafterLady — site behavior
   Deal cards now live as plain HTML in index.html (Bootstrap
   cards) — this file just handles filtering/search on top of
   whatever cards are already on the page, plus nav + newsletter.
   ============================================================ */

function setupGridFilters(){
  const cards = Array.from(document.querySelectorAll(".deal-card"));
  const grid = document.getElementById("dealGrid");
  if(!cards.length || !grid) return;

  let activePlatform = "all";
  let activeCraft = "all";
  let query = "";
  let emptyState = null;

  function apply(){
    let anyVisible = false;
    cards.forEach(card => {
      const platform = card.dataset.platform || "";
      const crafts = (card.dataset.craft || "").split(" ");
      const text = card.textContent.toLowerCase();

      let visible = true;
      if(activePlatform !== "all" && platform !== activePlatform) visible = false;
      if(activeCraft !== "all" && !crafts.includes(activeCraft)) visible = false;
      if(query && !text.includes(query)) visible = false;

      card.classList.toggle("d-none", !visible);
      if(visible) anyVisible = true;
    });

    if(!anyVisible){
      if(!emptyState){
        emptyState = document.createElement("div");
        emptyState.className = "col-12 text-center py-5 text-muted";
        emptyState.innerHTML = '<h3 class="h5" style="color:var(--ink);">No finds match yet</h3><p class="mb-0">Try a different search term or filter.</p>';
        grid.appendChild(emptyState);
      }
    } else if(emptyState){
      emptyState.remove();
      emptyState = null;
    }
  }

  document.querySelectorAll("button[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      activePlatform = btn.dataset.filter;
      document.querySelectorAll("button[data-filter]").forEach(o =>
        o.setAttribute("aria-pressed", o === btn ? "true" : "false"));
      apply();
    });
  });

  document.querySelectorAll("button[data-craft]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCraft = btn.dataset.craft;
      document.querySelectorAll("button[data-craft]").forEach(o =>
        o.setAttribute("aria-pressed", o === btn ? "true" : "false"));
      apply();
    });
  });

  const search = document.getElementById("dealSearch");
  if(search){
    search.addEventListener("input", e => {
      query = e.target.value.trim().toLowerCase();
      apply();
    });
  }
}

// Mobile nav toggle
function setupNav(){
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if(!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// Newsletter form (front-end only placeholder — wire up to your provider)
function setupNewsletter(){
  const form = document.querySelector(".nl-form");
  if(!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = form.querySelector("button");
    const original = btn.textContent;
    btn.textContent = "Signed up!";
    form.reset();
    setTimeout(() => { btn.textContent = original; }, 2500);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupNewsletter();
});
