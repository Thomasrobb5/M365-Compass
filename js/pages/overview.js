/**
 * pages/overview.js – Overview Dashboard: KPI cards + all 4 charts
 */

function renderOverviewPage() {
    const { users, skus } = LG.data;
    const days = LG.inactivityDays;

    const totalPurchased = skus.reduce((s, k) => s + (k.prepaidUnits?.enabled || 0), 0);
    const totalUsers = users.length;
    const licensedUsers = users.filter(u => u._isLicensed);
    const inactiveLicensed = licensedUsers.filter(u => u._daysInactive === null || u._daysInactive >= days);
    const monthlySavings = inactiveLicensed.reduce((s, u) => s + u._monthlyCost, 0);

    // KPI values
    document.getElementById('kpi-total-licenses').textContent = totalPurchased.toLocaleString();
    document.getElementById('kpi-total-users').textContent = totalUsers.toLocaleString();
    document.getElementById('kpi-licensed-users').textContent = licensedUsers.length.toLocaleString();
    document.getElementById('kpi-inactive-users').textContent = inactiveLicensed.length.toLocaleString();
    document.getElementById('kpi-savings').textContent = '$' + monthlySavings.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Charts
    renderLicenseDistChart(skus);
    renderUnderutilizedChart(skus);
    renderSigninActivityChart(users);
    renderActiveInactiveChart(users, days);

    // Update sidebar badges
    updateBadges();
}

window.renderOverviewPage = renderOverviewPage;
