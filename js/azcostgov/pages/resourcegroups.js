/**
 * resourcegroups.js - Renderer for Azure Resource Groups Detail Page
 */

function azRenderResourceGroupsPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-widest">Resource Group Cost Analysis</h2>
            <button onclick="azExportTable('resourceGroups')" class="btn-secondary btn-sm flex items-center gap-2 text-[10px] px-3 py-1.5 h-8">
                <i data-lucide="download" class="w-3 h-3"></i> Export CSV
            </button>
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
                    ${data.resourceGroups.map(rg => `
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
}
window.azRenderResourceGroupsPage = azRenderResourceGroupsPage;
