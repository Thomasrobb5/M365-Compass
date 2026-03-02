/**
 * tags.js - Renderer for Azure Costs by Tag
 */

function azRenderTagsPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    // Aggregate tags
    const tagMap = {};
    data.resourceGroups.forEach(rg => {
        if (rg.tags && Object.keys(rg.tags).length > 0) {
            Object.entries(rg.tags).forEach(([key, val]) => {
                const tagKey = `${key}: ${val}`;
                if (!tagMap[tagKey]) tagMap[tagKey] = { name: tagKey, cost: 0, count: 0, key, val };
                tagMap[tagKey].cost += rg.cost;
                tagMap[tagKey].count += 1;
            });
        }
    });

    const sortedTags = Object.values(tagMap).sort((a, b) => b.cost - a.cost);

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="tag" class="w-5 h-5 text-blue-400"></i> Costs by Azure Tag
            </h2>
            <button onclick="azExportTable('tags')" class="btn-secondary btn-sm flex items-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> Export CSV
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm">
                <h3 class="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Top Tags by Cost</h3>
                <div class="h-64 relative">
                    <canvas id="az-chart-tags"></canvas>
                </div>
            </div>
            <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                <div class="text-center">
                    <p class="text-sm text-slate-400 mb-1">Total Tagged Spend</p>
                    <p class="text-4xl font-black text-white">
                        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(sortedTags.reduce((sum, t) => sum + t.cost, 0))}
                    </p>
                    <p class="text-xs text-slate-500 mt-2">Aggregated across ${sortedTags.length} unique tag permutations</p>
                </div>
            </div>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-left text-sm">
                <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="px-6 py-3">Tag Key: Value</th>
                        <th class="px-6 py-3 text-right">Total Cost</th>
                        <th class="px-6 py-3 text-right">Resource Count</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                    ${sortedTags.map(tag => `
                        <tr class="hover:bg-surface-850 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">${tag.key}</span>
                                    <span class="text-white font-medium">${tag.val}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-right font-mono text-slate-300">
                                ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(tag.cost)}
                            </td>
                            <td class="px-6 py-4 text-right text-slate-400">
                                ${tag.count}
                            </td>
                        </tr>
                    `).join('')}
                    ${sortedTags.length === 0 ? '<tr><td colspan="3" class="px-6 py-12 text-center text-slate-500">No tagged resources found</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderTagChart(sortedTags);
}

let azTagChart = null;
function renderTagChart(tags) {
    const ctx = document.getElementById('az-chart-tags');
    if (!ctx) return;

    if (azTagChart) azTagChart.destroy();

    const displayTags = tags.slice(0, 10);

    azTagChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayTags.map(t => t.name),
            datasets: [{
                label: 'Cost',
                data: displayTags.map(t => t.cost),
                backgroundColor: '#3b82f6',
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

window.azRenderTagsPage = azRenderTagsPage;
