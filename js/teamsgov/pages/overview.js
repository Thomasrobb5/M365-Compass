// ============================================================================
// Teams Governance - Overview Page Logic
// ============================================================================

window.tgFilteredTeams = [];

async function tgRenderOverview() {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;

    // Overview only needs KPIs and Charts now
    tgCalculateKpis(teams);

    // Render Charts
    if (typeof renderTeamsVisibilityChart === 'function') renderTeamsVisibilityChart(teams);
    if (typeof renderTeamsTemplateChart === 'function') renderTeamsTemplateChart(teams);
    if (typeof renderTeamsGuestsChart === 'function') renderTeamsGuestsChart(teams);
}

// ----------------------------------------------------------------------------
// KPIs
// ----------------------------------------------------------------------------
function tgCalculateKpis(teams) {
    let total = teams.length;
    let ownerless = 0;
    let publicTeams = 0;
    let externalTeams = 0;

    teams.forEach(t => {
        if (t.owners === 0) ownerless++;
        if (t.visibility.toLowerCase() === 'public') publicTeams++;
        if (t.guests > 0) externalTeams++;
    });

    // Update DOM
    document.getElementById('tg-kpi-total').textContent = total.toLocaleString();
    document.getElementById('tg-kpi-ownerless').textContent = ownerless.toLocaleString();
    document.getElementById('tg-kpi-public').textContent = publicTeams.toLocaleString();
    document.getElementById('tg-kpi-external').textContent = externalTeams.toLocaleString();
}

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ----------------------------------------------------------------------------
// Table Rendering & Filtering
// ----------------------------------------------------------------------------

function tgRenderTable(teams, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (teams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-500 py-8">No Teams found matching criteria.</td></tr>`;
        return;
    }

    let html = '';
    teams.forEach(t => {
        const ownerClass = t.owners === 0 ? "text-amber-400 font-bold" : "text-white";
        const guestClass = t.guests > 0 ? "text-emerald-400 font-bold" : "text-slate-400";
        const visClass = t.visibility.toLowerCase() === 'public' ? "text-violet-400" : "text-slate-400";

        let activityCol = '';
        if (tbodyId === 'tg-teams-archived-tbody') {
            const archivedBadge = t.isArchived
                ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/30 text-rose-400 border border-rose-800">Archived</span>'
                : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800">Active</span>';
            activityCol = `<td class="text-sm whitespace-nowrap">${archivedBadge}</td>`;
        }

        const dispOwners = t.owners >= 100 ? '100+' : t.owners;
        const dispGuests = t.guests >= 100 ? '100+' : t.guests;

        html += `
            <tr class="hover:bg-surface-800/50 transition-colors cursor-pointer" onclick="tgOpenTeamDetailsModal('${t.id}')">
                <td>
                    <div class="font-medium text-white">${escapeHtml(t.displayName)}</div>
                    ${t.description ? `<div class="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">${escapeHtml(t.description)}</div>` : ''}
                </td>
                <td class="${visClass} capitalize">${escapeHtml(t.visibility)}</td>
                ${activityCol}
                <td class="text-center ${ownerClass}">${dispOwners}</td>
                <td class="text-center ${guestClass}">${dispGuests}</td>
                <td class="text-right">
                    <button class="text-xs text-brand-400 hover:text-brand-300" onclick="event.stopPropagation(); tgOpenTeamDetailsModal('${t.id}')">View</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function tgRenderAllTeams() {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;
    window.tgFilteredTeamsAll = [...teams];
    tgRenderTable(teams, 'tg-teams-all-tbody');
}

async function tgRenderOrphanedTeams() {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;
    window.tgFilteredTeamsOrphaned = teams.filter(t => t.owners === 0);
    tgRenderTable(window.tgFilteredTeamsOrphaned, 'tg-teams-orphaned-tbody');
}

async function tgRenderArchivedTeams() {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;
    window.tgFilteredTeamsArchived = teams.filter(t => t.isArchived === true);
    tgRenderTable(window.tgFilteredTeamsArchived, 'tg-teams-archived-tbody');
}

async function tgRenderGuestTeams() {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;
    window.tgFilteredTeamsGuests = teams.filter(t => t.guests > 0);
    tgRenderTable(window.tgFilteredTeamsGuests, 'tg-teams-guests-tbody');
}

function tgFilterTeams(tab) {
    let q = '';
    let source = [];
    let stateKey = '';
    let tbodyId = '';

    const allTeams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;

    if (tab === 'all') {
        q = document.getElementById('tg-search-all').value.toLowerCase();

        const visFilter = document.getElementById('tg-filter-visibility').value;
        const tplFilter = document.getElementById('tg-filter-template').value;

        source = allTeams.filter(t => {
            // Check visibility
            if (visFilter !== 'all') {
                if (t.visibility.toLowerCase() !== visFilter) return false;
            }
            // Check template prefix
            if (tplFilter !== 'all') {
                const name = t.displayName.toUpperCase();
                if (tplFilter === 'other') {
                    if (name.startsWith('PRJ-') || name.startsWith('DPT-') || name.startsWith('EXT-')) return false;
                } else {
                    if (!name.startsWith(tplFilter + '-')) return false;
                }
            }
            return true;
        });

        stateKey = 'tgFilteredTeamsAll';
        tbodyId = 'tg-teams-all-tbody';
    }
    else if (tab === 'orphaned') {
        q = document.getElementById('tg-search-orphaned').value.toLowerCase();
        source = allTeams.filter(t => t.owners === 0);
        stateKey = 'tgFilteredTeamsOrphaned';
        tbodyId = 'tg-teams-orphaned-tbody';
    }
    else if (tab === 'guests') {
        q = document.getElementById('tg-search-guests').value.toLowerCase();
        source = allTeams.filter(t => t.guests > 0);
        stateKey = 'tgFilteredTeamsGuests';
        tbodyId = 'tg-teams-guests-tbody';
    }
    else if (tab === 'archived') {
        q = document.getElementById('tg-search-archived').value.toLowerCase();
        source = allTeams.filter(t => t.isArchived === true);
        stateKey = 'tgFilteredTeamsArchived';
        tbodyId = 'tg-teams-archived-tbody';
    }

    if (!q) {
        window[stateKey] = [...source];
    } else {
        window[stateKey] = source.filter(t =>
            t.displayName.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
    }

    tgRenderTable(window[stateKey], tbodyId);
}

// ----------------------------------------------------------------------------
// CSV Export
// ----------------------------------------------------------------------------
function tgExportTeamsCsv(tab) {
    let dataToExport = [];
    let filename = 'teams-export.csv';

    if (tab === 'all') { dataToExport = window.tgFilteredTeamsAll; filename = 'all-teams-export.csv'; }
    if (tab === 'orphaned') { dataToExport = window.tgFilteredTeamsOrphaned; filename = 'orphaned-teams-export.csv'; }
    if (tab === 'guests') { dataToExport = window.tgFilteredTeamsGuests; filename = 'guest-teams-export.csv'; }
    if (tab === 'archived') { dataToExport = window.tgFilteredTeamsArchived; filename = 'archived-teams-export.csv'; }

    // Format data to show 100+ for large arrays
    const formattedData = dataToExport.map(t => ({
        ...t,
        owners: t.owners >= 100 ? '100+' : t.owners,
        members: t.members >= 100 ? '100+' : t.members,
        guests: t.guests >= 100 ? '100+' : t.guests
    }));

    exportToCsv(formattedData, filename, [
        { label: 'Team', value: 'displayName' },
        { label: 'Visibility', value: 'visibility' },
        { label: 'Archived', value: 'isArchived' },
        { label: 'Owners Count', value: 'owners' },
        { label: 'Members', value: 'members' },
        { label: 'Guests', value: 'guests' },
        { label: 'Description', value: 'description' },
        { label: 'Created Date', value: 'createdDateTime' }
    ]);
}

// ----------------------------------------------------------------------------
// Team Details Modal
// ----------------------------------------------------------------------------
function tgOpenTeamDetailsModal(teamId) {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;
    const t = teams.find(x => x.id === teamId);
    if (!t) return;

    document.getElementById('tg-detail-avatar').textContent = t.displayName.substring(0, 2).toUpperCase();
    document.getElementById('tg-detail-name').innerHTML = `${escapeHtml(t.displayName)} <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-700 ${t.visibility.toLowerCase() === 'public' ? 'text-violet-400' : 'text-slate-300'} capitalize">${escapeHtml(t.visibility)}</span>`;
    document.getElementById('tg-detail-id').textContent = `Group ID: ${t.id}`;

    document.getElementById('tg-detail-guests').textContent = t.guests >= 100 ? '100+' : (t.guests || 0);
    document.getElementById('tg-detail-members').textContent = t.members >= 100 ? '100+' : (t.members || 0);
    document.getElementById('tg-detail-owners').textContent = t.owners >= 100 ? '100+' : (t.owners || 0);

    document.getElementById('tg-detail-desc').textContent = t.description || 'No description provided.';

    document.getElementById('tg-detail-created').textContent = t.createdDateTime ? new Date(t.createdDateTime).toLocaleDateString() : 'Unknown';
    document.getElementById('tg-detail-archived').textContent = t.isArchived ? 'Archived (Read-Only)' : 'Active Workspace';

    document.getElementById('tg-details-modal').classList.remove('hidden');
    lucide.createIcons();
}

function tgCloseTeamDetailsModal() {
    document.getElementById('tg-details-modal').classList.add('hidden');
}

// ----------------------------------------------------------------------------
// Create Team Modal Logic
// ----------------------------------------------------------------------------

function tgOpenCreateTeamModal() {
    document.getElementById('tg-create-status').classList.add('hidden');
    document.getElementById('tg-team-name').value = '';
    document.getElementById('tg-team-desc').value = '';
    document.getElementById('tg-team-owner').value = '';
    tgUpdateTemplatePreview();
    document.getElementById('tg-create-modal').classList.remove('hidden');
}

function tgCloseCreateTeamModal() {
    document.getElementById('tg-create-modal').classList.add('hidden');
}

function tgUpdateTemplatePreview() {
    const template = document.querySelector('input[name="tg-template"]:checked').value;
    const name = document.getElementById('tg-team-name').value;

    document.getElementById('tg-prefix-preview').textContent = `${template}-`;

    const previewName = name.trim() ? name : 'New Team';
    document.getElementById('tg-final-name-preview').textContent = `${template}-${previewName}`;
}

// Attach listeners to update previews
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[name="tg-template"]').forEach(el => {
        el.addEventListener('change', tgUpdateTemplatePreview);
    });
    document.getElementById('tg-team-name')?.addEventListener('input', tgUpdateTemplatePreview);
});

async function tgSubmitCreateTeam() {
    const btn = document.getElementById('tg-create-btn');
    const statusDiv = document.getElementById('tg-create-status');
    const template = document.querySelector('input[name="tg-template"]:checked').value;
    const name = document.getElementById('tg-team-name').value.trim();
    const desc = document.getElementById('tg-team-desc').value.trim();
    const owner = document.getElementById('tg-team-owner').value.trim();

    if (!name || !owner) {
        statusDiv.textContent = 'Team Name and Primary Owner are required.';
        statusDiv.className = 'block p-3 rounded-xl border text-sm mt-4 border-red-800 bg-red-900/30 text-red-400';
        return;
    }

    try {
        // UI Loading State
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i> Provisioning...`;
        statusDiv.className = 'block p-3 rounded-xl border text-sm mt-4 border-blue-800 bg-blue-900/30 text-blue-400';
        statusDiv.textContent = 'Sending request to Microsoft Graph to provision team...';

        if (LG.isDemoMode) {
            // Fake it for demo mode
            await new Promise(r => setTimeout(r, 1500));
            window.tgDemoData.teams.unshift({
                id: `demo-created-${Date.now()}`,
                displayName: `${template}-${name}`,
                description: desc || `Demo provisioned`,
                visibility: 'Private',
                createdDateTime: new Date().toISOString(),
                owners: 1,
                guests: template === 'EXT' ? 1 : 0,
                members: 1,
                isArchived: false
            });
        } else {
            // Real Graph Call
            await tgCreateTeamGraph(name, desc, owner, `${template}-`);
        }

        // Success
        statusDiv.className = 'block p-3 rounded-xl border text-sm mt-4 border-emerald-800 bg-emerald-900/30 text-emerald-400';
        statusDiv.textContent = 'Team successfully provisioned! Refreshing data...';

        // Refresh overview
        setTimeout(() => {
            tgCloseCreateTeamModal();
            initTeamsGovernance(true); // reloads data by bypassing cache
        }, 2000);

    } catch (err) {
        statusDiv.className = 'block p-3 rounded-xl border text-sm mt-4 border-red-800 bg-red-900/30 text-red-400';
        statusDiv.textContent = err.message || 'An error occurred provisioning the team.';
        console.error(err);
    } finally {
        // Reset button only on error (on success we close modal anyway)
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Provision Team`;
        lucide.createIcons(); // re-init icons
    }
}
