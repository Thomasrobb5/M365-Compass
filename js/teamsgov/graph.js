// ============================================================================
// Teams Governance - Microsoft Graph Engine
// ============================================================================

window.tgData = {
    teams: [], // List of all Teams
    cacheKey: 'tg_data_cache',
    cacheTTL: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// ----------------------------------------------------------------------------
// Cache Logic (IndexedDB via localforage)
// ----------------------------------------------------------------------------
async function tgSaveCache() {
    try {
        const payload = { ts: Date.now(), teams: window.tgData.teams };
        await localforage.setItem(window.tgData.cacheKey, payload);
    } catch (e) {
        console.error('Teams Gov IndexedDB cache write failed:', e);
    }
}

async function tgLoadCache() {
    try {
        const data = await localforage.getItem(window.tgData.cacheKey);
        if (!data) return null;
        const { ts, teams } = data;
        if (!teams || !teams.length) return null;
        const age = Date.now() - ts;
        return { teams, ageMs: age, fresh: age < window.tgData.cacheTTL, ts };
    } catch (e) {
        console.error('Teams Gov IndexedDB cache read failed:', e);
        return null;
    }
}

async function tgClearCache() {
    try {
        await localforage.removeItem(window.tgData.cacheKey);
    } catch (e) { console.error('Teams Gov IndexedDB cache clear failed:', e); }
}

// ----------------------------------------------------------------------------
// Core Fetch logic
// ----------------------------------------------------------------------------

async function tgLoadGraphData(forceRefresh = false) {
    console.log("Loading Teams via Microsoft Graph...");
    tgUpdateLoading(5, "Checking local cache...");
    window.tgData.teams = [];

    if (!LG.msalInstance.getAllAccounts().length) {
        throw new Error("No active MSAL account found.");
    }

    if (!forceRefresh) {
        const cached = await tgLoadCache();
        if (cached && cached.fresh) {
            console.log("Teams Governance using cached data from " + new Date(cached.ts).toLocaleString());
            window.tgData.teams = cached.teams;
            tgUpdateLoading(100, "Loaded from cache.");
            return;
        }
    }

    try {
        tgUpdateLoading(10, "Fetching Teams list...");

        // Step 1: Fetch all M365 Groups which are provisioned as Teams
        // The endpoint GET /groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')
        let groupsUrl = "https://graph.microsoft.com/v1.0/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$select=id,displayName,description,visibility,createdDateTime";
        let allGroups = [];

        let groupsData = await graphFetch(groupsUrl);
        if (groupsData && groupsData.value) {
            allGroups = allGroups.concat(groupsData.value);
            while (groupsData['@odata.nextLink']) {
                groupsData = await graphFetch(groupsData['@odata.nextLink']);
                allGroups = allGroups.concat(groupsData.value || []);
            }
        }

        tgUpdateLoading(40, `Found ${allGroups.length} Teams. Analysing owners and guests...`);

        // Step 3: For each team, get owner and member counts.

        const POOL_SIZE = 5; // To avoid throttling
        let completed = 0;

        for (let i = 0; i < allGroups.length; i += POOL_SIZE) {
            const batch = allGroups.slice(i, i + POOL_SIZE);

            const promises = batch.map(async (group) => {
                // Fetch Owners
                const ownersUrl = `https://graph.microsoft.com/v1.0/groups/${group.id}/owners?$select=id,userPrincipalName`;
                let owners = [];
                try {
                    const oData = await graphFetch(ownersUrl);
                    owners = oData.value || [];
                } catch (e) { console.warn(`Failed to fetch owners for ${group.id}`); }

                // Fetch Members to identify external guests (userType eq 'Guest')
                // Note: Standard Graph requires Directory.Read.All to read userType accurately
                const membersUrl = `https://graph.microsoft.com/v1.0/groups/${group.id}/members?$select=id,userPrincipalName,userType`;
                let members = [];
                let guests = [];
                try {
                    const mData = await graphFetch(membersUrl);
                    members = mData.value || [];
                    guests = members.filter(m => m.userType === 'Guest' || m.userPrincipalName?.includes('#EXT#'));
                } catch (e) { console.warn(`Failed to fetch members for ${group.id}`); }

                // Fetch Teams specific settings (isArchived)
                const teamUrl = `https://graph.microsoft.com/v1.0/teams/${group.id}?$select=isArchived`;
                let isArchived = false;
                try {
                    const tData = await graphFetch(teamUrl);
                    isArchived = tData.isArchived === true;
                } catch (e) { console.warn(`Failed to fetch team specific settings for ${group.id}`); }

                return {
                    id: group.id,
                    displayName: group.displayName || 'Unnamed Team',
                    description: group.description,
                    visibility: group.visibility || 'Unknown',
                    createdDateTime: group.createdDateTime,
                    isArchived: isArchived,
                    owners: owners.length,
                    members: members.length,
                    guests: guests.length,
                    rawOwners: owners
                };
            });

            const results = await Promise.all(promises);
            window.tgData.teams.push(...results);

            completed += results.length;
            const pct = Math.floor(40 + (completed / allGroups.length) * 60);
            tgUpdateLoading(pct, `Analyzed ${completed} of ${allGroups.length} Teams...`);
        }

        console.log("Teams Governance data loaded:", window.tgData.teams);

        // Save to cache
        await tgSaveCache();

    } catch (err) {
        console.error("Error loading Teams data from Graph:", err);
        throw err;
    }
}

// ----------------------------------------------------------------------------
// Create New Team flow
// ----------------------------------------------------------------------------
// Creating a Team requires Group.ReadWrite.All & Team.Create
async function tgCreateTeamGraph(name, description, ownerUpn, templatePrefix) {
    console.log(`Creating Team: ${templatePrefix}${name} with owner ${ownerUpn}`);

    // 1. Resolve owner UPN to User ID
    const userUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(ownerUpn)}?$select=id`;
    let userId;
    try {
        const uData = await graphFetch(userUrl);
        if (!uData.id) throw new Error("User not found");
        userId = uData.id;
    } catch (e) {
        throw new Error(`Could not find a user with UPN: ${ownerUpn}`);
    }

    const finalName = `${templatePrefix}${name}`;

    // 2. We use the Unified Group creation endpoint.
    // To create a Team, standard method is to use the /teams endpoint or create an M365 group and then PUT /teams/{id}
    // Easiest robust method in Graph v1.0: Create an M365 Group with team provisioning option.
    const createGroupPayload = {
        displayName: finalName,
        description: description || `Created via M365 Compass - ${templatePrefix}`,
        mailEnabled: true,
        mailNickname: finalName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
        securityEnabled: false,
        groupTypes: ["Unified"],
        visibility: "Private",
        "owners@odata.bind": [`https://graph.microsoft.com/v1.0/users/${userId}`]
    };

    let newGroup;
    try {
        newGroup = await graphFetch("https://graph.microsoft.com/v1.0/groups", { method: "POST", body: JSON.stringify(createGroupPayload) });
        if (!newGroup || !newGroup.id) throw new Error("Failed to create M365 Group");
    } catch (e) {
        console.error(e);
        throw new Error("Failed to create the underlying M365 Group. Ensure 'Group.ReadWrite.All' permission is granted.");
    }

    // 3. Add the Team overlay (PUT /groups/{id}/team)
    // Note: Graph API sometimes requires a few seconds delay after group creation before adding a Team
    await new Promise(r => setTimeout(r, 2000));

    try {
        const teamPayload = {
            "memberSettings": {
                "allowCreateUpdateChannels": true
            },
            "messagingSettings": {
                "allowUserEditMessages": true,
                "allowUserDeleteMessages": true
            },
            "funSettings": {
                "allowGiphy": true,
                "giphyContentRating": "strict"
            }
        };
        await graphFetch(`https://graph.microsoft.com/v1.0/teams`, {
            method: "POST", body: JSON.stringify({
                "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
                "group@odata.bind": `https://graph.microsoft.com/v1.0/groups('${newGroup.id}')`,
                ...teamPayload
            })
        });

        return newGroup.id;
    } catch (e) {
        console.error(e);
        // Sometimes it fails if done too quickly, but the group is made.
        throw new Error("M365 Group was created, but applying the Team overlay failed or timed out. Ensure 'Team.Create' permission is granted.");
    }
}
