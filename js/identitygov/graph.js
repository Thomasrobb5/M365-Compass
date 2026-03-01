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

        if (LG.isDemoMode) {
            idgLoadDemoData();
            idgSetProgress(100);
            idgShowLoading(false);
            return;
        }

        // 1. Fetch MFA Registration Details
        idgShowLoading(true, 'Fetching MFA registration status...');
        let mfaData = [];
        try {
            mfaData = await graphFetchAll('https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails');
        } catch (e) {
            console.warn('Failed to fetch MFA details:', e);
            showToast('Permission denied for MFA reports. Check Reports.Read.All.', 'warning');
        }
        idgSetProgress(30);

        // 2. Fetch Risky Users
        idgShowLoading(true, 'Checking for risky accounts...');
        let riskData = [];
        try {
            riskData = await graphFetchAll('https://graph.microsoft.com/v1.0/identityProtection/riskyUsers');
        } catch (e) {
            console.warn('Failed to fetch risky users:', e);
            showToast('Permission denied for Risk reports. Check IdentityRiskyUser.Read.All.', 'warning');
        }
        idgSetProgress(60);

        // 3. Fetch CA Policies
        idgShowLoading(true, 'Loading Conditional Access policies...');
        try {
            const policiesRes = await graphFetch('https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies');
            IDG.data.policies = policiesRes.value || [];
        } catch (e) {
            console.warn('Failed to fetch CA policies:', e);
            showToast('Permission denied for CA Policies. Check Policy.Read.All.', 'warning');
        }
        idgSetProgress(80);

        // 4. Merge with LG.data.users
        idgShowLoading(true, 'Finalizing identity analysis...');

        if (!LG.data.users || LG.data.users.length === 0) {
            // Try to load base user data if missing
            await loadAllData();
        }

        const mfaMap = {};
        mfaData.forEach(m => {
            if (m.userPrincipalName) mfaMap[m.userPrincipalName.toLowerCase()] = m;
        });

        const riskMap = {};
        riskData.forEach(r => {
            if (r.userPrincipalName) riskMap[r.userPrincipalName.toLowerCase()] = r;
        });

        IDG.data.users = LG.data.users.map(u => {
            const upn = u.userPrincipalName?.toLowerCase();
            const mfa = mfaMap[upn];
            const risk = riskMap[upn];

            // Determine MFA Status
            let mfaStatus = 'None';
            if (mfa) {
                if (mfa.isMfaRegistered) {
                    const methods = mfa.methodsRegistered || [];
                    const strongMethods = ['fido2', 'windowsHelloForBusiness', 'certificateBasedAuthentication'];
                    const hasStrong = methods.some(m => strongMethods.includes(m));
                    mfaStatus = hasStrong ? 'Strong' : 'Weak';
                }
            }

            return {
                id: u.id,
                displayName: u.displayName,
                userPrincipalName: u.userPrincipalName,
                department: u.department || 'Unknown',
                jobTitle: u.jobTitle || 'Standard User',
                mfaStatus: mfaStatus,
                riskLevel: (risk && risk.riskLevel) ? (risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1)) : 'None',
                isPrivileged: (u.jobTitle || '').toLowerCase().includes('admin') || (u.jobTitle || '').toLowerCase().includes('director'),
                lastSignIn: u._lastSignIn
            };
        });

        IDG.data.lastSync = new Date();
        IDG.isDemoMode = false;
        idgSetProgress(100);
        idgShowLoading(false);

        if (typeof idgRenderPage === 'function') idgRenderPage(idgCurrentPage);
        await saveIdgCache();
        showToast(`Synced ${IDG.data.users.length} identity profiles`, 'success');
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
