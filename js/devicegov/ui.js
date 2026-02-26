/**
 * devicegov/ui.js – Device Governance module router, sidebar nav, and page dispatch
 */

let dgCurrentPage = 'devicegov-overview';

const DG_PAGE_META = {
    'devicegov-overview': { title: 'Overview', subtitle: 'Endpoint health at a glance' },
    'devicegov-inventory': { title: 'Device Inventory', subtitle: 'Comprehensive list of Intune managed devices' },
    'devicegov-compliance': { title: 'Compliance & Security', subtitle: 'Identify non-compliant and unencrypted devices' },
    'devicegov-encryption': { title: 'Device Encryption', subtitle: 'BitLocker & FileVault status — filter and export by department' },
    'devicegov-compliance-report': { title: 'Compliance Report', subtitle: 'Full compliance status across all devices — filter and export by department' }
};

function dgNavigateTo(page) {
    dgCurrentPage = page;

    // Nav highlighting
    document.querySelectorAll('.dg-nav-item[data-dgpage]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dgpage === page);
    });

    // Show/hide pages
    document.querySelectorAll('.dg-page-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(page);
    if (section) section.classList.remove('hidden');

    // Header
    const meta = DG_PAGE_META[page] || {};
    const titleEl = document.getElementById('devicegov-page-title');
    const subEl = document.getElementById('devicegov-page-subtitle');
    if (titleEl) titleEl.textContent = meta.title || '';
    if (subEl) subEl.textContent = meta.subtitle || '';

    dgRenderPage(page);
}
window.dgNavigateTo = dgNavigateTo;

async function dgRenderPage(page) {
    switch (page) {
        case 'devicegov-overview':
            if (typeof dgRenderOverview === 'function') dgRenderOverview();
            break;
        case 'devicegov-inventory':
            if (typeof dgRenderInventory === 'function') dgRenderInventory();
            break;
        case 'devicegov-compliance':
            if (typeof dgRenderCompliance === 'function') dgRenderCompliance();
            break;
        case 'devicegov-encryption':
            if (typeof dgRenderEncryption === 'function') dgRenderEncryption();
            break;
        case 'devicegov-compliance-report':
            if (typeof dgRenderComplianceReport === 'function') dgRenderComplianceReport();
            break;
    }
}
window.dgRenderPage = dgRenderPage;

// ── Wire up Device Governance sidebar events ────────────────────────────────
async function dgInitUI() {
    // Nav items
    document.querySelectorAll('.dg-nav-item[data-dgpage]').forEach(btn => {
        btn.addEventListener('click', () => dgNavigateTo(btn.dataset.dgpage));
    });

    // Try to load from cache
    if (typeof loadDgCache === 'function') {
        const loaded = await loadDgCache();
        if (loaded) {
            const statusEl = document.getElementById('devicegov-sync-status');
            if (statusEl) {
                const age = Math.round((Date.now() - DG.data.lastSync) / 60000);
                statusEl.textContent = age === 0 ? 'Cached: Just now' : `Cached: ${age}m ago`;
            }
            dgRenderPage(dgCurrentPage);
        }
    }

    // Back to hub
    const backBtn = document.getElementById('devicegov-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (typeof backToHub === 'function') backToHub();
        });
    }

    // Refresh Data
    const refreshBtn = document.getElementById('devicegov-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (LG.isDemoMode) {
                if (typeof dgLoadDemoData === 'function') await dgLoadDemoData();
            } else {
                if (typeof dgLoadGraphData === 'function') await dgLoadGraphData();
            }
        });
    }

    // Init Lucide icons specifically for the Device Gov section if not already done globally
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({
            nodes: document.getElementById('view-devicegov').querySelectorAll('[data-lucide]')
        });
    }
}
window.dgInitUI = dgInitUI;
