/**
 * untagged.js - Renderer for Azure Resources without tags with collapsible grouping
 */

function azRenderUntaggedPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    // 1. Group individual untagged resources by Resource Group
    const untaggedResources = data.resourceGroups.filter(res => !res.tags || Object.keys(res.tags).length === 0);

    const rgGroups = {};
    untaggedResources.forEach(res => {
        const rgKey = res.rgName || 'Unknown Group';
        if (!rgGroups[rgKey]) {
            rgGroups[rgKey] = {
                name: rgKey,
                subscription: res.subscription,
                location: res.location,
                cost: 0,
                resources: []
            };
        }
        rgGroups[rgKey].cost += res.cost;
        rgGroups[rgKey].resources.push(res);
    });

    const sortedGroups = Object.values(rgGroups).sort((a, b) => b.cost - a.cost);
    const totalUntaggedCost = sortedGroups.reduce((sum, g) => sum + g.cost, 0);

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="tag-off" class="w-5 h-5 text-amber-400"></i> Untagged Resources
            </h2>
            <button onclick="azExportUntagged()" class="btn-secondary btn-sm flex items-center gap-2 text-[10px] px-3 py-1.5 h-8">
                <i data-lucide="download" class="w-3 h-3"></i> Export CSV
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
                        The following resource groups contain resources with no tags assigned. This can lead to difficulties in cost allocation 
                        and financial accountability.
                    </p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Untagged RGs</p>
                <p class="text-3xl font-black text-white">${sortedGroups.length}</p>
            </div>
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Untagged Items</p>
                <p class="text-3xl font-black text-white">${untaggedResources.length}</p>
            </div>
            <div class="bg-surface-850 border border-surface-700 rounded-2xl p-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Impacted Spend</p>
                <p class="text-3xl font-black text-white">
                    ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(totalUntaggedCost)}
                </p>
            </div>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
            <div class="px-6 py-4 border-b border-surface-800 bg-surface-950/30 flex items-center justify-between">
                <h3 class="text-xs font-bold text-white uppercase tracking-wider">Grouped by Resource Group</h3>
                <span class="text-[10px] text-slate-500">Click a row to expand specific resources</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                            <th class="px-6 py-3 w-10"></th>
                            <th class="px-6 py-3">Resource Group</th>
                            <th class="px-6 py-3">Subscription</th>
                            <th class="px-6 py-3 text-right">Items</th>
                            <th class="px-6 py-3 text-right">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-800">
                        ${sortedGroups.map((group, idx) => {
        const groupId = `untagged-rg-${idx}`;
        return `
                                <tr class="hover:bg-surface-850 transition-colors cursor-pointer group" onclick="azToggleUntaggedGroup('${groupId}')">
                                    <td class="px-6 py-4 text-slate-500 group-hover:text-amber-400 transition-colors">
                                        <i data-lucide="chevron-right" id="${groupId}-icon" class="w-4 h-4 transition-transform duration-200"></i>
                                    </td>
                                    <td class="px-6 py-4 font-bold text-white">${group.name}</td>
                                    <td class="px-6 py-4 text-slate-400 text-xs">${group.subscription}</td>
                                    <td class="px-6 py-4 text-right text-slate-400 font-medium">${group.resources.length}</td>
                                    <td class="px-6 py-4 text-right font-mono text-amber-400 font-bold">
                                        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(group.cost)}
                                    </td>
                                </tr>
                                <tr id="${groupId}" class="hidden bg-surface-950/50">
                                    <td colspan="5" class="px-12 py-4">
                                        <div class="border-l-2 border-surface-700 pl-6 space-y-3">
                                            <div class="grid grid-cols-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pb-2 border-b border-surface-800">
                                                <span>Resource Name</span>
                                                <span>Service Type</span>
                                                <span class="text-right">Individual Cost</span>
                                            </div>
                                            ${group.resources.map(res => `
                                                <div class="grid grid-cols-3 text-xs">
                                                    <span class="text-slate-200 font-medium truncate pr-4" title="${res.name}">${res.name}</span>
                                                    <span class="text-slate-500">${res.service}</span>
                                                    <span class="text-right font-mono text-slate-400">
                                                        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(res.cost)}
                                                    </span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </td>
                                </tr>
                            `;
    }).join('')}
                        ${sortedGroups.length === 0 ? '<tr><td colspan="5" class="px-6 py-12 text-center text-emerald-500 font-bold">Excellent! All resources are tagged.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Toggle individual resource visibility
 */
function azToggleUntaggedGroup(id) {
    const row = document.getElementById(id);
    const icon = document.getElementById(`${id}-icon`);
    if (!row || !icon) return;

    const isHidden = row.classList.contains('hidden');

    // Toggle class
    row.classList.toggle('hidden');

    // Rotate icon
    icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';

    // Optional: add a slight amber glow to active row
    const parentRow = row.previousElementSibling;
    if (parentRow) {
        parentRow.classList.toggle('bg-surface-850', isHidden);
    }
}

/**
 * Export untagged resources to CSV (all of them)
 */
function azExportUntagged() {
    const data = azGetFilteredData();
    const untagged = data.resourceGroups.filter(res => !res.tags || Object.keys(res.tags).length === 0);
    if (!untagged.length) {
        showToast("No untagged resources to export", "info");
        return;
    }

    let csv = "Resource Name,Resource Group,Subscription,Service,Cost\n";
    untagged.forEach(res => {
        csv += `"${res.name}","${res.rgName || 'N/A'}","${res.subscription}","${res.service}",${res.cost}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `azure_untagged_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    showToast("Report exported successfully", "success");
}

window.azRenderUntaggedPage = azRenderUntaggedPage;
window.azToggleUntaggedGroup = azToggleUntaggedGroup;
window.azExportUntagged = azExportUntagged;
