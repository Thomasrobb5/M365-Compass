/**
 * Security Governance - Page Renderers
 */

function secRenderOverview() {
    console.log("Rendering Security Overview...");

    // 1. Calculate Metrics
    const globalAdmins = SEC.data.roles.find(r => r.displayName === "Global Administrator")?.members || [];
    const totalAdmins = SEC.data.roles.reduce((acc, role) => acc + (role.members?.length || 0), 0);
    const privilegedRoles = SEC.data.roles.filter(r => r.members?.length > 0).length;
    const totalGrants = SEC.data.grants.length;

    // 2. Update KPIs
    document.getElementById('sec-kpi-total-admins').textContent = totalAdmins;
    document.getElementById('sec-kpi-global-admins').textContent = globalAdmins.length;
    document.getElementById('sec-kpi-privileged-roles').textContent = privilegedRoles;
    document.getElementById('sec-kpi-total-grants').textContent = totalGrants;

    // 3. Highlight Risk
    const gaKpi = document.getElementById('sec-kpi-global-admins').parentElement;
    if (globalAdmins.length > 5) {
        gaKpi.classList.add('border-red-500/50', 'bg-red-500/5');
    } else {
        gaKpi.classList.remove('border-red-500/50', 'bg-red-500/5');
    }

    // 4. Render Charts
    renderSecCharts();
}

function renderSecCharts() {
    // Admin Distribution
    const roleLabels = SEC.data.roles.filter(r => r.members?.length > 0).map(r => r.displayName);
    const roleCounts = SEC.data.roles.filter(r => r.members?.length > 0).map(r => r.members.length);

    if (window.renderAdminDistributionChart) {
        window.renderAdminDistributionChart(roleLabels, roleCounts);
    }

    // Consent Risk (Mock logic for risk classification)
    const riskData = { High: 0, Medium: 0, Low: 0 };
    SEC.data.grants.forEach(g => {
        const scope = (g.scope || '').toLowerCase();
        if (scope.includes('.all') || scope.includes('directory.read') || scope.includes('mail.read')) {
            riskData.High++;
        } else if (scope.includes('.readwrite')) {
            riskData.Medium++;
        } else {
            riskData.Low++;
        }
    });

    if (window.renderConsentRiskChart) {
        window.renderConsentRiskChart(Object.keys(riskData), Object.values(riskData));
    }
}

function secRenderAdminRoles(filter = '', roleId = null) {
    const tbody = document.getElementById('sec-admins-tbody');
    tbody.innerHTML = '';
    const q = filter.toLowerCase();
    const activeId = roleId || SEC.state.activeRoleId;

    SEC.data.roles.forEach(role => {
        if (!role.members || role.members.length === 0) return;

        // If filtering by a specific role (card click), only show that role
        if (activeId && role.id !== activeId) return;

        role.members.forEach(member => {
            const isExternal = member.userPrincipalName?.includes('#EXT#');
            const isGlobal = role.displayName === "Global Administrator";

            // Filter logic (Search keyword)
            const roleMatch = (role.displayName || '').toLowerCase().includes(q);
            const nameMatch = (member.displayName || '').toLowerCase().includes(q);
            const upnMatch = (member.userPrincipalName || '').toLowerCase().includes(q);

            if (q && !roleMatch && !nameMatch && !upnMatch) {
                return;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-bold text-white">${role.displayName}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-[10px] text-white">
                            ${member.displayName?.charAt(0) || 'U'}
                        </div>
                        <span>${member.displayName}</span>
                    </div>
                </td>
                <td class="text-xs text-slate-400">${member.userPrincipalName}</td>
                <td>
                    <span class="px-2 py-0.5 rounded text-[10px] ${isExternal ? 'bg-amber-900/40 text-amber-400' : 'bg-blue-900/40 text-blue-400'}">
                        ${isExternal ? 'Guest / External' : 'Internal'}
                    </span>
                </td>
                <td class="text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isGlobal ? 'bg-red-900/50 text-red-400 animate-pulse' : 'bg-surface-800 text-slate-500'}">
                        ${isGlobal ? 'CRITICAL' : 'Low'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function secRenderRoleCards() {
    const container = document.getElementById('sec-role-cards-container');
    if (!container) return;
    container.innerHTML = '';

    // Sort roles by member count descending
    const sortedRoles = [...SEC.data.roles].sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));

    sortedRoles.forEach(role => {
        if (!role.members || role.members.length === 0) return;

        const count = role.members.length;
        const isGlobal = role.displayName === "Global Administrator";
        const isActive = SEC.state.activeRoleId === role.id;

        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between h-24 ${isActive
            ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-900/20'
            : 'bg-surface-900 border-surface-800 hover:border-surface-600'
            }`;

        card.onclick = () => secApplyRoleFilter(role.id, role.displayName);

        card.innerHTML = `
            <div class="flex items-start justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider ${isGlobal ? 'text-red-400' : 'text-slate-500'}">${isGlobal ? 'Critical Role' : 'Directory Role'}</span>
                <div class="w-6 h-6 rounded-lg ${isGlobal ? 'bg-red-500/10 text-red-500' : 'bg-surface-800 text-slate-400'} flex items-center justify-center">
                    <i data-lucide="${isGlobal ? 'shield-alert' : 'user-cog'}" class="w-3.5 h-3.5"></i>
                </div>
            </div>
            <div>
                <div class="text-sm font-bold text-white truncate mb-0.5">${role.displayName}</div>
                <div class="text-xs text-slate-500">${count} Members</div>
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons({ nodes: [container] });
}

function secApplyRoleFilter(roleId, roleName) {
    if (SEC.state.activeRoleId === roleId) {
        secClearRoleFilter();
        return;
    }

    SEC.state.activeRoleId = roleId;

    // Update UI Filter Badge
    const badge = document.getElementById('sec-active-role-filter');
    const badgeName = document.getElementById('sec-active-role-name');
    badge.classList.remove('hidden');
    badgeName.textContent = roleName;

    // Refresh views
    secRenderRoleCards();
    secRenderAdminRoles();
}
window.secApplyRoleFilter = secApplyRoleFilter;

function secRenderGlobalAdmins(filter = '') {
    const tbody = document.getElementById('sec-globaladmins-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const q = filter.toLowerCase();

    const gaRole = SEC.data.roles.find(r => r.displayName === "Global Administrator");
    if (!gaRole || !gaRole.members) return;

    gaRole.members.forEach(member => {
        const isExternal = member.userPrincipalName?.includes('#EXT#');

        // Filter logic
        const nameMatch = (member.displayName || '').toLowerCase().includes(q);
        const upnMatch = (member.userPrincipalName || '').toLowerCase().includes(q);

        if (q && !nameMatch && !upnMatch) {
            return;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-red-900/40 flex items-center justify-center text-[10px] text-red-400 font-bold border border-red-500/30">
                        ${member.displayName?.charAt(0) || 'U'}
                    </div>
                    <span class="font-bold text-white">${member.displayName}</span>
                </div>
            </td>
            <td class="text-xs text-slate-400">${member.userPrincipalName}</td>
            <td>
                <span class="px-2 py-0.5 rounded text-[10px] ${isExternal ? 'bg-amber-900/40 text-amber-400' : 'bg-blue-900/40 text-blue-400'}">
                    ${isExternal ? 'Guest / External' : 'Internal'}
                </span>
            </td>
            <td class="text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/50 text-red-400 animate-pulse">
                    CRITICAL
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function secRenderConsentGrants(filter = '') {
    const tbody = document.getElementById('sec-consent-tbody');
    tbody.innerHTML = '';
    const q = filter.toLowerCase();

    SEC.data.grants.forEach(g => {
        const scope = (g.scope || '').toLowerCase();
        // Lookup display name from SP map using clientId
        const spName = SEC.data.servicePrincipals[g.clientId] || g.displayName || 'Unknown App';
        const appNameLower = spName.toLowerCase();
        const clientId = (g.clientId || '').toLowerCase();

        // Filter logic
        if (q && !appNameLower.includes(q) && !scope.includes(q) && !clientId.includes(q)) {
            return;
        }

        const tr = document.createElement('tr');
        let risk = 'Low';
        let riskClass = 'bg-surface-800 text-slate-400';

        if (scope.includes('.all') || scope.includes('directory.read') || scope.includes('mail.read')) {
            risk = 'HIGH';
            riskClass = 'bg-red-900/40 text-red-400';
        } else if (scope.includes('.readwrite')) {
            risk = 'Medium';
            riskClass = 'bg-amber-900/40 text-amber-400';
        }

        tr.innerHTML = `
            <td class="font-bold text-white">${spName}</td>
            <td class="text-xs text-slate-400">${g.consentType === 'AllPrincipals' ? 'Admin (Tenant-wide)' : 'User'}</td>
            <td class="text-[10px] font-mono text-slate-500">${g.clientId}</td>
            <td class="max-w-xs truncate text-xs text-slate-400" title="${g.scope}">${g.scope}</td>
            <td class="text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${riskClass}">
                    ${risk}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function secExportAdminCsv() {
    const headers = ["Role", "Name", "UPN", "Type", "Severity"];
    const rows = [];

    SEC.data.roles.forEach(role => {
        role.members?.forEach(m => {
            rows.push([
                role.displayName,
                m.displayName,
                m.userPrincipalName,
                m.userPrincipalName.includes('#EXT#') ? 'External' : 'Internal',
                role.displayName === "Global Administrator" ? 'CRITICAL' : 'Low'
            ]);
        });
    });

    if (typeof exportToCsv === 'function') {
        exportToCsv("M365Compass_AdminRoles.csv", [headers, ...rows]);
    }
}

function secExportGlobalAdminCsv() {
    const headers = ["Name", "UPN", "Type", "Severity"];
    const rows = [];
    const gaRole = SEC.data.roles.find(r => r.displayName === "Global Administrator");

    gaRole?.members?.forEach(m => {
        rows.push([
            m.displayName,
            m.userPrincipalName,
            m.userPrincipalName.includes('#EXT#') ? 'External' : 'Internal',
            'CRITICAL'
        ]);
    });

    if (typeof exportToCsv === 'function') {
        exportToCsv("M365Compass_GlobalAdmins.csv", [headers, ...rows]);
    }
}

function secExportConsentCsv() {
    const headers = ["App Name", "Consent Type", "Client ID", "Scopes", "Risk"];
    const rows = SEC.data.grants.map(g => {
        const scope = g.scope.toLowerCase();
        let risk = 'Low';
        if (scope.includes('.all') || scope.includes('directory.read') || scope.includes('mail.read')) risk = 'HIGH';
        else if (scope.includes('.readwrite')) risk = 'Medium';

        return [
            g.displayName,
            g.consentType,
            g.clientId,
            g.scope,
            risk
        ];
    });

    if (typeof exportToCsv === 'function') {
        exportToCsv("M365Compass_ConsentGrants.csv", [headers, ...rows]);
    }
}
