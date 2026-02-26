/**
 * appgov/pages/detail.js – Application Detail drilldown page
 * Groups are expanded on-demand when the page opens so it always works,
 * regardless of whether data was loaded from cache or fresh.
 */

let currentAgDetailApp = null;

async function agRenderAppDetail(app) {
    currentAgDetailApp = app;

    if (!app) {
        document.getElementById('appgov-detail').innerHTML = '<p class="text-slate-500 p-8">No application selected.</p>';
        return;
    }

    const days = AG.inactivityDays;

    // Header info
    _agSet('ag-detail-name', app.displayName);
    _agSet('ag-detail-publisher', app.publisherName || 'Unknown Publisher');

    const ssoEl = document.getElementById('ag-detail-sso');
    if (ssoEl) {
        const cls = { SAML: 'badge-premium', OIDC: 'badge-license', 'Password SSO': 'badge-warning', None: 'badge-disabled' }[app._ssoMode] || 'badge-disabled';
        ssoEl.innerHTML = `<span class="badge ${cls}">${app._ssoMode}</span>`;
    }

    const homepageEl = document.getElementById('ag-detail-homepage');
    if (homepageEl && app.homepage) {
        homepageEl.href = app.homepage;
        homepageEl.textContent = app.homepage;
        homepageEl.classList.remove('hidden');
    } else if (homepageEl) {
        homepageEl.classList.add('hidden');
    }

    // ── SSO Configuration panel ───────────────────────────────────────────
    const ssoConfigEl = document.getElementById('ag-detail-sso-config');
    if (ssoConfigEl) {
        if (app._ssoMode !== 'None') {
            const replyUrls = (app.replyUrls || []).filter(Boolean);
            const entityId = (app.identifierUris || [])[0] || null;
            const loginUrl = app.loginUrl || app.homepage || null;
            ssoConfigEl.innerHTML = `
            <div class="content-card">
                <div class="content-card-header">
                    <h3 class="section-title">
                        <i data-lucide="key-round" class="w-4 h-4 text-violet-400"></i>
                        SSO Configuration — ${app._ssoMode}
                    </h3>
                </div>
                <div class="p-5 space-y-4">
                    ${loginUrl ? `<div>
                        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Sign-On URL / Login URL</p>
                        <a href="${loginUrl}" target="_blank" class="text-sm text-brand-400 hover:underline break-all">${loginUrl}</a>
                    </div>` : ''}
                    ${entityId ? `<div>
                        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Entity ID / Identifier URI</p>
                        <code class="text-xs text-slate-300 bg-surface-900 border border-surface-700 rounded px-2 py-1 break-all block">${entityId}</code>
                    </div>` : ''}
                    ${replyUrls.length ? `<div>
                        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Reply URLs / ACS URLs (${replyUrls.length})</p>
                        <div class="space-y-1.5">${replyUrls.map(url => `
                            <div class="flex items-center gap-2 bg-surface-900 border border-surface-700 rounded-lg px-3 py-1.5">
                                <i data-lucide="arrow-right" class="w-3 h-3 text-slate-500 shrink-0"></i>
                                <code class="text-xs text-slate-300 break-all">${url}</code>
                            </div>`).join('')}
                        </div>
                    </div>` : ''}
                    ${!loginUrl && !entityId && !replyUrls.length ? `<p class="text-sm text-slate-500">SSO mode: ${app._ssoMode}. Detailed URL configuration is not available via the API for this app.</p>` : ''}
                </div>
            </div>`;
            lucide.createIcons({ nodes: [ssoConfigEl] });
            ssoConfigEl.classList.remove('hidden');
        } else {
            ssoConfigEl.classList.add('hidden');
        }
    }

    // ── Render user table (may trigger on-demand group expansion) ─────────
    await _agRenderDetailUsers(app, days);


}
window.agRenderAppDetail = agRenderAppDetail;

// ── Render group table ──────────────────────────────────────────────────────
async function _agRenderDetailUsers(app, days) {
    const tbody = document.getElementById('ag-detail-users-tbody');
    if (!tbody) return;

    // The backend worker has already fully expanded groups and fetched deep sign-ins.
    // Standardise stats display directly.
    const displayCount = app._expandedCount || app._assignedCount || 0;
    _agSet('ag-detail-assigned', displayCount);
    _agSet('ag-detail-direct', app._directUsers || 0);
    _agSet('ag-detail-groups', app._groups || 0);


    // Render final table directly
    _agPopulateUsersTable(app._assignedUsers || [], tbody, days);
}

function _agPopulateUsersTable(users, tbody, days) {
    tbody.innerHTML = '';

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-slate-500 py-6">No user assignment data available</td></tr>';
        return;
    }

    // Group users by their source group for visual grouping
    const directUsers = users.filter(u => u.assignmentType === 'Direct');
    const groupUsers = users.filter(u => u.assignmentType === 'Group');

    // Sort: direct first, then group members grouped together
    const sorted = [...directUsers, ...groupUsers.sort((a, b) =>
        (a.groupName || '').localeCompare(b.groupName || '') || (a.displayName || '').localeCompare(b.displayName || '')
    )];

    let lastGroup = null;

    sorted.slice(0, 150).forEach(u => {
        // Insert group header row when group changes
        if (u.assignmentType === 'Group' && u.groupName !== lastGroup) {
            lastGroup = u.groupName;
            const headerRow = document.createElement('tr');
            headerRow.className = 'bg-surface-900/60';
            headerRow.innerHTML = `
            <td colspan="2" class="py-2 px-4">
                <div class="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wide">
                    <i data-lucide="users" class="w-3 h-3"></i>
                    Group: ${u.groupName || 'Unknown Group'}
                    ${u.isGroupFallback ? '<span class="text-slate-500 font-normal normal-case ml-1">(member list unavailable)</span>' : ''}
                </div>
            </td>`;
            tbody.appendChild(headerRow);
            lucide.createIcons({ nodes: [headerRow] });
        }

        const typeBadge = u.assignmentType === 'Direct'
            ? '<span class="badge badge-license">Direct</span>'
            : `<span class="badge badge-disabled">Group</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>
        <p class="text-sm font-medium text-slate-200">${u.displayName || '—'}</p>
        <p class="text-xs text-slate-500">${u.userPrincipalName || ''}</p>
      </td>
      <td>${typeBadge}</td>
    `;
        tbody.appendChild(tr);
    });

    if (users.length > 150) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="2" class="text-center text-xs text-slate-500 py-3">Showing 150 of ${users.length} users</td>`;
        tbody.appendChild(tr);
    }
}

// ── Export App Users to CSV ───────────────────────────────────────────────────
function exportAgAppUsersCsv() {
    if (!currentAgDetailApp || !currentAgDetailApp._assignedUsers || currentAgDetailApp._assignedUsers.length === 0) {
        if (window.showToast) window.showToast('No user data available to export', 'error');
        return;
    }

    const headers = ['Name', 'UPN', 'Assignment Type', 'Source Group'];
    const rows = currentAgDetailApp._assignedUsers.map(u => [
        `"${(u.displayName || '').replace(/"/g, '""')}"`,
        `"${u.userPrincipalName || ''}"`,
        `"${u.assignmentType || ''}"`,
        `"${(u.groupName || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Build descriptive filename based on app name
    const safeName = (currentAgDetailApp.displayName || 'App').replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `licenseguard_app_users_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showToast) window.showToast(`Exported ${currentAgDetailApp._assignedUsers.length} users successfully`, 'success');
}
window.exportAgAppUsersCsv = exportAgAppUsersCsv;
