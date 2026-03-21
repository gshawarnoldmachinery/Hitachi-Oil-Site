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
        versionLine.textContent = 'Version ' + pageVersion + ' • Last updated: ' + lastUpdated;
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
        initSimpleTooltips
    };
})();
