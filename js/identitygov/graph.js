/**
 * identitygov/graph.js – Data fetching for Identity Governance
 */

window.IDG = {
    data: {
        users: [],
        policies: [],
        lastSync: null
    },
    isDemoMode: false
};

const KEY_IDG_CACHE = 'm365_compass_idg_cache';

async function saveIdgCache() {
    try {
        await localforage.setItem(KEY_IDG_CACHE, {
            users: IDG.data.users,
            policies: IDG.data.policies,
            ts: Date.now()
        });
    } catch (e) {
        console.error('IDG Cache save failed:', e);
    }
}

async function loadIdgCache() {
    try {
        const cached = await localforage.getItem(KEY_IDG_CACHE);
        if (cached && cached.users) {
            IDG.data.users = cached.users;
            IDG.data.policies = cached.policies || [];
            IDG.data.lastSync = new Date(cached.ts);
            return true;
        }
    } catch (e) {
        console.error('IDG Cache load failed:', e);
    }
    return false;
}
window.loadIdgCache = loadIdgCache;

async function idgLoadGraphData() {
    if (!LG.accessToken) {
        showToast('Please sign in first', 'warning');
        return;
    }

    try {
        idgShowLoading(true, 'Connecting to Azure AD Identity services...');
        idgSetProgress(5);

        // Note: Real implementation would use batching for:
        // 1. /reports/authenticationMethods/userRegistrationDetails
        // 2. /identityProtection/riskyUsers
        // 3. /conditionalAccess/policies
        // 4. /users with select for department, jobTitle, etc.

        // For now, if we are in demo mode, just load demo data
        if (LG.isDemoMode) {
            idgLoadDemoData();
        } else {
            // Placeholder for real Graph API calls as outlined in the implementation plan
            console.warn("Real Graph API fetching for Identity is not yet implemented.");
            showToast("Authenticated fetching for Identity is coming soon. Using Demo data for now.", "info");
            idgLoadDemoData();
            IDG.isDemoMode = false; // Mark that we tried real auth
        }

        idgSetProgress(100);
        idgShowLoading(false);

        if (typeof idgRenderPage === 'function') idgRenderPage(idgCurrentPage);
        await saveIdgCache();

    } catch (err) {
        console.error('Error fetching Identity Governance data:', err);
        showToast('Failed to load identity data: ' + err.message, 'error');
        idgShowLoading(false);
    }
}
window.idgLoadGraphData = idgLoadGraphData;

function idgSetProgress(pct) {
    const bar = document.getElementById('identitygov-progress-bar');
    const label = document.getElementById('identitygov-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
}
window.idgSetProgress = idgSetProgress;

function idgShowLoading(show, message = 'Loading identity data...') {
    const overlay = document.getElementById('identitygov-loading-overlay');
    const textEl = document.getElementById('identitygov-loading-sub-text');
    if (overlay) {
        if (show) {
            if (textEl) textEl.textContent = message;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}
window.idgShowLoading = idgShowLoading;
