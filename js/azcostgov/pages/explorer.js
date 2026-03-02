/**
 * explorer.js - Hierarchical Azure Resource Explorer
 */

function azRenderExplorerPage() {
    const container = document.getElementById('azcostgov-pages-container');
    if (!container) return;

    const data = azGetFilteredData();

    // Group hierarchy: Subscription -> Resource Group -> Resource
    const hierarchy = {};

    data.resourceGroups.forEach(res => {
        const subName = res.subscription || 'Default Subscription';
        const rgName = res.rgName || res.name || 'Unknown Group'; // res.name is fallback if rgName not present (backward compatibility)

        if (!hierarchy[subName]) {
            hierarchy[subName] = {
                name: subName,
                cost: 0,
                groups: {}
            };
        }

        if (!hierarchy[subName].groups[rgName]) {
            hierarchy[subName].groups[rgName] = {
                name: rgName,
                cost: 0,
                location: res.location,
                resources: []
            };
        }

        hierarchy[subName].cost += res.cost;
        hierarchy[subName].groups[rgName].cost += res.cost;
        hierarchy[subName].groups[rgName].resources.push(res);
    });

    container.innerHTML = `
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="search" class="w-5 h-5 text-blue-400"></i> Resource Explorer
            </h2>
            <div class="relative w-full md:w-80">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>
                <input type="text" id="az-explorer-search" placeholder="Search resources, types, or RGs..." 
                    class="w-full bg-surface-900 border border-surface-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
                    oninput="azFilterExplorer()">
            </div>
        </div>

        <div id="az-explorer-tree" class="space-y-4">
            ${Object.values(hierarchy).sort((a, b) => b.cost - a.cost).map((sub, sIdx) => {
        const subId = `exp-sub-${sIdx}`;
        return `
                    <div class="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-sm explorer-sub-node" data-sub-name="${sub.name}">
                        <!-- Subscription Header -->
                        <div class="px-6 py-4 bg-surface-950/40 flex items-center justify-between cursor-pointer group hover:bg-surface-850/50 transition-colors" 
                            onclick="azToggleExplorerNode('${subId}')">
                            <div class="flex items-center gap-3">
                                <i data-lucide="layers" class="w-4 h-4 text-blue-400"></i>
                                <div>
                                    <h3 class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">${sub.name}</h3>
                                    <p class="text-[10px] text-slate-500 uppercase tracking-tighter">Subscription</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-6">
                                <div class="text-right">
                                    <p class="text-xs font-mono text-white font-bold">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(sub.cost)}</p>
                                    <p class="text-[9px] text-slate-500">${Object.keys(sub.groups).length} Resource Groups</p>
                                </div>
                                <i data-lucide="chevron-down" id="${subId}-icon" class="w-4 h-4 text-slate-600 group-hover:text-white transition-all"></i>
                            </div>
                        </div>

                        <!-- RG Level Container -->
                        <div id="${subId}" class="p-4 bg-surface-900/50 space-y-3">
                            ${Object.values(sub.groups).sort((a, b) => b.cost - a.cost).map((rg, rIdx) => {
            const rgId = `${subId}-rg-${rIdx}`;
            return `
                                    <div class="border border-surface-800 rounded-xl overflow-hidden explorer-rg-node" data-rg-name="${rg.name}">
                                        <!-- RG Header -->
                                        <div class="px-4 py-3 bg-surface-850/30 flex items-center justify-between cursor-pointer group hover:bg-surface-800/50 transition-colors"
                                            onclick="azToggleExplorerNode('${rgId}')">
                                            <div class="flex items-center gap-3">
                                                <i data-lucide="box" class="w-3.5 h-3.5 text-emerald-400"></i>
                                                <div>
                                                    <h4 class="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">${rg.name}</h4>
                                                    <p class="text-[9px] text-slate-500">${rg.location}</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-4">
                                                <div class="text-right">
                                                    <p class="text-xs font-mono text-slate-300 font-bold">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(rg.cost)}</p>
                                                    <p class="text-[9px] text-slate-500">${rg.resources.length} items</p>
                                                </div>
                                                <i data-lucide="chevron-right" id="${rgId}-icon" class="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-all"></i>
                                            </div>
                                        </div>

                                        <!-- Resource Level Container -->
                                        <div id="${rgId}" class="hidden bg-surface-950/30">
                                            <div class="p-3 space-y-1">
                                                ${rg.resources.map(res => `
                                                    <div class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-800/50 transition-colors explorer-resource-node" 
                                                        data-res-name="${res.name}" data-res-type="${res.service}">
                                                        <div class="flex items-center gap-2">
                                                            <div class="w-1 h-1 rounded-full bg-slate-700"></div>
                                                            <div>
                                                                <p class="text-xs font-medium text-slate-300">${res.name}</p>
                                                                <p class="text-[9px] text-slate-500">${res.service}</p>
                                                            </div>
                                                        </div>
                                                        <p class="text-xs font-mono text-slate-500">${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(res.cost)}</p>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Toggle visibility of a tree node
 */
function azToggleExplorerNode(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(`${id}-icon`);
    if (!el || !icon) return;

    const isHidden = el.classList.contains('hidden');
    el.classList.toggle('hidden');

    // Rotate icon (chevron-down vs chevron-right handling)
    if (id.includes('-rg-')) {
        // Resource Group level uses chevron-right transition
        icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    } else {
        // Subscription level uses chevron-down collapse
        icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-180deg)';
    }
}

/**
 * Search/Filter functionalitiy for the explorer
 */
function azFilterExplorer() {
    const query = document.getElementById('az-explorer-search').value.toLowerCase();
    const subs = document.querySelectorAll('.explorer-sub-node');

    subs.forEach(sub => {
        let subVisible = false;
        const rgs = sub.querySelectorAll('.explorer-rg-node');

        rgs.forEach(rg => {
            let rgVisible = false;
            const resources = rg.querySelectorAll('.explorer-resource-node');

            resources.forEach(res => {
                const name = res.getAttribute('data-res-name').toLowerCase();
                const type = res.getAttribute('data-res-type').toLowerCase();
                const matches = name.includes(query) || type.includes(query);

                res.style.display = matches ? 'flex' : 'none';
                if (matches) rgVisible = true;
            });

            const rgName = rg.getAttribute('data-rg-name').toLowerCase();
            if (rgName.includes(query)) rgVisible = true;

            // If RG visible, ensure its container is shown (if hidden by search previously)
            rg.style.display = rgVisible ? 'block' : 'none';
            if (rgVisible) {
                subVisible = true;
                // Auto-expand RGs that contain matching children if searching
                const resContainer = rg.querySelector('div[id*="-rg-"]');
                if (query.length > 2 && rgVisible) {
                    resContainer.classList.remove('hidden');
                    const icon = document.getElementById(`${resContainer.id}-icon`);
                    if (icon) icon.style.transform = 'rotate(90deg)';
                }
            }
        });

        const subName = sub.getAttribute('data-sub-name').toLowerCase();
        if (subName.includes(query)) subVisible = true;

        sub.style.display = subVisible ? 'block' : 'none';
    });
}

window.azRenderExplorerPage = azRenderExplorerPage;
window.azToggleExplorerNode = azToggleExplorerNode;
window.azFilterExplorer = azFilterExplorer;
