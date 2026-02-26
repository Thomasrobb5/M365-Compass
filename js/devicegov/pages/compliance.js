/**
 * devicegov/pages/compliance.js – Specific view focusing on failing/unencrypted endpoints
 */

function dgRenderCompliance() {
    const sec = document.getElementById('devicegov-compliance');
    if (!sec) return;

    // First time structural render
    if (!document.getElementById('dg-comp-tbody')) {
        sec.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <!-- Compliance Breakdown Card -->
                <div class="content-card">
                    <div class="content-card-header">
                        <h3 class="section-title"><i data-lucide="shield-alert" class="w-4 h-4 text-red-400"></i> Non-Compliant Reasons</h3>
                    </div>
                    <div class="p-5 flex flex-col items-center justify-center min-h-[220px]">
                        <p class="text-slate-400 text-sm text-center">Detailed compliance policies are not fully exposed in the base managedDevice endpoint.<br>Showing overall compliance status distribution instead.</p>
                        <canvas id="chart-dg-comp-reasons" class="max-h-48 mt-4"></canvas>
                    </div>
                </div>

                <!-- Action Required Summary -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-surface-900 border border-red-800/40 rounded-2xl p-5 flex flex-col justify-between">
                        <div class="flex items-start justify-between">
                            <div class="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                                <i data-lucide="monitor-x" class="w-5 h-5 text-red-400"></i>
                            </div>
                            <span class="text-xs font-semibold px-2 py-1 rounded bg-red-900/50 text-red-300">High Risk</span>
                        </div>
                        <div class="mt-4">
                            <h4 class="text-3xl font-bold text-red-400" id="dg-comp-noncompliant-count">0</h4>
                            <p class="text-sm text-slate-400 mt-1">Non-Compliant Devices</p>
                            <p class="text-xs text-slate-500 mt-2 leading-relaxed">Devices failing one or more Intune compliance policies (e.g. OS version, password complexity).</p>
                        </div>
                    </div>
                    
                    <div class="bg-surface-900 border border-amber-800/40 rounded-2xl p-5 flex flex-col justify-between">
                        <div class="flex items-start justify-between">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                                <i data-lucide="unlock" class="w-5 h-5 text-amber-400"></i>
                            </div>
                            <span class="text-xs font-semibold px-2 py-1 rounded bg-amber-900/50 text-amber-300">Medium Risk</span>
                        </div>
                        <div class="mt-4">
                            <h4 class="text-3xl font-bold text-amber-400" id="dg-comp-unencrypted-count">0</h4>
                            <p class="text-sm text-slate-400 mt-1">Unencrypted Storage</p>
                            <p class="text-xs text-slate-500 mt-2 leading-relaxed">Devices reporting BitLocker or FileVault is disabled or not applicable.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-card flex flex-col h-full max-h-[500px]">
                <div class="content-card-header flex-wrap gap-y-2 shrink-0">
                    <h3 class="section-title"><i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i> Devices Requiring Attention</h3>
                    <div class="flex items-center gap-2">
                        <button class="btn-secondary btn-sm flex items-center gap-2" onclick="dgExportCompliance()">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Export
                        </button>
                    </div>
                </div>
                <div class="table-wrapper flex-1 overflow-y-auto">
                    <table class="data-table">
                        <thead class="sticky top-0 bg-surface-900/95 backdrop-blur-sm z-10 shadow-sm shadow-black/20">
                            <tr>
                                <th>Device Name</th>
                                <th>Assigned User</th>
                                <th>OS</th>
                                <th>Issue Identified</th>
                                <th>Last Sync</th>
                            </tr>
                        </thead>
                        <tbody id="dg-comp-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [sec] });
    }

    dgUpdateComplianceData();
}

function dgUpdateComplianceData() {
    const devices = DG.data.devices || [];

    const nonCompliant = devices.filter(d => ['noncompliant', 'gracePeriod'].includes(d.complianceState));
    const unencrypted = devices.filter(d => !d.isEncrypted);
    const atRisk = devices.filter(d => d.defenderStatus === 'atRisk');

    // Update KPI panels
    const ncCountEl = document.getElementById('dg-comp-noncompliant-count');
    if (ncCountEl) ncCountEl.textContent = nonCompliant.length;

    const encCountEl = document.getElementById('dg-comp-unencrypted-count');
    if (encCountEl) encCountEl.textContent = unencrypted.length;

    // Aggregate devices with issues
    const issueMap = new Map();

    devices.forEach(d => {
        let issues = [];
        if (d.complianceState === 'noncompliant') issues.push('Non-compliant');
        if (d.complianceState === 'gracePeriod') issues.push('In Grace Period');
        if (!d.isEncrypted) issues.push('Unencrypted');
        if (d.defenderStatus === 'atRisk') issues.push('Defender At Risk');

        if (issues.length > 0) {
            issueMap.set(d.id, { device: d, issues: issues });
        }
    });

    // Render chart
    dgRenderComplianceChart(devices);

    // Render table
    const tbody = document.getElementById('dg-comp-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (issueMap.size === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-slate-500">No security or compliance issues detected across the fleet.</td></tr>`;
    } else {
        const sortedIssues = Array.from(issueMap.values()).sort((a, b) => b.issues.length - a.issues.length || new Date(b.device.lastSyncDateTime || 0) - new Date(a.device.lastSyncDateTime || 0));

        sortedIssues.forEach(item => {
            const d = item.device;
            let issueHtml = item.issues.map(i => {
                if (i === 'Unencrypted') return `<span class="badge bg-amber-900/40 text-amber-300 border border-amber-800/50">${i}</span>`;
                return `<span class="badge bg-red-900/40 text-red-300 border border-red-800/50">${i}</span>`;
            }).join('<span class="mx-1"></span>');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <span class="font-medium text-slate-200 text-sm">${d.deviceName}</span>
                    <br>
                    <span class="text-xs text-slate-500">${d.manufacturer} ${d.model}</span>
                </td>
                <td>
                    <span class="text-sm">${d.userDisplayName || '—'}</span>
                    <br>
                    <span class="text-xs text-slate-500">${d.userPrincipalName || ''}</span>
                </td>
                <td>${d.operatingSystem} ${d.osVersion}</td>
                <td><div class="flex flex-wrap gap-1">${issueHtml}</div></td>
                <td class="text-slate-400 text-xs">${formatDate(d.lastSyncDateTime)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function dgRenderComplianceChart(devices) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('chart-dg-comp-reasons');
    if (!canvas) return;

    if (window.DG_ChartInstances && window.DG_ChartInstances['dg-comp-reasons']) {
        window.DG_ChartInstances['dg-comp-reasons'].destroy();
    }

    const counts = devices.reduce((acc, d) => {
        const state = d.complianceState || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
    }, {});

    if (!window.DG_ChartInstances) window.DG_ChartInstances = {};

    window.DG_ChartInstances['dg-comp-reasons'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#64748b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 } } }
            }
        }
    });
}

function dgExportCompliance() {
    const devices = DG.data.devices || [];
    const issueDevices = devices.filter(d => d.complianceState !== 'compliant' || !d.isEncrypted || d.defenderStatus === 'atRisk');

    if (!issueDevices.length) return;

    let csv = 'Device Name,OS,User,Compliance State,Encryption State,Defender Status,Last Sync\n';
    issueDevices.forEach(d => {
        csv += `"${d.deviceName || ''}","${d.operatingSystem || ''}","${d.userPrincipalName || ''}","${d.complianceState || ''}","${d.isEncrypted ? 'Encrypted' : 'Unencrypted'}","${d.defenderStatus || ''}","${d.lastSyncDateTime || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intune_compliance_issues_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.dgExportCompliance = dgExportCompliance;

window.dgRenderCompliance = dgRenderCompliance;
