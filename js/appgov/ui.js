/**
 * appgov/ui.js – App Governance module router, sidebar nav, and page dispatch
 */

let agCurrentPage = 'appgov-overview';
let agSelectedApp = null;

const AG_PAGE_META = {
    'appgov-overview': { title: 'App Governance Overview', subtitle: 'Enterprise application health at a glance' },
    'appgov-apps': { title: 'Application Inventory', subtitle: 'All enterprise applications registered in your tenant' },

    'appgov-detail': { title: 'Application Detail', subtitle: '' },
};

function agNavigateTo(page, app) {
    agCurrentPage = page;
    if (app) agSelectedApp = app;

    // Nav highlighting
    document.querySelectorAll('.ag-nav-item[data-agpage]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.agpage === page);
    });

    // Show/hide pages
    document.querySelectorAll('.ag-page-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(page);
    if (section) section.classList.remove('hidden');

    // Header
    const meta = AG_PAGE_META[page] || {};
    const titleEl = document.getElementById('appgov-page-title');
    const subEl = document.getElementById('appgov-page-subtitle');
    if (titleEl) titleEl.textContent = page === 'appgov-detail' && agSelectedApp
        ? agSelectedApp.displayName
        : (meta.title || '');
    if (subEl) subEl.textContent = meta.subtitle || '';

    agRenderPage(page);
}
window.agNavigateTo = agNavigateTo;

async function agRenderPage(page) {
    switch (page) {
        case 'appgov-overview': agRenderOverview(); break;
        case 'appgov-apps': agRenderAppsTable(); break;

        case 'appgov-detail': await agRenderAppDetail(agSelectedApp); break;
    }
}
window.agRenderPage = agRenderPage;

// ── Open app detail ───────────────────────────────────────────────────────
function agOpenApp(app) {
    agNavigateTo('appgov-detail', app);
}
window.agOpenApp = agOpenApp;

// ── Wire up App Governance sidebar events ─────────────────────────────────
function agInitUI() {
    // Nav items
    document.querySelectorAll('.ag-nav-item[data-agpage]').forEach(btn => {
        btn.addEventListener('click', () => agNavigateTo(btn.dataset.agpage));
    });

    // Inactivity threshold
    const sel = document.getElementById('appgov-inactivity-days');
    if (sel) {
        sel.value = AG.inactivityDays;
        sel.addEventListener('change', e => {
            AG.inactivityDays = parseInt(e.target.value);
            agRenderPage(agCurrentPage);
        });
    }

    // Refresh (Force Sync — clears cache and re-fetches everything)
    document.getElementById('appgov-refresh-btn')?.addEventListener('click', async () => {
        if (AG.isDemoMode) {
            agLoadDemoData();
            agRenderPage(agCurrentPage);
            showToast('App demo data refreshed', 'info');
        } else if (LG.accessToken) {
            if (typeof agClearCache === 'function') await agClearCache();
            AG.data.apps = [];
            showToast('Starting full App Governance sync — this may take a while', 'info', 5000);
            await agLoadAllData();
            agRenderPage(agCurrentPage);
        }
    });

    // Back to hub
    document.getElementById('appgov-back-btn')?.addEventListener('click', showHub);
}
window.agInitUI = agInitUI;
