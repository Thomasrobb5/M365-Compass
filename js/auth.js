/**
 * auth.js – MSAL.js v3 authentication + config modal + app bootstrap
 */

const MSAL_SCOPES = [
    'User.Read',
    'User.Read.All',
    'Organization.Read.All',
    'Directory.Read.All',
    'AuditLog.Read.All',
    'Reports.Read.All',
    'Application.Read.All',
];

// ── Load saved config from localStorage ──────────────────────────────────
function loadConfig() {
    try {
        const cfg = localStorage.getItem('lg_config');
        return cfg ? JSON.parse(cfg) : {};
    } catch { return {}; }
}

function saveConfig(config) {
    localStorage.setItem('lg_config', JSON.stringify(config));
}

// ── Initialize MSAL ───────────────────────────────────────────────────────
async function initMsal(tenantId, clientId, redirectUri) {
    const msalConfig = {
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            redirectUri: redirectUri || window.location.origin,
            navigateToLoginRequestUrl: true,
        },
        cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false,
        },
        system: {
            loggerOptions: {
                loggerCallback: (level, msg) => { if (level <= 2) console.log('[MSAL]', msg); },
                logLevel: msal.LogLevel.Warning
            }
        }
    };
    LG.msalInstance = new msal.PublicClientApplication(msalConfig);
    // initialize() is MSAL v3+ only; v2 doesn't have this method
    if (typeof LG.msalInstance.initialize === 'function') {
        await LG.msalInstance.initialize();
    }
    return LG.msalInstance;
}

// ── Handle redirect after login ───────────────────────────────────────────
async function handleRedirectResult() {
    try {
        const result = await LG.msalInstance.handleRedirectPromise();
        if (result) {
            LG.account = result.account;
            LG.accessToken = result.accessToken;
            return true;
        }
    } catch (e) {
        console.error('Redirect handling error:', e);
        showToast('Authentication error: ' + e.message, 'error');
    }
    return false;
}

// ── Try silent login ──────────────────────────────────────────────────────
async function trySilentLogin() {
    const accounts = LG.msalInstance.getAllAccounts();
    if (!accounts || accounts.length === 0) return false;
    try {
        const result = await LG.msalInstance.acquireTokenSilent({
            scopes: MSAL_SCOPES,
            account: accounts[0]
        });
        LG.account = accounts[0];
        LG.accessToken = result.accessToken;
        return true;
    } catch (e) { return false; }
}

// ── Redirect login ────────────────────────────────────────────────────────
async function doLogin() {
    try {
        // Clear any stale MSAL interaction state that can block login after interruptions
        Object.keys(sessionStorage)
            .filter(k => k.startsWith('msal.') && k.includes('interaction.status'))
            .forEach(k => sessionStorage.removeItem(k));

        await LG.msalInstance.loginRedirect({ scopes: MSAL_SCOPES });
    } catch (e) {
        if (e.errorCode === 'interaction_in_progress') {
            // Nuclear option: wipe all MSAL session keys and retry once
            Object.keys(sessionStorage)
                .filter(k => k.startsWith('msal.'))
                .forEach(k => sessionStorage.removeItem(k));
            showToast('Session cleared — please try signing in again', 'info');
            return;
        }
        showToast('Login failed: ' + e.message, 'error');
        throw e;
    }
}

// ── Sign out ──────────────────────────────────────────────────────────────
function doSignOut() {
    if (LG.msalInstance && LG.account) {
        LG.msalInstance.logoutRedirect({ account: LG.account });
    } else {
        window.location.reload();
    }
}

// ── Show authenticated UI ─────────────────────────────────────────────────
function showAuthenticatedUI() {
    // Hide the login screen if it's still showing
    const loginView = document.getElementById('view-login');
    if (loginView) loginView.classList.add('hidden');
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('pages-container').classList.remove('hidden');
    document.getElementById('tenant-info').classList.remove('hidden');
    document.getElementById('signout-btn').classList.remove('hidden');
    document.getElementById('last-refreshed').classList.remove('hidden');

    const badge = document.getElementById('data-source-badge');
    badge.classList.remove('hidden');
    badge.classList.add('flex');
    if (LG.isDemoMode) {
        document.getElementById('data-source-dot').classList.add('bg-amber-400');
        document.getElementById('data-source-label').textContent = 'Demo Mode';
        document.getElementById('data-source-label').classList.add('text-amber-400');
    } else {
        document.getElementById('data-source-dot').classList.add('bg-emerald-400');
        document.getElementById('data-source-label').textContent = 'Live Data';
        document.getElementById('data-source-label').classList.add('text-emerald-400');
    }

    if (LG.account) {
        document.getElementById('signed-in-user').textContent = LG.account.username || LG.account.name || '';
    }
}

// ── Config Modal ──────────────────────────────────────────────────────────
function openConfigModal(cancellable = false) {
    const modal = document.getElementById('config-modal');
    const cfg = loadConfig();
    if (cfg.tenantId) document.getElementById('cfg-tenant-id').value = cfg.tenantId;
    if (cfg.clientId) document.getElementById('cfg-client-id').value = cfg.clientId;
    document.getElementById('cfg-redirect-uri').value = cfg.redirectUri || window.location.origin;
    if (typeof AG !== 'undefined') document.getElementById('cfg-blob-url').value = AG.blobUrl || '';
    if (cancellable) document.getElementById('cfg-cancel-btn').classList.remove('hidden');
    else document.getElementById('cfg-cancel-btn').classList.add('hidden');
    modal.classList.remove('hidden');
}

function closeConfigModal() {
    document.getElementById('config-modal').classList.add('hidden');
}

// ── Bootstrap the app ─────────────────────────────────────────────────────
async function bootstrapApp() {
    loadRates();
    const cfg = loadConfig();

    // Restore inactivity days setting
    const savedDays = localStorage.getItem('lg_inactivity_days');
    if (savedDays) {
        LG.inactivityDays = parseInt(savedDays);
        document.getElementById('inactivity-days').value = LG.inactivityDays;
    }

    // If we have config, try to init MSAL and handle redirect
    if (cfg.tenantId && cfg.clientId) {
        try {
            await initMsal(cfg.tenantId, cfg.clientId, cfg.redirectUri);
            const redirectHandled = await handleRedirectResult();
            if (redirectHandled) {
                showHub();
                return;
            }
            // Try silent token acquisition
            const silentOk = await trySilentLogin();
            if (silentOk) {
                showHub();
                return;
            }
        } catch (e) {
            console.error('MSAL init error:', e);
        }
    }

    // Show login prompt (view-login is visible by default on page load)
    // nothing to do — #view-login is already visible
}

// ── Wire up events ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Config Save
    document.getElementById('cfg-save-btn').addEventListener('click', async () => {
        const tenantId = document.getElementById('cfg-tenant-id').value.trim();
        const clientId = document.getElementById('cfg-client-id').value.trim();
        const redirectUri = document.getElementById('cfg-redirect-uri').value.trim() || window.location.origin;
        const blobUrl = (document.getElementById('cfg-blob-url')?.value || '').trim();
        const demoMode = document.getElementById('cfg-demo-mode').checked;

        if (!demoMode && (!tenantId || !clientId)) {
            showToast('Tenant ID and Client ID are required (or enable Demo Mode)', 'warning');
            return;
        }

        saveConfig({ tenantId, clientId, redirectUri });
        if (typeof agSetBlobUrl === 'function') agSetBlobUrl(blobUrl);
        closeConfigModal();

        if (demoMode) {
            LG.isDemoMode = true;
            AG.isDemoMode = true;
            closeConfigModal();
            showHub();
            showToast('Demo mode activated — choose a product to explore', 'info');
        } else {
            LG.isDemoMode = false;
            try {
                await initMsal(tenantId, clientId, redirectUri);
                showToast('Redirecting to Microsoft login...', 'info');
                await doLogin();
            } catch (e) {
                showToast('Failed to initialize: ' + e.message, 'error');
            }
        }
    });

    document.getElementById('cfg-cancel-btn').addEventListener('click', closeConfigModal);

    // Connect Button
    document.getElementById('connect-btn').addEventListener('click', () => openConfigModal(false));

    // Demo Button
    document.getElementById('demo-btn').addEventListener('click', () => {
        LG.isDemoMode = true;
        AG.isDemoMode = true;
        showHub();
        showToast('Demo mode — choose a product to get started', 'info');
    });

    // Settings (re-open config)
    document.getElementById('settings-btn').addEventListener('click', () => openConfigModal(true));

    // Sign Out (sidebar, inside module views)
    document.getElementById('signout-btn').addEventListener('click', () => {
        if (confirm('Sign out of M365 Compass?')) {
            localStorage.removeItem('lg_config');
            LG.isDemoMode = false;
            AG.isDemoMode = false;
            doSignOut();
        }
    });

    // Sign Out (Hub header button)
    const hubSignoutBtn = document.getElementById('hub-signout-btn');
    if (hubSignoutBtn) {
        hubSignoutBtn.addEventListener('click', () => {
            if (confirm('Sign out of M365 Compass?')) {
                localStorage.removeItem('lg_config');
                LG.isDemoMode = false;
                AG.isDemoMode = false;
                doSignOut();
            }
        });
    }

    // Refresh Button
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        if (LG.isDemoMode) {
            loadDemoData();
            showToast('Demo data refreshed', 'info');
            renderCurrentPage();
        } else if (LG.accessToken) {
            showLoading('Refreshing data...');
            try {
                await loadAllData();
                renderCurrentPage();
            } catch (e) {
                showToast('Refresh failed: ' + e.message, 'error');
                hideLoading();
            }
        } else {
            showToast('Please connect to Microsoft 365 first', 'warning');
        }
    });

    // Inactivity days
    document.getElementById('inactivity-days').addEventListener('change', (e) => {
        LG.inactivityDays = parseInt(e.target.value);
        localStorage.setItem('lg_inactivity_days', LG.inactivityDays);
        renderCurrentPage();
    });

    // Bootstrap
    await bootstrapApp();
});
