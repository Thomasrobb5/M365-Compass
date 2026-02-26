/**
 * appgov/graph.js – Enterprise Application Governance Backend Integration
 * 
 * Re-architected: Graph API querying has been moved to a Node.js Azure Function 
 * backend to prevent browser-side timeouts/quotas on large tenants.
 * This frontend simply downloads that pre-compiled JSON blob.
 */

window.AG = {
    data: { apps: [] },
    inactivityDays: 30,
    isDemoMode: false,
    cacheKey: 'ag_data_cache',
    cacheTTL: 30 * 24 * 60 * 60 * 1000,
    blobUrl: localStorage.getItem('ag_blob_url') || '', // The URL to the Azure Storage JSON file
};

function agSetBlobUrl(url) {
    AG.blobUrl = url;
    if (url) localStorage.setItem('ag_blob_url', url);
    else localStorage.removeItem('ag_blob_url');
}
window.agSetBlobUrl = agSetBlobUrl;

// ── Cache helpers (IndexedDB via localforage) ─────────────────────────────
async function agSaveCache() {
    try {
        const payload = { ts: Date.now(), apps: AG.data.apps };
        await localforage.setItem(AG.cacheKey, payload);
    } catch (e) {
        console.error('AG IndexedDB cache write failed:', e);
    }
}
async function agLoadCache() {
    try {
        const data = await localforage.getItem(AG.cacheKey);
        if (!data) return null;
        const { ts, apps } = data;
        if (!apps || !apps.length) return null;
        const age = Date.now() - ts;
        return { apps, ageMs: age, fresh: age < AG.cacheTTL, ts };
    } catch (e) {
        console.error('AG IndexedDB cache read failed:', e);
        return null;
    }
}
async function agClearCache() {
    try {
        await localforage.removeItem(AG.cacheKey);
    } catch (e) { console.error('AG IndexedDB cache clear failed:', e); }
}
window.agSaveCache = agSaveCache;
window.agLoadCache = agLoadCache;
window.agClearCache = agClearCache;

// ── Download Data from Backend Blob ───────────────────────────────────────
async function agLoadAllData() {
    if (!AG.blobUrl) {
        showToast('App Governance requires a backend URL. Configure it in Settings.', 'error', 5000);
        return;
    }

    showAgLoading('Connecting to Backend Service...', 15, 'Downloading latest tenant snapshot');
    try {
        const res = await fetch(AG.blobUrl, {
            // Append timestamp to bust browser HTTP cache and force fresh payload
            cache: 'no-store'
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download payload`);

        agSetLoadingProgress(60, 'Downloading payload...', 'Receiving JSON blob');
        const data = await res.json();

        if (!data.apps) throw new Error('Invalid payload format received');

        agSetLoadingProgress(85, 'Parsing App Governance data...', `Processing ${data.apps.length} apps`);
        AG.data.apps = data.apps;

        agSetLoadingProgress(100, 'Data loaded!', 'Backend payload applied');
        await new Promise(r => setTimeout(r, 400));

        await agSaveCache();
        showToast('Application data synced from backend', 'success');
    } catch (err) {
        console.error('App Gov Backend fetch error:', err);
        showToast('Error syncing with backend: ' + err.message, 'error');
    } finally {
        hideAgLoading();
    }
}
window.agLoadAllData = agLoadAllData;

// ── Legacy Graph helpers no longer needed but stubbed for detail.js compat ─
async function agFetchAppSignIns() { return []; }
async function agFetchGroupMembers() { return []; }
window.agFetchAppSignIns = agFetchAppSignIns;
window.agFetchGroupMembers = agFetchGroupMembers;

// ── UI Loading Helpers ────────────────────────────────────────────────────
function showAgLoading(msg, pct, sub) {
    const overlay = document.getElementById('appgov-loading');
    if (overlay) overlay.classList.remove('hidden');
    const content = document.getElementById('appgov-pages');
    if (content) content.classList.add('hidden');
    agSetLoadingProgress(pct ?? 0, msg, sub);
}
function hideAgLoading() {
    const overlay = document.getElementById('appgov-loading');
    if (overlay) overlay.classList.add('hidden');
    const content = document.getElementById('appgov-pages');
    if (content) content.classList.remove('hidden');
}
function agSetLoadingProgress(pct, msg, sub) {
    const bar = document.getElementById('appgov-progress-bar');
    const pctEl = document.getElementById('appgov-progress-pct');
    const textEl = document.getElementById('appgov-loading-text');
    const subEl = document.getElementById('appgov-loading-sub-text');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    if (msg && textEl) textEl.textContent = msg;
    if (subEl) subEl.textContent = sub || '';
}
window.showAgLoading = showAgLoading;
window.hideAgLoading = hideAgLoading;
window.agSetLoadingProgress = agSetLoadingProgress;
