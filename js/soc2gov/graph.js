/**
 * soc2gov/graph.js – Data fetching for SOC2 Audit Module
 */

window.SOC2G = {
    data: {
        users: [],
        devices: [],
        apps: [],
        roles: [],
        policies: [],
        guestUsers: [],
        lastSync: null
    },
    isDemoMode: false
};

const KEY_SOC2_CACHE = 'm365_compass_soc2_cache';

async function saveSoc2Cache() {
    try {
        await localforage.setItem(KEY_SOC2_CACHE, {
            ...SOC2G.data,
            isDemoMode: SOC2G.isDemoMode,
            ts: Date.now()
        });
    } catch (e) {
        console.error('SOC2 Cache save failed:', e);
    }
}

async function loadSoc2Cache() {
    try {
        const cached = await localforage.getItem(KEY_SOC2_CACHE);
        if (cached && cached.users && cached.users.length > 0) {
            SOC2G.data.users = cached.users;
            SOC2G.data.devices = cached.devices || [];
            SOC2G.data.apps = cached.apps || [];
            SOC2G.data.roles = cached.roles || [];
            SOC2G.data.policies = cached.policies || [];
            SOC2G.data.guestUsers = cached.guestUsers || [];
            SOC2G.isDemoMode = cached.isDemoMode || false;
            SOC2G.data.lastSync = new Date(cached.ts);
            return true;
        }
    } catch (e) {
        console.error('SOC2 Cache load failed:', e);
    }
    return false;
}
window.loadSoc2Cache = loadSoc2Cache;

async function soc2LoadGraphData() {
    if (!LG.accessToken && !SOC2G.isDemoMode) {
        showToast('Please sign in first', 'warning');
        return;
    }

    try {
        soc2ShowLoading(true, 'Consolidating Compliance Data...');
        soc2SetProgress(5);

        if (SOC2G.isDemoMode) {
            await soc2LoadDemoData();
            soc2SetProgress(100);
            soc2ShowLoading(false);
            return;
        }

        // Try to piggyback off existing module caches to save API calls
        await loadIdgCache(); // Try to get IDG data (users, mfa, risk)
        await loadDgCache();  // Try to get DG data (devices, bitlocker)
        await agLoadCache();  // Try to get AG data (apps)

        soc2SetProgress(30);

        // 1. Identity Data (MFA, Risk, Inactivity)
        soc2ShowLoading(true, 'Analyzing IAM & Authentication...');
        if (IDG && IDG.data && IDG.data.users && IDG.data.users.length > 0) {
            SOC2G.data.users = IDG.data.users;
            SOC2G.data.policies = IDG.data.policies;
        } else {
            // Need to fetch it if IDG hasn't been run
            await idgLoadGraphData();
            SOC2G.data.users = IDG.data.users;
            SOC2G.data.policies = IDG.data.policies;
        }
        soc2SetProgress(50);


        // 2. Device Data (Encryption, Compliance)
        soc2ShowLoading(true, 'Analyzing Endpoint Security...');
        if (DG && DG.data && DG.data.devices && DG.data.devices.length > 0) {
            SOC2G.data.devices = DG.data.devices;
        } else {
            await dgLoadGraphData();
            SOC2G.data.devices = DG.data.devices;
        }
        soc2SetProgress(70);

        // 3. fetch highly privileged roles for Privileged Access Review
        soc2ShowLoading(true, 'Auditing Privileged Roles...');
        let rolesData = [];
        try {
            // Fetch Global Admin and Security Admin role members
            const globalAdminsRoles = await graphFetchAll('https://graph.microsoft.com/v1.0/directoryRoles/roleTemplateId=62e90394-69f5-4237-9190-012177145e10/members');
            const securityAdminsRoles = await graphFetchAll('https://graph.microsoft.com/v1.0/directoryRoles/roleTemplateId=194ae4cb-b126-40b2-bd5b-6091b380977d/members');

            const processRole = (members, roleName) => {
                members.forEach(m => {
                    if (m['@odata.type'] === '#microsoft.graph.user') {
                        rolesData.push({
                            id: m.id,
                            displayName: m.displayName,
                            userPrincipalName: m.userPrincipalName,
                            role: roleName
                        });
                    }
                });
            };

            processRole(globalAdminsRoles, 'Global Administrator');
            processRole(securityAdminsRoles, 'Security Administrator');

            SOC2G.data.roles = rolesData;

        } catch (e) {
            console.warn('Failed to fetch Roles:', e);
            showToast('Permission denied for Role Reports. Check RoleManagement.Read.Directory.', 'warning');
        }

        soc2SetProgress(85);

        // 4. Fetch Guest Users
        soc2ShowLoading(true, 'Auditing Guest Accounts...');
        try {
            SOC2G.data.guestUsers = await graphFetchAll('https://graph.microsoft.com/v1.0/users?$filter=userType eq \'Guest\'&$select=id,displayName,userPrincipalName,createdDateTime,signInActivity,accountEnabled');
        } catch (e) {
            console.warn('Failed to fetch Guests:', e);
        }


        SOC2G.data.lastSync = new Date();
        SOC2G.isDemoMode = false;
        soc2SetProgress(100);
        soc2ShowLoading(false);

        if (typeof soc2RenderPage === 'function') soc2RenderPage(soc2CurrentPage);
        await saveSoc2Cache();
        showToast('SOC2 Audit data aggregation complete', 'success');

    } catch (err) {
        console.error('Error fetching SOC2 data:', err);
        showToast('Failed to load SOC2 data: ' + err.message, 'error');
        soc2ShowLoading(false);
    }
}
window.soc2LoadGraphData = soc2LoadGraphData;

function soc2SetProgress(pct) {
    const bar = document.getElementById('soc2gov-progress-bar');
    const label = document.getElementById('soc2gov-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
}
window.soc2SetProgress = soc2SetProgress;

function soc2ShowLoading(show, message = 'Compiling compliance data...') {
    const overlay = document.getElementById('soc2gov-loading-overlay');
    const textEl = document.getElementById('soc2gov-loading-sub-text');
    if (overlay) {
        if (show) {
            if (textEl) textEl.textContent = message;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}
window.soc2ShowLoading = soc2ShowLoading;
