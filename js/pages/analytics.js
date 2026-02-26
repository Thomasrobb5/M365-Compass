/**
 * pages/analytics.js – Analytics page: dept cost, licence trend, heatmap, stale accounts
 */

// ── Snapshot helpers ──────────────────────────────────────────────────────
const SNAPSHOT_KEY = 'lg_snapshots';
const MAX_SNAPSHOTS = 90;

function saveSnapshot() {
    if (!LG.data.skus.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const snapshots = loadSnapshots();
    // Don't duplicate today's entry
    const existing = snapshots.findIndex(s => s.date === today);
    const entry = {
        date: today,
        skus: LG.data.skus.map(s => ({
            name: getSkuName(s.skuId, s.skuPartNumber),
            assigned: s.consumedUnits || 0,
            purchased: s.prepaidUnits?.enabled || 0
        }))
    };
    if (existing >= 0) {
        snapshots[existing] = entry;
    } else {
        snapshots.push(entry);
    }
    // Prune to max
    const pruned = snapshots.sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_SNAPSHOTS);
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(pruned)); } catch (_) { }
}

function loadSnapshots() {
    try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]'); } catch { return []; }
}
window.saveSnapshot = saveSnapshot;
window.loadSnapshots = loadSnapshots;

// ── Generate demo snapshots (8 weeks) ────────────────────────────────────
function generateDemoSnapshots() {
    const skuDefs = [
        { name: 'Microsoft 365 E5', base: 38, purchased: 50 },
        { name: 'Microsoft 365 Business Basic', base: 156, purchased: 200 },
        { name: 'Microsoft 365 Business Premium', base: 61, purchased: 75 },
        { name: 'Microsoft Teams Premium', base: 14, purchased: 30 },
        { name: 'Power Automate Premium', base: 9, purchased: 25 },
    ];
    const now = Date.now();
    const snapshots = [];
    for (let w = 55; w >= 0; w -= 7) {
        const date = new Date(now - w * 86400000).toISOString().slice(0, 10);
        // Add slight random drift per SKU
        snapshots.push({
            date,
            skus: skuDefs.map(s => ({
                name: s.name,
                assigned: Math.max(1, s.base + Math.round((Math.random() - 0.45) * 6)),
                purchased: s.purchased
            }))
        });
    }
    return snapshots;
}
window.generateDemoSnapshots = generateDemoSnapshots;

// ── Render full Analytics page ────────────────────────────────────────────
function renderAnalyticsPage() {
    const { users } = LG.data;

    // ── KPIs ──────────────────────────────────────────────────────────────
    const staleUsers = users.filter(u =>
        u.accountEnabled && u._isLicensed && u._lastSignIn === null
    );
    const depts = [...new Set(users.filter(u => u.department).map(u => u.department))];
    const totalSpend = users.filter(u => u._isLicensed)
        .reduce((s, u) => s + u._monthlyCost, 0);

    _setEl('analytics-stale-count', staleUsers.length);
    _setEl('analytics-dept-count', depts.length);
    _setEl('analytics-total-spend', '$' + totalSpend.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','));

    // ── Charts ────────────────────────────────────────────────────────────
    renderDeptCostChart(users);
    const snapshots = LG.isDemoMode ? generateDemoSnapshots() : loadSnapshots();
    renderLicenceTrendChart(snapshots);
    renderActivityHeatmapChart(users);

    // ── Stale accounts table ──────────────────────────────────────────────
    renderStaleTable(staleUsers);
}
window.renderAnalyticsPage = renderAnalyticsPage;

function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ── Stale Accounts Table ──────────────────────────────────────────────────
function renderStaleTable(staleUsers) {
    const tbody = document.getElementById('stale-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!staleUsers.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">No stale accounts found — great news!</td></tr>';
        return;
    }

    staleUsers.slice(0, 50).forEach(user => {
        const licBadges = user._licenseNames.map(n =>
            `<span class="badge badge-license">${n.length > 20 ? n.slice(0, 20) + '\u2026' : n}</span>`
        ).join(' ');
        const costStr = '$' + user._monthlyCost.toFixed(2);

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-red-900/40 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
            ${(user.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p class="text-sm font-medium text-slate-200">${user.displayName || '\u2014'}</p>
            <p class="text-xs text-slate-500">${user.userPrincipalName || ''}</p>
          </div>
        </div>
      </td>
      <td class="text-slate-400">${user.department || '\u2014'}</td>
      <td><div class="flex flex-wrap gap-1">${licBadges}</div></td>
      <td class="text-right text-red-400 font-bold">${costStr}/mo</td>
      <td class="text-center">
        <button class="btn-secondary btn-sm" onclick="openUserModal(LG.data.users.find(u=>u.id==='${user.id}'))">
          View
        </button>
      </td>
    `;
        tbody.appendChild(tr);
    });
}
