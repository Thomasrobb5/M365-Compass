/**
 * devicegov/pages/detail.js – Slide-over device detail panel
 *
 * Opens instantly with cached device data, then optionally fetches
 * deeper detail (storage, serial number, etc.) from the Graph API.
 */

let dgCurrentDevice = null;

// ── Open the panel ─────────────────────────────────────────────────────────
async function dgOpenDeviceDetail(deviceId) {
    const device = (DG.data.devices || []).find(d => d.id === deviceId);
    if (!device) return;

    dgCurrentDevice = device;

    const panel = document.getElementById('dg-detail-panel');
    const backdrop = document.getElementById('dg-detail-backdrop');
    const body = document.getElementById('dg-detail-body');
    const loading = document.getElementById('dg-detail-loading');

    // Show panel immediately with cached data
    backdrop.classList.remove('hidden');
    panel.classList.remove('translate-x-full');

    document.getElementById('dg-detail-name').textContent = device.deviceName || 'Unknown Device';
    document.getElementById('dg-detail-subtitle').textContent = `${device.manufacturer || ''} ${device.model || ''} · ${device.operatingSystem || ''}`.trim();

    // Show loading
    body.classList.add('hidden');
    loading.classList.remove('hidden');

    // Re-initialise Lucide for the X button
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [panel] });

    // Render cached data first
    dgPopulateDetailPanel(device);
    loading.classList.add('hidden');
    body.classList.remove('hidden');

    // Then attempt to fetch richer data from Graph if authenticated
    if (LG.accessToken && device.id) {
        try {
            const extra = await graphFetch(
                `https://graph.microsoft.com/beta/deviceManagement/managedDevices/${device.id}?$select=id,serialNumber,phoneNumber,totalStorageSpaceInBytes,freeStorageSpaceInBytes,imei,easDeviceId,azureADDeviceId,enrolledDateTime,lastSyncDateTime,userPrincipalName,userDisplayName,emailAddress,deviceEnrollmentType,managementAgent,partnerReportedThreatState,configurationManagerClientEnabledFeatures`
            );
            // Merge deeper data into cached object
            Object.assign(device, extra);
            dgCurrentDevice = device;
            dgPopulateDetailPanel(device);
        } catch (e) {
            // Fine — just show cached data
            console.warn('Could not fetch extended device details:', e.message);
        }
    }
}
window.dgOpenDeviceDetail = dgOpenDeviceDetail;

// ── Populate panel content from device object ──────────────────────────────
function dgPopulateDetailPanel(d) {
    const panel = document.getElementById('dg-detail-panel');

    // Status badges
    const badgesEl = document.getElementById('dg-detail-badges');
    if (badgesEl) {
        const compBadge = d.complianceState === 'compliant'
            ? '<span class="badge badge-license">Compliant</span>'
            : `<span class="badge badge-disabled">${d.complianceState || 'Unknown'}</span>`;
        const encBadge = d.isEncrypted
            ? '<span class="badge badge-premium">Encrypted</span>'
            : '<span class="badge badge-disabled">Unencrypted</span>';
        const ownerBadge = d.managedDeviceOwnerType === 'company'
            ? '<span class="badge bg-cyan-900/40 text-cyan-300">Corporate</span>'
            : '<span class="badge bg-slate-800 text-slate-400">Personal / BYOD</span>';
        const defBadge = d.defenderStatus === 'secured'
            ? '<span class="badge bg-blue-900/40 text-blue-300">Defender OK</span>'
            : (d.defenderStatus === 'atRisk'
                ? '<span class="badge bg-red-900/40 text-red-300">Defender At Risk</span>'
                : '');
        badgesEl.innerHTML = `${compBadge}${encBadge}${ownerBadge}${defBadge}`;
    }

    // Device Information
    const infoEl = document.getElementById('dg-detail-info');
    if (infoEl) {
        infoEl.innerHTML = _dgDl([
            ['OS', `${d.operatingSystem || '—'} ${d.osVersion || ''}`],
            ['Enrolled', formatDate(d.enrolledDateTime)],
            ['Last Sync', formatDate(d.lastSyncDateTime)],
            ['Enrollment Type', _dgFmt(d.deviceEnrollmentType)],
            ['Management Agent', _dgFmt(d.managementAgent)],
            ['Azure AD Device ID', d.azureADDeviceId ? `<code class="text-xs text-slate-400 break-all">${d.azureADDeviceId}</code>` : '—'],
            ['Intune Device ID', `<code class="text-xs text-slate-400 break-all">${d.id}</code>`],
        ]);
    }

    // Hardware
    const hwEl = document.getElementById('dg-detail-hardware');
    if (hwEl) {
        const totalGB = d.totalStorageSpaceInBytes ? (d.totalStorageSpaceInBytes / 1e9).toFixed(1) + ' GB' : null;
        const freeGB = d.freeStorageSpaceInBytes ? (d.freeStorageSpaceInBytes / 1e9).toFixed(1) + ' GB' : null;
        hwEl.innerHTML = _dgDl([
            ['Manufacturer', d.manufacturer || '—'],
            ['Model', d.model || '—'],
            ['Serial Number', d.serialNumber || '—'],
            ['IMEI', d.imei || '—'],
            ['Total Storage', totalGB || '—'],
            ['Free Storage', freeGB || '—'],
        ].filter(([, v]) => v && v !== '—'));
    }

    // Assigned User
    const userEl = document.getElementById('dg-detail-user');
    if (userEl) {
        userEl.innerHTML = _dgDl([
            ['Display Name', d.userDisplayName || d.userPrincipalName || '—'],
            ['UPN', d.userPrincipalName || '—'],
            ['Email', d.emailAddress || '—'],
        ]);
    }

    // Footer note
    const footerEl = document.getElementById('dg-detail-footer-note');
    if (footerEl) footerEl.textContent = `Last synced: ${formatDate(d.lastSyncDateTime)}`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [panel] });
}

// ── Close the panel ────────────────────────────────────────────────────────
function dgCloseDeviceDetail() {
    const panel = document.getElementById('dg-detail-panel');
    const backdrop = document.getElementById('dg-detail-backdrop');
    panel.classList.add('translate-x-full');
    backdrop.classList.add('hidden');
    dgCurrentDevice = null;
}
window.dgCloseDeviceDetail = dgCloseDeviceDetail;

// ── Helpers ────────────────────────────────────────────────────────────────
function _dgDl(rows) {
    return rows.map(([label, value]) => `
        <div class="flex items-start justify-between gap-4 px-5 py-3">
            <dt class="text-xs font-medium text-slate-400 shrink-0 w-36">${label}</dt>
            <dd class="text-xs text-slate-200 text-right break-all">${value ?? '—'}</dd>
        </div>`).join('');
}

function _dgFmt(str) {
    if (!str) return '—';
    // Convert camelCase / PascalCase to spaced words
    return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
}
