// ============================================================================
// Teams Governance - UI Controller
// ============================================================================

const tgState = {
    isLoaded: false,
    currentPage: 'teamsgov-overview'
};

// ----------------------------------------------------------------------------
// Module Launch & Core UI
// ----------------------------------------------------------------------------

function launchTeamsGovernance() {
    console.log("Launching Teams Governance...");
    // Hide Hub
    document.getElementById('view-hub').classList.add('hidden');
    // Show Teams Gov
    const viewTg = document.getElementById('view-teamsgov');
    viewTg.classList.remove('hidden');
    viewTg.style.display = 'block'; // Force display just in case

    // Add slide-in animation
    viewTg.style.animation = 'none';
    viewTg.offsetHeight; // trigger reflow
    viewTg.style.animation = 'slide-in 0.3s ease-out forwards';

    if (!tgState.isLoaded) {
        initTeamsGovernance();
    }
}

async function initTeamsGovernance(forceRefresh = false) {
    console.log("Initializing Teams Governance module, forceRefresh:", forceRefresh);
    tgShowLoading("Scanning Microsoft Teams", "Please wait while we gather workspace data...");

    try {
        if (LG.isDemoMode) {
            await tgLoadDemoData();
        } else {
            await tgLoadGraphData(forceRefresh);
        }

        // Render initial page
        showTgPage('teamsgov-overview');

        tgState.isLoaded = true;
    } catch (error) {
        console.error("Teams Governance init error:", error);
        showToast("Failed to initialize Teams Governance.", "error");
    } finally {
        tgHideLoading();
    }
}

// ----------------------------------------------------------------------------
// Navigation & Loading States
// ----------------------------------------------------------------------------

function showTgPage(pageId) {
    // Basic navigation logic (expandable for multiple pages)
    document.querySelectorAll('.tg-page-section').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId)?.classList.remove('hidden');

    document.querySelectorAll('.tg-nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tg-nav-item[data-tgpage="${pageId}"]`)?.classList.add('active');

    // Render data based on tab
    if (pageId === 'teamsgov-overview') tgRenderOverview();
    if (pageId === 'teamsgov-all') tgRenderAllTeams();
    if (pageId === 'teamsgov-orphaned') tgRenderOrphanedTeams();
    if (pageId === 'teamsgov-guests') tgRenderGuestTeams();
    if (pageId === 'teamsgov-archived') tgRenderArchivedTeams();

    tgState.currentPage = pageId;
}

function tgShowLoading(title, subtitle) {
    document.getElementById('teamsgov-loading-overlay').classList.remove('hidden');
    document.getElementById('teamsgov-loading-title').textContent = title || "Loading...";
    document.getElementById('teamsgov-loading-sub-text').textContent = subtitle || "Please wait";

    const progress = document.getElementById('teamsgov-progress-bar');
    const pct = document.getElementById('teamsgov-progress-pct');
    progress.style.width = '0%';
    pct.textContent = '0%';
}

function tgUpdateLoading(percent, text) {
    const progress = document.getElementById('teamsgov-progress-bar');
    const pct = document.getElementById('teamsgov-progress-pct');
    progress.style.width = `${percent}%`;
    pct.textContent = `${percent}%`;

    if (text) {
        document.getElementById('teamsgov-loading-sub-text').textContent = text;
    }
}

function tgHideLoading() {
    setTimeout(() => {
        document.getElementById('teamsgov-loading-overlay').classList.add('hidden');
    }, 500);
}

// ----------------------------------------------------------------------------
// Event Listeners Registration
// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    // Nav menu
    document.querySelectorAll('.tg-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const pageId = e.currentTarget.getAttribute('data-tgpage');
            showTgPage(pageId);
        });
    });

    // Back to hub
    document.getElementById('teamsgov-back-btn')?.addEventListener('click', () => {
        if (typeof backToHub === 'function') {
            backToHub();
        } else {
            document.getElementById('view-teamsgov').classList.add('hidden');
            document.getElementById('view-hub').classList.remove('hidden');
        }
    });

    // Refresh
    document.getElementById('teamsgov-refresh-btn')?.addEventListener('click', () => {
        initTeamsGovernance(true);
    });

});
