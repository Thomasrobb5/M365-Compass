/**
 * devicegov/pages/compliance-report.js – Full compliance report page
 * Department, State, OS, and Search-filterable table of ALL devices + CSV export
 */

let dgComplianceReportDeptFilter = 'all';
let dgComplianceReportOSFilter = 'all';
let dgComplianceReportSearchTerm = '';

function dgRenderComplianceReport() {
    const sec = document.getElementById('devicegov-compliance-report');
    if (!sec) return;

    if (!sec.dataset.init) {
        sec.dataset.init = '1';
        sec.innerHTML = `
            <!-- KPI Row -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div class="bg-surface-900 border border-emerald-800/40 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-emerald-400" id="cr-kpi-compliant">0</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Compliant</p>
                </div>
                <div class="bg-surface-900 border border-red-800/40 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center mb-3">
                        <i data-lucide="shield-x" class="w-4 h-4 text-red-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-red-400" id="cr-kpi-noncompliant">0</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Non-Compliant</p>
                </div>
                <div class="bg-surface-900 border border-amber-800/40 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
                        <i data-lucide="clock" class="w-4 h-4 text-amber-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-amber-400" id="cr-kpi-grace">0</h4>
                    <p class="text-xs text-slate-400 mt-0.5">In Grace Period</p>
                </div>
                <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center mb-3">
                        <i data-lucide="percent" class="w-4 h-4 text-slate-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-white" id="cr-kpi-pct">0%</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Compliance Rate</p>
                </div>
            </div>

            <!-- Table card -->
            <div class="content-card flex flex-col" style="max-height: calc(100vh - 280px);">
                <div class="content-card-header flex-wrap gap-y-2 shrink-0">
                    <h3 class="section-title">
                        <i data-lucide="clipboard-check" class="w-4 h-4 text-cyan-400"></i>
                        Compliance Status — All Devices
                    </h3>
                    <div class="flex items-center gap-2 flex-wrap">
                        <!-- Search Box -->
                        <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"></i>
                            <input type="text" id="cr-search-input" placeholder="Search user or device..." 
                                class="bg-surface-800 border border-surface-700 text-white text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-48 transition-all">
                        </div>

                        <!-- Department Filter -->
                        <select id="cr-dept-filter"
                            class="bg-surface-800 border border-surface-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer">
                            <option value="all">All Departments</option>
                        </select>

                        <!-- OS Filter -->
                        <select id="cr-os-filter"
                            class="bg-surface-800 border border-surface-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer">
                            <option value="all">All OS</option>
                        </select>

                        <!-- State Filter -->
                        <select id="cr-state-filter"
                            class="bg-surface-800 border border-surface-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer">
                            <option value="all">All States</option>
                            <option value="compliant">Compliant</option>
                            <option value="noncompliant">Non-Compliant</option>
                            <option value="gracePeriod">Grace Period</option>
                            <option value="configManager">Config Manager</option>
                            <option value="unknown">Unknown</option>
                        </select>

                        <button onclick="dgExportComplianceReport()"
                            class="btn-secondary btn-sm flex items-center gap-2">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV
                        </button>
                    </div>
                </div>
                <div class="table-wrapper flex-1 overflow-y-auto">
                    <table class="data-table">
                        <thead class="sticky top-0 bg-surface-900/95 backdrop-blur-sm z-10 shadow-sm shadow-black/20">
                            <tr>
                                <th>Device</th>
                                <th>User</th>
                                <th>Department</th>
                                <th>OS</th>
                                <th>Compliance</th>
                                <th>Encryption</th>
                                <th>Defender</th>
                                <th>Last Sync</th>
                            </tr>
                        </thead>
                        <tbody id="cr-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [sec] });

        // Wire up filters
        document.getElementById('cr-dept-filter').addEventListener('change', function () {
            dgComplianceReportDeptFilter = this.value;
            dgUpdateComplianceReportTable();
        });
        document.getElementById('cr-os-filter').addEventListener('change', function () {
            dgComplianceReportOSFilter = this.value;
            dgUpdateComplianceReportTable();
        });
        document.getElementById('cr-state-filter').addEventListener('change', function () {
            dgUpdateComplianceReportTable();
        });

        const searchInput = document.getElementById('cr-search-input');
        searchInput.addEventListener('input', (e) => {
            dgComplianceReportSearchTerm = e.target.value.toLowerCase();
            dgUpdateComplianceReportTable();
        });
    }

    dgUpdateComplianceReportData();
}
window.dgRenderComplianceReport = dgRenderComplianceReport;

function dgUpdateComplianceReportData() {
    const devices = DG.data.devices || [];

    // Populate department dropdown
    const deptSelect = document.getElementById('cr-dept-filter');
    if (deptSelect) {
        const currentVal = deptSelect.value;
        const depts = [...new Set(devices.map(d => d.department || 'Unknown'))].sort();
        deptSelect.innerHTML = '<option value="all">All Departments</option>' +
            depts.map(d => `<option value="${d}" ${d === currentVal ? 'selected' : ''}>${d}</option>`).join('');
    }

    // Populate OS dropdown
    const osSelect = document.getElementById('cr-os-filter');
    if (osSelect) {
        const currentVal = osSelect.value;
        const oss = [...new Set(devices.map(d => d.operatingSystem).filter(Boolean))].sort();
        osSelect.innerHTML = '<option value="all">All OS</option>' +
            oss.map(o => `<option value="${o}" ${o === currentVal ? 'selected' : ''}>${o}</option>`).join('');
    }

    dgUpdateComplianceReportTable();
}

function dgUpdateComplianceReportTable() {
    const devices = DG.data.devices || [];
    const stateFilter = document.getElementById('cr-state-filter')?.value || 'all';

    // Apply all filters
    let filtered = devices.filter(d => {
        // Department
        if (dgComplianceReportDeptFilter !== 'all' && (d.department || 'Unknown') !== dgComplianceReportDeptFilter) return false;

        // OS
        if (dgComplianceReportOSFilter !== 'all' && d.operatingSystem !== dgComplianceReportOSFilter) return false;

        // State
        if (stateFilter !== 'all' && (d.complianceState || 'unknown') !== stateFilter) return false;

        // Search
        if (dgComplianceReportSearchTerm) {
            const match = (d.deviceName || '').toLowerCase().includes(dgComplianceReportSearchTerm) ||
                (d.userDisplayName || '').toLowerCase().includes(dgComplianceReportSearchTerm) ||
                (d.userPrincipalName || '').toLowerCase().includes(dgComplianceReportSearchTerm);
            if (!match) return false;
        }

        return true;
    });

    const compliant = filtered.filter(d => d.complianceState === 'compliant').length;
    const nonCompliant = filtered.filter(d => d.complianceState === 'noncompliant').length;
    const grace = filtered.filter(d => d.complianceState === 'gracePeriod').length;
    const pct = filtered.length ? Math.round((compliant / filtered.length) * 100) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('cr-kpi-compliant', compliant);
    set('cr-kpi-noncompliant', nonCompliant);
    set('cr-kpi-grace', grace);
    set('cr-kpi-pct', pct + '%');

    const tbody = document.getElementById('cr-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-slate-500">No devices match the selected filters.</td></tr>`;
        return;
    }

    const stateLabel = (state) => {
        const map = {
            compliant: `<span class="badge bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">Compliant</span>`,
            noncompliant: `<span class="badge bg-red-900/40 text-red-300 border border-red-800/50">Non-Compliant</span>`,
            gracePeriod: `<span class="badge bg-amber-900/40 text-amber-300 border border-amber-800/50">Grace Period</span>`,
            configManager: `<span class="badge bg-blue-900/40 text-blue-300 border border-blue-800/50">Config Manager</span>`,
        };
        return map[state] || `<span class="badge bg-surface-800 text-slate-400 border border-surface-700">${state || 'Unknown'}</span>`;
    };

    const defenderLabel = (status) => {
        if (status === 'notApplicable') return `<span class="text-xs text-slate-600">N/A</span>`;
        if (status === 'secured') return `<span class="badge bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">Secured</span>`;
        if (status === 'atRisk') return `<span class="badge bg-red-900/40 text-red-300 border border-red-800/50">At Risk</span>`;
        return `<span class="text-xs text-slate-500">${status || '—'}</span>`;
    };

    // Sort: non-compliant first, then grace, then compliant
    const order = { noncompliant: 0, gracePeriod: 1, configManager: 2, compliant: 3 };
    const sorted = [...filtered].sort((a, b) =>
        (order[a.complianceState] ?? 4) - (order[b.complianceState] ?? 4));

    tbody.innerHTML = sorted.map(d => `<tr>
        <td>
            <span class="font-medium text-slate-200 text-sm">${d.deviceName || '—'}</span>
            <br><span class="text-xs text-slate-500">${d.manufacturer || ''} ${d.model || ''}</span>
        </td>
        <td>
            <span class="text-sm">${d.userDisplayName || '—'}</span>
            <br><span class="text-xs text-slate-500">${d.userPrincipalName || ''}</span>
        </td>
        <td><span class="text-sm text-slate-300">${d.department || '—'}</span></td>
        <td class="text-sm text-slate-400">${d.operatingSystem || '—'}</td>
        <td>${stateLabel(d.complianceState)}</td>
        <td>${d.isEncrypted
            ? `<span class="badge bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">Encrypted</span>`
            : `<span class="badge bg-amber-900/40 text-amber-300 border border-amber-800/50">Unencrypted</span>`}</td>
        <td>${defenderLabel(d.defenderStatus)}</td>
        <td class="text-xs text-slate-500">${typeof formatDate === 'function' ? formatDate(d.lastSyncDateTime) : (d.lastSyncDateTime || '—')}</td>
    </tr>`).join('');
}

function dgExportComplianceReport() {
    const devices = DG.data.devices || [];
    const stateFilter = document.getElementById('cr-state-filter')?.value || 'all';

    // Apply same filters as table
    let filtered = devices.filter(d => {
        if (dgComplianceReportDeptFilter !== 'all' && (d.department || 'Unknown') !== dgComplianceReportDeptFilter) return false;
        if (dgComplianceReportOSFilter !== 'all' && d.operatingSystem !== dgComplianceReportOSFilter) return false;
        if (stateFilter !== 'all' && (d.complianceState || 'unknown') !== stateFilter) return false;
        if (dgComplianceReportSearchTerm) {
            const match = (d.deviceName || '').toLowerCase().includes(dgComplianceReportSearchTerm) ||
                (d.userDisplayName || '').toLowerCase().includes(dgComplianceReportSearchTerm) ||
                (d.userPrincipalName || '').toLowerCase().includes(dgComplianceReportSearchTerm);
            if (!match) return false;
        }
        return true;
    });

    if (!filtered.length) { if (typeof showToast === 'function') showToast('No data to export', 'warning'); return; }

    const deptLabel = dgComplianceReportDeptFilter === 'all' ? 'All_Depts' : dgComplianceReportDeptFilter.replace(/\s+/g, '_');
    const osLabel = dgComplianceReportOSFilter === 'all' ? 'All_OS' : dgComplianceReportOSFilter.replace(/\s+/g, '_');
    const stateLabel = stateFilter === 'all' ? 'All_States' : stateFilter;

    let csv = 'Device Name,Manufacturer,Model,User,UPN,Department,OS,OS Version,Compliance State,Encryption,Defender Status,Last Sync\n';
    filtered.forEach(d => {
        csv += `"${d.deviceName || ''}","${d.manufacturer || ''}","${d.model || ''}","${d.userDisplayName || ''}","${d.userPrincipalName || ''}","${d.department || ''}","${d.operatingSystem || ''}","${d.osVersion || ''}","${d.complianceState || ''}","${d.isEncrypted ? 'Encrypted' : 'Unencrypted'}","${d.defenderStatus || ''}","${d.lastSyncDateTime || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance_report_${deptLabel}_${osLabel}_${stateLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
window.dgExportComplianceReport = dgExportComplianceReport;
