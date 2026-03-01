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
}
window.showHub = showHub;

async function launchLicenceGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-licence').classList.remove('hidden');

    if (LG.isDemoMode) {
        if (!LG.data.users.length) loadDemoData();
    } else if (LG.accessToken) {
        if (!LG.data.users.length) {
            // Try cache first
            const cached = typeof loadLgCache === 'function' ? await loadLgCache() : null;
            if (cached && cached.fresh) {
                LG.data.users = cached.users;
                LG.data.skus = cached.skus;
                LG.data.org = cached.org;
                LG.lastRefreshed = new Date(Date.now() - cached.ageMs);
                if (LG.data.org) document.getElementById('tenant-name').textContent = LG.data.org.displayName;
                updateLastRefreshed();
                const mins = Math.round(cached.ageMs / 60000);
                showToast(`Using cached data (${mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h'} old) — click Refresh to update`, 'info', 6000);
            } else {
                if (cached && !cached.fresh) showToast('Cache expired — fetching fresh data', 'info', 3000);
                await loadAllData();
            }
        }
    }
    showAuthenticatedUI();
    renderCurrentPage();
}
window.launchLicenceGovernance = launchLicenceGovernance;

async function launchAppGovernance() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-appgov').classList.remove('hidden');

    if (AG.isDemoMode) {
        if (!AG.data.apps.length) agLoadDemoData();
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
    document.getElementById('view-devicegov').classList.remove('hidden');

    if (typeof dgInitUI === 'function') await dgInitUI();
    if (typeof dgNavigateTo === 'function') dgNavigateTo('devicegov-overview');

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

