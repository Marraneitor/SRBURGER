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
      { href: 'pedido-manual.html', label: 'Pedidos' },
      { href: 'controldeenvios.html', label: 'Envíos' },
      { href: 'repartidor.html', label: 'Repartidor' },
      { href: 'paginaburger.html', label: 'Menú' },
      { href: 'Codigos.html', label: 'Códigos' },
      { href: 'data.html', label: 'Data' },
      { href: 'Historialdepedidos.html', label: 'Historial' },
      { href: 'insumosgastados.html', label: 'Insumos' },
      { href: 'itemsvendidos.html', label: 'Items' },
      { href: 'Ganancias.html', label: 'Ganancias' },
      { href: 'Productos.html', label: 'Productos' },
      { href: 'ingredientes.html', label: 'Ingredientes' },
      { href: 'inventario.html', label: 'Inventario' },
      { href: 'clientes-admin.html', label: 'Clientes' },
      { href: 'Publicidad.html', label: 'Publicidad' },
      { href: 'notifi.html', label: 'Notifi' }
    ];

    const header = document.createElement('header');
    header.className = 'sr-topbar';
    const NAV_PREF_KEY = 'sr_shell_nav_hidden';

    const title = String(document.title || '').replace(/\s+[-–—].*$/, '').trim();

    header.innerHTML = `
      <div class="sr-topbar__inner">
        <div class="sr-topbar__head">
          <a class="sr-brand" href="master.html" aria-label="Ir a Master">SR &amp; SRA <span>BURGER</span></a>
          <div class="sr-topbar__meta" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        </div>
        <button class="sr-topbar__toggle" type="button" aria-label="Abrir menu" aria-controls="sr-main-nav" aria-expanded="false">
          <span class="sr-topbar__toggle-icon" aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>
        <button class="sr-topbar__collapse" type="button" aria-label="Ocultar menu" aria-pressed="false" title="Ocultar o mostrar menu">
          <span class="sr-topbar__collapse-icon" aria-hidden="true">◂</span>
        </button>
        <nav class="sr-topbar__nav" id="sr-main-nav" aria-label="Navegación principal">
          ${links
            .map((l) => {
              const isActive = current === String(l.href).toLowerCase();
              const cls = 'sr-nav-link' + (isActive ? ' is-active' : '');
              return `<a class="${cls}" href="${l.href}">${escapeHtml(l.label)}</a>`;
            })
            .join('')}
        </nav>
      </div>
      <div class="sr-topbar__overlay" aria-hidden="true"></div>
      <button class="sr-fab sr-admin-fab" type="button" aria-label="Accesos rapidos" aria-controls="sr-fab-panel" aria-expanded="false">+</button>
      <div class="sr-fab-panel" id="sr-fab-panel" aria-hidden="true">
        <a class="sr-fab-link" href="pedido-manual.html">Pedidos</a>
        <a class="sr-fab-link" href="controldeenvios.html">Envios</a>
        <a class="sr-fab-link" href="notifi.html">Notifi</a>
        <a class="sr-fab-link" href="admin.html">Admin</a>
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

      const nav = header.querySelector('.sr-topbar__nav');
      const toggle = header.querySelector('.sr-topbar__toggle');
      const collapseBtn = header.querySelector('.sr-topbar__collapse');
      const overlay = header.querySelector('.sr-topbar__overlay');
      const fab = header.querySelector('.sr-admin-fab');
      const fabPanel = header.querySelector('.sr-fab-panel');

      const setNavOpen = (isOpen) => {
        document.body.classList.toggle('sr-nav-open', isOpen);
        if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      };

      const setFabOpen = (isOpen) => {
        document.body.classList.toggle('sr-fab-open', isOpen);
        if (fab) fab.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (fabPanel) fabPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      };

      const setNavCollapsed = (isCollapsed) => {
        document.body.classList.toggle('sr-nav-collapsed', isCollapsed);
        if (collapseBtn) {
          const icon = collapseBtn.querySelector('.sr-topbar__collapse-icon');
          collapseBtn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
          collapseBtn.setAttribute('aria-label', isCollapsed ? 'Mostrar menu' : 'Ocultar menu');
          collapseBtn.setAttribute('title', isCollapsed ? 'Mostrar menu' : 'Ocultar menu');
          if (icon) icon.textContent = isCollapsed ? '▸' : '◂';
        }
        if (isCollapsed) setNavOpen(false);
        try { localStorage.setItem(NAV_PREF_KEY, isCollapsed ? '1' : '0'); } catch (_) {}
      };

      if (toggle) {
        toggle.addEventListener('click', () => {
          if (document.body.classList.contains('sr-nav-collapsed')) {
            setNavCollapsed(false);
          }
          const willOpen = !document.body.classList.contains('sr-nav-open');
          if (willOpen) setFabOpen(false);
          setNavOpen(willOpen);
        });
      }

      if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
          const willCollapse = !document.body.classList.contains('sr-nav-collapsed');
          setFabOpen(false);
          setNavCollapsed(willCollapse);
        });
      }

      if (overlay) {
        overlay.addEventListener('click', () => {
          setNavOpen(false);
          setFabOpen(false);
        });
      }

      if (nav) {
        nav.querySelectorAll('a').forEach((a) => {
          a.addEventListener('click', () => {
            setNavOpen(false);
            setFabOpen(false);
          });
        });
      }

      if (fab) {
        fab.addEventListener('click', () => {
          const willOpen = !document.body.classList.contains('sr-fab-open');
          if (willOpen) setNavOpen(false);
          setFabOpen(willOpen);
        });
      }

      if (fabPanel) {
        fabPanel.querySelectorAll('a').forEach((a) => {
          a.addEventListener('click', () => setFabOpen(false));
        });
      }

      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          setNavOpen(false);
          setFabOpen(false);
        }
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 980) {
          setNavOpen(false);
          setFabOpen(false);
        }
      });

      try {
        const savedPref = localStorage.getItem(NAV_PREF_KEY);
        const initialCollapsed = savedPref == null
          ? window.innerWidth <= 980
          : savedPref === '1';
        setNavCollapsed(initialCollapsed);
      } catch (_) {
        setNavCollapsed(window.innerWidth <= 980);
      }
    }
  } catch (_) {
    // noop
  }
})();
