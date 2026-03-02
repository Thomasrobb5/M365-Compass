/**
 * resourcegroups.js - Renderer for Azure Resource Groups Detail Page
 */

function azRenderResourceGroupsPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="box" class="w-5 h-5 text-amber-400"></i> Resource Group Cost Analysis
            </h2>
            <button onclick="azExportTable('resourceGroups')" class="btn-secondary btn-sm flex items-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> Export CSV
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm">
                <h3 class="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Top Resource Groups by Cost</h3>
                <div class="h-64 relative">
                    <canvas id="az-chart-rg-bars"></canvas>
                </div>
            </div>
            <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm flex flex-col justify-center text-center">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Resource Groups</p>
                <p class="text-4xl font-black text-white">${data.resourceGroups.length}</p>
                <div class="mt-4 pt-4 border-t border-surface-800">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Spend / RG</p>
                    <p class="text-2xl font-bold text-slate-300">
                        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.resourceGroups.length > 0 ? data.totalCost / data.resourceGroups.length : 0)}
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-left text-sm">
                <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="px-6 py-4">Resource Group</th>
                        <th class="px-6 py-4">Subscription</th>
                        <th class="px-6 py-4">Service Type</th>
                        <th class="px-6 py-4">Location</th>
                        <th class="px-6 py-4 text-right">Cost</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                    ${data.resourceGroups.sort((a, b) => b.cost - a.cost).map(rg => `
                        <tr class="hover:bg-surface-850 transition-colors">
                            <td class="px-6 py-4 font-bold text-white">${rg.name}</td>
                            <td class="px-6 py-4 text-slate-400 text-xs">${rg.subscription}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 bg-surface-800 border border-surface-700 rounded text-[10px] text-slate-300">
                                    ${rg.service}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-slate-500 text-xs">${rg.location}</td>
                            <td class="px-6 py-4 text-right font-mono text-amber-400 font-bold">
                                ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(rg.cost)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderRgChart(data.resourceGroups);
}

let azRgChart = null;
function renderRgChart(rgs) {
    const ctx = document.getElementById('az-chart-rg-bars');
    if (!ctx) return;

    if (azRgChart) azRgChart.destroy();

    const displayRgs = rgs.sort((a, b) => b.cost - a.cost).slice(0, 10);

    azRgChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayRgs.map(rg => rg.name),
            datasets: [{
                label: 'Cost',
                data: displayRgs.map(rg => rg.cost),
                backgroundColor: '#f59e0b',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(71, 85, 105, 0.1)' },
                    ticks: { color: '#64748b', font: { size: 10 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10 } }
                }
            }
        }
    });
}

window.azRenderResourceGroupsPage = azRenderResourceGroupsPage;
