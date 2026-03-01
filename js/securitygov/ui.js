/**
 * Security Governance - UI Controller
 */

const SEC = {
    data: {
        roles: [],
        grants: []
    },
    state: {
        isLoaded: false,
        initialized: false,
        currentPage: 'securitygov-overview',
        activeRoleId: null // Current role drill-down filter
    }
};

async function launchSecGov() {
    console.log("Launching Security Governance...");

    // Initialise UI event listeners if first time
    if (!SEC.state.initialized) {
        initSecUI();
        SEC.state.initialized = true;
    }

    // Nav to overview by default
    secNavigateTo('securitygov-overview');

    // Load data
    if (!SEC.state.isLoaded) {
        await secRefreshData();
    }
}

function initSecUI() {
    // Back button
    document.getElementById('securitygov-back-btn')?.addEventListener('click', () => {
        if (typeof backToHub === 'function') backToHub();
    });

    // Sidebar navigation
    document.querySelectorAll('.sec-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-secpage');
            secNavigateTo(page);
        });
    });

    // Refresh button
    document.getElementById('securitygov-refresh-btn')?.addEventListener('click', () => {
        secRefreshData(true);
    });

    // Search Filtering
    document.getElementById('sec-admins-search')?.addEventListener('input', (e) => {
        secRenderAdminRoles(e.target.value);
    });
    document.getElementById('sec-globaladmins-search')?.addEventListener('input', (e) => {
        secRenderGlobalAdmins(e.target.value);
    });
    document.getElementById('sec-consent-search')?.addEventListener('input', (e) => {
        secRenderConsentGrants(e.target.value);
    });
}

function secNavigateTo(pageId) {
    console.log("Navigating to Security Gov page:", pageId);
    SEC.state.currentPage = pageId;

    // Update Sidebar
    document.querySelectorAll('.sec-nav-item').forEach(btn => {
        if (btn.getAttribute('data-secpage') === pageId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update Title
    const titleEl = document.getElementById('securitygov-page-title');
    const subtitleEl = document.getElementById('securitygov-page-subtitle');

    if (pageId === 'securitygov-overview') {
        titleEl.textContent = 'Security Overview';
        subtitleEl.textContent = 'Tenant-wide security posture & risk metrics';
    } else if (pageId === 'securitygov-admins') {
        titleEl.textContent = 'Admin Role Audit';
        subtitleEl.textContent = 'Auditing privileged directory roles and members';
    } else if (pageId === 'securitygov-globaladmins') {
        titleEl.textContent = 'Global Administrators';
        subtitleEl.textContent = 'Critical privileged access that can manage the entire tenant';
    } else if (pageId === 'securitygov-consent') {
        titleEl.textContent = 'User Consent Grants';
        subtitleEl.textContent = 'Third-party apps with delegated access to tenant data';
    }

    // Toggle Page Visibility
    document.querySelectorAll('.sec-page').forEach(p => {
        p.classList.add('hidden');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }

    // Re-render data if loaded
    if (SEC.state.isLoaded) {
        renderSecPage(pageId);
    }
}

async function secRefreshData(force = false) {
    secShowLoading(true);

    try {
        if (LG.isDemoMode) {
            await secLoadDemoData();
        } else {
            await secLoadGraphData(force);
        }

        SEC.state.isLoaded = true;
        renderSecPage(SEC.state.currentPage);
    } catch (err) {
        console.error("Security data load failed:", err);
        secShowLoading(false, "Failed to load security data", err.message);
    } finally {
        secShowLoading(false);
    }
}

function secShowLoading(show, text = "Audit in progress...", subtext = "Connecting to Graph API") {
    const overlay = document.getElementById('securitygov-loading-overlay');
    const pages = document.getElementById('securitygov-pages');

    if (show) {
        overlay.classList.remove('hidden');
        pages.classList.add('opacity-40', 'pointer-events-none');
        document.getElementById('security-loading-text').textContent = text;
        document.getElementById('security-loading-sub-text').textContent = subtext;
    } else {
        overlay.classList.add('hidden');
        pages.classList.remove('opacity-40', 'pointer-events-none');
    }
}

function renderSecPage(pageId) {
    if (pageId === 'securitygov-overview') {
        if (typeof secRenderOverview === 'function') secRenderOverview();
    } else if (pageId === 'securitygov-admins') {
        if (typeof secRenderRoleCards === 'function') secRenderRoleCards();
        if (typeof secRenderAdminRoles === 'function') secRenderAdminRoles();
    } else if (pageId === 'securitygov-globaladmins') {
        if (typeof secRenderGlobalAdmins === 'function') secRenderGlobalAdmins();
    } else if (pageId === 'securitygov-consent') {
        if (typeof secRenderConsentGrants === 'function') secRenderConsentGrants();
    }
}

function secClearRoleFilter() {
    SEC.state.activeRoleId = null;
    document.getElementById('sec-active-role-filter').classList.add('hidden');
    document.getElementById('sec-admins-search').value = '';
    secRenderAdminRoles();
    secRenderRoleCards();
}
window.secClearRoleFilter = secClearRoleFilter;
