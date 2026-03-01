/**
 * soc2gov/ui.js – Routing and UI logic for SOC2 Audit Module
 */

window.soc2CurrentPage = 'soc2-overview';

function launchSoc2Governance() {
    // Hide main hub
    const mainHub = document.getElementById('view-hub');
    if (mainHub) mainHub.classList.add('hidden');

    // Make sure SOC2 container exists
    const soc2Container = document.getElementById('view-soc2gov');
    if (soc2Container) {
        soc2Container.classList.remove('hidden');
    } else {
        console.error('view-soc2gov not found in DOM');
        return;
    }

    // Set page to overview
    soc2CurrentPage = 'soc2-overview';

    // Hook up sidebar navigation
    const navButtons = document.querySelectorAll('.soc2gov-nav-item');
    navButtons.forEach(btn => {
        btn.removeEventListener('click', soc2NavClick); // Prevent duplicates
        btn.addEventListener('click', soc2NavClick);
    });

    // Check auth/demo mode and load data
    if (!SOC2G.isDemoMode && !LG.accessToken) {
        showToast('Please sign in to access SOC2 Governance', 'warning');
        soc2ExitModule();
        return;
    }

    if (SOC2G.data.lastSync) {
        // Already loaded this session
        soc2RenderPage(soc2CurrentPage);
    } else {
        // Fetch or load from cache
        soc2LoadGraphData();
    }
}
window.launchSoc2Governance = launchSoc2Governance;

function soc2NavClick(e) {
    const targetPage = e.currentTarget.getAttribute('data-page');
    if (targetPage) {
        soc2RenderPage(targetPage);
    }
}

function soc2RenderPage(page) {
    soc2CurrentPage = page;

    // Update Sidebar Styling
    const navButtons = document.querySelectorAll('.soc2gov-nav-item');
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-page') === page) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Hide all pages
    const pages = document.querySelectorAll('.soc2gov-page-section');
    pages.forEach(p => p.classList.add('hidden'));

    // Show target
    const targetEl = document.getElementById(`page-${page}`);
    if (targetEl) {
        targetEl.classList.remove('hidden');
    }

    // Dispatch to specific renderer
    if (page === 'soc2-overview' && typeof soc2RenderOverview === 'function') {
        soc2RenderOverview();
    } else if (page === 'soc2-reports' && typeof soc2RenderReports === 'function') {
        soc2RenderReports();
    }
}
window.soc2RenderPage = soc2RenderPage;

// Helper function to show/hide loading
function soc2ShowLoading(show, title = 'Aggregating Audit Data', subtitle = 'Fetching from Azure AD and Intune', pct = 0) {
    const overlay = document.getElementById('soc2gov-loading-overlay');
    if (!overlay) return;

    if (show) {
        overlay.classList.remove('hidden');
        document.getElementById('soc2gov-loading-title').textContent = title;
        document.getElementById('soc2gov-loading-sub-text').textContent = subtitle;
        document.getElementById('soc2gov-progress-bar').style.width = `${pct}%`;
        document.getElementById('soc2gov-progress-pct').textContent = `${pct}%`;
    } else {
        overlay.classList.add('hidden');
    }
}
window.soc2ShowLoading = soc2ShowLoading;

function soc2ExitModule() {
    const soc2Container = document.getElementById('view-soc2gov');
    if (soc2Container) soc2Container.classList.add('hidden');

    const mainHub = document.getElementById('view-hub');
    if (mainHub) mainHub.classList.remove('hidden');
}
window.soc2ExitModule = soc2ExitModule;
