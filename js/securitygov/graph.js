/**
 * Security Governance - Graph API Controller
 */

async function secLoadGraphData(forceRefresh = false) {
    console.log("Fetching Security data from Graph API...");

    // 1. Check Cache
    if (!forceRefresh) {
        const cached = await localforage.getItem('tg_sec_data');
        if (cached && (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000)) {
            console.log("Using cached security data");
            SEC.data = cached.data;
            // Ensure properties exist if loading from old cache
            if (!SEC.data.servicePrincipals) SEC.data.servicePrincipals = {};
            return;
        }
    }

    try {
        // 2. Fetch Directory Roles with members
        const rolesResponse = await graphFetch('https://graph.microsoft.com/v1.0/directoryRoles?$expand=members');
        const roles = rolesResponse.value || [];

        // 3. Fetch OAuth2 Permission Grants (User Consent)
        const grantsResponse = await graphFetch('https://graph.microsoft.com/v1.0/oauth2PermissionGrants');
        const grants = grantsResponse.value || [];

        // 4. Fetch Service Principals for Display Names
        // Using graphFetchAll to handle potentially large lists of apps
        let sps = [];
        try {
            sps = await graphFetchAll('https://graph.microsoft.com/v1.0/servicePrincipals?$select=id,displayName');
        } catch (e) {
            console.warn("Failed to fetch Service Principals, app names will be generic", e);
        }

        // 5. Transform and update state
        SEC.data.roles = roles;
        SEC.data.grants = grants;

        // Build map for fast lookup
        SEC.data.servicePrincipals = {};
        sps.forEach(sp => {
            if (sp.id) SEC.data.servicePrincipals[sp.id] = sp.displayName;
        });

        // 6. Cache result
        await localforage.setItem('tg_sec_data', {
            timestamp: Date.now(),
            data: SEC.data
        });

    } catch (err) {
        throw new Error("Graph Security Request Failed: " + err.message);
    }
}
