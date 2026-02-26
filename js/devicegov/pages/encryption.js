/**
 * devicegov/pages/encryption.js – Device Encryption report page
 * Department, OS, and Search-filterable table of all devices with encryption status + CSV export
 */

let dgEncryptionDeptFilter = 'all';
let dgEncryptionOSFilter = 'all';
let dgEncryptionSearchTerm = '';

function dgRenderEncryption() {
    const sec = document.getElementById('devicegov-encryption');
    if (!sec) return;

    // Build page structure on first render
    if (!sec.dataset.init) {
        sec.dataset.init = '1';
        sec.innerHTML = `
            <!-- KPI Row -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div class="bg-surface-900 border border-emerald-800/40 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                        <i data-lucide="lock" class="w-4 h-4 text-emerald-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-emerald-400" id="enc-kpi-encrypted">0</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Encrypted</p>
                </div>
                <div class="bg-surface-900 border border-amber-800/40 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
                        <i data-lucide="unlock" class="w-4 h-4 text-amber-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-amber-400" id="enc-kpi-unencrypted">0</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Unencrypted</p>
                </div>
                <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center mb-3">
                        <i data-lucide="monitor-smartphone" class="w-4 h-4 text-slate-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-white" id="enc-kpi-total">0</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Total Devices</p>
                </div>
                <div class="bg-surface-900 border border-surface-700 rounded-2xl p-5">
                    <div class="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center mb-3">
                        <i data-lucide="percent" class="w-4 h-4 text-slate-400"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-white" id="enc-kpi-pct">0%</h4>
                    <p class="text-xs text-slate-400 mt-0.5">Encryption Rate</p>
                </div>
            </div>

            <!-- Table card -->
            <div class="content-card flex flex-col" style="max-height: calc(100vh - 280px);">
                <div class="content-card-header flex-wrap gap-y-2 shrink-0">
                    <div class="flex items-center gap-3">
                        <h3 class="section-title">
                            <i data-lucide="table-2" class="w-4 h-4 text-cyan-400"></i>
                            Encryption Status — All Devices
                        </h3>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <!-- Search Box -->
                        <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"></i>
                            <input type="text" id="enc-search-input" placeholder="Search user or device..." 
                                class="bg-surface-800 border border-surface-700 text-white text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-48 transition-all">
                        </div>

                        <!-- Department Filter -->
                        <select id="enc-dept-filter"
                            class="bg-surface-800 border border-surface-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer">
                            <option value="all">All Departments</option>
                        </select>

                        <!-- OS Filter -->
                        <select id="enc-os-filter"
                            class="bg-surface-800 border border-surface-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer">
                            <option value="all">All OS</option>
                        </select>

                        <button onclick="dgExportEncryption()"
                            class="btn-secondary btn-sm flex items-center gap-2">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV
                        </button>
                    </div>
                </div>
                <div class="table-wrapper flex-1 overflow-y-auto">
                    <table class="data-table">
                        <thead class="sticky top-0 bg-surface-900/95 backdrop-blur-sm z-10 shadow-sm shadow-black/20">
                            <tr>
                                <th>Device</th>
                                <th>User</th>
                                <th>Department</th>
                                <th>OS</th>
                                <th>Encryption</th>
                                <th>Last Sync</th>
                            </tr>
                        </thead>
                        <tbody id="enc-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [sec] });

        // Wire up filters
        document.getElementById('enc-dept-filter').addEventListener('change', function () {
            dgEncryptionDeptFilter = this.value;
            dgUpdateEncryptionTable();
        });

        document.getElementById('enc-os-filter').addEventListener('change', function () {
            dgEncryptionOSFilter = this.value;
            dgUpdateEncryptionTable();
        });

        const searchInput = document.getElementById('enc-search-input');
        searchInput.addEventListener('input', (e) => {
            dgEncryptionSearchTerm = e.target.value.toLowerCase();
            dgUpdateEncryptionTable();
        });
    }

    dgUpdateEncryptionData();
}
window.dgRenderEncryption = dgRenderEncryption;

function dgUpdateEncryptionData() {
    const devices = DG.data.devices || [];

    // Populate department dropdown
    const deptSelect = document.getElementById('enc-dept-filter');
    if (deptSelect) {
        const currentVal = deptSelect.value;
        const depts = [...new Set(devices.map(d => d.department || 'Unknown').filter(Boolean))].sort();
        deptSelect.innerHTML = '<option value="all">All Departments</option>' +
            depts.map(d => `<option value="${d}" ${d === currentVal ? 'selected' : ''}>${d}</option>`).join('');
    }

    // Populate OS dropdown
    const osSelect = document.getElementById('enc-os-filter');
    if (osSelect) {
        const currentVal = osSelect.value;
        const oss = [...new Set(devices.map(d => d.operatingSystem).filter(Boolean))].sort();
        osSelect.innerHTML = '<option value="all">All OS</option>' +
            oss.map(o => `<option value="${o}" ${o === currentVal ? 'selected' : ''}>${o}</option>`).join('');
    }

    dgUpdateEncryptionTable();
}

function dgUpdateEncryptionTable() {
    const devices = DG.data.devices || [];

    // Apply filters
    const filtered = devices.filter(d => {
        // Department
        if (dgEncryptionDeptFilter !== 'all' && (d.department || 'Unknown') !== dgEncryptionDeptFilter) return false;

        // OS
        if (dgEncryptionOSFilter !== 'all' && d.operatingSystem !== dgEncryptionOSFilter) return false;

        // Search
        if (dgEncryptionSearchTerm) {
            const match = (d.deviceName || '').toLowerCase().includes(dgEncryptionSearchTerm) ||
                (d.userDisplayName || '').toLowerCase().includes(dgEncryptionSearchTerm) ||
                (d.userPrincipalName || '').toLowerCase().includes(dgEncryptionSearchTerm);
            if (!match) return false;
        }

        return true;
    });

    const encrypted = filtered.filter(d => d.isEncrypted).length;
    const unencrypted = filtered.filter(d => !d.isEncrypted).length;
    const pct = filtered.length ? Math.round((encrypted / filtered.length) * 100) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('enc-kpi-encrypted', encrypted);
    set('enc-kpi-unencrypted', unencrypted);
    set('enc-kpi-total', filtered.length);
    set('enc-kpi-pct', pct + '%');

    const tbody = document.getElementById('enc-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">No devices found matching the current filters.</td></tr>`;
        return;
    }

    // Sort: unencrypted first
    const sorted = [...filtered].sort((a, b) => Number(a.isEncrypted) - Number(b.isEncrypted));

    tbody.innerHTML = sorted.map(d => {
        const encBadge = d.isEncrypted
            ? `<span class="badge bg-emerald-900/40 text-emerald-300 border border-emerald-800/50"><i data-lucide="lock" class="w-3 h-3 inline mr-1"></i>Encrypted</span>`
            : `<span class="badge bg-amber-900/40 text-amber-300 border border-amber-800/50"><i data-lucide="unlock" class="w-3 h-3 inline mr-1"></i>Unencrypted</span>`;
        return `<tr>
            <td>
                <span class="font-medium text-slate-200 text-sm">${d.deviceName || '—'}</span>
                <br><span class="text-xs text-slate-500">${d.manufacturer || ''} ${d.model || ''}</span>
            </td>
            <td>
                <span class="text-sm">${d.userDisplayName || '—'}</span>
                <br><span class="text-xs text-slate-500">${d.userPrincipalName || ''}</span>
            </td>
            <td><span class="text-sm text-slate-300">${d.department || '—'}</span></td>
            <td class="text-sm text-slate-400">${d.operatingSystem || '—'} ${d.osVersion || ''}</td>
            <td>${encBadge}</td>
            <td class="text-xs text-slate-500">${typeof formatDate === 'function' ? formatDate(d.lastSyncDateTime) : (d.lastSyncDateTime || '—')}</td>
        </tr>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [tbody] });
}

function dgExportEncryption() {
    const devices = DG.data.devices || [];

    // Apply same filters as table
    const filtered = devices.filter(d => {
        if (dgEncryptionDeptFilter !== 'all' && (d.department || 'Unknown') !== dgEncryptionDeptFilter) return false;
        if (dgEncryptionOSFilter !== 'all' && d.operatingSystem !== dgEncryptionOSFilter) return false;
        if (dgEncryptionSearchTerm) {
            const match = (d.deviceName || '').toLowerCase().includes(dgEncryptionSearchTerm) ||
                (d.userDisplayName || '').toLowerCase().includes(dgEncryptionSearchTerm) ||
                (d.userPrincipalName || '').toLowerCase().includes(dgEncryptionSearchTerm);
            if (!match) return false;
        }
        return true;
    });

    if (!filtered.length) { if (typeof showToast === 'function') showToast('No data to export', 'warning'); return; }

    const deptLabel = dgEncryptionDeptFilter === 'all' ? 'All_Depts' : dgEncryptionDeptFilter.replace(/\s+/g, '_');
    const osLabel = dgEncryptionOSFilter === 'all' ? 'All_OS' : dgEncryptionOSFilter.replace(/\s+/g, '_');

    let csv = 'Device Name,Manufacturer,Model,User,UPN,Department,OS,OS Version,Encryption Status,Last Sync\n';
    filtered.forEach(d => {
        csv += `"${d.deviceName || ''}","${d.manufacturer || ''}","${d.model || ''}","${d.userDisplayName || ''}","${d.userPrincipalName || ''}","${d.department || ''}","${d.operatingSystem || ''}","${d.osVersion || ''}","${d.isEncrypted ? 'Encrypted' : 'Unencrypted'}","${d.lastSyncDateTime || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `device_encryption_${deptLabel}_${osLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
window.dgExportEncryption = dgExportEncryption;
