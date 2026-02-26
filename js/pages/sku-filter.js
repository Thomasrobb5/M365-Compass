/**
 * pages/sku-filter.js – SKU exclusion management for Licence Governance
 *
 * Stores excluded SKU IDs in localStorage under 'lg_excluded_skus'.
 * Auto-excludes known "secondary" SKU patterns on first run.
 */

// ── Known secondary SKU patterns (by prefix / keyword in partNumber) ──────
const SECONDARY_SKU_PATTERNS = [
    'WINDOWS_STORE', 'MICROSOFT_BUSINESS_CENTER', 'RIGHTSMANAGEMENT_ADHOC',
    'MCOPSTNPP', 'MCOPSTN', 'FLOW_FREE', 'POWERFLOW_P1', 'POWER_BI_STANDARD',
    'TEAMS_FREE', 'DESKLESSPACK', 'ENTERPRISEPACKWITHOUTPROPLUS',
    'INTUNE_A_D', 'ATP_ENTERPRISE', 'WIN_DEF_ATP', 'THREAT_INTELLIGENCE',
    'ADALLOM_O365', 'ADALLOM_STANDALONE', 'CRMPLAN', 'DYN365',
    'MDATP_SERVER', 'DEFENDER_ENDPOINT', 'MCOMEETADV', 'MCOSTANDARD',
    'MCOCAP', 'MCOIMP', 'CRMSTORAGE', 'PROJECTCLIENT', 'VISIONONLINE_PLAN1',
    'OFFICESUBSCRIPTION_FACULTY', 'STANDARDWOFFPACK_FACULTY',
    'ENTERPRISEPREMIUM_FACULTY', 'STANDARDPACK_STUDENT',
];
// SKUs with this many or more seats get a "large" flag (likely secondary)
const LARGE_SKU_THRESHOLD = 10000;
const LG_EXCLUDED_KEY = 'lg_excluded_skus';

// ── Load / save exclusion list ────────────────────────────────────────────
function loadExcludedSkus() {
    try {
        const raw = localStorage.getItem(LG_EXCLUDED_KEY);
        return raw ? new Set(JSON.parse(raw)) : null;
    } catch { return null; }
}

function saveExcludedSkus(set) {
    localStorage.setItem(LG_EXCLUDED_KEY, JSON.stringify([...set]));
}

// Called once after first data load to auto-detect and exclude secondary SKUs
function autoExcludeSecondarySkus(skus) {
    const existing = loadExcludedSkus();
    if (existing !== null) return; // already configured, respect user's choices

    const excluded = new Set();
    skus.forEach(sku => {
        const part = (sku.skuPartNumber || '').toUpperCase();
        const seats = sku.prepaidUnits?.enabled || 0;
        const isSecondary = SECONDARY_SKU_PATTERNS.some(p => part.includes(p)) || seats >= LARGE_SKU_THRESHOLD;
        if (isSecondary) excluded.add(sku.skuId);
    });
    saveExcludedSkus(excluded);
    if (excluded.size) showToast(`Auto-hidden ${excluded.size} secondary SKU(s) — manage in SKU Settings`, 'info', 6000);
}
window.autoExcludeSecondarySkus = autoExcludeSecondarySkus;

// Filter the SKU list based on user's current exclusions
function getVisibleSkus(skus) {
    const excluded = loadExcludedSkus();
    if (!excluded || excluded.size === 0) return skus;
    return skus.filter(s => !excluded.has(s.skuId));
}
window.getVisibleSkus = getVisibleSkus;

// ── SKU Manager Modal ────────────────────────────────────────────────────
function openSkuManager() {
    const modal = document.getElementById('sku-manager-modal');
    if (!modal) return;
    renderSkuManagerList();
    modal.classList.remove('hidden');
}
function closeSkuManager() {
    document.getElementById('sku-manager-modal')?.classList.add('hidden');
}
window.openSkuManager = openSkuManager;
window.closeSkuManager = closeSkuManager;

function renderSkuManagerList() {
    const list = document.getElementById('sku-manager-list');
    if (!list) return;
    const skus = LG.data.skus;
    const excluded = loadExcludedSkus() || new Set();

    list.innerHTML = skus.map(sku => {
        const name = getSkuName(sku.skuId, sku.skuPartNumber);
        const seats = sku.prepaidUnits?.enabled || 0;
        const isExcluded = excluded.has(sku.skuId);
        const isLarge = seats >= LARGE_SKU_THRESHOLD;
        const isSecondary = SECONDARY_SKU_PATTERNS.some(p => (sku.skuPartNumber || '').toUpperCase().includes(p));
        const tag = isLarge ? `<span class="text-xs text-amber-400 ml-1">${seats.toLocaleString()} seats</span>` :
            isSecondary ? `<span class="text-xs text-slate-500 ml-1">secondary</span>` : '';
        return `
        <label class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-800 cursor-pointer transition group">
            <input type="checkbox" class="sku-toggle w-4 h-4 accent-brand-500 rounded shrink-0"
                data-skuid="${sku.skuId}" ${isExcluded ? '' : 'checked'} onchange="toggleSkuExclusion('${sku.skuId}', this.checked)">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-200 truncate">${name}${tag}</p>
                <p class="text-xs text-slate-500 truncate">${sku.skuPartNumber || ''}</p>
            </div>
            ${isExcluded ? '<span class="text-xs text-slate-600">hidden</span>' : ''}
        </label>`;
    }).join('');
}

function toggleSkuExclusion(skuId, isVisible) {
    const excluded = loadExcludedSkus() || new Set();
    if (isVisible) excluded.delete(skuId);
    else excluded.add(skuId);
    saveExcludedSkus(excluded);
    // Re-render current page to apply filter
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
}
window.toggleSkuExclusion = toggleSkuExclusion;

function resetSkuFilter() {
    localStorage.removeItem(LG_EXCLUDED_KEY);
    autoExcludeSecondarySkus(LG.data.skus);
    renderSkuManagerList();
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
}
window.resetSkuFilter = resetSkuFilter;

function showAllSkus() {
    saveExcludedSkus(new Set());
    renderSkuManagerList();
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
}
window.showAllSkus = showAllSkus;
