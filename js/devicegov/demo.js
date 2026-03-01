/**
 * devicegov/demo.js – Mock data generator for Device Governance
 * Simulates the same two-phase load as real Graph mode:
 *   Phase 1 — devices from Intune (no department)
 *   Phase 2 — department resolved from mock user directory
 */

// Fixed mock user pool with departments — simulates EntraID user profiles
const DG_DEMO_USERS = (() => {
    const departments = ['IT', 'Finance', 'HR', 'Sales', 'Operations', 'Marketing', 'Legal', 'Engineering'];
    const firstNames = ['James', 'Emma', 'Oliver', 'Sophia', 'Liam', 'Ava', 'Noah', 'Isabella', 'Elijah', 'Mia',
        'William', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor',
        'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Young', 'Robinson', 'Lewis'];

    const users = {};
    for (let i = 0; i < 200; i++) {
        const first = firstNames[i % firstNames.length];
        const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
        const upn = `${first.toLowerCase()}.${last.toLowerCase()}${i}@demo.local`;
        users[upn] = {
            displayName: `${first} ${last}`,
            department: departments[i % departments.length]
        };
    }
    return users;
})();

async function dgLoadDemoData() {
    dgShowLoading(true, 'Generating mock Intune device inventory...');
    if (typeof dgSetProgress === 'function') dgSetProgress(5);

    // Simulate Phase 1 — device list from Intune
    await new Promise(r => setTimeout(r, 600));

    const statuses = ['compliant', 'noncompliant', 'gracePeriod', 'configManager'];
    const manufacturers = ['Dell Inc.', 'Lenovo', 'Microsoft Corporation', 'HP', 'Apple'];
    const osNames = ['Windows', 'macOS', 'iOS', 'Android'];
    const userKeys = Object.keys(DG_DEMO_USERS);

    const count = Math.floor(Math.random() * 50) + 150; // 150-200 devices
    const devices = [];

    for (let i = 0; i < count; i++) {
        const isWin = Math.random() > 0.3;
        const os = isWin ? 'Windows' : osNames[Math.floor(Math.random() * osNames.length)];
        const mfg = isWin ? manufacturers[Math.floor(Math.random() * 4)] : 'Apple';
        const isCompliant = Math.random() > 0.15;
        const upn = userKeys[i % userKeys.length];
        const user = DG_DEMO_USERS[upn];

        devices.push({
            id: 'dev-' + Math.random().toString(36).substr(2, 9),
            deviceName: mfg.split(' ')[0] + '-' + Math.floor(Math.random() * 10000),
            userPrincipalName: upn,
            userDisplayName: user.displayName,
            department: null,         // not set yet — resolved in Phase 2
            operatingSystem: os,
            osVersion: isWin ? '10.0.22621' : '14.5',
            complianceState: isCompliant ? 'compliant' : statuses[Math.floor(Math.random() * statuses.length)],
            isEncrypted: Math.random() > 0.1,
            managedDeviceOwnerType: Math.random() > 0.2 ? 'company' : 'personal',
            lastSyncDateTime: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
            manufacturer: mfg,
            model: isWin ? 'Latitude ' + Math.floor(Math.random() * 9000) : 'MacBook Pro',
            defenderStatus: isWin ? (Math.random() > 0.05 ? 'secured' : 'atRisk') : 'notApplicable'
        });
    }

    if (typeof dgSetProgress === 'function') dgSetProgress(50);
    dgShowLoading(true, `Loaded ${devices.length} devices — resolving user departments...`);

    // Simulate Phase 2 — resolve department from user profile
    await new Promise(r => setTimeout(r, 400));

    devices.forEach(d => {
        const user = DG_DEMO_USERS[d.userPrincipalName];
        d.department = user ? user.department : 'Unknown';
    });

    if (typeof dgSetProgress === 'function') dgSetProgress(100);

    DG.data.devices = devices;
    DG.data.lastSync = new Date();
    DG.isDemoMode = true;

    if (typeof saveDgCache === 'function') await saveDgCache();

    if (typeof showToast === 'function') showToast(`Generated ${devices.length} devices with department data`, 'success');

    const statusEl = document.getElementById('devicegov-sync-status');
    if (statusEl) statusEl.textContent = 'Demo Data Loaded';

    dgShowLoading(false);
    if (typeof dgRenderPage === 'function') dgRenderPage(dgCurrentPage);
}
window.dgLoadDemoData = dgLoadDemoData;
