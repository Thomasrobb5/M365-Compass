// ============================================================================
// Teams Governance - Overview Page Logic
// ============================================================================

window.tgFilteredTeams = [];

async function tgRenderOverview() {
    const teams = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;
    window.tgFilteredTeams = [...teams];

    tgCalculateKpis(teams);
    tgRenderTable(teams);

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

function tgRenderTable(teams) {
    const tbody = document.getElementById('tg-teams-tbody');
    if (!tbody) return;

    if (teams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-500 py-8">No Teams found matching criteria.</td></tr>`;
        return;
    }

    let html = '';
    teams.forEach(t => {
        const ownerClass = t.owners === 0 ? "text-amber-400 font-bold" : "text-white";
        const guestClass = t.guests > 0 ? "text-emerald-400 font-bold" : "text-slate-400";
        const visClass = t.visibility.toLowerCase() === 'public' ? "text-violet-400" : "text-slate-400";

        html += `
            <tr class="hover:bg-surface-800/50 transition-colors">
                <td>
                    <div class="font-medium text-white">${escapeHtml(t.displayName)}</div>
                    ${t.description ? `<div class="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">${escapeHtml(t.description)}</div>` : ''}
                </td>
                <td class="${visClass}">${escapeHtml(t.visibility)}</td>
                <td class="text-center ${ownerClass}">${t.owners}</td>
                <td class="text-center ${guestClass}">${t.guests}</td>
                <td class="text-right">
                    <button class="text-xs text-brand-400 hover:text-brand-300" onclick="alert('Team details view coming soon')">View</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function tgFilterTeams() {
    const q = document.getElementById('tg-search').value.toLowerCase();
    const source = LG.isDemoMode ? window.tgDemoData.teams : window.tgData.teams;

    if (!q) {
        window.tgFilteredTeams = [...source];
    } else {
        window.tgFilteredTeams = source.filter(t =>
            t.displayName.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
    }

    tgRenderTable(window.tgFilteredTeams);
}

// ----------------------------------------------------------------------------
// CSV Export
// ----------------------------------------------------------------------------
function tgExportTeamsCsv() {
    exportToCsv(window.tgFilteredTeams, 'teams-governance-export.csv', [
        { label: 'Team', value: 'displayName' },
        { label: 'Visibility', value: 'visibility' },
        { label: 'Owners Count', value: 'owners' },
        { label: 'Members', value: 'members' },
        { label: 'Guests', value: 'guests' },
        { label: 'Description', value: 'description' },
        { label: 'Created Date', value: 'createdDateTime' }
    ]);
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
            initTeamsGovernance(); // reloads data
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
