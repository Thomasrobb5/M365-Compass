/**
 * subscriptions.js - Renderer for Azure Subscriptions Detail Page
 */

function azRenderSubscriptionsPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-widest">Subscription Inventory</h2>
            <button onclick="azExportTable('subscriptions')" class="btn-secondary btn-sm flex items-center gap-2 text-[10px] px-3 py-1.5 h-8">
                <i data-lucide="download" class="w-3 h-3"></i> Export CSV
            </button>
        </div>

        <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm">
            <table class="w-full text-left text-sm">
                <thead class="bg-surface-950 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="px-6 py-4">Subscription ID</th>
                        <th class="px-6 py-4">Name</th>
                        <th class="px-6 py-4 text-right">Monthly Cost</th>
                        <th class="px-6 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-800">
                    ${data.subscriptions.map(sub => `
                        <tr class="hover:bg-surface-850 transition-colors">
                            <td class="px-6 py-4 font-mono text-[10px] text-slate-500">${sub.id}</td>
                            <td class="px-6 py-4 font-bold text-white">${sub.name}</td>
                            <td class="px-6 py-4 text-right font-mono text-blue-400 font-bold">
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
        
        <div class="mt-6 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <div class="flex gap-4">
                <div class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    <i data-lucide="info" class="w-5 h-5"></i>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-white mb-1">Subscription Billing</h4>
                    <p class="text-xs text-slate-400 leading-relaxed">
                        Costs shown are for the current billing period. Subscription status is synced with Azure Resource Manager.
                        Billing data is updated every 24 hours.
                    </p>
                </div>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.azRenderSubscriptionsPage = azRenderSubscriptionsPage;
