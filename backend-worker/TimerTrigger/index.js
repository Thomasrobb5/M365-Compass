const { Client } = require('@microsoft/microsoft-graph-client');
const { BlobServiceClient } = require('@azure/storage-blob');

// This script pulls all Enterprise Apps, Assignments, Group Members, and Recent Sign-Ins via Graph API.
// It compiles a single optimized JSON structure and uploads it to Azure Blob Storage over-writing the previous run.

// Execution timeout: 10 minutes (configurable Azure Function host.json)
module.exports = async function (context, myTimer) {
    context.log("App Governance Sync started.", new Date().toISOString());

    const tenantId = process.env["TENANT_ID"];
    const clientId = process.env["CLIENT_ID"];
    const clientSecret = process.env["CLIENT_SECRET"];
    const storageConnString = process.env["AzureWebJobsStorage"]; // or custom AZURE_STORAGE_CONNECTION_STRING
    const containerName = "appgov-data";
    const blobName = "data.json";

    if (!tenantId || !clientId || !clientSecret || !storageConnString) {
        context.log.error("Missing required environment variables.");
        return;
    }

    try {
        // 1. Authenticate Graph Client using App-Only permissions (Raw OAuth2)
        const https = require('https');
        const tokenData = await new Promise((resolve, reject) => {
            const data = new URLSearchParams({
                client_id: clientId,
                scope: 'https://graph.microsoft.com/.default',
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            }).toString();

            const req = https.request({
                hostname: 'login.microsoftonline.com',
                path: `/${tenantId}/oauth2/v2.0/token`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });

        if (!tokenData.access_token) {
            throw new Error('Failed to acquire token: ' + JSON.stringify(tokenData));
        }

        class MyAuthenticationProvider {
            async getAccessToken() {
                return tokenData.access_token;
            }
        }
        const authProvider = new MyAuthenticationProvider();
        const graphClient = Client.initWithMiddleware({ authProvider });

        // 2. Fetch Apps
        context.log("Fetching Enterprise Applications...");
        let apps = [];
        let url = '/servicePrincipals?$filter=servicePrincipalType eq \'Application\'&$select=id,displayName,appId,tags,preferredSingleSignOnMode,accountEnabled,homepage,signInAudience,publisherName,loginUrl,replyUrls,identifierUris&$top=999';
        while (url) {
            const res = await graphClient.api(url)
                .header('ConsistencyLevel', 'eventual')
                .get();
            if (res.value) apps.push(...res.value);
            url = res['@odata.nextLink'];
        }
        apps = apps.filter(sp =>
            sp.tags?.includes('WindowsAzureActiveDirectoryIntegratedApp') ||
            (sp.publisherName && !['Microsoft Services', 'Microsoft Corporation'].includes(sp.publisherName))
        );

        // Transform apps
        apps.forEach(app => {
            app._ssoMode = classifySso(app.preferredSingleSignOnMode);
            app._assignedCount = 0;
            app._directUsers = 0;
            app._groups = 0;
            app._expandedCount = 0;
            app._inactiveCount = 0;
            app._assignedUsers = [];
            app._recentSignIns = [];
            app._lastSignIn = null;
            app._lastSignInDays = null;
            app._assignments = [];
        });

        const activeApps = apps.filter(a => a.accountEnabled !== false);
        context.log(`Found ${activeApps.length} active apps out of ${apps.length} total.`);

        // 3. Fetch Assignments & Group Members (Sequentially/Batched to avoid 429s)
        context.log("Fetching Assignments and expanding Groups...");
        const chunkSize = 15;
        for (let i = 0; i < activeApps.length; i += chunkSize) {
            const batch = activeApps.slice(i, i + chunkSize);
            await Promise.all(batch.map(async (app) => {
                let aUrl = `/servicePrincipals/${app.id}/appRoleAssignedTo?$top=999&$select=id,principalId,principalDisplayName,principalType,createdDateTime`;
                while (aUrl) {
                    const aRes = await graphClient.api(aUrl).get();
                    if (aRes.value) app._assignments.push(...aRes.value);
                    aUrl = aRes['@odata.nextLink'];
                }

                app._assignedCount = app._assignments.length;
                app._directUsers = app._assignments.filter(a => a.principalType === 'User').length;
                app._groups = app._assignments.filter(a => a.principalType === 'Group').length;

                // Pre-expand groups during backend sync
                app._expandedUsers = [];
                for (const assignment of app._assignments) {
                    if (assignment.principalType === 'User') {
                        app._expandedUsers.push({
                            id: assignment.principalId,
                            displayName: assignment.principalDisplayName || '—',
                            assignmentType: 'Direct',
                            groupName: null,
                            isGroupFallback: false
                        });
                    } else if (assignment.principalType === 'Group') {
                        try {
                            let mUrl = `/groups/${assignment.principalId}/transitiveMembers?$select=id,displayName,userPrincipalName&$top=500`;
                            while (mUrl) {
                                const mRes = await graphClient.api(mUrl).get();
                                if (mRes.value) {
                                    mRes.value.forEach(m => {
                                        if (m['@odata.type'] === '#microsoft.graph.user' || m.userPrincipalName) {
                                            // Deduplicate across groups
                                            if (!app._expandedUsers.find(u => u.id === m.id)) {
                                                app._expandedUsers.push({
                                                    id: m.id,
                                                    displayName: m.displayName || '—',
                                                    userPrincipalName: m.userPrincipalName || '',
                                                    assignmentType: 'Group',
                                                    groupName: assignment.principalDisplayName,
                                                    isGroupFallback: false
                                                });
                                            }
                                        }
                                    });
                                }
                                mUrl = mRes['@odata.nextLink'];
                            }
                        } catch (err) {
                            // Keep fallback row
                            app._expandedUsers.push({
                                id: assignment.principalId,
                                displayName: assignment.principalDisplayName || '—',
                                assignmentType: 'Group',
                                groupName: assignment.principalDisplayName,
                                isGroupFallback: true
                            });
                        }
                    }
                }
                app._expandedCount = app._expandedUsers.filter(u => !u.isGroupFallback).length;
                // Free memory since we expanded them securely
                delete app._assignments;
            }));
            context.log(`Processed ${Math.min(i + chunkSize, activeApps.length)} / ${activeApps.length} apps for assignments...`);
        }

        // 4. Finalize Assignment Payload (Sign-in logs removed per user request)
        apps.forEach(app => {
            if (app._expandedUsers) {
                app._assignedUsers = app._expandedUsers;
                delete app._expandedUsers;
            } else {
                app._assignedUsers = [];
            }
            // Clear sign-in fields since feature is dropped
            app._recentSignIns = [];
            app._lastSignIn = null;
            app._lastSignInDays = null;
            app._inactiveCount = 0;
        });

        // 5. Upload to Blob Storage
        context.log("Sync complete. Generating payload...");
        const payload = JSON.stringify({
            ts: Date.now(),
            apps: apps,
            version: "1.0-backend"
        });

        context.log("Uploading to Blob Storage...");
        const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.upload(payload, payload.length, {
            blobHTTPHeaders: { blobContentType: "application/json" }
        });

        context.log("App Governance data successfully uploaded to blob.");

    } catch (err) {
        context.log.error("Sync Failed:", err);
        throw err;
    }
};

function classifySso(mode) {
    if (!mode || mode === 'notSet') return 'None';
    if (mode === 'saml') return 'SAML';
    if (mode === 'oidc') return 'OIDC';
    if (mode === 'password') return 'Password SSO';
    return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function daysSince(isoString) {
    if (!isoString) return 9999;
    try {
        const d = new Date(isoString);
        if (isNaN(d)) return 9999;
        const diff = Date.now() - d.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch { return 9999; }
}
