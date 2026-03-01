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
            return;
        }
    }

    try {
        // 2. Fetch Directory Roles with members
        // We use $expand=members to get who is assigned to each role in one call
        const rolesResponse = await graphFetch('/directoryRoles?$expand=members');
        const roles = rolesResponse.value || [];

        // 3. Fetch OAuth2 Permission Grants (User Consent)
        const grantsResponse = await graphFetch('/oauth2PermissionGrants');
        const grants = grantsResponse.value || [];

        // 4. Transform and update state
        SEC.data.roles = roles;
        SEC.data.grants = grants;

        // 5. Cache result
        await localforage.setItem('tg_sec_data', {
            timestamp: Date.now(),
            data: SEC.data
        });

    } catch (err) {
        throw new Error("Graph Security Request Failed: " + err.message);
    }
}
