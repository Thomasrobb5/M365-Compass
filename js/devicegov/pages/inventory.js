/**
 * devicegov/pages/inventory.js – Full Managed Device Table
 */

let dgInventoryState = {
    search: '',
    osFilter: '',
    complianceFilter: ''
};

function dgRenderInventory() {
    const sec = document.getElementById('devicegov-inventory');
    if (!sec) return;

    // First time render structural HTML
    if (!document.getElementById('dg-inventory-tbody')) {
        sec.innerHTML = `
            <div class="content-card flex flex-col h-full max-h-[calc(100vh-160px)]">
                <div class="content-card-header flex-wrap gap-y-2 shrink-0">
                    <h3 class="section-title"><i data-lucide="pc-case" class="w-4 h-4 text-cyan-400"></i> Managed Device Inventory</h3>
                    <div class="flex items-center gap-2 flex-wrap">
                        <div class="relative">
                            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                            <input type="text" placeholder="Search devices or users..." class="input-field pl-9 text-sm w-56" oninput="dgInventorySearch(this.value)" />
                        </div>
                        <select id="dg-os-filter" class="input-field text-sm w-36" onchange="dgInventoryOsFilter(this.value)">
                            <option value="">All OS</option>
                        </select>
                        <select id="dg-comp-filter" class="input-field text-sm w-44" onchange="dgInventoryCompFilter(this.value)">
                            <option value="">All Compliance states</option>
                            <option value="compliant">Compliant</option>
                            <option value="noncompliant">Non-Compliant</option>
                            <option value="gracePeriod">In Grace Period</option>
                        </select>
                        <button class="btn-secondary btn-sm flex items-center gap-2" onclick="dgExportInventory()">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV
                        </button>
                    </div>
                </div>
                <!-- Action Bar wrapper (hidden by default) -->
                <div id="dg-inventory-action-bar" class="bg-cyan-900/30 border-y border-cyan-800/50 px-6 py-2 flex items-center justify-between hidden shrink-0">
                    <div class="flex items-center gap-2 text-sm text-cyan-100">
                        <i data-lucide="check-square" class="w-4 h-4 text-cyan-400"></i>
                        <span id="dg-inventory-selected-count" class="font-bold">0</span> devices selected
                    </div>
                    <button class="text-xs text-slate-400 hover:text-white" onclick="dgClearInventorySelection()">Clear Selection</button>
                </div>
                
                <div class="table-wrapper flex-1 overflow-y-auto">
                    <table class="data-table">
                        <thead class="sticky top-0 bg-surface-900/95 backdrop-blur-sm z-10 shadow-sm shadow-black/20">
                            <tr>
                                <th class="w-10 text-center">
                                    <input type="checkbox" id="dg-inventory-select-all" class="rounded border-surface-600 bg-surface-900 accent-cyan-500 w-4 h-4 cursor-pointer" onclick="dgToggleInventoryAll(this)">
                                </th>
                                <th>Device Name</th>
                                <th>Assigned User</th>
                                <th>OS Info</th>
                                <th class="text-center">Compliance</th>
                                <th class="text-center">Encryption</th>
                                <th class="text-center">Defender</th>
                                <th>Last Sync</th>
                            </tr>
                        </thead>
                        <tbody id="dg-inventory-tbody"></tbody>
                    </table>
                </div>
                <div class="px-6 py-3 border-t border-surface-800 text-xs text-slate-500 shrink-0 flex justify-between">
                    <span id="dg-inventory-count-label">0 devices</span>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [sec] });
        dgPopulateOsFilterOptions();
    }

    dgUpdateInventoryTable();
}

function dgPopulateOsFilterOptions() {
    const filter = document.getElementById('dg-os-filter');
    if (!filter) return;

    const osNames = [...new Set((DG.data.devices || []).map(d => d.operatingSystem))].filter(Boolean).sort();

    // Keep 'All OS' option
    filter.innerHTML = '<option value="">All OS</option>';
    osNames.forEach(os => {
        const opt = document.createElement('option');
        opt.value = os;
        opt.textContent = os;
        filter.appendChild(opt);
    });

    // Restore selection
    filter.value = dgInventoryState.osFilter;
}

function dgUpdateInventoryTable() {
    const tbody = document.getElementById('dg-inventory-tbody');
    const countLabel = document.getElementById('dg-inventory-count-label');
    if (!tbody) return;

    let devices = DG.data.devices || [];

    // Apply filters
    if (dgInventoryState.osFilter) {
        devices = devices.filter(d => d.operatingSystem === dgInventoryState.osFilter);
    }

    if (dgInventoryState.complianceFilter) {
        devices = devices.filter(d => d.complianceState === dgInventoryState.complianceFilter);
    }

    if (dgInventoryState.search) {
        const term = dgInventoryState.search.toLowerCase();
        devices = devices.filter(d =>
            (d.deviceName || '').toLowerCase().includes(term) ||
            (d.userDisplayName || '').toLowerCase().includes(term) ||
            (d.userPrincipalName || '').toLowerCase().includes(term) ||
            (d.manufacturer || '').toLowerCase().includes(term) ||
            (d.model || '').toLowerCase().includes(term)
        );
    }

    // Sort logic (defaults to last sync desc for now)
    devices.sort((a, b) => new Date(b.lastSyncDateTime || 0) - new Date(a.lastSyncDateTime || 0));

    tbody.innerHTML = '';

    if (devices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-slate-500">No devices found matching filter criteria.</td></tr>`;
    } else {
        devices.forEach(d => {
            const compBadge = d.complianceState === 'compliant' ? '<span class="badge badge-license">Compliant</span>' : `<span class="badge badge-disabled">${d.complianceState}</span>`;
            const encBadge = d.isEncrypted ? '<span class="badge badge-premium">Encrypted</span>' : '<span class="badge badge-disabled">Unencrypted</span>';
            const defBadge = d.defenderStatus === 'secured' ? '<span class="badge badge-license">Secured</span>' : (d.defenderStatus === 'atRisk' ? '<span class="badge badge-disabled">At Risk</span>' : `<span class="badge bg-slate-800 text-slate-400">${d.defenderStatus || 'N/A'}</span>`);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">
                    <input type="checkbox" class="dg-device-cb rounded border-surface-600 bg-surface-900 accent-cyan-500 w-4 h-4 cursor-pointer" data-id="${d.id}">
                </td>
                <td>
                    <span class="font-medium text-slate-200 text-sm hover:text-cyan-400 cursor-pointer transition" onclick="dgOpenDeviceDetail('${d.id}')">${d.deviceName}</span>
                    <br>
                    <span class="text-xs text-slate-500">${d.manufacturer} ${d.model}</span>
                </td>
                <td>
                    <span class="text-sm">${d.userDisplayName || '—'}</span>
                    <br>
                    <span class="text-xs text-slate-500">${d.userPrincipalName || ''}</span>
                </td>
                <td>
                    <span class="text-sm">${d.operatingSystem}</span>
                    <br>
                    <span class="text-xs text-slate-500">${d.osVersion}</span>
                </td>
                <td class="text-center">${compBadge}</td>
                <td class="text-center">${encBadge}</td>
                <td class="text-center">${defBadge}</td>
                <td class="text-slate-400 text-xs">${formatDate(d.lastSyncDateTime)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (countLabel) {
        countLabel.textContent = `Showing ${devices.length} of ${DG.data.devices?.length || 0} devices`;
    }

    // Sync checkboxes if selection state matters (not implemented globally yet)
}

// ── Filter Handlers ────────────────────────────────────────────────────────
function dgInventorySearch(val) {
    dgInventoryState.search = val.trim();
    dgUpdateInventoryTable();
}
window.dgInventorySearch = dgInventorySearch;

function dgInventoryOsFilter(val) {
    dgInventoryState.osFilter = val;
    dgUpdateInventoryTable();
}
window.dgInventoryOsFilter = dgInventoryOsFilter;

function dgInventoryCompFilter(val) {
    dgInventoryState.complianceFilter = val;
    dgUpdateInventoryTable();
}
window.dgInventoryCompFilter = dgInventoryCompFilter;

// ── Selection Logic (Placeholder) ──────────────────────────────────────────
function dgToggleInventoryAll(cb) {
    document.querySelectorAll('.dg-device-cb').forEach(box => {
        box.checked = cb.checked;
    });
    dgUpdateActionBar();
}
window.dgToggleInventoryAll = dgToggleInventoryAll;

function dgUpdateActionBar() {
    const checked = document.querySelectorAll('.dg-device-cb:checked').length;
    const bar = document.getElementById('dg-inventory-action-bar');
    const count = document.getElementById('dg-inventory-selected-count');

    if (checked > 0) {
        bar.classList.remove('hidden');
        if (count) count.textContent = checked;
    } else {
        bar.classList.add('hidden');
    }
}
window.dgUpdateActionBar = dgUpdateActionBar;

function dgClearInventorySelection() {
    const cbAll = document.getElementById('dg-inventory-select-all');
    if (cbAll) cbAll.checked = false;
    document.querySelectorAll('.dg-device-cb').forEach(box => box.checked = false);
    dgUpdateActionBar();
}
window.dgClearInventorySelection = dgClearInventorySelection;

// Event delegation for table checkboxes
document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('dg-device-cb')) {
        dgUpdateActionBar();
        // Uncheck 'select all' if an individual box is unchecked
        if (!e.target.checked) {
            const cbAll = document.getElementById('dg-inventory-select-all');
            if (cbAll) cbAll.checked = false;
        }
    }
});

// ── CSV Export ─────────────────────────────────────────────────────────────
function dgExportInventory() {
    const devices = DG.data.devices || [];
    if (!devices.length) return;

    let csv = 'Device Name,Manufacturer,Model,OS,OS Version,User Name,UPN,Compliance,Encryption,Defender,Last Sync\n';

    devices.forEach(d => {
        csv += `"${d.deviceName || ''}","${d.manufacturer || ''}","${d.model || ''}","${d.operatingSystem || ''}","${d.osVersion || ''}","${d.userDisplayName || ''}","${d.userPrincipalName || ''}","${d.complianceState || ''}","${d.isEncrypted ? 'Encrypted' : 'Unencrypted'}","${d.defenderStatus || ''}","${d.lastSyncDateTime || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intune_device_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.dgExportInventory = dgExportInventory;

window.dgRenderInventory = dgRenderInventory;
