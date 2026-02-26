/**
 * pages/reports.js – Reports page: export adapters and report page render
 */

function renderReportsPage() {
    // Page is static HTML – just ensure Lucide icons are rendered
    lucide.createIcons();
}

function exportReport(reportType) {
    switch (reportType) {
        case 'full-license': exportUsersCSV(); break;
        case 'inactive': exportInactiveCSV(); break;
        case 'license-util': exportInventoryCSV(); break;
        case 'optimization': exportInsightsReport(); break;
        case 'device': exportDeviceReport(); break;
        default:
            showToast('Unknown report type: ' + reportType, 'warning');
    }
}

function exportDeviceReport() {
    const { users } = LG.data;
    const premiumUsers = users.filter(u =>
        u._isLicensed && u._licenseNames.some(n => PREMIUM_SKUS.includes(n))
    );
    const headers = ['Display Name', 'UPN', 'Department', 'Primary License', 'Last Device', 'Last Browser', 'Desktop Access', 'Mobile Access', 'Browser Only', 'Last Sign-in'];
    const rows = premiumUsers.map(u => {
        const device = (u._lastDevice || '').toLowerCase();
        const isDesktop = /windows|mac/i.test(device);
        const isMobile = /iphone|android|ipad/i.test(device);
        const primary = u._licenseNames.find(n => PREMIUM_SKUS.includes(n)) || u._licenseNames[0] || '—';
        return [
            u.displayName, u.userPrincipalName, u.department,
            primary, u._lastDevice || '—', u._lastBrowser || '—',
            isDesktop && !isMobile ? 'Yes' : 'No',
            isMobile ? 'Yes' : 'No',
            !isDesktop && !isMobile ? 'Yes' : 'No',
            u._lastSignIn ? formatDate(u._lastSignIn) : 'Never'
        ];
    });
    exportCSV('device_access_report.csv', headers, rows);
}

window.renderReportsPage = renderReportsPage;
window.exportReport = exportReport;
window.exportDeviceReport = exportDeviceReport;
