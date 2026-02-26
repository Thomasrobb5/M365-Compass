/**
 * appgov/pages/inactive.js – Inactive App Users cross-app view
 */

function agRenderInactiveUsers() {
    const days = AG.inactivityDays;
    const apps = AG.data.apps;

    // Build cross-app inactive list
    const rows = [];
    apps.forEach(app => {
        const users = app._assignedUsers || [];
        users.forEach(u => {
            const isInactive = !u._lastSignIn || daysSince(u._lastSignIn) >= days;
            if (isInactive) {
                rows.push({ app, user: u, daysInactive: u._lastSignIn ? daysSince(u._lastSignIn) : null });
            }
        });
    });

    // Sort: never signed in first, then by most inactive
    rows.sort((a, b) => (b.daysInactive ?? 9999) - (a.daysInactive ?? 9999));

    // KPIs
    const uniqueUsers = new Set(rows.map(r => r.user.id)).size;
    const affectedApps = new Set(rows.map(r => r.app.id)).size;
    _agSet('ag-inactive-row-count', rows.length);
    _agSet('ag-inactive-user-count', uniqueUsers);
    _agSet('ag-inactive-app-count', affectedApps);

    const tbody = document.getElementById('ag-inactive-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-500 py-8">
      No inactive app users found for the ${days}-day threshold — great news!
    </td></tr>`;
        return;
    }

    // Apply dept filter
    const deptFilter = document.getElementById('ag-inactive-dept-filter')?.value || '';

    let filtered = rows;
    if (deptFilter) filtered = rows.filter(r => (r.user.department || '') === deptFilter);

    // Populate dept filter
    const deptSel = document.getElementById('ag-inactive-dept-filter');
    if (deptSel && !deptSel.dataset.populated) {
        const depts = [...new Set(rows.map(r => r.user.department).filter(Boolean))].sort();
        deptSel.innerHTML = '<option value="">All Departments</option>' +
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
        deptSel.dataset.populated = '1';
    }

    filtered.slice(0, 100).forEach(({ app, user, daysInactive }) => {
        const daysLabel = daysInactive !== null ? `${daysInactive} days` : '∞ (never)';
        const severity = !daysInactive ? 'border-l-4 border-red-500'
            : daysInactive >= 60 ? 'border-l-4 border-red-400'
                : daysInactive >= 30 ? 'border-l-4 border-amber-500' : '';

        const typeBadge = user.assignmentType === 'Direct'
            ? '<span class="badge badge-license">Direct</span>'
            : `<span class="badge badge-disabled">Group${user.groupName ? ': ' + user.groupName : ''}</span>`;

        const tr = document.createElement('tr');
        tr.className = severity;
        tr.innerHTML = `
      <td>
        <p class="text-sm font-medium text-slate-200">${user.displayName || '—'}</p>
        <p class="text-xs text-slate-500">${user.userPrincipalName || ''}</p>
      </td>
      <td>
        <button class="text-brand-400 hover:text-brand-300 transition text-sm font-medium"
          onclick="agOpenApp(AG.data.apps.find(a=>a.id==='${app.id}'))">${app.displayName}</button>
      </td>
      <td>${typeBadge}</td>
      <td class="text-slate-400 text-xs">${user._lastSignIn ? formatDate(user._lastSignIn) : 'Never'}</td>
      <td class="text-right font-bold ${!daysInactive || daysInactive >= 60 ? 'text-red-400' : 'text-amber-400'}">${daysLabel}</td>
      <td class="text-center">
        <button class="btn-secondary btn-sm"
          onclick="agOpenApp(AG.data.apps.find(a=>a.id==='${app.id}'))">View App</button>
      </td>
    `;
        tbody.appendChild(tr);
    });
}
window.agRenderInactiveUsers = agRenderInactiveUsers;

function agInactiveDeptFilter(val) {
    const tbody = document.getElementById('ag-inactive-tbody');
    if (tbody) tbody.innerHTML = '';
    agRenderInactiveUsers();
}
window.agInactiveDeptFilter = agInactiveDeptFilter;
