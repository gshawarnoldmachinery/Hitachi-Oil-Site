// Shared UI helpers for all Hitachi product pages.
(function () {
    const state = {
        themeInitialized: false,
        menuInitialized: false,
        printInitialized: false,
        buttons: []
    };

    // Theme persistence key.
    const BRIGHTNESS_KEY = 'hitachiThemeBrightness';

    const SEARCH_DATA = [
        { title: 'Grease', url: '../Grease/', keywords: 'nlgi ep grease pins bushings lubrication' },
        { title: 'Engine Oil', url: '../Engine-Oil/', keywords: 'engine oil diesel dh-2 10w-40' },
        { title: 'Coolant', url: '../Coolant/', keywords: 'coolant antifreeze 50/50 extended life' },
        { title: 'Hydraulic Oil', url: '../Hydraulic-Oil/', keywords: 'hydraulic oil super 46hn hydraulic system' },
        { title: 'Transmission Oil', url: '../Transmission-Oil/', keywords: 'transmission oil 10w powershift' },
        { title: 'Gear Oil', url: '../Gear-Oil/', keywords: 'gear oil gl-4 planetary swing gears' },
        { title: 'Axle Oil', url: '../Axle-Oil/', keywords: 'axle oil extreme pressure wheel loader' }
    ];

    function applyBrightness(level, buttons) {
        const valid = ['subtle', 'bold'].includes(level) ? level : 'subtle';
        document.body.classList.remove('brightness-subtle', 'brightness-medium', 'brightness-bold');
        document.body.classList.add('brightness-' + valid);
        buttons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.brightness === valid);
        });
        return valid;
    }

    // Theme toggle initialization (Light/Dark buttons).
    function initThemeToggle() {
        if (state.themeInitialized) {
            return { buttons: state.buttons, apply: (level) => applyBrightness(level, state.buttons) };
        }
        const buttons = Array.from(document.querySelectorAll('.brightness-btn'));
        state.buttons = buttons;
        if (!buttons.length) {
            state.themeInitialized = true;
            return { buttons: [], apply: () => 'subtle' };
        }

        const storedBrightness = localStorage.getItem(BRIGHTNESS_KEY) || 'subtle';
        applyBrightness(storedBrightness, buttons);

        buttons.forEach((btn) => {
            btn.addEventListener('click', function () {
                const level = btn.dataset.brightness || 'subtle';
                const applied = applyBrightness(level, buttons);
                localStorage.setItem(BRIGHTNESS_KEY, applied);
            });
        });

        state.themeInitialized = true;
        return { buttons, apply: (level) => applyBrightness(level, buttons) };
    }

    // Burger menu toggle behavior.
    function initToolbarMenu() {
        if (state.menuInitialized) return;
        const menuButton = document.querySelector('.toolbar-menu-btn');
        const menu = document.getElementById('toolbarMenu');
        if (!menuButton || !menu) {
            state.menuInitialized = true;
            return;
        }

        // When viewing locally via file://, ensure directory links open index.html.
        if (window.location && window.location.protocol === 'file:') {
            const links = Array.from(document.querySelectorAll('a[href$="/"]'));
            links.forEach((link) => {
                const href = link.getAttribute('href') || '';
                if (href.includes('://')) return;
                link.setAttribute('href', href + 'index.html');
            });
        }

        const closeMenu = () => {
            menu.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
        };

        menuButton.addEventListener('click', function (event) {
            event.stopPropagation();
            const open = menu.classList.toggle('is-open');
            menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        document.addEventListener('click', function (event) {
            if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeMenu();
        });

        state.menuInitialized = true;
    }

    // Print button handler.
    function initPrintButton() {
        if (state.printInitialized) return;
        const printBtn = document.getElementById('printBtn');
        if (!printBtn) {
            state.printInitialized = true;
            return;
        }
        printBtn.addEventListener('click', function () {
            if (typeof window.print === 'function') {
                window.print();
            } else {
                alert('Print is not supported in this app. Please open this file in a web browser and print from there.');
            }
        });
        state.printInitialized = true;
    }

    // Simple site search (page name + keywords).
    function initSiteSearch() {
        const inputs = Array.from(document.querySelectorAll('.toolbar-search-input'));
        if (!inputs.length) return;

        const normalized = SEARCH_DATA.map((item) => {
            return {
                title: item.title,
                url: item.url,
                haystack: (item.title + ' ' + (item.keywords || '')).toLowerCase()
            };
        });

        function resolveHref(url) {
            if (window.location && window.location.protocol === 'file:' && url.endsWith('/')) {
                return url + 'index.html';
            }
            return url;
        }

        function renderResults(container, results, query) {
            if (!container) return;
            container.innerHTML = '';
            if (!query) {
                container.classList.remove('is-open');
                return;
            }
            if (!results.length) {
                const empty = document.createElement('div');
                empty.className = 'toolbar-search-empty';
                empty.textContent = 'No matches for "' + query + '"';
                container.appendChild(empty);
                container.classList.add('is-open');
                return;
            }
            results.forEach((item) => {
                const link = document.createElement('a');
                link.href = resolveHref(item.url);
                link.textContent = item.title;
                container.appendChild(link);
            });
            container.classList.add('is-open');
        }

        inputs.forEach((input) => {
            const wrap = input.closest('.toolbar-search-wrap');
            const resultsEl = wrap ? wrap.querySelector('.toolbar-search-results') : null;
            let latestResults = [];

            function closeResults() {
                if (resultsEl) resultsEl.classList.remove('is-open');
            }

            input.addEventListener('input', function () {
                const query = input.value.trim().toLowerCase();
                if (query.length < 2) {
                    renderResults(resultsEl, [], '');
                    return;
                }
                latestResults = normalized.filter((item) => item.haystack.includes(query)).slice(0, 6);
                renderResults(resultsEl, latestResults, input.value.trim());
            });

            input.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    closeResults();
                    input.blur();
                }
                if (event.key === 'Enter' && latestResults.length) {
                    window.location.href = resolveHref(latestResults[0].url);
                }
            });

            document.addEventListener('click', function (event) {
                if (!wrap || !resultsEl) return;
                if (wrap.contains(event.target)) return;
                closeResults();
            });
        });
    }

    // Footer version line updater.
    function initVersionLine(pageVersion) {
        const versionLine = document.getElementById('versionLine');
        if (!versionLine) return;
        const updated = document.lastModified ? new Date(document.lastModified) : new Date();
        const lastUpdated = isNaN(updated.getTime()) ? 'Unknown' : updated.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
        versionLine.textContent = 'Version ' + pageVersion + ' - Last updated: ' + lastUpdated;
    }

    // Mobile tooltip toggles for simple tooltip cards.
    function initSimpleTooltips() {
        const tips = Array.from(document.querySelectorAll('.family-tooltip'));
        if (!tips.length) return;
        const mobile = window.matchMedia('(max-width: 768px)');

        function closeAll() {
            tips.forEach((tip) => tip.classList.remove('is-open'));
            document.body.classList.remove('tip-open');
        }

        document.addEventListener('click', function (event) {
            if (!mobile.matches) return;
            const target = event.target.closest('.family-tooltip');
            if (!target) {
                closeAll();
                return;
            }
            const open = target.classList.contains('is-open');
            closeAll();
            if (!open) {
                target.classList.add('is-open');
                document.body.classList.add('tip-open');
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeAll();
        });
    }

    window.SiteShared = {
        initThemeToggle,
        initToolbarMenu,
        initPrintButton,
        initVersionLine,
        initSimpleTooltips,
        initSiteSearch
    };
})();
