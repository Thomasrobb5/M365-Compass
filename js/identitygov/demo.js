/**
 * identitygov/demo.js – Sample data for Identity Governance
 */

function idgLoadDemoData() {
    console.log("Loading Identity Governance Demo Data...");

    // Sample Departments
    const depts = ['IT', 'HR', 'Finance', 'Sales', 'Engineering', 'Operations'];

    // Sample Users with Identity Metrics
    const users = [
        {
            id: '1',
            displayName: 'John Doe',
            userPrincipalName: 'john.doe@contoso.com',
            department: 'IT',
            jobTitle: 'System Administrator',
            mfaStatus: 'Strong', // FIDO2 / Auth App
            mfaMethods: ['Microsoft Authenticator', 'FIDO2 Security Key'],
            riskLevel: 'None',
            isPrivileged: true,
            isAdmin: true,
            hasLegacyAuth: false,
            lastSignIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            signInSuccessRate: 98
        },
        {
            id: '2',
            displayName: 'Jane Smith',
            userPrincipalName: 'jane.smith@contoso.com',
            department: 'Finance',
            jobTitle: 'Finance Manager',
            mfaStatus: 'Weak', // SMS / Voice
            mfaMethods: ['SMS'],
            riskLevel: 'Low',
            isPrivileged: false,
            isAdmin: false,
            hasLegacyAuth: true,
            lastSignIn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            signInSuccessRate: 92
        },
        {
            id: '3',
            displayName: 'Bob Wilson',
            userPrincipalName: 'bob.wilson@contoso.com',
            department: 'Sales',
            jobTitle: 'Sales Executive',
            mfaStatus: 'None',
            mfaMethods: [],
            riskLevel: 'High',
            isPrivileged: false,
            isAdmin: false,
            hasLegacyAuth: true,
            lastSignIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            signInSuccessRate: 45
        },
        {
            id: '4',
            displayName: 'Alice Brown',
            userPrincipalName: 'alice.brown@contoso.com',
            department: 'Engineering',
            jobTitle: 'Software Engineer',
            mfaStatus: 'Strong',
            mfaMethods: ['Microsoft Authenticator'],
            riskLevel: 'None',
            isPrivileged: false,
            isAdmin: false,
            hasLegacyAuth: false,
            lastSignIn: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
            signInSuccessRate: 100
        },
        {
            id: '5',
            displayName: 'Charlie Davis',
            userPrincipalName: 'charlie.davis@contoso.com',
            department: 'HR',
            jobTitle: 'HR Specialist',
            mfaStatus: 'Weak',
            mfaMethods: ['Voice Call'],
            riskLevel: 'Medium',
            isPrivileged: false,
            isAdmin: false,
            hasLegacyAuth: false,
            lastSignIn: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
            signInSuccessRate: 88
        }
    ];

    // Generate 15 more random users
    for (let i = 6; i <= 20; i++) {
        const dept = depts[Math.floor(Math.random() * depts.length)];
        const mfaPool = ['Strong', 'Weak', 'None'];
        const mfa = mfaPool[Math.floor(Math.random() * mfaPool.length)];
        const riskPool = ['None', 'Low', 'Medium', 'High'];
        const risk = Math.random() > 0.8 ? riskPool[Math.floor(Math.random() * 3) + 1] : 'None';

        users.push({
            id: String(i),
            displayName: `Demo User ${i}`,
            userPrincipalName: `user${i}@contoso.com`,
            department: dept,
            jobTitle: 'Staff Member',
            mfaStatus: mfa,
            mfaMethods: mfa === 'Strong' ? ['Microsoft Authenticator'] : (mfa === 'Weak' ? ['SMS'] : []),
            riskLevel: risk,
            isPrivileged: false,
            isAdmin: false,
            hasLegacyAuth: Math.random() > 0.7,
            lastSignIn: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
            signInSuccessRate: 70 + Math.floor(Math.random() * 30)
        });
    }

    IDG.data.users = users;

    // Sample Policies
    IDG.data.policies = [
        { id: 'p1', displayName: 'MFA for Admins', state: 'enabled', conditions: { users: { includeRoles: ['Global Admin'] } }, grantControls: { builtInControls: ['mfa'] } },
        { id: 'p2', displayName: 'Block Legacy Auth', state: 'enabled', conditions: { clientAppTypes: ['exchangeActiveSync', 'other'] }, grantControls: { builtInControls: ['block'] } },
        { id: 'p3', displayName: 'Risk-based Password Reset', state: 'enabledForReportingButNotEnforced', conditions: { userRiskLevels: ['high'] }, grantControls: { builtInControls: ['mfa', 'passwordChange'] } }
    ];

    IDG.data.lastSync = new Date();
    IDG.isDemoMode = true;

    console.log("Identity Governance Demo Data loaded:", IDG.data.users.length, "users");
}

window.idgLoadDemoData = idgLoadDemoData;
