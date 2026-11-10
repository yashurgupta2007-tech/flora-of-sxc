

let ALL_TREES = [];
let ALL_ZONES = [];

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('tree-grid');
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const resultCount = document.getElementById('result-count');

  if (!grid || !searchInput ||
    !typeFilter || !resultCount) {
    console.error('Tree directory: Required HTML elements are missing.');
    return;
  }

  const zoneFilter = document.createElement('select');
  zoneFilter.id = 'zone-filter';
  zoneFilter.setAttribute('aria-label', 'Filter by campus zone');
  zoneFilter.innerHTML = '<option value="">All campus zones</option>';

  const filterContainer = document.querySelector('.filter-bar');
  filterContainer.appendChild(zoneFilter);

  const params = new URLSearchParams(window.location.search);
  const requestedZone = (params.get('zone') || '').toLowerCase();

  grid.innerHTML =
    '<div class="empty-state"><p>Loading the campus tree directory...</p></div>';

  try {

    const results = await Promise.all([
      fetchZones(),
      fetchTrees({ limit: 200 })
    ]);

    ALL_ZONES = results[0] || [];
    const response = results[1];

    ALL_TREES = (response.data || []).filter(
      tree => tree.is_active !== false
    );

    ALL_ZONES.forEach(zone => {
      const option = document.createElement('option');
      option.value = zone.slug;
      option.textContent = zone.name;
      zoneFilter.appendChild(option);
    });

    if (ALL_ZONES.some(zone => zone.slug === requestedZone)) {
      zoneFilter.value = requestedZone;
    }



    applyFilters();

  } catch (error) {
    console.error('Could not load the tree directory:', error);

    grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"
                  style="font-size:2rem;color:#e0a13c;"></i>
                <p>Could not load the tree directory.</p>
                <p>Please check your connection and refresh the page.</p>
            </div>`;

    resultCount.textContent = 'Unable to load tree records';
    return;
  }


  searchInput.addEventListener('input', debounce(applyFilters, 200));
  typeFilter.addEventListener('change', applyFilters);
  zoneFilter.addEventListener('change', applyFilters);

  function applyFilters() {
    const search = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;
    const zone = zoneFilter.value;

    const filtered = ALL_TREES.filter(tree => {
      const searchableFields = [
        tree.common_name,
        tree.botanical_name,
      ];

      const matchesSearch = !search ||
        searchableFields.some(value =>
          String(value || '').toLowerCase().includes(search)
        );

      const matchesType = !type || tree.plant_type === type;

      const matchesZone = !zone ||
        tree.campus_zones?.slug === zone;

      return matchesSearch &&
        matchesType &&
        matchesZone;
    });

    render(filtered);
  }

  function render(trees) {
    const count = trees.length;

    resultCount.textContent =
      `Showing ${count} of ${ALL_TREES.length} documented tree` +
      `${ALL_TREES.length === 1 ? '' : 's'}`;

    if (count === 0) {
      if (ALL_TREES.length === 0) {
        grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-leaf"
                           style="font-size:2rem;color:var(--leaf-400);"></i>
                        <p><strong>The campus tree directory is being prepared.</strong></p>
                        <p>Verified tree records will appear here as the campus survey progresses.</p>
                    </div>`;
      } else {
        grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-magnifying-glass"
                        style="font-size:2rem;color:var(--leaf-400);"></i>
                        <p>No trees match your selected filters.</p>
                        <p>Try another search or choose a different campus zone.</p>
                    </div>`;
      }
      return;
    }

    grid.innerHTML = trees.map(renderTreeCard).join('');
  }

  function renderTreeCard(tree) {
    const image = tree.image_url || 'https://placehold.co/400x300?text=Flora+of+SXC';
    const zoneName = tree.campus_zones?.name || '';

    return `
    <article class="tree-card reveal is-visible">
      <a href="tree.html?id=${encodeURIComponent(tree.id)}">
        <div class="tree-card-img">
        <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(tree.common_name || 'Plant')}"
            loading="lazy"
          >

          <span class="tree-card-badge">
            ${escapeHTML(tree.plant_type || 'Plant')}
          </span>

        </div>
      </a>

      <div class="tree-card-body">

        <h3>
          ${escapeHTML(tree.common_name || 'Unnamed Plant')}
        </h3>

        <div class="sci-name">
          <i>${escapeHTML(tree.botanical_name || '')}</i>
        </div>

        ${zoneName ? `
          <div class="family-tag">
            <i class="fa-solid fa-location-dot"></i>
            ${escapeHTML(zoneName)}
          </div>
        ` : ''}

        <div class="tree-card-footer">

          <a
            class="tree-card-link"
            href="tree.html?id=${encodeURIComponent(tree.id)}"
          >
            Explore Profile
            <i class="fa-solid fa-arrow-right"></i>
          </a>

        </div>

      </div>

    </article>`;
  }

  function debounce(callback, delay) {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(...args), delay);
    };
  }
});
