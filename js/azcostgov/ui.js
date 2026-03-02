/**
 * ui.js - Azure Cost Module UI entry point and state management
 */

let azCurrentPage = 'azcostgov-overview';
let azFilters = {
    subscriptions: [], // Empty means all
    viewBy: 'resourceGroups' // 'resourceGroups' or 'tags'
};

const AZ_PAGE_META = {
    'azcostgov-overview': { title: 'Azure Cost Overview', subtitle: 'Spending across all subscriptions' },
    'azcostgov-subscriptions': { title: 'Subscriptions', subtitle: 'Costs broken down by subscription' },
    'azcostgov-resourcegroups': { title: 'Resource Groups', subtitle: 'Costs broken down by resource group' },
    'azcostgov-explorer': { title: 'Resource Explorer', subtitle: 'Hierarchical view of all Azure assets' },
    'azcostgov-tags': { title: 'Costs by Tag', subtitle: 'Aggregation by Azure resource tags' },
    'azcostgov-untagged': { title: 'Untagged Resources', subtitle: 'Resource groups without any tags' }
};

/**
 * Navigate to a page within the Azure Cost module
 */
function azNavigateTo(page) {
    if (!AZ_PAGE_META[page]) return;
    azCurrentPage = page;

    // Update sidebar nav items
    document.querySelectorAll('#azcostgov-sidebar .nav-item[data-page]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update headers
    const meta = AZ_PAGE_META[page];
    document.getElementById('azcostgov-page-title').textContent = meta.title;
    document.getElementById('azcostgov-page-subtitle').textContent = meta.subtitle;

    // Update Filter Bar visibility (only for overview)
    const filterBar = document.getElementById('azcostgov-filter-bar');
    if (page === 'azcostgov-overview') {
        filterBar.classList.remove('hidden');
        azRenderFilterBar();
    } else {
        filterBar.classList.add('hidden');
    }

    // Dispatch to renderer
    azRenderPage(page);
}
window.azNavigateTo = azNavigateTo;

/**
 * Initialize the Azure Cost UI
 */
function azInitUI() {
    console.log("Initializing Azure Cost UI...");
    azRenderFilterBar();
    azRenderPage(azCurrentPage);
    lucide.createIcons();
}
window.azInitUI = azInitUI;

/**
 * Render the top filter bar
 */
function azRenderFilterBar() {
    const filterBar = document.getElementById('azcostgov-filter-bar');
    if (!filterBar) return;

    const subs = AZG.data.subscriptions || [];
    const viewBy = azFilters.viewBy;

    filterBar.innerHTML = `
        <div class="flex items-center gap-3 mr-auto">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter By Subscriptions:</span>
            <div class="flex flex-wrap gap-2">
                <button onclick="azToggleSubscriptionFilter('all')" 
                    class="px-3 py-1 rounded-full text-[10px] font-bold transition-all ${azFilters.subscriptions.length === 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-surface-800 text-slate-500 border border-surface-700 hover:text-slate-300'}">
                    All
                </button>
                ${subs.map(sub => `
                    <button onclick="azToggleSubscriptionFilter('${sub.name}')"
                        class="px-3 py-1 rounded-full text-[10px] font-bold transition-all ${azFilters.subscriptions.includes(sub.name) ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-surface-800 text-slate-500 border border-surface-700 hover:text-slate-300'}">
                        ${sub.name}
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="flex items-center gap-3">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Group By:</span>
            <div class="bg-surface-800 p-1 rounded-lg border border-surface-700 flex gap-1">
                <button onclick="azSetViewBy('resourceGroups')" 
                    class="px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewBy === 'resourceGroups' ? 'bg-surface-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}">
                    Resource Groups
                </button>
                <button onclick="azSetViewBy('tags')" 
                    class="px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewBy === 'tags' ? 'bg-surface-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}">
                    Azure Tags
                </button>
            </div>
        </div>
    `;
}

function azToggleSubscriptionFilter(subName) {
    if (subName === 'all') {
        azFilters.subscriptions = [];
    } else {
        const index = azFilters.subscriptions.indexOf(subName);
        if (index > -1) {
            azFilters.subscriptions.splice(index, 1);
        } else {
            azFilters.subscriptions.push(subName);
        }
    }
    azRenderFilterBar();
    azRenderPage(azCurrentPage);
}
window.azToggleSubscriptionFilter = azToggleSubscriptionFilter;

function azSetViewBy(view) {
    azFilters.viewBy = view;
    azRenderFilterBar();
    azRenderPage(azCurrentPage);
}
window.azSetViewBy = azSetViewBy;

/**
 * Get filtered data based on current state
 */
function azGetFilteredData() {
    let rgs = AZG.data.resourceGroups || [];
    let subs = AZG.data.subscriptions || [];

    // Filter by subscription
    if (azFilters.subscriptions.length > 0) {
        rgs = rgs.filter(rg => azFilters.subscriptions.includes(rg.subscription));
        subs = subs.filter(sub => azFilters.subscriptions.includes(sub.name));
    }

    // Calculate total
    const total = subs.reduce((sum, s) => sum + s.cost, 0);

    return {
        resourceGroups: rgs,
        subscriptions: subs,
        totalCost: total,
        currency: AZG.data.currency,
        viewBy: azFilters.viewBy
    };
}
window.azGetFilteredData = azGetFilteredData;

/**
 * Render a page within the module
 */
function azRenderPage(page) {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    // Clear previous view
    container.innerHTML = '';

    if (page === 'azcostgov-overview') {
        if (typeof azRenderOverviewPage === 'function') azRenderOverviewPage();
    } else if (page === 'azcostgov-subscriptions') {
        if (typeof azRenderSubscriptionsPage === 'function') azRenderSubscriptionsPage();
    } else if (page === 'azcostgov-resourcegroups') {
        if (typeof azRenderResourceGroupsPage === 'function') azRenderResourceGroupsPage();
    } else if (page === 'azcostgov-explorer') {
        if (typeof azRenderExplorerPage === 'function') azRenderExplorerPage();
    } else if (page === 'azcostgov-tags') {
        if (typeof azRenderTagsPage === 'function') azRenderTagsPage();
    } else if (page === 'azcostgov-untagged') {
        if (typeof azRenderUntaggedPage === 'function') azRenderUntaggedPage();
    } else {
        container.innerHTML = `<div class="p-12 text-center text-slate-500">Coming Soon... (${page})</div>`;
    }
}

/**
 * Export a summary of Azure costs to CSV
 */
function azExportSummary() {
    const data = AZG.data;
    if (!data.history || !data.history.length) return;

    let csv = "Month,Cost\n";
    data.history.forEach(h => {
        csv += `${h.month},${h.cost}\n`;
    });

    downloadCsv(csv, `azure_cost_summary_${new Date().toISOString().split('T')[0]}.csv`);
    showToast("Summary exported successfully", "success");
}
window.azExportSummary = azExportSummary;

/**
 * Export a specific table (subscriptions or resourceGroups) to CSV
 */
function azExportTable(type) {
    const data = AZG.data[type];
    if (!data || !data.length) return;

    const headers = Object.keys(data[0]);
    let csv = headers.join(",") + "\n";

    data.forEach(row => {
        csv += headers.map(header => {
            let val = row[header];
            if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
            return val;
        }).join(",") + "\n";
    });

    downloadCsv(csv, `azure_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`, "success");
}
window.azExportTable = azExportTable;

/**
 * Helper to trigger CSV download
 */
function downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * External triggering of data refresh
 */
async function azRefreshData() {
    showToast("Refreshing Azure Cost data...", "info");
    await azLoadGraphData();
    azRenderPage(azCurrentPage);
    showToast("Azure Cost data refreshed.", "success");
}
window.azRefreshData = azRefreshData;
