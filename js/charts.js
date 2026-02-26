/**
 * charts.js – Chart.js chart definitions and render helpers
 */

const CHART_COLORS = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];
const CHART_COLORS_ALPHA = CHART_COLORS.map(c => c + '33');

function isDark() { return document.documentElement.classList.contains('dark'); }

function chartDefaults() {
    return {
        plugins: {
            legend: { labels: { color: isDark() ? '#94a3b8' : '#334155', font: { family: 'system-ui', size: 12 }, padding: 16 } },
            tooltip: {
                backgroundColor: isDark() ? '#1e293b' : '#fff',
                titleColor: isDark() ? '#e2e8f0' : '#1e293b',
                bodyColor: isDark() ? '#94a3b8' : '#475569',
                borderColor: isDark() ? '#334155' : '#e2e8f0',
                borderWidth: 1, padding: 10, cornerRadius: 8,
            }
        },
        scales: {
            x: { ticks: { color: isDark() ? '#64748b' : '#94a3b8', font: { size: 11 } }, grid: { color: isDark() ? '#1e293b' : '#f1f5f9' } },
            y: { ticks: { color: isDark() ? '#64748b' : '#94a3b8', font: { size: 11 } }, grid: { color: isDark() ? '#1e293b' : '#f1f5f9' } }
        },
        animation: { duration: 500, easing: 'easeOutQuart' },
        responsive: true, maintainAspectRatio: false,
    };
}

function destroyChart(id) {
    if (LG.chartInstances[id]) { LG.chartInstances[id].destroy(); delete LG.chartInstances[id]; }
}

// ── License Distribution Donut ────────────────────────────────────────────
function renderLicenseDistChart(skus) {
    destroyChart('license-dist');
    const canvas = document.getElementById('chart-license-dist');
    if (!canvas) return;
    const data = skus.filter(s => s.consumedUnits > 0);
    LG.chartInstances['license-dist'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: data.map(s => getSkuName(s.skuId, s.skuPartNumber)),
            datasets: [{ data: data.map(s => s.consumedUnits), backgroundColor: CHART_COLORS, borderColor: isDark() ? '#0f172a' : '#fff', borderWidth: 3, hoverOffset: 6 }]
        },
        options: {
            ...chartDefaults(),
            cutout: '68%',
            plugins: { ...chartDefaults().plugins, legend: { position: 'right', ...chartDefaults().plugins.legend } },
            scales: {}
        }
    });
}

// ── Under-utilized Bar Chart ──────────────────────────────────────────────
function renderUnderutilizedChart(skus) {
    destroyChart('underutilized');
    const canvas = document.getElementById('chart-underutilized');
    if (!canvas) return;
    const sorted = [...skus]
        .filter(s => s.prepaidUnits?.enabled > 0)
        .map(s => ({ name: getSkuName(s.skuId, s.skuPartNumber), pct: Math.round((s.consumedUnits / s.prepaidUnits.enabled) * 100) }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 6);

    LG.chartInstances['underutilized'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.name.length > 22 ? s.name.slice(0, 22) + '...' : s.name),
            datasets: [{
                label: '% Utilized',
                data: sorted.map(s => s.pct),
                backgroundColor: sorted.map(s => s.pct < 50 ? '#ef444488' : s.pct < 75 ? '#f59e0b88' : '#10b98188'),
                borderColor: sorted.map(s => s.pct < 50 ? '#ef4444' : s.pct < 75 ? '#f59e0b' : '#10b981'),
                borderWidth: 1, borderRadius: 4,
            }]
        },
        options: {
            ...chartDefaults(),
            indexAxis: 'y',
            scales: {
                x: { ...chartDefaults().scales.x, min: 0, max: 100, ticks: { ...chartDefaults().scales.x.ticks, callback: v => v + '%' } },
                y: { ...chartDefaults().scales.y }
            },
            plugins: { ...chartDefaults().plugins, legend: { display: false } }
        }
    });
}

// ── Sign-in Activity Line Chart ───────────────────────────────────────────
function renderSigninActivityChart(users) {
    destroyChart('signin-activity');
    const canvas = document.getElementById('chart-signin-activity');
    if (!canvas) return;

    const days = 30;
    const now = Date.now();
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        buckets[key] = 0;
    }
    users.forEach(u => {
        if (!u._lastSignIn) return;
        const d = new Date(u._lastSignIn);
        const daysAgo = Math.floor((now - d.getTime()) / 86400000);
        if (daysAgo < days) {
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            if (key in buckets) buckets[key]++;
        }
    });

    LG.chartInstances['signin-activity'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: Object.keys(buckets),
            datasets: [{
                label: 'Sign-ins',
                data: Object.values(buckets),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderWidth: 2, fill: true, tension: 0.4,
                pointRadius: 2, pointHoverRadius: 5, pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            ...chartDefaults(),
            plugins: { ...chartDefaults().plugins, legend: { display: false } }
        }
    });
}

// ── Active vs Inactive Pie ────────────────────────────────────────────────
function renderActiveInactiveChart(users, days) {
    destroyChart('active-inactive');
    const canvas = document.getElementById('chart-active-inactive');
    if (!canvas) return;
    const licensed = users.filter(u => u._isLicensed);
    const inactive = licensed.filter(u => u._daysInactive === null || u._daysInactive >= days);
    const active = licensed.length - inactive.length;
    LG.chartInstances['active-inactive'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Inactive'],
            datasets: [{
                data: [active, inactive.length],
                backgroundColor: ['#10b98166', '#ef444466'],
                borderColor: ['#10b981', '#ef4444'],
                borderWidth: 2, hoverOffset: 6
            }]
        },
        options: {
            ...chartDefaults(),
            cutout: '65%',
            plugins: { ...chartDefaults().plugins, legend: { position: 'bottom', ...chartDefaults().plugins.legend } },
            scales: {}
        }
    });
}

// ── Device Charts ─────────────────────────────────────────────────────────
function renderDeviceCharts(users) {
    // Top Devices Bar
    destroyChart('devices');
    const canvas1 = document.getElementById('chart-devices');
    if (canvas1) {
        const deviceCounts = {};
        users.forEach(u => {
            const d = u._lastDevice || 'Unknown';
            deviceCounts[d] = (deviceCounts[d] || 0) + 1;
        });
        const sorted = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        LG.chartInstances['devices'] = new Chart(canvas1, {
            type: 'bar',
            data: {
                labels: sorted.map(x => x[0]),
                datasets: [{ label: 'Users', data: sorted.map(x => x[1]), backgroundColor: CHART_COLORS, borderRadius: 4 }]
            },
            options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, legend: { display: false } } }
        });
    }

    // OS Donut
    destroyChart('os');
    const canvas2 = document.getElementById('chart-os');
    if (canvas2) {
        const osCounts = { Windows: 0, Mac: 0, iOS: 0, Android: 0, Other: 0 };
        users.forEach(u => {
            const d = (u._lastDevice || '').toLowerCase();
            if (d.includes('windows') || d === 'windows') osCounts.Windows++;
            else if (d.includes('mac') || d === 'mac') osCounts.Mac++;
            else if (d.includes('iphone') || d.includes('ipad') || d.includes('ios')) osCounts.iOS++;
            else if (d.includes('android')) osCounts.Android++;
            else osCounts.Other++;
        });
        const filtered = Object.entries(osCounts).filter(x => x[1] > 0);
        LG.chartInstances['os'] = new Chart(canvas2, {
            type: 'doughnut',
            data: {
                labels: filtered.map(x => x[0]),
                datasets: [{ data: filtered.map(x => x[1]), backgroundColor: CHART_COLORS, borderColor: isDark() ? '#0f172a' : '#fff', borderWidth: 2, hoverOffset: 4 }]
            },
            options: {
                ...chartDefaults(),
                cutout: '60%',
                plugins: { ...chartDefaults().plugins, legend: { position: 'bottom', ...chartDefaults().plugins.legend } },
                scales: {}
            }
        });
    }
}

// ── Department Cost Breakdown ─────────────────────────────────────────────
function renderDeptCostChart(users) {
    destroyChart('dept-cost');
    const canvas = document.getElementById('chart-dept-cost');
    if (!canvas) return;

    const deptMap = {};
    users.filter(u => u._isLicensed && u.department).forEach(u => {
        deptMap[u.department] = (deptMap[u.department] || 0) + u._monthlyCost;
    });
    const sorted = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);

    LG.chartInstances['dept-cost'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: '$/month',
                data: sorted.map(x => parseFloat(x[1].toFixed(2))),
                backgroundColor: CHART_COLORS.map(c => c + 'bb'),
                borderColor: CHART_COLORS,
                borderWidth: 1, borderRadius: 4,
            }]
        },
        options: {
            ...chartDefaults(),
            indexAxis: 'y',
            plugins: {
                ...chartDefaults().plugins,
                legend: { display: false },
                tooltip: {
                    ...chartDefaults().plugins.tooltip,
                    callbacks: { label: ctx => ' $' + ctx.raw.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '/mo' }
                }
            },
            scales: {
                x: { ...chartDefaults().scales.x, ticks: { ...chartDefaults().scales.x.ticks, callback: v => '$' + v } },
                y: { ...chartDefaults().scales.y }
            }
        }
    });
}

// ── Licence Trend Over Time ───────────────────────────────────────────────
function renderLicenceTrendChart(snapshots) {
    destroyChart('lic-trend');
    const canvas = document.getElementById('chart-lic-trend');
    if (!canvas || !snapshots.length) return;

    // Collect unique SKU names across all snapshots
    const skuNames = [...new Set(snapshots.flatMap(s => s.skus.map(sk => sk.name)))];
    const labels = snapshots.map(s => {
        const d = new Date(s.date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const datasets = skuNames.slice(0, 6).map((name, i) => ({
        label: name.length > 22 ? name.slice(0, 22) + '\u2026' : name,
        data: snapshots.map(s => {
            const sku = s.skus.find(sk => sk.name === name);
            return sku ? sku.assigned : null;
        }),
        borderColor: CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '22',
        borderWidth: 2, fill: false, tension: 0.3,
        pointRadius: 3, pointHoverRadius: 5,
        spanGaps: true,
    }));

    LG.chartInstances['lic-trend'] = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
            ...chartDefaults(),
            plugins: {
                ...chartDefaults().plugins,
                legend: { ...chartDefaults().plugins.legend, position: 'bottom' }
            }
        }
    });
}

// ── Activity Heatmap (day of week) ────────────────────────────────────────
function renderActivityHeatmapChart(users) {
    destroyChart('activity-heatmap');
    const canvas = document.getElementById('chart-activity-heatmap');
    if (!canvas) return;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    users.forEach(u => {
        if (!u._lastSignIn) return;
        const dow = new Date(u._lastSignIn).getDay();
        counts[dow]++;
    });

    // Rotate so Mon is first
    const rotatedLabels = [...days.slice(1), days[0]];
    const rotatedCounts = [...counts.slice(1), counts[0]];

    const maxVal = Math.max(...rotatedCounts, 1);
    const bgColors = rotatedCounts.map(v => {
        const intensity = v / maxVal;
        return intensity > 0.7 ? '#3b82f6cc' : intensity > 0.4 ? '#3b82f688' : '#3b82f633';
    });

    LG.chartInstances['activity-heatmap'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: rotatedLabels,
            datasets: [{
                label: 'Sign-ins',
                data: rotatedCounts,
                backgroundColor: bgColors,
                borderColor: '#3b82f6',
                borderWidth: 1, borderRadius: 4,
            }]
        },
        options: {
            ...chartDefaults(),
            plugins: {
                ...chartDefaults().plugins,
                legend: { display: false },
                tooltip: { ...chartDefaults().plugins.tooltip, callbacks: { label: ctx => ` ${ctx.raw} users` } }
            }
        }
    });
}

window.renderLicenseDistChart = renderLicenseDistChart;
window.renderUnderutilizedChart = renderUnderutilizedChart;
window.renderSigninActivityChart = renderSigninActivityChart;
window.renderActiveInactiveChart = renderActiveInactiveChart;
window.renderDeviceCharts = renderDeviceCharts;
window.renderDeptCostChart = renderDeptCostChart;
window.renderLicenceTrendChart = renderLicenceTrendChart;
window.renderActivityHeatmapChart = renderActivityHeatmapChart;
