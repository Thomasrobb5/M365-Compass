/**
 * overview.js - Renderer for Azure Cost Overview
 */

function azRenderOverviewPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();
    const totalCostStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.totalCost);

    // Prepare Grouped Data for Toggle-able Table
    let tableTitle = "Top Resource Groups";
    let tableType = "resourceGroups";
    let groupHeader = "Resource Group";
    let secondaryHeader = "Location";
    let tableRows = [];

    if (data.viewBy === 'tags') {
        tableTitle = "Cost by Azure Tags";
        tableType = "tags";
        groupHeader = "Tag (Key: Value)";
        secondaryHeader = "Count";

        // Aggregate tags
        const tagMap = {};
        data.resourceGroups.forEach(rg => {
            if (rg.tags) {
                Object.entries(rg.tags).forEach(([key, val]) => {
                    const tagKey = `${key}: ${val}`;
                    if (!tagMap[tagKey]) tagMap[tagKey] = { name: tagKey, cost: 0, count: 0 };
                    tagMap[tagKey].cost += rg.cost;
                    tagMap[tagKey].count += 1;
                });
            }
        });
        tableRows = Object.values(tagMap).sort((a, b) => b.cost - a.cost);
    } else {
        // Aggregate resources back to RGs for this specific table
        const rgMap = {};
        data.resourceGroups.forEach(res => {
            const key = res.rgName || res.name;
            if (!rgMap[key]) {
                rgMap[key] = {
                    name: key,
                    cost: 0,
                    location: res.location,
                    service: res.service,
                    subscription: res.subscription
                };
            }
            rgMap[key].cost += res.cost;
        });
        tableRows = Object.values(rgMap).sort((a, b) => b.cost - a.cost);
    }

    container.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-widest">Financial Summary</h2>
            <div class="flex items-center gap-2">
                <button onclick="azExportSummary()" class="btn-secondary btn-sm flex items-center gap-2 text-[10px] px-3 py-1.5 h-8">
                    <i data-lucide="download" class="w-3 h-3"></i> Export Summary
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <i data-lucide="banknote" class="w-5 h-5"></i>
                    </div>
                </div>
                <h3 class="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Monthly Spend</h3>
                <p class="text-4xl font-black text-white">${totalCostStr}</p>
                <div class="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/5 py-1 px-2.5 rounded-lg border border-emerald-500/20 w-fit">
                    <i data-lucide="trending-down" class="w-3 h-3"></i>
                    <span>Optimized - No Waste</span>
                </div>
            </div>

            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                        <i data-lucide="layers" class="w-5 h-5"></i>
                    </div>
                </div>
                <h3 class="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Subscriptions</h3>
                <p class="text-4xl font-black text-white">${data.subscriptions.length}</p>
                <p class="text-xs text-slate-500 mt-1">Filtered Inventory</p>
            </div>

            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <i data-lucide="box" class="w-5 h-5"></i>
                    </div>
                </div>
                <h3 class="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Resource Groups</h3>
                <p class="text-4xl font-black text-white">${data.resourceGroups.length}</p>
                <p class="text-xs text-slate-500 mt-1">Filtered Resources</p>
            </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i data-lucide="trending-up" class="w-4 h-4 text-blue-400"></i> Spending Trend (6 Months)
                    </h3>
                </div>
                <div class="h-64 relative">
                    <canvas id="az-chart-trend"></canvas>
                </div>
            </div>
            <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i data-lucide="pie-chart" class="w-4 h-4 text-violet-400"></i> Service Distribution
                    </h3>
                </div>
                <div class="h-64 relative">
                    <canvas id="az-chart-services"></canvas>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
                <div class="px-6 py-5 border-b border-surface-800 flex items-center justify-between">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="list" class="w-4 h-4 text-blue-400"></i> Subscription Breakdown
                    </h3>
                    <button onclick="azExportTable('subscriptions')" class="btn-secondary btn-sm text-[10px] px-2 py-1 h-7">
                        <i data-lucide="download" class="w-3 h-3"></i> CSV
                    </button>
                </div>
                <div class="p-0">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th class="px-6 py-3">Subscription Name</th>
                                <th class="px-6 py-3 text-right">Cost</th>
                                <th class="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-surface-800">
                            ${data.subscriptions.map(sub => `
                                <tr class="hover:bg-surface-850 transition-colors">
                                    <td class="px-6 py-4 font-bold text-white">${sub.name}</td>
                                    <td class="px-6 py-4 text-right font-mono text-slate-300">
                                        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(sub.cost)}
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-black ${sub.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">
                                            ${sub.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
                <div class="px-6 py-5 border-b border-surface-800 flex items-center justify-between">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <i data-lucide="bar-chart-2" class="w-4 h-4 text-amber-400"></i> ${tableTitle}
                    </h3>
                    <button onclick="azExportTable('${tableType}')" class="btn-secondary btn-sm text-[10px] px-2 py-1 h-7">
                        <i data-lucide="download" class="w-3 h-3"></i> CSV
                    </button>
                </div>
                <div class="p-0">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th class="px-6 py-3">${groupHeader}</th>
                                <th class="px-6 py-3 text-right">Cost</th>
                                <th class="px-6 py-3 text-right">${secondaryHeader}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-surface-800">
                            ${tableRows.map(row => `
                                <tr class="hover:bg-surface-850 transition-colors">
                                    <td class="px-6 py-4 font-bold text-white">${row.name}</td>
                                    <td class="px-6 py-4 text-right font-mono text-slate-300">
                                        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(row.cost)}
                                    </td>
                                    <td class="px-6 py-4 text-slate-500 text-xs text-right">
                                        <div class="flex flex-col items-end">
                                            <span class="text-slate-300 font-medium">${data.viewBy === 'tags' ? row.count : row.location}</span>
                                            <span class="text-[10px] opacity-60">${data.viewBy === 'tags' ? 'Resources' : row.service}</span>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Initialize Charts
    renderAzCharts(data);
}

/**
 * Initialize Chart.js spending charts
 */
let azTrendChart = null;
let azServiceChart = null;

function renderAzCharts(filteredData) {
    const data = filteredData || AZG.data;

    // Service Distribution calculation based on filtered RGs
    const serviceDistribution = {};
    data.resourceGroups.forEach(rg => {
        if (!serviceDistribution[rg.service]) serviceDistribution[rg.service] = 0;
        serviceDistribution[rg.service] += rg.cost;
    });

    const serviceLabels = Object.keys(serviceDistribution);
    const serviceCosts = Object.values(serviceDistribution);

    // Get the global history for the trend chart (as trend is usually across all)
    // or use filtered data history if we want to be subscription-specific
    const historyData = AZG.data.history || [];
    if (!historyData.length) return;

    // Spending Trend Chart
    const trendCtx = document.getElementById('az-chart-trend');
    if (trendCtx) {
        if (azTrendChart) azTrendChart.destroy();
        azTrendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: historyData.map(h => h.month),
                datasets: [{
                    label: 'Monthly Cost',
                    data: historyData.map(h => h.cost),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        titleColor: '#94a3b8',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => ` Cost: $${context.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(71, 85, 105, 0.1)' },
                        ticks: {
                            color: '#64748b',
                            font: { size: 10 },
                            callback: (value) => '$' + value
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 10 } }
                    }
                }
            }
        });
    }

    // Service Distribution Chart
    const serviceCtx = document.getElementById('az-chart-services');
    if (serviceCtx) {
        if (azServiceChart) azServiceChart.destroy();
        azServiceChart = new Chart(serviceCtx, {
            type: 'doughnut',
            data: {
                labels: serviceLabels,
                datasets: [{
                    data: serviceCosts,
                    backgroundColor: [
                        '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
                        '#ef4444', '#06b6d4', '#ec4899', '#6366f1',
                        '#f97316', '#22c55e', '#a855f7', '#14b8a6'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 10 },
                            usePointStyle: true,
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => ` ${context.label}: $${context.parsed.toFixed(2)}`
                        }
                    }
                }
            }
        });
    }
}
window.azRenderOverviewPage = azRenderOverviewPage;
