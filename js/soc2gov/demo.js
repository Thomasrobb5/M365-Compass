/**
 * soc2gov/demo.js – Mock data for SOC2 Governance demos
 */

async function soc2LoadDemoData() {
    SOC2G.isDemoMode = true;

    // Simulate Network Delay
    await new Promise(r => setTimeout(r, 600));

    SOC2G.data.users = [
        { id: 'u1', displayName: 'Alice Admin', userPrincipalName: 'alice@demo.com', department: 'IT', jobTitle: 'System Admin', _lastSignIn: new Date(Date.now() - 2 * 86400000).toISOString(), mfaStatus: 'Strong', riskLevel: 'None', isPrivileged: true },
        { id: 'u2', displayName: 'Bob Sales', userPrincipalName: 'bob@demo.com', department: 'Sales', jobTitle: 'AE', _lastSignIn: new Date(Date.now() - 40 * 86400000).toISOString(), mfaStatus: 'None', riskLevel: 'None', isPrivileged: false },
        { id: 'u3', displayName: 'Charlie CEO', userPrincipalName: 'charlie@demo.com', department: 'Executive', jobTitle: 'CEO', _lastSignIn: new Date(Date.now() - 1 * 86400000).toISOString(), mfaStatus: 'Weak', riskLevel: 'Medium', isPrivileged: true },
        { id: 'u4', displayName: 'Dave Dev', userPrincipalName: 'dave@demo.com', department: 'Engineering', jobTitle: 'Developer', _lastSignIn: new Date(Date.now() - 5 * 86400000).toISOString(), mfaStatus: 'Strong', riskLevel: 'None', isPrivileged: false },
        { id: 'u5', displayName: 'Eve HR', userPrincipalName: 'eve@demo.com', department: 'HR', jobTitle: 'Recruiter', _lastSignIn: new Date(Date.now() - 100 * 86400000).toISOString(), mfaStatus: 'Strong', riskLevel: 'None', isPrivileged: false }
    ];

    SOC2G.data.roles = [
        { id: 'u1', displayName: 'Alice Admin', userPrincipalName: 'alice@demo.com', role: 'Global Administrator' },
        { id: 'u3', displayName: 'Charlie CEO', userPrincipalName: 'charlie@demo.com', role: 'Security Administrator' }
    ];

    SOC2G.data.guestUsers = [
        { id: 'g1', displayName: 'Partner Vendor', userPrincipalName: 'partner_ext.com#EXT#@demo.onmicrosoft.com', createdDateTime: new Date(Date.now() - 200 * 86400000).toISOString(), accountEnabled: true },
        { id: 'g2', displayName: 'Old Contractor', userPrincipalName: 'dev_ext.com#EXT#@demo.onmicrosoft.com', createdDateTime: new Date(Date.now() - 400 * 86400000).toISOString(), accountEnabled: true }
    ];

    SOC2G.data.devices = [
        { id: 'd1', deviceName: 'LT-ALICE', userPrincipalName: 'alice@demo.com', department: 'IT', operatingSystem: 'Windows', complianceState: 'compliant', isEncrypted: true, defenderStatus: 'secured' },
        { id: 'd2', deviceName: 'LT-BOB', userPrincipalName: 'bob@demo.com', department: 'Sales', operatingSystem: 'Windows', complianceState: 'noncompliant', isEncrypted: false, defenderStatus: 'atRisk' },
        { id: 'd3', deviceName: 'MAC-CHARLIE', userPrincipalName: 'charlie@demo.com', department: 'Executive', operatingSystem: 'macOS', complianceState: 'compliant', isEncrypted: true, defenderStatus: 'notApplicable' },
    ];

    SOC2G.data.apps = [
        { id: 'a1', displayName: 'Legacy Auth App', accountEnabled: true, _assignedCount: 50, _ssoMode: 'None', _inactiveCount: 50 },
        { id: 'a2', displayName: 'Salesforce', accountEnabled: true, _assignedCount: 120, _ssoMode: 'SAML', _inactiveCount: 5 }
    ];

    SOC2G.data.policies = [
        { id: 'p1', displayName: 'Require MFA for Admins', state: 'enabled' },
        { id: 'p2', displayName: 'Block Legacy Auth', state: 'enabled' },
        { id: 'p3', displayName: 'Require Compliant Device', state: 'disabled' }
    ];

    SOC2G.data.lastSync = new Date();
    document.getElementById('soc2gov-sync-status').textContent = 'Demo Mode Active';
}

window.soc2LoadDemoData = soc2LoadDemoData;
