(function () {
  try {
    const current = (location.pathname.split('/').pop() || '').toLowerCase();

    // IMPORTANT: Never show the internal navigation shell on customer-facing pages.
    const blockedPages = new Set(['', 'index.html', 'paginaburger.html', 'tuenvio.html']);
    if (blockedPages.has(current)) return;

    const html = document.documentElement;
    const body = document.body;

    // Allow explicit opt-out per page.
    if (
      (html && html.getAttribute('data-sr-shell') === '0') ||
      (body && body.getAttribute('data-sr-shell') === '0')
    ) {
      return;
    }

    html.classList.add('sr-dark');
    if (body) body.classList.add('sr-app');

    const links = [
      { href: 'master.html', label: 'Master' },
      { href: 'admin.html', label: 'Admin' },
      { href: 'paginaburger.html', label: 'Menú' },
      { href: 'controldeenvios.html', label: 'Envíos' },
      { href: 'Codigos.html', label: 'Códigos' },
      { href: 'data.html', label: 'Data' },
      { href: 'insumosgastados.html', label: 'Insumos' },
      { href: 'itemsvendidos.html', label: 'Items' },
      { href: 'Ganancias.html', label: 'Ganancias' },
      { href: 'Productos.html', label: 'Productos' },
      { href: 'ingredientes.html', label: 'Ingredientes' }
    ];

    const header = document.createElement('header');
    header.className = 'sr-topbar';

    const title = String(document.title || '').replace(/\s+[-–—].*$/, '').trim();

    header.innerHTML = `
      <div class="sr-topbar__inner">
        <a class="sr-brand" href="master.html" aria-label="Ir a Master">SR &amp; SRA <span>BURGER</span></a>
        <div class="sr-topbar__meta" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <nav class="sr-topbar__nav" aria-label="Navegación principal">
          ${links
            .map((l) => {
              const isActive = current === String(l.href).toLowerCase();
              const cls = 'sr-nav-link' + (isActive ? ' is-active' : '');
              return `<a class="${cls}" href="${l.href}">${escapeHtml(l.label)}</a>`;
            })
            .join('')}
        </nav>
      </div>
    `;

    function escapeHtml(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    if (document.body) {
      document.body.prepend(header);
    }
  } catch (_) {
    // noop
  }
})();
