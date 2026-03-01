/**
 * ui.js – Navigation, sidebar, dark mode toggle, rates modal, and page router
 */

// ── Current page tracker ──────────────────────────────────────────────────
let currentPage = 'overview';

const PAGE_META = {
    overview: { title: 'Overview', subtitle: 'License usage at a glance' },
    inventory: { title: 'License Inventory', subtitle: 'All subscribed SKUs and utilization' },
    users: { title: 'All Users', subtitle: 'Search, filter, and inspect every user' },
    inactive: { title: 'Inactive Users', subtitle: 'Licensed users with no recent sign-in activity' },
    devices: { title: 'Device & Usage Insights', subtitle: 'How users are accessing Microsoft 365' },
    analytics: { title: 'Analytics', subtitle: 'Department spend, licence trends, activity patterns & stale accounts' },
    insights: { title: 'Optimization Insights', subtitle: 'Auto-generated cost reduction recommendations' },
    reports: { title: 'Reports', subtitle: 'Export data for governance and auditing' },
};

// ── Navigate to a page ────────────────────────────────────────────────────
function navigateTo(page) {
    if (!PAGE_META[page]) return;
    currentPage = page;

    // Update nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update header
    const meta = PAGE_META[page];
    document.getElementById('page-title').textContent = meta.title;
    document.getElementById('page-subtitle').textContent = meta.subtitle;

    // Show/hide page sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(`page-${page}`);
    if (section) section.classList.remove('hidden');

    // Render page content
    renderPage(page);
}
window.navigateTo = navigateTo;

// ── Hub / Module switching ─────────────────────────────────────────────────
function showHub() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-hub').classList.remove('hidden');
    document.getElementById('view-licence').classList.add('hidden');
    document.getElementById('view-appgov').classList.add('hidden');
    document.getElementById('view-devicegov').classList.add('hidden');
    document.getElementById('view-teamsgov').classList.add('hidden');
    document.getElementById('view-securitygov').classList.add('hidden');
    document.getElementById('view-identitygov').classList.add('hidden');

    // Update hub user info
    const hubUser = document.getElementById('hub-user-info');
    if (hubUser) {
        if (LG.isDemoMode || AG.isDemoMode) {
            hubUser.textContent = 'Demo Mode — admin@contoso.com';
        } else if (LG.account) {
            hubUser.textContent = LG.account.username || LG.account.name || '';
        }
    }
    const hubOrg = document.getElementById('hub-org-name');
    if (hubOrg) {
        if (LG.isDemoMode) hubOrg.textContent = 'Contoso Demo Corp';
        else if (LG.data.org) hubOrg.textContent = LG.data.org.displayName;
    }

    // Update Platform Status Widget
    updateHubPlatformWidget();
}
window.showHub = showHub;

async function updateHubPlatformWidget() {
    // 1. Connection Status
    const apiEl = document.getElementById('hub-widget-api-status');
    const apiDot = document.getElementById('hub-widget-api-dot');

    if (LG.isDemoMode) {
        if (apiEl) apiEl.textContent = 'Demo Mode';
        if (apiEl) apiEl.className = 'text-amber-400 font-medium flex items-center gap-1.5';
        if (apiDot) apiDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
    } else if (LG.accessToken) {
        if (apiEl) apiEl.textContent = 'Connected (Live)';
        if (apiEl) apiEl.className = 'text-emerald-400 font-medium flex items-center gap-1.5';
        if (apiDot) apiDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
    } else {
        if (apiEl) apiEl.textContent = 'Disconnected';
        if (apiEl) apiEl.className = 'text-slate-400 font-medium flex items-center gap-1.5';
        if (apiDot) apiDot.className = 'w-1.5 h-1.5 rounded-full bg-slate-500';
    }

    // 2. Tenant Target
    const tenantEl = document.getElementById('hub-widget-tenant-name');
    if (tenantEl) {
        if (LG.isDemoMode) {
            tenantEl.textContent = 'contoso.com (Demo)';
        } else if (LG.account && LG.account.username) {
            // Extract domain from username if we don't have the explicit tenant name yet
            const domain = LG.account.username.split('@')[1];
            tenantEl.textContent = domain || 'Unknown Tenant';
        } else {
            tenantEl.textContent = 'Not Authenticated';
        }
    }

    // 3. Estimate Cache Size
    const cacheEl = document.getElementById('hub-widget-cache-size');
    if (cacheEl) {
        try {
            const keys = await localforage.keys();
            let totalBytes = 0;
            for (const key of keys) {
                const item = await localforage.getItem(key);
                if (item) {
                    const str = typeof item === 'string' ? item : JSON.stringify(item);
                    totalBytes += new Blob([str]).size;
                }
            }
            if (totalBytes === 0) {
                cacheEl.textContent = 'Empty';
            } else if (totalBytes < 1024 * 1024) {
                cacheEl.textContent = (totalBytes / 1024).toFixed(1) + ' KB';
            } else {
                cacheEl.textContent = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';
            }
        } catch (e) {
            console.error("Failed to calculate cache size", e);
            cacheEl.textContent = 'Unknown';
        }
    }
}

async function launchLicenceGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-licence').classList.remove('hidden');

    // Invalidate demo data if switching to Live mode
    const isStaleDemo = !LG.isDemoMode && (LG.isDemoMode || LG.data.users.some(u => u.id && String(u.id).startsWith('demo-user-')));
    if (isStaleDemo) {
        console.log("Clearing stale demo data for License Governance...");
        LG.data.users = [];
        LG.data.skus = [];
        LG.data.org = null;
        LG.isDemoMode = false;
    }

    if (LG.isDemoMode) {
        if (!LG.data.users.length) loadDemoData();
    } else if (LG.accessToken) {
        if (!LG.data.users.length) {
            // Try cache first
            const cached = typeof loadLgCache === 'function' ? await loadLgCache() : null;
            if (cached && cached.fresh && !cached.isDemoMode) {
                LG.data.users = cached.users;
                LG.data.skus = cached.skus;
                LG.data.org = cached.org;
                LG.lastRefreshed = new Date(Date.now() - cached.ageMs);
                if (LG.data.org) document.getElementById('tenant-name').textContent = LG.data.org.displayName;
                updateLastRefreshed();
                const mins = Math.round(cached.ageMs / 60000);
                showToast(`Using cached data (${mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h'} old) — click Refresh to update`, 'info', 6000);
            } else {
                if (cached && (cached.isDemoMode || !cached.fresh)) {
                    if (cached.isDemoMode) console.log("Ignoring stale demo cache for License Governance");
                    else showToast('Cache expired — fetching fresh data', 'info', 3000);
                }
                await loadAllData();
            }
        }
    }
    showAuthenticatedUI();
    renderCurrentPage();
}
window.launchLicenceGovernance = launchLicenceGovernance;

async function launchIdentityGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-identitygov').classList.remove('hidden');

    // Load Data
    const hasCache = await loadIdgCache();

    // Invalidate demo data if switching to Live mode (check in-memory OR just-loaded cache)
    const isStaleDemo = !LG.isDemoMode && (IDG.isDemoMode || IDG.data.users.some(u => u.id && String(u.id).startsWith('idg-demo-')));
    if (isStaleDemo) {
        console.log("Clearing stale demo data for Identity Governance...");
        IDG.data.users = [];
        IDG.data.policies = [];
        IDG.isDemoMode = false;
    }

    if (!IDG.data.users.length) {
        if (LG.isDemoMode) {
            await idgLoadDemoData();
        } else {
            await idgLoadGraphData();
        }
    } else if (hasCache && !IDG.isDemoMode) {
        if (IDG.data.lastSync) {
            const mins = Math.round((Date.now() - IDG.data.lastSync.getTime()) / 60000);
            showToast(`Using cached identity data (${mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h'} old) — click Refresh to update`, 'info', 6000);
        } else {
            showToast('Using cached identity data — click Refresh to update', 'info', 6000);
        }
    }

    if (typeof idgInitUI === 'function') idgInitUI();
}
window.launchIdentityGovernance = launchIdentityGovernance;

async function launchAppGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-licence').classList.add('hidden');
    document.getElementById('view-devicegov').classList.add('hidden');
    document.getElementById('view-teamsgov').classList.add('hidden');
    document.getElementById('view-securitygov').classList.add('hidden');
    document.getElementById('view-appgov').classList.remove('hidden');

    // Invalidate demo data if switching to Live mode
    const isStaleDemo = !LG.isDemoMode && AG.data.apps.some(a => a.id && a.id.startsWith('sp-'));
    if (isStaleDemo) {
        console.log("Clearing stale demo data for App Governance...");
        AG.data.apps = [];
    }

    if (LG.isDemoMode) {
        if (!AG.data.apps || !AG.data.apps.length) agLoadDemoData();
    } else if (LG.accessToken) {
        if (!AG.data.apps.length) {
            // Try cache first
            const cached = typeof agLoadCache === 'function' ? await agLoadCache() : null;
            // Invalidate old bulky cache format that caused quota errors
            const isBulkyCache = cached && cached.apps?.length && ('_recentSignIns' in cached.apps[0] || '_assignments' in cached.apps[0]);

            if (cached && cached.fresh && !isBulkyCache) {
                AG.data.apps = cached.apps;
                const mins = Math.round(cached.ageMs / 60000);
                showToast(`Using cached app data (${mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h'} old) — click Refresh to update`, 'info', 6000);
            } else {
                if (isBulkyCache && typeof agClearCache === 'function') await agClearCache();
                if (cached && !cached.fresh && !isBulkyCache) showToast('App cache expired — fetching fresh data', 'info', 3000);
                await agLoadAllData();
            }
        }
    }
    agInitUI();
    agNavigateTo('appgov-overview');
}
window.launchAppGovernance = launchAppGovernance;

function backToHub() {
    document.getElementById('view-licence').classList.add('hidden');
    document.getElementById('view-appgov').classList.add('hidden');
    document.getElementById('view-devicegov').classList.add('hidden');
    document.getElementById('view-teamsgov').classList.add('hidden');
    document.getElementById('view-securitygov').classList.add('hidden');
    document.getElementById('view-hub').classList.remove('hidden');
    // Refresh org/user info in hub header
    const hubOrg = document.getElementById('hub-org-name');
    if (hubOrg && LG.data.org) hubOrg.textContent = LG.data.org.displayName;
}
window.backToHub = backToHub;

// ── Launch Device Governance ────────────────────────────────────────────────
async function launchDeviceGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-licence').classList.add('hidden');
    document.getElementById('view-appgov').classList.add('hidden');
    document.getElementById('view-teamsgov').classList.add('hidden');
    document.getElementById('view-securitygov').classList.add('hidden');
    document.getElementById('view-devicegov').classList.remove('hidden');

    if (typeof dgInitUI === 'function') await dgInitUI();
    if (typeof dgNavigateTo === 'function') dgNavigateTo('devicegov-overview');

    // Load Cache
    if (typeof loadDgCache === 'function') await loadDgCache();

    // Invalidate demo data if switching to Live mode
    const isStaleDemo = !LG.isDemoMode && (DG.isDemoMode || DG.data.devices.some(d => d.id && String(d.id).startsWith('dev-')));
    if (isStaleDemo) {
        console.log("Clearing stale demo data for Device Governance...");
        DG.data.devices = [];
        DG.isDemoMode = false;
    }

    // Auto-load data ONLY if we don't have cached data yet
    if (!DG.data.devices || DG.data.devices.length === 0) {
        if (LG.isDemoMode) {
            if (typeof dgLoadDemoData === 'function') await dgLoadDemoData();
        } else if (LG.accessToken) {
            if (typeof dgLoadGraphData === 'function') await dgLoadGraphData();
        }
    }
}
window.launchDeviceGovernance = launchDeviceGovernance;

// ── Launch Security Governance ─────────────────────────────────────────────
async function launchSecurityGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-licence').classList.add('hidden');
    document.getElementById('view-appgov').classList.add('hidden');
    document.getElementById('view-teamsgov').classList.add('hidden');
    document.getElementById('view-devicegov').classList.add('hidden');
    document.getElementById('view-securitygov').classList.remove('hidden');

    if (typeof launchSecGov === 'function') await launchSecGov();
}
window.launchSecurityGovernance = launchSecurityGovernance;

/**
 * Global CSV Export Utility
 * @param {Array} data - Array of objects or arrays
 * @param {String} filename - Output filename
 * @param {Array} columns - Optional. If provided, maps objects: [{label: 'Header', value: 'key'}]
 */
function exportToCsv(filename, data, columns = null) {
    if (!data || !data.length) return;

    let csvContent = "";

    if (columns) {
        // Map objects based on columns
        const headers = columns.map(c => `"${c.label}"`).join(',');
        const rows = data.map(item => {
            return columns.map(col => {
                let val = item[col.value] !== undefined && item[col.value] !== null ? item[col.value] : '';
                if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
                return val;
            }).join(',');
        });
        csvContent = [headers, ...rows].join('\n');
    } else {
        // Assume data is already arrays of rows (first row is header)
        csvContent = data.map(row => {
            return row.map(cell => {
                let val = cell !== undefined && cell !== null ? String(cell) : '';
                return `"${val.replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.exportToCsv = exportToCsv;

// ── Dispatch to page renderers ─────────────────────────────────────────────
function renderPage(page) {
    if (!LG.data.users.length && !LG.isDemoMode && !LG.accessToken) return;
    switch (page) {
        case 'overview': renderOverviewPage(); break;
        case 'inventory': renderInventoryPage(); break;
        case 'users': renderUsersPage(); break;
        case 'inactive': renderInactivePage(); break;
        case 'devices': renderDevicesPage(); break;
        case 'analytics': renderAnalyticsPage(); break;
        case 'insights': renderInsightsPage(); break;
        case 'reports': renderReportsPage(); break;
    }
}

function renderCurrentPage() {
    renderPage(currentPage);
}
window.renderCurrentPage = renderCurrentPage;

// ── Dark / Light Mode ─────────────────────────────────────────────────────
function setTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    const knob = document.getElementById('theme-knob');
    const toggle = document.getElementById('theme-toggle');
    if (dark) {
        knob.style.transform = 'translateX(20px)';
        toggle.style.background = '#2563eb';
    } else {
        knob.style.transform = 'translateX(0)';
        toggle.style.background = '#94a3b8';
    }
    localStorage.setItem('lg_theme', dark ? 'dark' : 'light');
    // Re-render charts with new color scheme
    if (currentPage === 'overview') renderOverviewPage();
    if (currentPage === 'devices') renderDevicesPage();
}

// ── Update sidebar badges ─────────────────────────────────────────────────
function updateBadges() {
    if (!LG.data.users.length) return;
    const days = LG.inactivityDays;
    const inactiveLicensed = LG.data.users.filter(u =>
        u._isLicensed && (u._daysInactive === null || u._daysInactive >= days)
    );
    const badge = document.getElementById('inactive-badge');
    if (inactiveLicensed.length > 0) {
        badge.textContent = inactiveLicensed.length;
        badge.classList.remove('hidden');
    }
    // Insights badge = number of recommendations categories
    document.getElementById('insights-badge').textContent = '!';
    document.getElementById('insights-badge').classList.remove('hidden');
}
window.updateBadges = updateBadges;

// ── License Rates Modal ───────────────────────────────────────────────────
function openRatesModal() {
    const container = document.getElementById('rates-container');
    container.innerHTML = '';
    const skuNames = [...new Set([
        ...Object.keys(DEFAULT_RATES),
        ...LG.data.skus.map(s => getSkuName(s.skuId, s.skuPartNumber))
    ])];
    skuNames.forEach(name => {
        const rate = LG.rates[name] ?? DEFAULT_RATES[name] ?? 0;
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3';
        row.innerHTML = `
      <label class="text-sm text-slate-300 flex-1 truncate" title="${name}">${name}</label>
      <div class="flex items-center gap-1">
        <span class="text-slate-500 text-sm">$</span>
        <input type="number" min="0" step="0.01" value="${rate}" data-sku="${name}"
          class="input-field w-20 text-right text-sm py-1 px-2" />
        <span class="text-slate-500 text-xs">/mo</span>
      </div>`;
        container.appendChild(row);
    });
    document.getElementById('rates-modal').classList.remove('hidden');
}

function closeRatesModal() {
    document.getElementById('rates-modal').classList.add('hidden');
}

// ── User Detail Modal ─────────────────────────────────────────────────────
function openUserModal(user) {
    const modal = document.getElementById('user-modal');
    const initials = (user.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('user-modal-avatar').textContent = initials;
    document.getElementById('user-modal-name').textContent = user.displayName || 'Unknown';
    document.getElementById('user-modal-upn').textContent = user.userPrincipalName || '';

    const isPremium = user._licenseNames.some(n => PREMIUM_SKUS.includes(n));
    const statusBadge = user.accountEnabled
        ? '<span class="badge badge-active">Enabled</span>'
        : '<span class="badge badge-disabled">Disabled</span>';

    const licenseHTML = user._licenseNames.length > 0
        ? user._licenseNames.map(n => `<span class="badge ${isPremium ? 'badge-premium' : 'badge-license'}">${n}</span>`).join(' ')
        : '<span class="text-slate-500 text-sm">No licenses</span>';

    const lastSignInStr = user._lastSignIn ? formatDate(user._lastSignIn) : 'Never';
    const daysStr = user._daysInactive !== null ? `${user._daysInactive} days ago` : 'Never signed in';

    document.getElementById('user-modal-body').innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-surface-900 rounded-xl p-4">
        <p class="text-xs text-slate-500 mb-1">Department</p>
        <p class="text-sm font-medium text-white">${user.department || '—'}</p>
      </div>
      <div class="bg-surface-900 rounded-xl p-4">
        <p class="text-xs text-slate-500 mb-1">Job Title</p>
        <p class="text-sm font-medium text-white">${user.jobTitle || '—'}</p>
      </div>
      <div class="bg-surface-900 rounded-xl p-4">
        <p class="text-xs text-slate-500 mb-1">Account Status</p>
        <div class="mt-1">${statusBadge}</div>
      </div>
      <div class="bg-surface-900 rounded-xl p-4">
        <p class="text-xs text-slate-500 mb-1">Last Sign-in</p>
        <p class="text-sm font-medium text-white">${lastSignInStr}</p>
        <p class="text-xs text-slate-500">${daysStr}</p>
      </div>
    </div>
    <div class="bg-surface-900 rounded-xl p-4">
      <p class="text-xs text-slate-500 mb-2">Assigned Licenses (${user._licenseNames.length})</p>
      <div class="flex flex-wrap gap-1.5">${licenseHTML}</div>
    </div>
    <div class="bg-surface-900 rounded-xl p-4">
      <p class="text-xs text-slate-500 mb-2">Estimated Monthly Cost</p>
      <p class="text-2xl font-bold text-white">$${user._monthlyCost.toFixed(2)}</p>
    </div>
    ${user._lastDevice ? `
    <div class="bg-surface-900 rounded-xl p-4">
      <p class="text-xs text-slate-500 mb-2">Last Known Device</p>
      <p class="text-sm font-medium text-white">${user._lastDevice} ${user._lastBrowser ? '· ' + user._lastBrowser : ''}</p>
    </div>` : ''}
    <div class="bg-surface-900 rounded-xl p-4">
      <p class="text-xs text-slate-500 mb-1">Email</p>
      <p class="text-sm font-medium text-white">${user.mail || user.userPrincipalName || '—'}</p>
    </div>
  `;
    modal.classList.remove('hidden');
    lucide.createIcons();
}
window.openUserModal = openUserModal;

// ── Wire up all UI events ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Theme
    const savedTheme = localStorage.getItem('lg_theme');
    setTheme(savedTheme !== 'light');

    document.getElementById('theme-toggle').addEventListener('click', () => {
        setTheme(!document.documentElement.classList.contains('dark'));
    });

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (LG.data.users.length > 0 || LG.isDemoMode || (page === 'overview')) {
                navigateTo(page);
            } else {
                showToast('Please connect to Microsoft 365 first', 'warning');
            }
        });
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Close sidebar on outside click (mobile)
    document.getElementById('pages-container')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });

    // Rates modal
    document.getElementById('edit-rates-btn').addEventListener('click', openRatesModal);
    document.getElementById('rates-modal-close').addEventListener('click', closeRatesModal);
    document.getElementById('rates-cancel-btn').addEventListener('click', closeRatesModal);
    document.getElementById('rates-save-btn').addEventListener('click', () => {
        const newRates = {};
        document.querySelectorAll('#rates-container input[data-sku]').forEach(inp => {
            newRates[inp.dataset.sku] = parseFloat(inp.value) || 0;
        });
        saveRates(newRates);
        // Recompute user costs
        LG.data.users.forEach(u => { u._monthlyCost = getUserMonthlyCost(u); });
        closeRatesModal();
        showToast('License rates saved', 'success');
        renderCurrentPage();
    });

    // User modal close
    document.getElementById('user-modal-close').addEventListener('click', () => {
        document.getElementById('user-modal').classList.add('hidden');
    });
    document.getElementById('user-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });

    // Reports export buttons
    document.querySelectorAll('.export-report-btn').forEach(btn => {
        btn.addEventListener('click', () => exportReport(btn.dataset.report));
    });

    // Inactive slider (page)
    document.getElementById('inactive-slider')?.addEventListener('input', (e) => {
        document.getElementById('inactive-slider-val').textContent = e.target.value + 'd';
        renderInactivePage(parseInt(e.target.value));
    });

    // Inactive export
    document.getElementById('inactive-export-btn')?.addEventListener('click', () => exportInactiveCSV());

    // Inventory export
    document.getElementById('inv-export-btn')?.addEventListener('click', () => exportInventoryCSV());

    // Users export
    document.getElementById('users-export-btn')?.addEventListener('click', () => exportUsersCSV());

    // Insights export
    document.getElementById('insights-export-btn')?.addEventListener('click', () => exportInsightsReport());

    // LG Force Sync — clear cache then reload fresh data
    document.getElementById('refresh-btn')?.addEventListener('click', async () => {
        if (!LG.accessToken && !LG.isDemoMode) return showToast('Not connected', 'warning');
        if (LG.isDemoMode) {
            LG.data.users = []; LG.data.skus = []; loadDemoData();
            showAuthenticatedUI(); renderCurrentPage();
            return showToast('Demo data refreshed', 'info');
        }
        if (typeof clearLgCache === 'function') await clearLgCache();
        LG.data.users = []; LG.data.skus = []; LG.data.org = null;
        showToast('Starting full sync — this may take a while', 'info', 4000);
        await loadAllData();
        showAuthenticatedUI(); renderCurrentPage();
    });

    // Initialize Lucide icons
    lucide.createIcons();
});

// ── Settings & Cache Management ───────────────────────────────────────────
function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // Reinforce icons within modal
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [modal] });
    }
}
window.openSettings = openSettings;

function closeSettings() {
    document.getElementById('settings-modal')?.classList.add('hidden');
}
window.closeSettings = closeSettings;

/**
 * Clears specific portal cache keys
 * @param {string|string[]} keys 
 */
async function clearPortalCache(keys) {
    const keyList = Array.isArray(keys) ? keys : [keys];

    try {
        for (const key of keyList) {
            await localforage.removeItem(key);
            console.log(`Cleared cache key: ${key}`);
        }

        if (typeof showToast === 'function') {
            showToast(`Cache cleared for requested portals`, 'success');
        }
    } catch (err) {
        console.error("Cache clear failed:", err);
        if (typeof showToast === 'function') {
            showToast("Failed to clear local cache", "error");
        }
    }
}
window.clearPortalCache = clearPortalCache;

async function clearAllCache() {
    const confirmClear = confirm("Are you sure you want to clear ALL cached data? This will remove all local summaries and force a fresh sync on next load.");
    if (!confirmClear) return;

    try {
        // Clear all localforage (IndexedDB) data for this origin
        await localforage.clear();

        // Also clear standard localStorage if used for any small flags
        localStorage.clear();

        if (typeof showToast === 'function') {
            showToast("All local cache cleared. Application will refresh.", "success");
        }

        // Reload the app to clean up in-memory state
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        console.error("Global cache clear failed:", err);
    }
}
window.clearAllCache = clearAllCache;

// Initialise settings listener if needed (though we use onclick)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
});
