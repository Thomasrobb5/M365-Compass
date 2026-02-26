/**
 * graph.js – Microsoft Graph API helpers + SKU mapping + demo data
 */

// ── SKU Name Map (skuId → friendly name, and partNumber → friendly name) ────────────
const SKU_NAMES = {
  // —— By SKU ID ——
  "06ebc4ee-1bb5-47dd-8120-11324bc54e06": "Microsoft 365 E5",
  "3b555118-da6a-4418-894f-7df1e2096870": "Microsoft 365 Business Basic",
  "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46": "Microsoft 365 Business Premium",
  "19ec0d23-8335-4cbd-94ac-6050e30712fa": "Exchange Online Plan 2",
  "36a0f3b3-adb5-49ea-bf66-762134cf063a": "Microsoft Teams Premium",
  "4cde982a-ede4-4409-9ae6-b003453c8ea6": "Microsoft Teams Rooms Pro",
  "b737dad2-2f6c-4c65-90e3-ca563267e8b9": "Planner Plan 1",
  "b30411f5-fea1-4a59-9ad9-3db7c7ead579": "Power Apps Premium",
  "4a51bf65-409c-4a91-b845-1121b571cc9d": "Power Automate Premium",
  "ca7f3140-d88c-455b-9a1c-7f0679e31a76": "Visio Plan 1",
  "38b434d2-a15e-4cde-9a98-e737c75623e1": "Visio Plan 2",
  "c5928d77-0657-4ac6-b6e8-4e4f88e5be3b": "Project Plan 3",
  "09015f9f-377f-4538-bbb5-f75ceb09a770": "Project Plan 5",
  "6fd2c87f-b296-42f0-b197-1e91e994b900": "Office 365 E3",
  "c7df2760-2c81-4ef7-b578-5b5392b571df": "Microsoft 365 E3",
  "a403ebcc-fae0-4ca2-8c8c-7a907fd6c235": "Power BI Premium Per User",
  "f30db892-07e9-47e9-837c-80727f46fd3d": "Microsoft Flow Free",
  "d17b27af-3f49-4822-99f9-56a661538792": "Microsoft Teams Exploratory",
  "18181a46-0d4e-45cd-891e-60aabd171b4e": "Office 365 E1",
  "26d45bd9-adf1-46cd-a9e1-51e9a5524128": "Office 365 E5",
  "b05e124f-c7cc-45a0-a6aa-8cf78c946968": "Enterprise Mobility + Security E5",
  "dcb1a3ae-b33f-4c65-8d68-1b6ced7e3abe": "Power Apps per App",
  "b4bda68d-6b92-4df5-89a8-cc2d8c9cbb9f": "Power BI Pro",
  "45bc2c81-6072-436a-9b0b-3b12eefbc402": "Microsoft 365 Copilot",
  "76844c9a-4b21-4c43-a98e-e7a8bbfef6a0": "Project Plan 1",
  "e43c7656-f1ee-4817-8fdf-38fc5c1df77e": "Visio Plan 2",
  "53818b1b-4a27-454b-d11e-ddf18dde4f9b": "Project Plan 1",
  "a10d5e58-74da-4312-9c40-d405328c3d21": "Power Automate per User with Attended RPA",
  "e2767865-c3e4-425e-becf-7a37d3e7f33a": "Teams Phone System Virtual User",
  // —— By partNumber string (fallback for IDs not in map) ——
  "SPE_E5": "Microsoft 365 E5",
  "SPE_E3": "Microsoft 365 E3",
  "SPB": "Microsoft 365 Business Premium",
  "O365_BUSINESS_ESSENTIALS": "Microsoft 365 Business Basic",
  "O365_BUSINESS_PREMIUM": "Microsoft 365 Business Premium",
  "STANDARDPACK": "Office 365 E1",
  "ENTERPRISEPACK": "Office 365 E3",
  "ENTERPRISEPREMIUM": "Office 365 E5",
  "EXCHANGEENTERPRISE": "Exchange Online Plan 2",
  "MCOEV": "Microsoft Teams Phone System",
  "MCOEV_VIRTUALUSER": "Teams Phone System Virtual User",
  "PHONESYSTEM_VIRTUALUSER": "Teams Phone System Virtual User",
  "MCOPSTN1": "Microsoft 365 Domestic Calling Plan",
  "MCOPSTN2": "Microsoft 365 International Calling Plan",
  "VISIOCLIENT": "Visio Online Plan 2",
  "VISIOONLINE_PLAN1": "Visio Plan 1",
  "VISIO_PLAN1_NAC": "Visio Plan 1",
  "POWER_BI_PRO": "Power BI Pro",
  "POWER_BI_STANDARD": "Power BI (free)",
  "PBI_PREMIUM_PER_USER": "Power BI Premium Per User",
  "Microsoft_365_Copilot": "Microsoft 365 Copilot",
  "COPILOT_M365": "Microsoft 365 Copilot",
  "M365_COPILOT": "Microsoft 365 Copilot",
  "PROJECT_P1": "Project Plan 1",
  "PROJECTESSENTIALS": "Project Plan 1",
  "PROJECTPROFESSIONAL": "Project Plan 3",
  "PROJECTPREMIUM": "Project Plan 5",
  "POWERAPPS_PER_USER": "Power Apps per User",
  "POWERAPPS_PER_APP_NEW": "Power Apps per App",
  "POWERAPPS_PER_APP": "Power Apps per App",
  "FLOW_PER_USER": "Power Automate per User",
  "POWERAUTOMATE_ATTENDED_RPA": "Power Automate with Attended RPA",
  "POWERAUTOMATE_UNATTENDED_RPA": "Power Automate with Unattended RPA",
  "Microsoft_Teams_Premium": "Microsoft Teams Premium",
  "TEAMS_PREMIUM": "Microsoft Teams Premium",
  "Microsoft_Teams_Rooms_Pro": "Microsoft Teams Rooms Pro",
  "MEETING_ROOM": "Microsoft Teams Rooms Standard",
  "EMS": "Enterprise Mobility + Security E3",
  "EMSPREMIUM": "Enterprise Mobility + Security E5",
  "ATP_ENTERPRISE": "Microsoft Defender for Office 365 P1",
  "RIGHTSMANAGEMENT": "Azure Information Protection Plan 1",
  "INTUNE_A_D": "Microsoft Intune Device",
  "INTUNE_A": "Microsoft Intune",
  "DEVELOPERPACK_E5": "Microsoft 365 E5 Developer",
  "SMB_BUSINESS_PREMIUM": "Microsoft 365 Business Premium",
  "SMB_BUSINESS": "Microsoft 365 Apps for Business",
  "O365_BUSINESS": "Microsoft 365 Apps for Business",
  "OFFICESUBSCRIPTION": "Microsoft 365 Apps for Enterprise",
  "SHAREPOINTSTANDARD": "SharePoint Online Plan 1",
  "SHAREPOINTENTERPRISE": "SharePoint Online Plan 2",
  "EXCHANGE_S_STANDARD": "Exchange Online Plan 1",
  "EXCHANGE_S_ENTERPRISE": "Exchange Online Plan 2",
  "STREAM": "Microsoft Stream",
  "WIN_DEF_ATP": "Microsoft Defender for Endpoint",
  "MDATP_Server": "Microsoft Defender for Endpoint Server",
  "RMSBASIC": "Rights Management (RMS) Basic",
  "PLANNERSTANDALONE": "Planner Plan 1",
  "TEAMS_FREE": "Microsoft Teams (Free)",
};

// ── Default license monthly rates ($/user/mo) ─────────────────────────────
const DEFAULT_RATES = {
  "Microsoft 365 E5": 57,
  "Microsoft 365 E3": 36,
  "Microsoft 365 Business Premium": 22,
  "Microsoft 365 Business Basic": 6,
  "Office 365 E1": 8,
  "Office 365 E3": 23,
  "Office 365 E5": 38,
  "Microsoft Teams Premium": 10,
  "Microsoft Teams Rooms Pro": 40,
  "Exchange Online Plan 2": 8,
  "Power Apps Premium": 20,
  "Power Automate Premium": 15,
  "Power BI Premium Per User": 20,
  "Project Plan 3": 30,
  "Project Plan 5": 55,
  "Visio Plan 1": 5,
  "Visio Plan 2": 15,
  "Planner Plan 1": 3,
  "Enterprise Mobility + Security E5": 16.40,
};

// Premium licenses that highlight inactive users
const PREMIUM_SKUS = [
  "Microsoft 365 E5", "Microsoft 365 E3", "Microsoft Teams Premium",
  "Microsoft Teams Rooms Pro", "Project Plan 5", "Power Apps Premium",
  "Power Automate Premium", "Office 365 E5", "Enterprise Mobility + Security E5"
];

// ── In-memory data store ───────────────────────────────────────────────────
window.LG = {
  msalInstance: null,
  account: null,
  accessToken: null,
  isDemoMode: false,
  data: { skus: [], users: [], org: null },
  rates: {},
  inactivityDays: 30,
  lastRefreshed: null,
  chartInstances: {},
};

// ── Utility: get friendly name from skuId + partNumber ──────────────────────
function getSkuName(skuId, skuPartNumber) {
  // 1. Try exact SKU ID match
  if (SKU_NAMES[skuId]) return SKU_NAMES[skuId];
  // 2. Try exact partNumber match
  if (skuPartNumber && SKU_NAMES[skuPartNumber]) return SKU_NAMES[skuPartNumber];
  // 3. Normalise underscore partNumbers (Microsoft_365_Copilot → Microsoft 365 Copilot)
  if (skuPartNumber) {
    const normalised = skuPartNumber.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalised !== skuPartNumber) return normalised;
    return skuPartNumber;
  }
  return skuId || 'Unknown License';
}
window.getSkuName = getSkuName;

// ── Utility: get user's license names ─────────────────────────────────────
function getUserLicenseNames(user) {
  if (!user.assignedLicenses || user.assignedLicenses.length === 0) return [];
  return user.assignedLicenses.map(al => {
    const sku = LG.data.skus.find(s => s.skuId === al.skuId);
    return getSkuName(al.skuId, sku ? sku.skuPartNumber : null);
  });
}
window.getUserLicenseNames = getUserLicenseNames;

// ── Utility: estimate user monthly cost ───────────────────────────────────
function getUserMonthlyCost(user) {
  const names = getUserLicenseNames(user);
  return names.reduce((sum, name) => sum + (LG.rates[name] || DEFAULT_RATES[name] || 0), 0);
}
window.getUserMonthlyCost = getUserMonthlyCost;

// ── Utility: days since date ───────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
window.daysSince = daysSince;

// ── Utility: parse OS + browser from userAgent ────────────────────────────
function parseDeviceInfo(userAgent) {
  if (!userAgent) return { os: '', browser: '' };
  const ua = userAgent.toLowerCase();
  let os = 'Other';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('ipad')) os = 'iPad';
  else if (ua.includes('iphone') || ua.includes('ios')) os = 'iPhone';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('mac')) os = 'Mac';
  else if (ua.includes('linux')) os = 'Linux';

  let browser = '';
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
  else if (ua.includes('chrome') || ua.includes('crios')) browser = 'Chrome';
  else if (ua.includes('firefox') || ua.includes('fxios')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  return { os, browser };
}
window.parseDeviceInfo = parseDeviceInfo;

// ── Utility: format date ──────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return 'Invalid'; }
}
window.formatDate = formatDate;

// ── Utility: load/save rates ──────────────────────────────────────────────
function loadRates() {
  try {
    const saved = localStorage.getItem('lg_rates');
    LG.rates = saved ? JSON.parse(saved) : { ...DEFAULT_RATES };
  } catch { LG.rates = { ...DEFAULT_RATES }; }
}
function saveRates(rates) {
  LG.rates = rates;
  localStorage.setItem('lg_rates', JSON.stringify(rates));
}
window.loadRates = loadRates;
window.saveRates = saveRates;
window.DEFAULT_RATES = DEFAULT_RATES;
window.PREMIUM_SKUS = PREMIUM_SKUS;

// ── Graph API: fetch with auto token refresh ──────────────────────────────
async function graphFetch(url, opts = {}) {
  if (!LG.accessToken) throw new Error('Not authenticated');
  const headers = {
    'Authorization': `Bearer ${LG.accessToken}`,
    'Content-Type': 'application/json',
    ...opts.headers
  };
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    await refreshToken();
    return graphFetch(url, opts);
  }
  if (!res.ok) {
    let msg = `Graph API error ${res.status}`;
    try { const err = await res.json(); msg = err.error?.message || msg; } catch { }
    throw new Error(msg);
  }
  return res.json();
}

// ── Graph API: paginated fetch ────────────────────────────────────────────
async function graphFetchAll(url) {
  const results = [];
  let nextLink = url;
  while (nextLink) {
    const data = await graphFetch(nextLink, {
      headers: { 'ConsistencyLevel': 'eventual' }
    });
    if (data.value) results.push(...data.value);
    nextLink = data['@odata.nextLink'] || null;
  }
  return results;
}

// Token refresh via MSAL 
async function refreshToken() {
  if (!LG.msalInstance || !LG.account) return;
  try {
    const res = await LG.msalInstance.acquireTokenSilent({
      scopes: MSAL_SCOPES,
      account: LG.account
    });
    LG.accessToken = res.accessToken;
  } catch (e) {
    console.warn('Silent token refresh failed, trying popup', e);
    const res = await LG.msalInstance.acquireTokenPopup({
      scopes: MSAL_SCOPES,
    });
    LG.accessToken = res.accessToken;
  }
}
window.refreshToken = refreshToken;

// ── Load all Microsoft 365 data ───────────────────────────────────────────
async function loadAllData() {
  showLoading('Connecting to Microsoft Graph...');
  setLoadingProgress(5, 'Connecting to Microsoft Graph...', 'Authenticating your session');
  try {
    setLoadingProgress(10, 'Fetching licence subscriptions...', 'Reading organisation data');
    const [skusRes, orgRes] = await Promise.all([
      graphFetch('https://graph.microsoft.com/v1.0/subscribedSkus'),
      graphFetch('https://graph.microsoft.com/v1.0/organization')
    ]);
    LG.data.skus = skusRes.value || [];
    LG.data.org = (orgRes.value || [])[0] || null;
    if (LG.data.org) {
      document.getElementById('tenant-name').textContent = LG.data.org.displayName || 'Unknown Tenant';
    }

    setLoadingProgress(30, 'Fetching users...', `Found ${LG.data.skus.length} licence SKUs — now loading users`);
    const userUrl = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,department,jobTitle,accountEnabled,assignedLicenses,signInActivity&$top=999';
    LG.data.users = await graphFetchAll(userUrl);
    setLoadingProgress(60, 'Processing user data...', `Loaded ${LG.data.users.length} users`);
    // Augment users with computed fields
    LG.data.users.forEach(u => {
      const lastSignIn = u.signInActivity?.lastSignInDateTime || u.signInActivity?.lastNonInteractiveSignInDateTime || null;
      u._lastSignIn = lastSignIn;
      u._daysInactive = daysSince(lastSignIn);
      u._licenseNames = getUserLicenseNames(u);
      u._monthlyCost = getUserMonthlyCost(u);
      u._isLicensed = u.assignedLicenses && u.assignedLicenses.length > 0;
      u._lastDevice = '';
      u._lastBrowser = '';
    });

    // Fetch recent sign-in logs to extract device/browser info
    setLoadingProgress(75, 'Fetching sign-in activity...', 'This may take a moment for large tenants');
    try {
      const signInUrl = 'https://graph.microsoft.com/v1.0/auditLogs/signIns?$top=200&$select=userId,userAgent,clientAppUsed,createdDateTime&$orderby=createdDateTime desc';
      const signInData = await graphFetch(signInUrl);
      const signIns = signInData.value || [];

      // Build a map: userId -> most-recent sign-in with a userAgent
      const deviceMap = {};
      signIns.forEach(si => {
        if (!deviceMap[si.userId] && si.userAgent) {
          const { os, browser } = parseDeviceInfo(si.userAgent);
          deviceMap[si.userId] = { device: os, browser };
        }
      });

      // Apply to users
      LG.data.users.forEach(u => {
        const info = deviceMap[u.id];
        if (info) {
          u._lastDevice = info.device;
          u._lastBrowser = info.browser;
        } else if (u._lastSignIn) {
          // Has signed in but no log detail available — show generic label
          u._lastDevice = 'Signed In';
        }
      });
    } catch (deviceErr) {
      console.warn('Could not fetch sign-in logs for device info (requires AuditLog.Read.All):', deviceErr.message);
      // Fall back: mark users who have signed in so the table shows something useful
      LG.data.users.forEach(u => {
        if (u._lastSignIn && !u._lastDevice) u._lastDevice = 'Signed In';
      });
    }

    setLoadingProgress(100, 'Data loaded successfully!', `${LG.data.users.length} users ready`);
    await new Promise(r => setTimeout(r, 400)); // brief pause so 100% is visible
    LG.lastRefreshed = new Date();
    updateLastRefreshed();
    saveLgCache();
    if (typeof autoExcludeSecondarySkus === 'function') autoExcludeSecondarySkus(LG.data.skus);
    // Save a daily snapshot for licence trend tracking
    if (typeof saveSnapshot === 'function') saveSnapshot();
    showToast('Data loaded successfully', 'success');
  } catch (err) {
    console.error('Graph fetch error:', err);
    let msg = err.message;
    if (msg.includes('Access is denied') || msg.includes('Insufficient')) {
      msg = 'Insufficient permissions. Ensure AuditLog.Read.All and User.Read.All are granted and consented.';
    }
    showToast(msg, 'error');
    throw err;
  } finally {
    hideLoading();
  }
}
window.loadAllData = loadAllData;

// ── DEMO DATA ─────────────────────────────────────────────────────────────
function loadDemoData() {
  const skuDefs = [
    { skuId: '06ebc4ee-1bb5-47dd-8120-11324bc54e06', skuPartNumber: 'SPE_E5', prepaidUnits: { enabled: 50 }, consumedUnits: 38 },
    { skuId: '3b555118-da6a-4418-894f-7df1e2096870', skuPartNumber: 'O365_BUSINESS_ESSENTIALS', prepaidUnits: { enabled: 200 }, consumedUnits: 156 },
    { skuId: 'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46', skuPartNumber: 'SMB_BUSINESS_PREMIUM', prepaidUnits: { enabled: 75 }, consumedUnits: 61 },
    { skuId: '36a0f3b3-adb5-49ea-bf66-762134cf063a', skuPartNumber: 'TEAMS_PREMIUM', prepaidUnits: { enabled: 30 }, consumedUnits: 14 },
    { skuId: '4a51bf65-409c-4a91-b845-1121b571cc9d', skuPartNumber: 'FLOW_PER_USER', prepaidUnits: { enabled: 25 }, consumedUnits: 9 },
    { skuId: '38b434d2-a15e-4cde-9a98-e737c75623e1', skuPartNumber: 'VISIOCLIENT', prepaidUnits: { enabled: 10 }, consumedUnits: 4 },
  ];
  LG.data.skus = skuDefs;

  const departments = ['Engineering', 'Sales', 'HR', 'Finance', 'Marketing', 'IT', 'Operations', 'Legal'];
  const titles = ['Manager', 'Analyst', 'Director', 'Engineer', 'Coordinator', 'Specialist', 'Administrator', 'Consultant'];
  const devices = ['Windows', 'Mac', 'iPhone', 'Android', 'iPad'];
  const browsers = ['Chrome', 'Edge', 'Safari', 'Firefox'];
  const now = Date.now();

  function makeUser(i) {
    const firstNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack', 'Karen', 'Leo', 'Maya', 'Nina', 'Oscar', 'Paula', 'Quinn', 'Ryan', 'Sara', 'Tom', 'Uma', 'Victor', 'Wendy', 'Xander', 'Yvonne', 'Zoe'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez'];
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const daysAgo = Math.random() < 0.28 ? (30 + Math.floor(Math.random() * 150)) : Math.floor(Math.random() * 28);
    const lastSignIn = new Date(now - daysAgo * 86400000).toISOString();
    const dept = departments[i % departments.length];
    const numLicenses = i % 7 === 0 ? 0 : (i % 5 === 0 ? 2 : 1);
    const assignedLicenses = [];
    if (numLicenses > 0) assignedLicenses.push({ skuId: skuDefs[i % skuDefs.length].skuId });
    if (numLicenses > 1) assignedLicenses.push({ skuId: skuDefs[(i + 1) % skuDefs.length].skuId });
    const lastSignInVal = numLicenses > 0 ? lastSignIn : null;
    const licenseNames = assignedLicenses.map(al => {
      const sku = LG.data.skus.find(s => s.skuId === al.skuId);
      return getSkuName(al.skuId, sku ? sku.skuPartNumber : null);
    });
    return {
      id: `demo-user-${i}`,
      displayName: `${fn} ${ln}`,
      userPrincipalName: `${fn.toLowerCase()}.${ln.toLowerCase()}@contoso.com`,
      mail: `${fn.toLowerCase()}.${ln.toLowerCase()}@contoso.com`,
      department: dept,
      jobTitle: titles[i % titles.length],
      accountEnabled: i % 12 !== 0,
      assignedLicenses,
      signInActivity: numLicenses > 0 ? { lastSignInDateTime: lastSignIn } : null,
      _lastDevice: devices[i % devices.length],
      _lastBrowser: browsers[i % browsers.length],
      _lastSignIn: lastSignInVal,
      _daysInactive: daysSince(lastSignInVal),
      _licenseNames: licenseNames,
      _monthlyCost: licenseNames.reduce((s, n) => s + (LG.rates[n] || DEFAULT_RATES[n] || 10), 0),
      _isLicensed: assignedLicenses.length > 0,
    };
  }

  LG.data.users = Array.from({ length: 120 }, (_, i) => makeUser(i));
  LG.data.org = { displayName: 'Contoso Demo Corp', id: 'demo-org' };
  document.getElementById('tenant-name').textContent = 'Contoso Demo Corp';
  document.getElementById('signed-in-user').textContent = 'admin@contoso.com';
  LG.lastRefreshed = new Date();
  updateLastRefreshed();
}
window.loadDemoData = loadDemoData;

// ── Licence Governance data cache (IndexedDB via localforage, persistent / manual refresh) ───
(function () {
  const KEY = 'lg_data_cache';
  const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — effectively manual-only refresh
  window.saveLgCache = async function () {
    try {
      const payload = {
        ts: Date.now(),
        users: LG.data.users,
        skus: LG.data.skus,
        org: LG.data.org,
      };
      await localforage.setItem(KEY, payload);
    } catch (e) {
      console.error('LG IndexedDB cache write failed:', e);
    }
  };
  window.loadLgCache = async function () {
    try {
      const data = await localforage.getItem(KEY);
      // Invalidate old localStorage bulky structure if it somehow made it into IndexedDB
      if (!data || !data.users || !data.users.length) return null;
      const { ts, users, skus, org } = data;
      const age = Date.now() - ts;
      return { users, skus, org, ageMs: age, fresh: age < TTL, ts };
    } catch (e) {
      console.error('LG IndexedDB cache read failed:', e);
      return null;
    }
  };
  window.clearLgCache = async function () {
    try {
      await localforage.removeItem(KEY);
    } catch (e) {
      console.error('LG IndexedDB cache clear failed:', e);
    }
  };
})();

// ── UI helpers ────────────────────────────────────────────────────────────
function showLoading(msg) {
  setLoadingProgress(0, msg || 'Loading Microsoft 365 data...');
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('pages-container').classList.add('hidden');
  document.getElementById('view-login')?.classList.add('hidden');
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
  document.getElementById('pages-container').classList.remove('hidden');
}
function setLoadingProgress(pct, msg, sub) {
  const bar = document.getElementById('loading-progress-bar');
  const pctEl = document.getElementById('loading-progress-pct');
  const textEl = document.getElementById('loading-text');
  const subEl = document.getElementById('loading-sub-text');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  if (msg && textEl) textEl.textContent = msg;
  if (subEl) subEl.textContent = sub || '';
}
window.setLoadingProgress = setLoadingProgress;
function updateLastRefreshed() {
  const el = document.getElementById('last-refreshed');
  if (LG.lastRefreshed) {
    el.textContent = `Refreshed: ${LG.lastRefreshed.toLocaleTimeString()}`;
    el.classList.remove('hidden');
  }
}
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.updateLastRefreshed = updateLastRefreshed;

// ── Toast system ──────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i><span class="text-sm font-medium flex-1">${message}</span><button onclick="this.parentElement.remove()" class="opacity-60 hover:opacity-100 transition"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>`;
  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });
  setTimeout(() => toast.remove(), duration);
}
window.showToast = showToast;

// ── CSV Export Utility ────────────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const quoteField = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(quoteField).join(','), ...rows.map(r => r.map(quoteField).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${filename}`, 'success');
}
window.exportCSV = exportCSV;
