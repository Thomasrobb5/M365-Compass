/**
 * devicegov/graph.js – Data fetching for Microsoft Intune / Defender metrics
 */

window.DG = {
    data: {
        devices: [],
        lastSync: null
    },
    isDemoMode: false
};

const KEY_DG_CACHE = 'm365_compass_dg_cache';

async function saveDgCache() {
    try {
        await localforage.setItem(KEY_DG_CACHE, {
            devices: DG.data.devices,
            isDemoMode: DG.isDemoMode,
            ts: Date.now()
        });
    } catch (e) {
        console.error('DG Cache save failed:', e);
    }
}

async function loadDgCache() {
    try {
        const cached = await localforage.getItem(KEY_DG_CACHE);
        if (cached && cached.devices) {
            DG.data.devices = cached.devices;
            DG.isDemoMode = cached.isDemoMode || false;
            DG.data.lastSync = new Date(cached.ts);
            return true;
        }
    } catch (e) {
        console.error('DG Cache load failed:', e);
    }
    return false;
}
window.loadDgCache = loadDgCache;

async function dgLoadGraphData() {
    if (!LG.accessToken) {
        showToast('Please sign in first', 'warning');
        return;
    }

    try {
        dgShowLoading(true, 'Connecting to Microsoft Intune...');
        dgSetProgress(5);

        // ── Phase 1: Fetch all managed devices ──────────────────────────────
        const devicesUrl = 'https://graph.microsoft.com/beta/deviceManagement/managedDevices?$select=id,deviceName,userPrincipalName,userDisplayName,operatingSystem,osVersion,complianceState,isEncrypted,managedDeviceOwnerType,lastSyncDateTime,manufacturer,model';
        const raw = await graphFetchAll(devicesUrl);
        dgSetProgress(50);
        dgShowLoading(true, `Loaded ${raw.length} devices — resolving user departments...`);

        // ── Phase 2: Batch-resolve departments from user profiles ────────────
        const upns = [...new Set(raw.map(d => d.userPrincipalName).filter(Boolean))];
        const deptMap = {};

        if (upns.length > 0) {
            // Graph $batch allows up to 20 requests per call
            const BATCH_SIZE = 20;
            for (let i = 0; i < upns.length; i += BATCH_SIZE) {
                const chunk = upns.slice(i, i + BATCH_SIZE);
                const requests = chunk.map((upn, idx) => ({
                    id: String(idx),
                    method: 'GET',
                    url: `/users/${encodeURIComponent(upn)}?$select=userPrincipalName,department`
                }));

                try {
                    const batchResp = await fetch('https://graph.microsoft.com/v1.0/$batch', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + LG.accessToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ requests })
                    });
                    const batchData = await batchResp.json();
                    (batchData.responses || []).forEach((r, idx) => {
                        if (r.status === 200 && r.body) {
                            const upn = chunk[idx];
                            deptMap[upn.toLowerCase()] = r.body.department || null;
                        }
                    });
                } catch (batchErr) {
                    console.warn('Department batch lookup failed for chunk:', batchErr);
                }

                // Update progress proportionally through Phase 2 (50–90%)
                dgSetProgress(50 + Math.round(((i + BATCH_SIZE) / upns.length) * 40));
            }
        }

        dgSetProgress(95);

        // ── Attach department + derive defender status ───────────────────────
        DG.data.devices = raw.map(d => {
            let defenderStatus = 'notApplicable';
            if (d.operatingSystem === 'Windows') {
                defenderStatus = (d.complianceState === 'compliant') ? 'secured' : 'atRisk';
            }
            const dept = d.userPrincipalName
                ? (deptMap[d.userPrincipalName.toLowerCase()] || null)
                : null;
            return { ...d, defenderStatus, department: dept };
        });

        showToast(`Synced ${DG.data.devices.length} devices with department data`, 'success');
        DG.data.lastSync = new Date();
        document.getElementById('devicegov-sync-status').textContent = 'Last synced just now';

        await saveDgCache();

        dgSetProgress(100);
        dgShowLoading(false);
        if (typeof dgRenderPage === 'function') dgRenderPage(dgCurrentPage);

    } catch (err) {
        console.error('Error fetching Device Governance data:', err);
        showToast('Failed to load device data: ' + err.message, 'error');
        dgShowLoading(false);
    }
}
window.dgLoadGraphData = dgLoadGraphData;

function dgSetProgress(pct) {
    const bar = document.getElementById('devicegov-progress-bar');
    const label = document.getElementById('devicegov-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
}
window.dgSetProgress = dgSetProgress;


function dgShowLoading(show, message = 'Loading device data...') {
    const overlay = document.getElementById('devicegov-loading-overlay');
    const textEl = document.getElementById('devicegov-loading-sub-text');
    if (overlay) {
        if (show) {
            if (textEl) textEl.textContent = message;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}
window.dgShowLoading = dgShowLoading;
