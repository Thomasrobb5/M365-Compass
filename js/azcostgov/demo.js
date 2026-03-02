/**
 * demo.js - Sample data for Azure Costs
 */

async function azLoadDemoData() {
    console.log("Loading Azure Cost demo data...");

    AZG.isDemoMode = true;
    AZG.data.currency = 'USD';

    // Historical Monthly Trends (last 6 months)
    AZG.data.history = [
        { month: 'Sep 2025', cost: 1450.00 },
        { month: 'Oct 2025', cost: 1520.50 },
        { month: 'Nov 2025', cost: 1680.75 },
        { month: 'Dec 2025', cost: 1850.20 },
        { month: 'Jan 2026', cost: 1720.40 },
        { month: 'Feb 2026', cost: 1820.65 }
    ];

    AZG.data.subscriptions = [
        { id: 'sub-1', name: 'Production Subscription', cost: 1250.45, status: 'Active' },
        { id: 'sub-2', name: 'Development Subscription', cost: 450.20, status: 'Active' },
        { id: 'sub-3', name: 'QA Subscription', cost: 120.00, status: 'Disabled' }
    ];

    AZG.data.resourceGroups = [
        { name: 'vm-prod-web-01', rgName: 'rg-prod-web', subscription: 'Production Subscription', cost: 400.00, location: 'East US', service: 'Compute', tags: { 'Environment': 'Prod', 'Project': 'Website' } },
        { name: 'vm-prod-web-02', rgName: 'rg-prod-web', subscription: 'Production Subscription', cost: 200.00, location: 'East US', service: 'Compute', tags: { 'Environment': 'Prod', 'Project': 'Website' } },
        { name: 'sql-prod-db', rgName: 'rg-prod-db', subscription: 'Production Subscription', cost: 450.45, location: 'East US', service: 'Databases', tags: { 'Environment': 'Prod', 'Project': 'Data' } },
        { name: 'vnet-shared', rgName: 'rg-shared-svc', subscription: 'Production Subscription', cost: 200.00, location: 'West Europe', service: 'Networking', tags: { 'Environment': 'Shared', 'Project': 'Infrastructure' } },
        { name: 'vm-dev-sandbox', rgName: 'rg-dev-sandbox', subscription: 'Development Subscription', cost: 450.20, location: 'North Central US', service: 'Compute', tags: { 'Environment': 'Dev', 'Project': 'Testing' } },
        { name: 'st-qa-logs', rgName: 'rg-qa-testing', subscription: 'QA Subscription', cost: 120.00, location: 'East US', service: 'Storage', tags: { 'Environment': 'QA', 'Project': 'Testing' } },
        { name: 'disk-zombie-01', rgName: 'rg-untagged-zombie', subscription: 'Production Subscription', cost: 50.50, location: 'East US', service: 'Other', tags: {} },
        { name: 'disk-zombie-02', rgName: 'rg-untagged-zombie', subscription: 'Production Subscription', cost: 25.00, location: 'East US', service: 'Other', tags: {} }
    ];

    // Service Type Breakdown
    AZG.data.services = [
        { name: 'Compute', cost: 1050.20 },
        { name: 'Databases', cost: 450.45 },
        { name: 'Storage', cost: 120.00 },
        { name: 'Networking', cost: 200.00 }
    ];

    AZG.data.totalCost = AZG.data.subscriptions.reduce((sum, sub) => sum + sub.cost, 0);

    if (typeof azInitUI === 'function') azInitUI();
}
