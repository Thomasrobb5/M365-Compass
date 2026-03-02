/**
 * untagged.js - Renderer for Azure Resources without tags
 */

function azRenderUntaggedPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    // Find untagged resource groups
    const untaggedRGs = data.resourceGroups.filter(rg => !rg.tags || Object.keys(rg.tags).length === 0);
    const sortedUntagged = untaggedRGs.sort((a, b) => b.cost - a.cost);
    const totalUntaggedCost = sortedUntagged.reduce((sum, rg) => sum + rg.cost, 0);

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="tag-off" class="w-5 h-5 text-amber-400"></i> Untagged Resources
            </h2>
            <button onclick="azExportUntagged()" class="btn-secondary btn-sm flex items-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> Export CSV
            </button>
        </div>

        <div class="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-6">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-white font-bold mb-1">Governance Warning</h3>
                    <p class="text-sm text-slate-400 leading-relaxed">
                        The following resource groups have no tags assigned. This can lead to difficulties in cost allocation, 
                        auditing, and financial accountability. We recommend implementing an Azure Policy to enforce mandatory tagging.
                    </p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Untagged Count</p>
                <p class="text-3xl font-black text-white">${sortedUntagged.length}</p>
                <p class="text-xs text-slate-500 mt-1">Resource Groups</p>
            </div>
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Untagged Spend</p>
                <p class="text-3xl font-black text-white">
                    ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(totalUntaggedCost)}
                </p>
                <p class="text-xs text-slate-500 mt-1">Total for current month</p>
            </div>
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">% of Total Spend</p>
                <p class="text-3xl font-black text-white">
                    ${data.totalCost > 0 ? ((totalUntaggedCost / data.totalCost) * 100).toFixed(1) : 0}%
                </p>
                <p class="text-xs text-slate-500 mt-1">Relative to filtered total</p>
            </div>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
            <div class="px-6 py-4 border-b border-surface-800 bg-surface-950/30">
                <h3 class="text-xs font-bold text-white uppercase tracking-wider">Resources Requiring Attention</h3>
            </div>
            <table class="w-full text-left text-sm">
                <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="px-6 py-3">Resource Name</th>
                        <th class="px-6 py-3">Resource Group</th>
                        <th class="px-6 py-3">Subscription</th>
                        <th class="px-6 py-3 text-right">Cost</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                    ${sortedUntagged.map(rg => `
                        <tr class="hover:bg-surface-850 transition-colors">
                            <td class="px-6 py-4 font-bold text-white truncate max-w-[200px]" title="${rg.name}">${rg.name}</td>
                            <td class="px-6 py-4 text-slate-400 text-xs">${rg.rgName || 'N/A'}</td>
                            <td class="px-6 py-4 text-slate-400 text-xs">${rg.subscription}</td>
                            <td class="px-6 py-4 text-right font-mono text-amber-400 font-bold">
                                ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(rg.cost)}
                            </td>
                        </tr>
                    `).join('')}
                    ${sortedUntagged.length === 0 ? '<tr><td colspan="4" class="px-6 py-12 text-center text-emerald-500 font-bold">Excellent! All resources are tagged.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Export untagged resources to CSV
 */
function azExportUntagged() {
    const data = azGetFilteredData();
    const untagged = data.resourceGroups.filter(rg => !rg.tags || Object.keys(rg.tags).length === 0);
    if (!untagged.length) return;

    let csv = "Resource Group,Subscription,Location,Cost\n";
    untagged.forEach(rg => {
        csv += `"${rg.name}","${rg.subscription}","${rg.location}",${rg.cost}\n`;
    });

    const link = document.createElement("a");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `azure_untagged_resources_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    showToast("Untagged resources exported", "success");
}

window.azRenderUntaggedPage = azRenderUntaggedPage;
window.azExportUntagged = azExportUntagged;
