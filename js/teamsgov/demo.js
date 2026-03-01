// ============================================================================
// Teams Governance - Demo Mode Data
// ============================================================================

window.tgDemoData = {
    teams: []
};

// ----------------------------------------------------------------------------
// Generate Demo Teams
// ----------------------------------------------------------------------------

function generateDemoTeams() {
    const list = [];
    const prefixes = ['PRJ', 'EXT', 'DPT', 'INIT', 'COMMITTEE', 'TEMP'];
    const departments = ['Marketing', 'Sales', 'Engineering', 'HR', 'Finance', 'Legal'];

    // Generate ~45 fake Teams
    for (let i = 0; i < 45; i++) {
        const isExternal = Math.random() > 0.8;
        const visibility = Math.random() > 0.9 ? 'Public' : 'Private';

        let prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        let dept = departments[Math.floor(Math.random() * departments.length)];
        let name = `${prefix}-${dept}-${Math.floor(Math.random() * 1000)}`;

        // Owner logic: 5% chance of being ownerless
        const isOwnerless = Math.random() < 0.05;
        const ownerCount = isOwnerless ? 0 : Math.floor(Math.random() * 3) + 1;

        // Guest logic: Ensure External teams always have guests
        const guestCount = isExternal ? Math.floor(Math.random() * 10) + 1 : (Math.random() > 0.9 ? 1 : 0);

        const memberCount = Math.floor(Math.random() * 50) + 5;

        // Random inactivity between 0 and 200 days
        const daysInactive = Math.floor(Math.random() * 200);
        const lastAct = new Date();
        lastAct.setDate(lastAct.getDate() - daysInactive);

        list.push({
            id: `demo-team-${i}`,
            displayName: name,
            description: `Demo description for ${name}`,
            visibility: visibility,
            createdDateTime: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
            lastActivityDate: lastAct.toISOString(),
            owners: ownerCount,
            guests: guestCount,
            members: memberCount,
            isArchived: Math.random() > 0.95
        });
    }
    window.tgDemoData.teams = list;
}

// ----------------------------------------------------------------------------
// Demo Actions
// ----------------------------------------------------------------------------

async function tgLoadDemoData() {
    console.log("Loading Teams Gov Demo Data...");
    tgUpdateLoading(30, "Generating mock teams...");

    return new Promise(resolve => {
        setTimeout(() => {
            generateDemoTeams();
            tgUpdateLoading(100, "Done");
            resolve();
        }, 800);
    });
}
