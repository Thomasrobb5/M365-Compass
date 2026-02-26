/**
 * pages/insights.js – Optimization Recommendations auto-generated cards
 */

// Insight definitions – each returns an object or null
const INSIGHT_GENERATORS = [
    // 1. Inactive E5/Premium users
    function inactivePremium({ users, skus, days }) {
        const hits = users.filter(u =>
            u._isLicensed &&
            u._licenseNames.some(n => PREMIUM_SKUS.includes(n)) &&
            (u._daysInactive === null || u._daysInactive >= days)
        );
        if (!hits.length) return null;
        const cost = hits.reduce((s, u) => s + u._monthlyCost, 0);
        return {
            id: 'inactive-premium',
            severity: 'critical',
            icon: 'user-x',
            iconBg: 'bg-red-500/15',
            iconColor: 'text-red-400',
            title: `${hits.length} premium license holder${hits.length > 1 ? 's' : ''} inactive for >${days} days`,
            desc: `Users holding high-value licenses (E5, Teams Premium, etc.) haven't signed in for over ${days} days. Revoking or downgrading these licenses could save approximately <strong class="text-emerald-400">$${cost.toFixed(0)}/month</strong>.`,
            users: hits,
            savings: cost,
            action: 'View Users',
            actionFn: 'inactive',
        };
    },

    // 2. Never signed in
    function neverSignedIn({ users }) {
        const hits = users.filter(u => u._isLicensed && u._lastSignIn === null);
        if (!hits.length) return null;
        const cost = hits.reduce((s, u) => s + u._monthlyCost, 0);
        return {
            id: 'never-signed-in',
            severity: 'critical',
            icon: 'ban',
            iconBg: 'bg-red-500/15',
            iconColor: 'text-red-400',
            title: `${hits.length} licensed user${hits.length > 1 ? 's' : ''} have NEVER signed in`,
            desc: `These users hold active licenses but have zero recorded sign-in activity in your tenant. Immediate review is recommended. Potential saving: <strong class="text-emerald-400">$${cost.toFixed(0)}/month</strong>.`,
            users: hits,
            savings: cost,
            action: null,
        };
    },

    // 3. Disabled accounts with licenses
    function disabledWithLicenses({ users }) {
        const hits = users.filter(u => u._isLicensed && !u.accountEnabled);
        if (!hits.length) return null;
        const cost = hits.reduce((s, u) => s + u._monthlyCost, 0);
        return {
            id: 'disabled-licensed',
            severity: 'high',
            icon: 'shield-off',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
            title: `${hits.length} disabled account${hits.length > 1 ? 's' : ''} still holding licenses`,
            desc: `Disabled Azure AD accounts that retain assigned licenses continue to consume paid seats. Remove licenses from disabled accounts to free up seats. Potential saving: <strong class="text-emerald-400">$${cost.toFixed(0)}/month</strong>.`,
            users: hits,
            savings: cost,
            action: null,
        };
    },

    // 4. Under-utilized SKU (< 40% utilized)
    function underutilizedSku({ skus }) {
        const hits = skus.filter(s => {
            const p = s.prepaidUnits?.enabled || 0;
            return p >= 5 && s.consumedUnits / p < 0.40;
        });
        if (!hits.length) return null;
        return {
            id: 'underutilized-sku',
            severity: 'high',
            icon: 'package-x',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
            title: `${hits.length} license SKU${hits.length > 1 ? 's' : ''} with <40% utilization`,
            desc: `The following plans are significantly under-utilized: <strong class="text-slate-300">${hits.map(s => getSkuName(s.skuId, s.skuPartNumber)).join(', ')}</strong>. Consider reducing your purchased seat count at next renewal to avoid over-spending.`,
            users: [],
            savings: 0,
            action: 'View Inventory',
            actionFn: 'inventory',
        };
    },

    // 5. Overlapping licenses (Business Premium + standalone Exchange/Teams)
    function overlappingLicenses({ users }) {
        const premiumSkuIds = LG.data.skus
            .filter(s => ['Microsoft 365 Business Premium', 'Microsoft 365 E3', 'Microsoft 365 E5', 'Office 365 E3', 'Office 365 E5'].includes(getSkuName(s.skuId, s.skuPartNumber)))
            .map(s => s.skuId);
        const standaloneSkuIds = LG.data.skus
            .filter(s => ['Exchange Online Plan 2', 'Microsoft Teams Premium', 'Planner Plan 1'].includes(getSkuName(s.skuId, s.skuPartNumber)))
            .map(s => s.skuId);
        const hits = users.filter(u => {
            const ids = (u.assignedLicenses || []).map(a => a.skuId);
            return ids.some(id => premiumSkuIds.includes(id)) && ids.some(id => standaloneSkuIds.includes(id));
        });
        if (!hits.length) return null;
        const cost = hits.reduce((s, u) => {
            const standaloneNames = u._licenseNames.filter(n => ['Exchange Online Plan 2', 'Microsoft Teams Premium', 'Planner Plan 1'].includes(n));
            return s + standaloneNames.reduce((ss, n) => ss + (LG.rates[n] || DEFAULT_RATES[n] || 0), 0);
        }, 0);
        return {
            id: 'overlapping-licenses',
            severity: 'medium',
            icon: 'layers',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-400',
            title: `${hits.length} user${hits.length > 1 ? 's' : ''} with overlapping/redundant licenses`,
            desc: `These users have a bundled plan (M365 E5, Business Premium, etc.) <em>and</em> a standalone add-on whose features are already included in the bundle (Exchange, Teams, Planner). Removing redundant standalone licenses could save <strong class="text-emerald-400">$${cost.toFixed(0)}/month</strong>.`,
            users: hits,
            savings: cost,
            action: null,
        };
    },

    // 6. Long inactive (90+ days)
    function longInactive({ users }) {
        const hits = users.filter(u => u._isLicensed && u._daysInactive !== null && u._daysInactive >= 90);
        if (!hits.length) return null;
        const cost = hits.reduce((s, u) => s + u._monthlyCost, 0);
        return {
            id: 'long-inactive',
            severity: 'medium',
            icon: 'clock',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-400',
            title: `${hits.length} licensed user${hits.length > 1 ? 's' : ''} inactive for 90+ days`,
            desc: `A broader group of licensed users hasn't signed in for over 90 days — a strong indicator of account abandonment. These may be former employees or seasonal workers. Total exposure: <strong class="text-emerald-400">$${cost.toFixed(0)}/month</strong>.`,
            users: hits,
            savings: cost,
            action: 'View Inactive',
            actionFn: 'inactive',
        };
    },

    // 7. Browser-only premium users (no desktop client seen)
    function browserOnlyPremium({ users }) {
        const hits = users.filter(u => {
            const isPremium = u._licenseNames.some(n => PREMIUM_SKUS.includes(n));
            const device = (u._lastDevice || '').toLowerCase();
            const browserOnly = device && !['windows', 'mac', 'pc'].some(k => device.includes(k));
            return isPremium && browserOnly;
        });
        if (hits.length < 3) return null;
        return {
            id: 'browser-only-premium',
            severity: 'low',
            icon: 'globe',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
            title: `${hits.length} E5/Premium users appear to use browser-only access`,
            desc: `These high-value license holders show no desktop client sign-ins in recent activity. They may not need premium desktop app entitlements and could be downgraded to a web/mobile-only plan. Review individually before making changes.`,
            users: hits,
            savings: 0,
            action: 'View Devices',
            actionFn: 'devices',
        };
    },
];

// ── Stored insights for export ────────────────────────────────────────────
let _currentInsights = [];

function renderInsightsPage() {
    const { users, skus } = LG.data;
    const days = LG.inactivityDays;
    const container = document.getElementById('insights-container');
    if (!container) return;
    container.innerHTML = '';
    _currentInsights = [];

    const ctx = { users, skus, days };

    INSIGHT_GENERATORS.forEach(gen => {
        try {
            const insight = gen(ctx);
            if (!insight) return;
            _currentInsights.push(insight);
            container.appendChild(buildInsightCard(insight));
        } catch (e) { console.warn('Insight error:', e); }
    });

    if (!_currentInsights.length) {
        container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h4 class="text-lg font-bold text-white mb-1">All Clear!</h4>
        <p class="text-slate-400 text-sm">No optimization opportunities detected with the current data and thresholds.</p>
      </div>`;
        return;
    }

    // Summary header
    const totalSavings = _currentInsights.reduce((s, i) => s + (i.savings || 0), 0);
    const summary = document.createElement('div');
    summary.className = 'rounded-2xl bg-gradient-to-r from-emerald-900/30 to-emerald-950/40 border border-emerald-800/30 p-5 flex items-center gap-5 mb-2';
    summary.innerHTML = `
    <div class="flex-1">
      <p class="text-sm text-emerald-400 font-semibold uppercase tracking-wider mb-1">Total Optimization Potential</p>
      <p class="text-3xl font-bold text-white">$${totalSavings.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}<span class="text-lg text-emerald-400">/month</span></p>
      <p class="text-sm text-slate-400 mt-1">${_currentInsights.length} recommendation${_currentInsights.length > 1 ? 's' : ''} · ${(_currentInsights.filter(i => i.severity === 'critical').length)} critical</p>
    </div>
    <div class="text-4xl">💡</div>`;
    container.prepend(summary);
}

function buildInsightCard(insight) {
    const severityMap = {
        critical: 'insight-severity-critical',
        high: 'insight-severity-high',
        medium: 'insight-severity-medium',
        low: 'insight-severity-low',
    };
    const severityLabelMap = {
        critical: { label: 'Critical', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
        high: { label: 'High', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
        medium: { label: 'Medium', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
        low: { label: 'Low', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    };
    const sev = severityLabelMap[insight.severity] || severityLabelMap.low;

    const card = document.createElement('div');
    card.className = `insight-card ${severityMap[insight.severity] || ''}`;
    card.innerHTML = `
    <div class="insight-icon ${insight.iconBg}">
      <i data-lucide="${insight.icon}" class="w-5 h-5 ${insight.iconColor}"></i>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-3 mb-2">
        <h4 class="text-sm font-semibold text-white leading-snug">${insight.title}</h4>
        <span class="badge border ${sev.cls} shrink-0">${sev.label}</span>
      </div>
      <p class="text-sm text-slate-400 leading-relaxed mb-3">${insight.desc}</p>
      <div class="flex items-center gap-3 flex-wrap">
        ${insight.savings > 0 ? `<span class="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">💰 $${insight.savings.toFixed(0)}/mo savings</span>` : ''}
        ${insight.users.length > 0 ? `<span class="text-xs text-slate-500">${insight.users.length} affected user${insight.users.length > 1 ? 's' : ''}</span>` : ''}
        ${insight.action && insight.actionFn ? `<button class="btn-secondary btn-sm" onclick="navigateTo('${insight.actionFn}')">${insight.action}</button>` : ''}
      </div>
    </div>`;
    lucide.createIcons({ nodes: [card] });
    return card;
}

function exportInsightsReport() {
    const headers = ['Title', 'Severity', 'Affected Users', 'Est. Monthly Savings', 'Description'];
    const rows = _currentInsights.map(i => [
        i.title, i.severity, i.users.length,
        i.savings > 0 ? '$' + i.savings.toFixed(2) : '$0.00',
        i.desc.replace(/<[^>]+>/g, '')
    ]);
    exportCSV('optimization_insights.csv', headers, rows);
}

window.renderInsightsPage = renderInsightsPage;
window.exportInsightsReport = exportInsightsReport;
