/**
 * appgov/pages/apps.js – Application Inventory page
 */

let agAppSearch = '';
let agSsoFilter = '';
let agAuditGroup = new Set();

// Load saved audit group on startup
try {
  const saved = localStorage.getItem('agAuditGroup_v1');
  if (saved) {
    agAuditGroup = new Set(JSON.parse(saved));
  }
} catch (e) {
  console.warn('Could not load Audit Group from storage', e);
}

function _agSaveAuditGroup() {
  localStorage.setItem('agAuditGroup_v1', JSON.stringify([...agAuditGroup]));
  _agUpdateAuditActionBar();
}

function _agUpdateAuditActionBar() {
  const bar = document.getElementById('ag-audit-action-bar');
  const countEl = document.getElementById('ag-audit-count');
  const selectAllCheck = document.getElementById('ag-apps-select-all');

  if (!bar || !countEl) return;

  if (agAuditGroup.size > 0) {
    countEl.textContent = agAuditGroup.size;
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }

  // Sync select-all checkbox visually based on current DOM state
  if (selectAllCheck) {
    const bodyBoxes = document.querySelectorAll('.ag-app-checkbox');
    if (bodyBoxes.length > 0) {
      const allChecked = Array.from(bodyBoxes).every(cb => cb.checked);
      selectAllCheck.checked = allChecked;
    } else {
      selectAllCheck.checked = false;
    }
  }
}

function agRenderAppsTable() {
  let apps = [...AG.data.apps];

  // Apply search
  if (agAppSearch) {
    const q = agAppSearch.toLowerCase();
    apps = apps.filter(a => a.displayName.toLowerCase().includes(q) || (a.publisherName || '').toLowerCase().includes(q));
  }
  // Apply SSO filter
  if (agSsoFilter) apps = apps.filter(a => a._ssoMode === agSsoFilter);

  _agPopulateAppFilters();

  const tbody = document.getElementById('ag-apps-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-8">No applications match your filters</td></tr>';
    return;
  }

  apps.forEach(app => {
    const ssoBadgeClass = {
      'SAML': 'badge-premium', 'OIDC': 'badge-license',
      'Password SSO': 'badge-warning', 'None': 'badge-disabled'
    }[app._ssoMode] || 'badge-disabled';


    const statusBadge = app.accountEnabled
      ? '<span class="badge badge-active">Enabled</span>'
      : '<span class="badge badge-disabled">Disabled</span>';

    const tr = document.createElement('tr');
    const isSelected = agAuditGroup.has(app.id);

    tr.innerHTML = `
      <td class="text-center">
        <input type="checkbox" class="ag-app-checkbox rounded border-surface-600 bg-surface-900 accent-brand-500 w-4 h-4 cursor-pointer" 
               ${isSelected ? 'checked' : ''} onchange="agToggleAppSelection(this, '${app.id}')">
      </td>
      <td>
        <button class="text-left hover:text-brand-400 transition group" onclick="agOpenApp(AG.data.apps.find(a=>a.id==='${app.id}'))">
          <p class="font-medium text-slate-200 group-hover:text-brand-400 text-sm">${app.displayName}</p>
          <p class="text-xs text-slate-500">${app.publisherName || '—'}</p>
        </button>
      </td>
      <td><span class="badge ${ssoBadgeClass}">${app._ssoMode}</span></td>
      <td class="text-center">${statusBadge}</td>
      <td class="text-right text-slate-300">
        <span class="font-medium">${app._assignedCount}</span>
        <span class="text-slate-500 text-xs"> (${app._directUsers || 0}d / ${app._groups || 0}g)</span>
      </td>

      <td class="text-center">
        <button class="btn-secondary btn-sm" onclick="agOpenApp(AG.data.apps.find(a=>a.id==='${app.id}'))">
          Details
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  _agUpdateAuditActionBar();
}
window.agRenderAppsTable = agRenderAppsTable;

function _agPopulateAppFilters() {
  const ssoSel = document.getElementById('ag-sso-filter');
  if (!ssoSel || ssoSel.dataset.populated) return;
  const modes = [...new Set(AG.data.apps.map(a => a._ssoMode))].sort();
  ssoSel.innerHTML = '<option value="">All SSO Types</option>' +
    modes.map(m => `<option value="${m}">${m}</option>`).join('');
  ssoSel.dataset.populated = '1';
}

// ── Audit Group UI Handlers ─────────────────────────────────────────────────
function agToggleAppSelection(cb, appId) {
  if (cb.checked) {
    agAuditGroup.add(appId);
  } else {
    agAuditGroup.delete(appId);
  }
  _agSaveAuditGroup();
}

function agToggleAllApps(masterCb) {
  const isChecked = masterCb.checked;
  const bodyBoxes = document.querySelectorAll('.ag-app-checkbox');
  bodyBoxes.forEach(cb => {
    cb.checked = isChecked;
    // The onclick attr doesn't fire when changed programmatically, so trigger manually
    const appIdMatch = cb.getAttribute('onchange').match(/'([^']+)'/);
    if (appIdMatch && appIdMatch[1]) {
      if (isChecked) {
        agAuditGroup.add(appIdMatch[1]);
      } else {
        agAuditGroup.delete(appIdMatch[1]);
      }
    }
  });
  _agSaveAuditGroup();
}

function agClearAuditGroup() {
  agAuditGroup.clear();
  _agSaveAuditGroup();
  // Re-render table to uncheck everything
  agRenderAppsTable();
}

// Called from HTML oninput/onchange
function agAppSearchInput(val) { agAppSearch = val; agRenderAppsTable(); }
function agSsoFilterChange(val) { agSsoFilter = val; agRenderAppsTable(); }
window.agAppSearchInput = agAppSearchInput;
window.agSsoFilterChange = agSsoFilterChange;
window.agToggleAppSelection = agToggleAppSelection;
window.agToggleAllApps = agToggleAllApps;
window.agClearAuditGroup = agClearAuditGroup;

// ── Export Audit Group to CSV ────────────────────────────────────────────────
function exportAgAuditGroupCsv() {
  if (agAuditGroup.size === 0) {
    if (window.showToast) window.showToast('Select apps to export first', 'error');
    return;
  }

  const selectedApps = AG.data.apps.filter(a => agAuditGroup.has(a.id));

  const headers = ['App Name', 'App ID', 'User Name', 'UPN', 'Assignment Type', 'Source Group'];
  const rows = [];

  selectedApps.forEach(app => {
    const appName = `"${(app.displayName || 'Unknown App').replace(/"/g, '""')}"`;
    const appIdStr = `"${app.appId || ''}"`;

    // Add all assigned users
    if (app._assignedUsers && app._assignedUsers.length > 0) {
      app._assignedUsers.forEach(u => {
        rows.push([
          appName,
          appIdStr,
          `"${(u.displayName || '').replace(/"/g, '""')}"`,
          `"${u.userPrincipalName || ''}"`,
          `"${u.assignmentType || ''}"`,
          `"${(u.groupName || '').replace(/"/g, '""')}"`
        ]);
      });
    } else {
      // Add a line showing the app has no users
      rows.push([appName, appIdStr, '"No Users Assigned"', '""', '""', '""']);
    }
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `licenseguard_audit_group_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (window.showToast) window.showToast(`Exported ${rows.length} rows successfully`, 'success');
}
window.exportAgAuditGroupCsv = exportAgAuditGroupCsv;
