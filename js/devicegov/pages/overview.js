/**
 * devicegov/pages/overview.js – Dashboard views for Device Gov
 */

function dgRenderOverview() {
    const sec = document.getElementById('devicegov-overview');
    if (!sec) return;

    const devices = DG.data.devices || [];
    const total = devices.length;

    // Calculate KPIs
    const compliant = devices.filter(d => d.complianceState === 'compliant').length;
    const nonCompliant = devices.filter(d => ['noncompliant', 'gracePeriod'].includes(d.complianceState)).length;
    const encrypted = devices.filter(d => d.isEncrypted).length;

    // Defender states
    const defenderSecured = devices.filter(d => d.defenderStatus === 'secured').length;
    const defenderAtRisk = devices.filter(d => d.defenderStatus === 'atRisk').length;

    sec.innerHTML = `
        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="kpi-card">
                <div class="kpi-icon bg-cyan-500/15 text-cyan-400"><i data-lucide="monitor-smartphone" class="w-5 h-5"></i></div>
                <div class="kpi-value text-white">${total}</div>
                <div class="kpi-label">Total Devices</div>
            </div>
            <div class="kpi-card ${nonCompliant > 0 ? 'border-red-800/40 bg-red-950/20' : ''}">
                <div class="kpi-icon ${nonCompliant > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}">
                    <i data-lucide="${nonCompliant > 0 ? 'shield-alert' : 'shield-check'}" class="w-5 h-5"></i>
                </div>
                <div class="flex items-end gap-2">
                    <div class="kpi-value ${nonCompliant > 0 ? 'text-red-400' : 'text-emerald-400'}">${nonCompliant}</div>
                    <div class="text-xs text-slate-500 mb-1">non-compliant</div>
                </div>
                <div class="kpi-label whitespace-nowrap overflow-hidden text-ellipsis">${Math.round((compliant / Math.max(1, total)) * 100)}% Compliance Rate</div>
            </div>
            <div class="kpi-card ${total - encrypted > 0 ? 'border-amber-800/40 bg-amber-950/20' : ''}">
                <div class="kpi-icon ${total - encrypted > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}">
                    <i data-lucide="lock" class="w-5 h-5"></i>
                </div>
                <div class="flex items-end gap-2">
                    <div class="kpi-value ${total - encrypted > 0 ? 'text-amber-400' : 'text-emerald-400'}">${total - encrypted}</div>
                    <div class="text-xs text-slate-500 mb-1">unencrypted</div>
                </div>
                <div class="kpi-label">${Math.round((encrypted / Math.max(1, total)) * 100)}% BitLocker Coverage</div>
            </div>
            <div class="kpi-card ${defenderAtRisk > 0 ? 'border-red-800/40 bg-red-950/20' : ''}">
                <div class="kpi-icon ${defenderAtRisk > 0 ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}">
                    <i data-lucide="shield" class="w-5 h-5"></i>
                </div>
                <div class="flex items-end gap-2">
                    <div class="kpi-value ${defenderAtRisk > 0 ? 'text-red-400' : 'text-blue-400'}">${defenderAtRisk}</div>
                    <div class="text-xs text-slate-500 mb-1">at risk</div>
                </div>
                <div class="kpi-label whitespace-nowrap overflow-hidden text-ellipsis">${defenderSecured} Secured endpoints</div>
            </div>
        </div>
        
        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title"><i data-lucide="pie-chart" class="w-4 h-4 text-cyan-400"></i> OS Distribution</h3>
                </div>
                <div class="chart-body flex items-center justify-center"><canvas id="chart-dg-os" class="max-h-64"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title"><i data-lucide="bar-chart-2" class="w-4 h-4 text-cyan-400"></i> Compliance Status by OS</h3>
                </div>
                <div class="chart-body"><canvas id="chart-dg-compliance" class="max-h-64"></canvas></div>
            </div>
        </div>

        <!-- Quick Table: Action Required / Failing Devices -->
        <div class="content-card">
            <div class="content-card-header">
                <h3 class="section-title"><i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i> Action Required (Top Non-Compliant/At Risk Devices)</h3>
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Device Name</th>
                            <th>User</th>
                            <th>OS</th>
                            <th class="text-center">Compliance</th>
                            <th class="text-center">Encryption</th>
                            <th class="text-center">Defender</th>
                            <th>Last Sync</th>
                        </tr>
                    </thead>
                    <tbody id="dg-overview-action-tbody"></tbody>
                </table>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [sec] });

    // Render charts
    dgRenderCharts(devices);

    // Render Quick Table (Top 10 failing/at risk)
    const tbody = document.getElementById('dg-overview-action-tbody');
    if (!tbody) return;

    const failingDevices = devices.filter(d =>
        d.complianceState !== 'compliant' ||
        !d.isEncrypted ||
        d.defenderStatus === 'atRisk'
    ).sort((a, b) => new Date(b.lastSyncDateTime) - new Date(a.lastSyncDateTime)).slice(0, 10);

    if (failingDevices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-500">All devices are compliant and secured.</td></tr>';
    } else {
        failingDevices.forEach(d => {
            const compBadge = d.complianceState === 'compliant' ? '<span class="badge badge-license">Compliant</span>' : `<span class="badge badge-disabled">${d.complianceState}</span>`;
            const encBadge = d.isEncrypted ? '<span class="badge badge-premium">Encrypted</span>' : '<span class="badge badge-disabled">Unencrypted</span>';
            const defBadge = d.defenderStatus === 'secured' ? '<span class="badge badge-license">Secured</span>' : (d.defenderStatus === 'atRisk' ? '<span class="badge badge-disabled">At Risk</span>' : `<span class="badge bg-slate-800 text-slate-400">${d.defenderStatus || 'N/A'}</span>`);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="font-medium text-slate-200 text-sm">${d.deviceName}</span><br><span class="text-xs text-slate-500">${d.manufacturer} ${d.model}</span></td>
                <td><span class="text-sm">${d.userDisplayName || '—'}</span><br><span class="text-xs text-slate-500">${d.userPrincipalName || ''}</span></td>
                <td>${d.operatingSystem} ${d.osVersion}</td>
                <td class="text-center">${compBadge}</td>
                <td class="text-center">${encBadge}</td>
                <td class="text-center">${defBadge}</td>
                <td class="text-slate-400 text-xs">${formatDate(d.lastSyncDateTime)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function dgRenderCharts(devices) {
    if (typeof Chart === 'undefined') return;

    // Default chart configuration (borrowed from LG for consistency)
    const chartDefaults = () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 } } } },
        scales: {
            x: { grid: { color: '#334155', drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { grid: { color: '#334155', drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true }
        }
    });

    const pieDefaults = () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 20, font: { family: "'Inter', sans-serif", size: 12 } } } },
        borderWidth: 0
    });

    // Destroy existing instances if any
    ['dg-os', 'dg-compliance'].forEach(id => {
        if (window.DG_ChartInstances && window.DG_ChartInstances[id]) {
            window.DG_ChartInstances[id].destroy();
        }
    });
    if (!window.DG_ChartInstances) window.DG_ChartInstances = {};

    // 1. OS Distribution Pie Chart
    const osCanvas = document.getElementById('chart-dg-os');
    if (osCanvas) {
        const osCounts = devices.reduce((acc, d) => {
            acc[d.operatingSystem] = (acc[d.operatingSystem] || 0) + 1;
            return acc;
        }, {});

        window.DG_ChartInstances['dg-os'] = new Chart(osCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(osCounts),
                datasets: [{
                    data: Object.values(osCounts),
                    backgroundColor: ['#06b6d4', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#64748b'],
                    hoverOffset: 4
                }]
            },
            options: { ...pieDefaults(), cutout: '70%' }
        });
    }

    // 2. Compliance Status by OS Bar Chart
    const compCanvas = document.getElementById('chart-dg-compliance');
    if (compCanvas) {
        const osLabels = [...new Set(devices.map(d => d.operatingSystem))];
        const compliantData = osLabels.map(os => devices.filter(d => d.operatingSystem === os && d.complianceState === 'compliant').length);
        const nonCompliantData = osLabels.map(os => devices.filter(d => d.operatingSystem === os && d.complianceState !== 'compliant').length);

        window.DG_ChartInstances['dg-compliance'] = new Chart(compCanvas, {
            type: 'bar',
            data: {
                labels: osLabels,
                datasets: [
                    { label: 'Compliant', data: compliantData, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'Non-Compliant/Other', data: nonCompliantData, backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: {
                ...chartDefaults(),
                scales: {
                    x: { ...chartDefaults().scales.x, stacked: true },
                    y: { ...chartDefaults().scales.y, stacked: true }
                }
            }
        });
    }
}

window.dgRenderOverview = dgRenderOverview;
