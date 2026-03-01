/**
 * identitygov/ui.js – UI rendering for Identity Governance
 */

let idgCurrentPage = 'identity-overview';
let idgFilters = {
    search: '',
    dept: 'all',
    mfa: 'all',
    risk: 'all',
    admin: 'all'
};

const IDG_PAGE_META = {
    'identity-overview': { title: 'Identity Overview', subtitle: 'Security posture at a glance' },
    'identity-users': { title: 'Identity Analysis', subtitle: 'Detailed MFA and Risk tracking per user' },
    'identity-policies': { title: 'Conditional Access', subtitle: 'Current security policies and coverage' }
};

function idgInitUI() {
    console.log("Initializing Identity Governance UI...");

    // Wire up navigation
    document.querySelectorAll('.identitygov-nav-item').forEach(btn => {
        btn.onclick = () => idgNavigateTo(btn.dataset.page);
    });

    // Populate Filters
    idgPopulateFilters();

    // Initial render
    idgRenderPage(idgCurrentPage);
}
window.idgInitUI = idgInitUI;

function idgNavigateTo(page) {
    if (!IDG_PAGE_META[page]) return;
    idgCurrentPage = page;

    // Update nav items
    document.querySelectorAll('.identitygov-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update header
    const meta = IDG_PAGE_META[page];
    document.getElementById('identitygov-page-title').textContent = meta.title;
    document.getElementById('identitygov-page-subtitle').textContent = meta.subtitle;

    // Show/hide page sections
    document.querySelectorAll('.identitygov-page-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(`page-${page}`);
    if (section) section.classList.remove('hidden');

    idgRenderPage(page);
}
window.idgNavigateTo = idgNavigateTo;

function idgRenderPage(page) {
    if (!IDG.data.users || IDG.data.users.length === 0) return;

    // Always ensure filters reflect current data (e.g. after refresh)
    idgPopulateFilters();

    const filtered = idgGetFilteredUsers();

    switch (page) {
        case 'identity-overview': renderIdgOverview(filtered); break;
        case 'identity-users': renderIdgUsers(filtered); break;
        case 'identity-policies': renderIdgPolicies(); break;
    }
}
window.idgRenderPage = idgRenderPage;

function idgGetFilteredUsers() {
    return IDG.data.users.filter(u => {
        const matchesSearch = !idgFilters.search ||
            u.displayName.toLowerCase().includes(idgFilters.search) ||
            u.userPrincipalName.toLowerCase().includes(idgFilters.search);

        const matchesDept = idgFilters.dept === 'all' || u.department === idgFilters.dept;
        const matchesMfa = idgFilters.mfa === 'all' || u.mfaStatus === idgFilters.mfa;
        const matchesRisk = idgFilters.risk === 'all' || u.riskLevel === idgFilters.risk;

        let matchesAdmin = true;
        if (idgFilters.admin === 'privileged') matchesAdmin = u.isPrivileged;
        else if (idgFilters.admin === 'standard') matchesAdmin = !u.isPrivileged;

        return matchesSearch && matchesDept && matchesMfa && matchesRisk && matchesAdmin;
    });
}

// ── Overview ─────────────────────────────────────────────────────────────
function renderIdgOverview(users) {
    const totalUsers = users.length;
    const strongMfa = users.filter(u => u.mfaStatus === 'Strong').length;
    const weakMfa = users.filter(u => u.mfaStatus === 'Weak').length;
    const noneMfa = users.filter(u => u.mfaStatus === 'None').length;
    const mfaPct = totalUsers > 0 ? Math.round(((strongMfa + weakMfa) / totalUsers) * 100) : 0;
    const riskyUsers = users.filter(u => u.riskLevel !== 'None').length;
    const legacyAuth = users.filter(u => u.hasLegacyAuth).length;

    // KPI Cards
    document.getElementById('idg-kpi-mfa-pct').textContent = mfaPct + '%';
    document.getElementById('idg-kpi-risky-users').textContent = riskyUsers;
    document.getElementById('idg-kpi-legacy-auth').textContent = legacyAuth;
    document.getElementById('idg-kpi-policies').textContent = IDG.data.policies.length;

    // Charts
    idgRenderMfaChart(strongMfa, weakMfa, noneMfa);
    idgRenderSecurityChart(users);
}

function idgRenderMfaChart(strong, weak, none) {
    const ctx = document.getElementById('idg-chart-mfa-dist');
    if (!ctx) return;

    if (window.idgMfaChart) window.idgMfaChart.destroy();

    window.idgMfaChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Strong (Authenticator/FIDO2)', 'Weak (SMS/Voice)', 'None'],
            datasets: [{
                data: [strong, weak, none],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 15 } }
            }
        }
    });
}

function idgRenderSecurityChart(users) {
    const ctx = document.getElementById('idg-chart-security-trends');
    if (!ctx) return;

    if (window.idgSecurityChart) window.idgSecurityChart.destroy();

    const depts = [...new Set(users.map(u => u.department))];
    const data = depts.map(d => {
        const deptUsers = users.filter(u => u.department === d);
        const protectedUsers = deptUsers.filter(u => u.mfaStatus === 'Strong').length;
        return (protectedUsers / deptUsers.length) * 100;
    });

    window.idgSecurityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: depts,
            datasets: [{
                label: 'Strong MFA % by Department',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#ffffff10' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
}

// ── User List ─────────────────────────────────────────────────────────────
function idgPopulateFilters() {
    const deptSelect = document.getElementById('idg-filter-dept');
    if (!deptSelect || !IDG.data.users) return;

    const currentVal = deptSelect.value;
    deptSelect.innerHTML = '<option value="all">All Departments</option>';

    // Get unique departments from data
    const depts = [...new Set(IDG.data.users.map(u => u.department).filter(d => d))].sort();
    depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
    });
    deptSelect.value = currentVal;
}

function idgApplyFilters() {
    idgFilters.search = document.getElementById('idg-user-search')?.value.toLowerCase() || '';
    idgFilters.dept = document.getElementById('idg-filter-dept')?.value || 'all';
    idgFilters.mfa = document.getElementById('idg-filter-mfa')?.value || 'all';
    idgFilters.risk = document.getElementById('idg-filter-risk')?.value || 'all';
    idgFilters.admin = document.getElementById('idg-filter-admin')?.value || 'all';

    idgRenderPage(idgCurrentPage);
}
window.idgApplyFilters = idgApplyFilters;

function idgExportCsv() {
    const users = idgGetFilteredUsers();
    if (!users || users.length === 0) {
        if (typeof showToast === 'function') showToast('No data to export', 'warning');
        return;
    }

    const headers = ['Display Name', 'User Principal Name', 'Department', 'Job Title', 'MFA Status', 'Risk Level', 'Legacy Auth', 'Privileged', 'Sign-in Success Rate'];
    const rows = users.map(u => [
        u.displayName,
        u.userPrincipalName,
        u.department || '',
        u.jobTitle || '',
        u.mfaStatus,
        u.riskLevel,
        u.hasLegacyAuth ? 'Yes' : 'No',
        u.isPrivileged ? 'Yes' : 'No',
        u.signInSuccessRate + '%'
    ]);

    // Construct CSV string
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `M365_Compass_Identity_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') showToast(`Exported ${users.length} users to CSV`, 'success');
}
window.idgExportCsv = idgExportCsv;

function renderIdgUsers(filtered) {
    const tbody = document.getElementById('idg-users-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Sort by name
    const sorted = [...filtered].sort((a, b) => a.displayName.localeCompare(b.displayName));

    sorted.forEach(u => {
        const tr = document.createElement('tr');

        let mfaIcon = '<i data-lucide="shield-x" class="w-4 h-4 text-red-400"></i>';
        let mfaLabel = 'None';
        if (u.mfaStatus === 'Strong') {
            mfaIcon = '<i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>';
            mfaLabel = 'Strong';
        } else if (u.mfaStatus === 'Weak') {
            mfaIcon = '<i data-lucide="shield-alert" class="w-4 h-4 text-amber-400"></i>';
            mfaLabel = 'Weak';
        }

        let riskBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">None</span>';
        if (u.riskLevel === 'High') riskBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 font-bold border border-red-500/30">High</span>';
        else if (u.riskLevel === 'Medium') riskBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">Medium</span>';
        else if (u.riskLevel === 'Low') riskBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">Low</span>';

        const legacyAuth = u.hasLegacyAuth
            ? '<span class="text-red-400" title="Uses Legacy Protocols"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i></span>'
            : '<span class="text-emerald-500"><i data-lucide="check" class="w-3.5 h-3.5"></i></span>';

        tr.innerHTML = `
            <td class="font-bold text-white flex items-center gap-2">
                ${u.isPrivileged ? '<i data-lucide="shield-alert" class="w-3 h-3 text-brand-400" title="Privileged Admin"></i>' : ''}
                ${u.displayName}
            </td>
            <td class="text-xs text-slate-500">${u.department || '—'}</td>
            <td class="text-center">
                <div class="flex flex-col items-center gap-1">
                    ${mfaIcon}
                    <span class="text-[10px] ${u.mfaStatus === 'Strong' ? 'text-emerald-400' : (u.mfaStatus === 'Weak' ? 'text-amber-400' : 'text-red-400')}">${mfaLabel}</span>
                </div>
            </td>
            <td class="text-center">${riskBadge}</td>
            <td class="text-center">${legacyAuth}</td>
            <td class="text-right text-xs">${u.signInSuccessRate}%</td>
        `;

        tr.onclick = () => {
            if (typeof openUserModal === 'function') openUserModal(u);
        };
        tr.className = 'hover:bg-surface-800 transition-colors cursor-pointer group';
        tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
}

// ── Policies ──────────────────────────────────────────────────────────────
function renderIdgPolicies() {
    const container = document.getElementById('idg-policies-container');
    if (!container) return;

    container.innerHTML = '';

    IDG.data.policies.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-3';

        const stateColor = p.state === 'enabled' ? 'text-emerald-400' : 'text-amber-400';
        const stateIcon = p.state === 'enabled' ? 'check-circle' : 'alert-circle';

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <h4 class="font-bold text-white text-sm">${p.displayName}</h4>
                <div class="flex items-center gap-1.5 ${stateColor} text-[10px] font-bold uppercase tracking-wider">
                    <i data-lucide="${stateIcon}" class="w-3 h-3"></i>
                    ${p.state.replace(/([A-Z])/g, ' $1').trim()}
                </div>
            </div>
            <div class="space-y-2">
                <p class="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Controls</p>
                <div class="flex flex-wrap gap-1.5">
                    ${(p.grantControls?.builtInControls || []).map(c => `
                        <span class="px-2 py-1 rounded bg-brand-500/10 text-brand-400 text-[10px] font-bold border border-brand-500/20">${c.toUpperCase()}</span>
                    `).join('')}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}
