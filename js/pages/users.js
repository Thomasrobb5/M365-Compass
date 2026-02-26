/**
 * pages/users.js – All Users: searchable, sortable, paginated DataTable + user modal
 */

let usersData = [];
let usersFiltered = [];
let usersPage = 1;
const USERS_PER_PAGE = 25;
let usersSortKey = 'displayName';
let usersSortDir = 1;

function renderUsersPage() {
    usersData = [...LG.data.users];
    populateDeptFilter();
    filterAndSortUsers();
}

function populateDeptFilter() {
    const sel = document.getElementById('users-dept-filter');
    const cur = sel.value;
    const depts = [...new Set(LG.data.users.map(u => u.department).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">All Departments</option>';
    depts.forEach(d => {
        const o = document.createElement('option');
        o.value = d; o.textContent = d;
        if (d === cur) o.selected = true;
        sel.appendChild(o);
    });
}

function filterAndSortUsers() {
    const searchVal = (document.getElementById('users-search')?.value || '').toLowerCase();
    const deptVal = document.getElementById('users-dept-filter')?.value || '';
    const days = LG.inactivityDays;

    usersFiltered = usersData.filter(u => {
        const matchSearch = !searchVal ||
            (u.displayName || '').toLowerCase().includes(searchVal) ||
            (u.userPrincipalName || '').toLowerCase().includes(searchVal) ||
            (u.department || '').toLowerCase().includes(searchVal) ||
            u._licenseNames.some(n => n.toLowerCase().includes(searchVal));
        const matchDept = !deptVal || u.department === deptVal;
        return matchSearch && matchDept;
    });

    // Sort
    usersFiltered.sort((a, b) => {
        let av = a[usersSortKey] ?? a['_' + usersSortKey] ?? '';
        let bv = b[usersSortKey] ?? b['_' + usersSortKey] ?? '';
        if (usersSortKey === 'daysInactive') { av = a._daysInactive ?? 9999; bv = b._daysInactive ?? 9999; }
        if (typeof av === 'string') return av.localeCompare(bv) * usersSortDir;
        return (av - bv) * usersSortDir;
    });

    usersPage = 1;
    renderUsersTable();
}

function renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    const inactivityDays = LG.inactivityDays;
    if (!tbody) return;
    tbody.innerHTML = '';

    const start = (usersPage - 1) * USERS_PER_PAGE;
    const pageData = usersFiltered.slice(start, start + USERS_PER_PAGE);

    pageData.forEach(user => {
        const isPremium = user._licenseNames.some(n => PREMIUM_SKUS.includes(n));
        const isInactive = user._isLicensed && (user._daysInactive === null || user._daysInactive >= inactivityDays);
        const lastSignInStr = user._lastSignIn ? formatDate(user._lastSignIn) : 'Never';
        const daysStr = user._daysInactive !== null ? `${user._daysInactive}d ago` : 'Never';

        const licBadges = user._licenseNames.slice(0, 2).map(n =>
            `<span class="badge ${PREMIUM_SKUS.includes(n) ? 'badge-premium' : 'badge-license'}">${n.length > 18 ? n.slice(0, 18) + '…' : n}</span>`
        ).join('');
        const moreCount = user._licenseNames.length > 2 ? `<span class="badge badge-license">+${user._licenseNames.length - 2}</span>` : '';

        const statusBadge = !user.accountEnabled
            ? '<span class="badge badge-disabled">Disabled</span>'
            : isInactive
                ? '<span class="badge badge-inactive">Inactive</span>'
                : '<span class="badge badge-active">Active</span>';

        const tr = document.createElement('tr');
        if (isPremium && isInactive) tr.classList.add('bg-red-950/10');
        tr.innerHTML = `
      <td>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
            ${(user.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span class="font-medium text-slate-200">${user.displayName || '—'}</span>
        </div>
      </td>
      <td class="text-slate-400 text-xs">${user.userPrincipalName || '—'}</td>
      <td class="text-slate-400">${user.department || '—'}</td>
      <td><div class="flex flex-wrap gap-1">${licBadges}${moreCount}</div></td>
      <td>
        <span class="text-sm ${user._daysInactive !== null && user._daysInactive >= inactivityDays ? 'text-amber-400 font-medium' : 'text-slate-300'}">${lastSignInStr}</span>
        <span class="text-xs text-slate-500 block">${daysStr}</span>
      </td>
      <td class="text-center">${statusBadge}</td>
    `;
        tr.addEventListener('click', () => openUserModal(user));
        tbody.appendChild(tr);
    });

    if (!pageData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 py-8">No users match your filters</td></tr>';
    }

    // Pagination
    const total = usersFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
    document.getElementById('users-count').textContent = `${total.toLocaleString()} users`;
    document.getElementById('users-page-info').textContent = `Page ${usersPage} / ${totalPages}`;
    document.getElementById('users-prev').disabled = usersPage <= 1;
    document.getElementById('users-next').disabled = usersPage >= totalPages;
}

function exportUsersCSV() {
    const headers = ['Display Name', 'UPN', 'Department', 'Job Title', 'Licenses', 'Last Sign-in', 'Days Inactive', 'Account Enabled', 'Est. Monthly Cost'];
    const rows = LG.data.users.map(u => [
        u.displayName, u.userPrincipalName, u.department, u.jobTitle,
        u._licenseNames.join('; '),
        u._lastSignIn ? formatDate(u._lastSignIn) : 'Never',
        u._daysInactive !== null ? u._daysInactive : 'N/A',
        u.accountEnabled ? 'Yes' : 'No',
        '$' + u._monthlyCost.toFixed(2)
    ]);
    exportCSV('all_users_licenses.csv', headers, rows);
}

// Wire events after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('users-search')?.addEventListener('input', () => filterAndSortUsers());
    document.getElementById('users-dept-filter')?.addEventListener('change', () => filterAndSortUsers());

    document.querySelectorAll('#users-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (usersSortKey === key) usersSortDir *= -1;
            else { usersSortKey = key; usersSortDir = 1; }
            renderUsersTable();
        });
    });

    document.getElementById('users-prev')?.addEventListener('click', () => {
        if (usersPage > 1) { usersPage--; renderUsersTable(); }
    });
    document.getElementById('users-next')?.addEventListener('click', () => {
        const total = Math.ceil(usersFiltered.length / USERS_PER_PAGE);
        if (usersPage < total) { usersPage++; renderUsersTable(); }
    });
});

window.renderUsersPage = renderUsersPage;
window.exportUsersCSV = exportUsersCSV;
