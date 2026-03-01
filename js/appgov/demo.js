/**
 * appgov/demo.js – Demo data generator for Enterprise Application Governance
 */


function classifySso(mode) {
    if (!mode || mode === 'notSet') return 'No SSO';
    if (mode === 'saml') return 'SAML 2.0';
    if (mode === 'oidc') return 'OpenID Connect';
    return mode;
}

function agLoadDemoData() {
    const appTemplates = [
        { name: 'Salesforce', publisher: 'Salesforce.com', sso: 'saml', homepage: 'https://salesforce.com' },
        { name: 'ServiceNow', publisher: 'ServiceNow Inc.', sso: 'saml', homepage: 'https://servicenow.com' },
        { name: 'Workday', publisher: 'Workday Inc.', sso: 'saml', homepage: 'https://workday.com' },
        { name: 'GitHub Enterprise', publisher: 'GitHub Inc.', sso: 'saml', homepage: 'https://github.com' },
        { name: 'Slack', publisher: 'Slack Technologies', sso: 'saml', homepage: 'https://slack.com' },
        { name: 'Zoom', publisher: 'Zoom Video Communications', sso: 'oidc', homepage: 'https://zoom.us' },
        { name: 'DocuSign', publisher: 'DocuSign Inc.', sso: 'saml', homepage: 'https://docusign.com' },
        { name: 'Concur', publisher: 'SAP Concur', sso: 'saml', homepage: 'https://concur.com' },
        { name: 'Jira Cloud', publisher: 'Atlassian', sso: 'saml', homepage: 'https://atlassian.com' },
        { name: 'Confluence', publisher: 'Atlassian', sso: 'saml', homepage: 'https://atlassian.com' },
        { name: 'Box', publisher: 'Box Inc.', sso: 'oidc', homepage: 'https://box.com' },
        { name: 'Tableau', publisher: 'Tableau Software', sso: 'saml', homepage: 'https://tableau.com' },
        { name: 'Adobe Creative Cloud', publisher: 'Adobe Inc.', sso: 'notSet', homepage: 'https://adobe.com' },
        { name: 'Dropbox Business', publisher: 'Dropbox Inc.', sso: 'notSet', homepage: 'https://dropbox.com' },
        { name: 'HubSpot', publisher: 'HubSpot Inc.', sso: 'oidc', homepage: 'https://hubspot.com' },
        { name: 'Zendesk', publisher: 'Zendesk Inc.', sso: 'saml', homepage: 'https://zendesk.com' },
        { name: 'Figma', publisher: 'Figma Inc.', sso: 'saml', homepage: 'https://figma.com' },
        { name: 'Monday.com', publisher: 'monday.com Ltd.', sso: 'notSet', homepage: 'https://monday.com' },
        { name: 'Notion', publisher: 'Notion Labs Inc.', sso: 'notSet', homepage: 'https://notion.so' },
        { name: 'Okta (Admin)', publisher: 'Okta Inc.', sso: 'saml', homepage: 'https://okta.com' },
    ];

    const deptGroups = [
        { name: 'All Staff', size: 80 }, { name: 'Engineering', size: 25 },
        { name: 'Sales Team', size: 20 }, { name: 'Finance', size: 12 },
        { name: 'HR', size: 8 }, { name: 'Marketing', size: 15 }, { name: 'IT Admins', size: 6 },
    ];

    const now = Date.now();

    const demoUsers = Array.from({ length: 120 }, (_, i) => {
        const names = ['Alice Smith', 'Bob Johnson', 'Carol Brown', 'Dave Wilson', 'Eve Martinez',
            'Frank Garcia', 'Grace Lee', 'Henry Taylor', 'Iris Anderson', 'Jack Thomas',
            'Karen Moore', 'Leo Jackson', 'Maya White', 'Nina Harris', 'Oscar Lewis'];
        const name = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '');
        return {
            id: `demo-u-${i}`, displayName: name,
            userPrincipalName: name.replace(' ', '').toLowerCase() + '@contoso.com'
        };
    });

    AG.data.apps = appTemplates.map((t, i) => {
        const appId = `demo-app-${i}-${Math.random().toString(36).slice(2, 8)}`;
        const totalAssigned = 10 + Math.floor(Math.random() * 70);
        const directUsers = Math.floor(totalAssigned * 0.3);
        const groupCount = Math.floor(Math.random() * 3) + 1;

        // Pick assigned users
        const assignedUsers = demoUsers.slice(i * 3 % 50, i * 3 % 50 + totalAssigned).map((u, j) => ({
            ...u,
            assignmentType: j < directUsers ? 'Direct' : 'Group',
            groupName: j >= directUsers ? deptGroups[(i + j) % deptGroups.length].name : null,
            _lastSignIn: Math.random() > 0.25 ? new Date(now - Math.floor(Math.random() * 90) * 86400000).toISOString() : null,
        }));

        // Inactive = assigned but no sign-in in last 30 days
        const inactiveCount = assignedUsers.filter(u =>
            !u._lastSignIn || daysSince(u._lastSignIn) >= 30
        ).length;

        const lastSignIn = assignedUsers
            .filter(u => u._lastSignIn)
            .sort((a, b) => new Date(b._lastSignIn) - new Date(a._lastSignIn))[0]?._lastSignIn || null;

        return {
            id: `sp-${i}`,
            appId,
            displayName: t.name,
            publisherName: t.publisher,
            homepage: t.homepage,
            preferredSingleSignOnMode: t.sso,
            accountEnabled: true,
            signInAudience: 'AzureADMyOrg',
            _ssoMode: classifySso(t.sso),
            _assignedCount: totalAssigned,
            _directUsers: directUsers,
            _groups: groupCount,
            _assignedUsers: assignedUsers,
            _inactiveCount: inactiveCount,
            _lastSignIn: lastSignIn,
            _lastSignInDays: lastSignIn ? daysSince(lastSignIn) : null,
            _recentSignIns: assignedUsers
                .filter(u => u._lastSignIn)
                .slice(0, 10)
                .map(u => ({ userId: u.id, userDisplayName: u.displayName, createdDateTime: u._lastSignIn })),
        };
    });

    showToast('App Governance demo data loaded', 'info');
}
window.agLoadDemoData = agLoadDemoData;
