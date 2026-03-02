/**
 * graph.js - Azure Cost Management API integration
 */

const AZG = {
    data: {
        subscriptions: [],
        resourceGroups: [],
        services: [],
        history: [],
        totalCost: 0,
        currency: 'USD'
    },
    isDemoMode: false
};

/**
 * Fetch cost data from Azure Graph
 */
async function azLoadGraphData() {
    console.log("Fetching Azure Cost data from Live Graph...");

    if (AZG.isDemoMode) {
        return azLoadDemoData();
    }

    const overlay = document.getElementById('azcostgov-loading-overlay');
    const pages = document.getElementById('azcostgov-pages-container');
    const filterBar = document.getElementById('azcostgov-filter-bar');

    const updateProgress = (pct, text, subText) => {
        const bar = document.getElementById('azcostgov-loading-progress-bar');
        const pctEl = document.getElementById('azcostgov-loading-progress-pct');
        const textEl = document.getElementById('azcostgov-loading-text');
        const subTextEl = document.getElementById('azcostgov-loading-sub-text');
        if (bar) bar.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
        if (textEl && text) textEl.textContent = text;
        if (subTextEl && subText) subTextEl.textContent = subText;
    };

    try {
        if (overlay) overlay.classList.remove('hidden');
        if (pages) pages.classList.add('hidden');
        if (filterBar) filterBar.classList.add('hidden');

        updateProgress(5, "Authentication", "Acquiring ARM Token...");
        const token = await getArmToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 1. Fetch Subscriptions
        updateProgress(10, "Scanning Resources", "Fetching subscriptions...");
        const subRes = await fetch('https://management.azure.com/subscriptions?api-version=2020-01-01', { headers });
        const subData = await subRes.json();

        if (!subData.value || subData.value.length === 0) {
            throw new Error("No subscriptions found or access denied.");
        }

        const subscriptions = [];
        const resourceGroups = [];
        const serviceDistribution = {};
        const historicalData = {};
        let totalMonthlySpend = 0;

        // 2. Fetch Costs per Subscription
        const totalSubs = subData.value.length;
        for (let i = 0; i < totalSubs; i++) {
            const sub = subData.value[i];
            const subId = sub.subscriptionId;
            const subName = sub.displayName;
            const subProgress = 10 + ((i / totalSubs) * 80);

            updateProgress(subProgress, `Scanning ${subName}`, `Fetching costs and metadata...`);

            // --- A. Fetch Resource Group Metadata (for Tags & Location) ---
            const rgMetaMap = {};
            try {
                const rgMetaRes = await fetch(`https://management.azure.com/subscriptions/${subId}/resourcegroups?api-version=2021-04-01`, { headers });
                if (rgMetaRes.ok) {
                    const rgMetaData = await rgMetaRes.json();
                    if (rgMetaData.value) {
                        rgMetaData.value.forEach(rg => {
                            rgMetaMap[rg.name] = {
                                tags: rg.tags || {},
                                location: rg.location
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn(`Failed to fetch RG metadata for sub ${subName}:`, e);
            }

            // --- B. Current Month breakdown (by RG and Service) ---
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = now.toISOString();

            const currentQuery = {
                "type": "Usage",
                "timeframe": "Custom",
                "timePeriod": { "from": startOfMonth, "to": endOfMonth },
                "dataset": {
                    "granularity": "None",
                    "aggregation": { "totalCost": { "name": "Cost", "function": "Sum" } },
                    "grouping": [
                        { "type": "Dimension", "name": "ResourceId" },
                        { "type": "Dimension", "name": "ResourceGroupName" },
                        { "type": "Dimension", "name": "ServiceName" }
                    ]
                }
            };

            const costRes = await fetch(`https://management.azure.com/subscriptions/${subId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`, {
                method: 'POST',
                headers,
                body: JSON.stringify(currentQuery)
            });

            if (costRes.ok) {
                const costData = await costRes.json();
                let subTotal = 0;

                if (costData.properties && costData.properties.rows) {
                    costData.properties.rows.forEach(row => {
                        const cost = parseFloat(row[0]);
                        const resourceId = row[1];
                        const rgName = row[2];
                        const serviceName = row[3];
                        subTotal += cost;

                        // Service breakdown
                        if (serviceName) {
                            serviceDistribution[serviceName] = (serviceDistribution[serviceName] || 0) + cost;
                        }

                        if (rgName) {
                            // Extract actual resource name from ID
                            let resourceName = rgName; // Fallback
                            if (resourceId && resourceId.includes('/')) {
                                resourceName = resourceId.split('/').pop();
                            }

                            const meta = rgMetaMap[rgName] || { tags: {}, location: 'Unknown' };
                            resourceGroups.push({
                                name: resourceName, // Using resource name now
                                rgName: rgName,    // Keeping RG name for reference
                                subscription: subName,
                                cost: cost,
                                location: meta.location,
                                service: serviceName || 'Other',
                                tags: meta.tags
                            });
                        }
                    });
                }
                subscriptions.push({ id: subId, name: subName, cost: subTotal, status: sub.state || 'Active' });
                totalMonthlySpend += subTotal;
            } else {
                console.warn(`Failed to fetch cost for sub ${subName}:`, await costRes.text());
                subscriptions.push({ id: subId, name: subName, cost: 0, status: 'Error' });
            }

            // --- C. Historical Trend (Last 6 Months) ---
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);

            const historyQuery = {
                "type": "Usage",
                "timeframe": "Custom",
                "timePeriod": { "from": sixMonthsAgo.toISOString(), "to": endOfMonth },
                "dataset": {
                    "granularity": "Monthly",
                    "aggregation": { "totalCost": { "name": "Cost", "function": "Sum" } }
                }
            };

            const histRes = await fetch(`https://management.azure.com/subscriptions/${subId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`, {
                method: 'POST',
                headers,
                body: JSON.stringify(historyQuery)
            });

            if (histRes.ok) {
                const histData = await histRes.json();
                if (histData.properties && histData.properties.rows) {
                    histData.properties.rows.forEach(row => {
                        const cost = parseFloat(row[0]);
                        const monthKey = row[1].toString(); // e.g. 20240101

                        const year = monthKey.substring(0, 4);
                        const month = monthKey.substring(4, 6);
                        const date = new Date(year, parseInt(month) - 1, 1);
                        const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                        historicalData[label] = (historicalData[label] || 0) + cost;
                    });
                }
            }
        }

        updateProgress(95, "Finalizing", "Aggregating results...");

        // 3. Update Global Data
        AZG.data.subscriptions = subscriptions;
        AZG.data.resourceGroups = resourceGroups;
        AZG.data.totalCost = totalMonthlySpend;
        AZG.data.currency = 'USD';

        // Convert historical data back to array and sort by date
        AZG.data.history = Object.entries(historicalData)
            .map(([month, cost]) => ({ month, cost }))
            .sort((a, b) => new Date(a.month) - new Date(b.month));

        // Convert service distribution back to array
        AZG.data.services = Object.entries(serviceDistribution)
            .map(([name, cost]) => ({ name, cost }))
            .sort((a, b) => b.cost - a.cost);

        await azSaveCache();

        updateProgress(100, "Scan Complete", "Rendering dashboard...");

        // Hide overlay and show content
        if (overlay) overlay.classList.add('hidden');
        if (pages) pages.classList.remove('hidden');
        // Filter bar should only show on overview
        if (typeof azCurrentPage !== 'undefined' && azCurrentPage === 'azcostgov-overview' && filterBar) {
            filterBar.classList.remove('hidden');
        }

        if (typeof azInitUI === 'function') azInitUI();
        return true;
    } catch (e) {
        console.error("Live Azure Cost fetch failed", e);
        if (overlay) overlay.classList.add('hidden');
        if (pages) pages.classList.remove('hidden');
        showToast(`Failed to load live data: ${e.message}. Falling back to demo.`, "error");
        return azLoadDemoData();
    }
}

/**
 * Cache management for Azure Costs
 */
async function azLoadCache() {
    try {
        const cached = await localforage.getItem('m365_compass_az_cache');
        if (cached) {
            AZG.data = cached.data;
            AZG.isDemoMode = cached.isDemoMode;
            return { fresh: true, ...cached };
        }
    } catch (e) {
        console.error("Failed to load Azure Cost cache", e);
    }
    return null;
}

async function azSaveCache() {
    try {
        await localforage.setItem('m365_compass_az_cache', {
            data: AZG.data,
            isDemoMode: AZG.isDemoMode,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Failed to save Azure Cost cache", e);
    }
}
