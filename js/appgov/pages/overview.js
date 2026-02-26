/**
 * appgov/pages/overview.js – App Governance overview page
 */

function agRenderOverview() {
    const apps = AG.data.apps;
    const days = AG.inactivityDays;

    // KPIs
    _agSet('ag-kpi-total-apps', apps.length);
    _agSet('ag-kpi-sso-enabled', apps.filter(a => a._ssoMode !== 'None').length);
    _agSet('ag-kpi-no-sso', apps.filter(a => a._ssoMode === 'None').length);

    const totalAssigned = apps.reduce((s, a) => s + (a._assignedCount || 0), 0);
    _agSet('ag-kpi-total-assigned', totalAssigned);


    // SSO chart
    agRenderSsoChart(apps);


    // Quick app table (top 8 by assigned count)
    const tbody = document.getElementById('ag-overview-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    [...apps].sort((a, b) => b._assignedCount - a._assignedCount).slice(0, 8).forEach(app => {

        const ssoBadgeClass = app._ssoMode === 'None' ? 'badge-disabled' :
            app._ssoMode === 'SAML' ? 'badge-premium' : 'badge-license';
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>
        <button class="text-left hover:text-brand-400 transition text-slate-200 font-medium text-sm"
          onclick="agOpenApp(AG.data.apps.find(a=>a.id==='${app.id}'))">${app.displayName}</button>
        <p class="text-xs text-slate-500">${app.publisherName || ''}</p>
      </td>
      <td><span class="badge ${ssoBadgeClass}">${app._ssoMode}</span></td>
      <td class="text-right text-slate-300">${app._assignedCount}</td>
      <td class="text-slate-400 text-xs">${app._lastSignIn ? formatDate(app._lastSignIn) : '—'}</td>
    `;
        tbody.appendChild(tr);
    });
}

function _agSet(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
window.agRenderOverview = agRenderOverview;
window._agSet = _agSet;

// ── SSO Coverage Donut ────────────────────────────────────────────────────
function agRenderSsoChart(apps) {
    destroyChart('ag-sso');
    const canvas = document.getElementById('chart-ag-sso');
    if (!canvas) return;

    const counts = { SAML: 0, OIDC: 0, 'Password SSO': 0, None: 0 };
    apps.forEach(a => { if (a._ssoMode in counts) counts[a._ssoMode]++; else counts['None']++; });
    const entries = Object.entries(counts).filter(([, v]) => v > 0);

    const colors = { SAML: '#3b82f6', OIDC: '#8b5cf6', 'Password SSO': '#f59e0b', None: '#ef4444' };

    LG.chartInstances['ag-sso'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: entries.map(([k]) => colors[k] || '#64748b'),
                borderColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                borderWidth: 3, hoverOffset: 6,
            }]
        },
        options: {
            ...chartDefaults(), cutout: '68%', scales: {},
            plugins: { ...chartDefaults().plugins, legend: { position: 'right', ...chartDefaults().plugins.legend } }
        }
    });
}

