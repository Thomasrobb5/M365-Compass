/**
 * soc2gov/pages/reports.js – Generate and Export SOC2 Evidence
 */

function soc2RenderReports() {
    const container = document.getElementById('page-soc2-reports');
    if (!container) return;

    if (!SOC2G.data.lastSync) {
        container.innerHTML = `<div class="p-8 text-center text-gray-400">Loading audit data...</div>`;
        return;
    }

    // Get unique departments for the filter dropdown
    const depts = new Set();
    SOC2G.data.users.forEach(u => u.department && depts.add(u.department));
    const deptOptions = Array.from(depts).sort().map(d => `<option value="${d}">${d}</option>`).join('');

    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-semibold mb-2">SOC 2 Audit Reports</h2>
            <p class="text-sm text-gray-400">Generate compliance evidence. Filter by department where applicable.</p>
        </div>

        <!-- Global Filters -->
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8 flex items-center gap-4">
            <label class="text-sm font-medium text-gray-300">Department Filter:</label>
            <select id="soc2-dept-filter" class="bg-gray-700 border border-gray-600 rounded px-3 text-sm h-9 w-64 text-white">
                <option value="ALL">All Departments</option>
                ${deptOptions}
            </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <!-- MFA Compliance Report -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col">
                <div class="flex items-center gap-3 mb-3 text-blue-400">
                    <i data-lucide="shield"></i>
                    <h3 class="font-medium text-white">Logical Access (CC6.1)</h3>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">MFA Registration status for all users, flagging weak or missing MFA setups.</p>
                <button onclick="soc2ExportMfaReport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
            </div>

            <!-- Privileged Access Review -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col">
                <div class="flex items-center gap-3 mb-3 text-amber-400">
                    <i data-lucide="key"></i>
                    <h3 class="font-medium text-white">Privileged Access (CC6.2)</h3>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">Review users holding highly privileged Azure AD directory roles.</p>
                <button onclick="soc2ExportRolesReport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
            </div>

            <!-- Inactive Accounts -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col">
                <div class="flex items-center gap-3 mb-3 text-red-400">
                    <i data-lucide="user-x"></i>
                    <h3 class="font-medium text-white">Terminations (CC6.3)</h3>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">Enabled accounts with no sign-in activity in the last 90 days. Used to verify offboarding.</p>
                <button onclick="soc2ExportInactiveReport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
            </div>

            <!-- Device Encryption -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col">
                <div class="flex items-center gap-3 mb-3 text-purple-400">
                    <i data-lucide="hard-drive"></i>
                    <h3 class="font-medium text-white">Endpoint Security (CC6.6)</h3>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">Device inventory showing BitLocker/FileVault encryption status and Intune compliance.</p>
                 <button onclick="soc2ExportDeviceReport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
            </div>

            <!-- Guest User Review -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col">
                <div class="flex items-center gap-3 mb-3 text-emerald-400">
                    <i data-lucide="users"></i>
                    <h3 class="font-medium text-white">Vendor Access (CC6.3)</h3>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">Review of all external/guest accounts to ensure least-privilege access is maintained.</p>
                 <button onclick="soc2ExportGuestReport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
            </div>

            <!-- Configuration Policies -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col">
                <div class="flex items-center gap-3 mb-3 text-rose-400">
                    <i data-lucide="settings"></i>
                    <h3 class="font-medium text-white">Configurations (CC7.2)</h3>
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">Snapshot of all Conditional Access policies to prove logical access boundaries.</p>
                 <button onclick="soc2ExportPoliciesReport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
            </div>

        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

window.soc2RenderReports = soc2RenderReports;

// -- Export Handlers --

function soc2GetSelectedDept() {
    const el = document.getElementById('soc2-dept-filter');
    return el ? el.value : 'ALL';
}

function soc2ExportMfaReport() {
    const dept = soc2GetSelectedDept();
    const data = dept === 'ALL' ? SOC2G.data.users : SOC2G.data.users.filter(u => u.department === dept);

    exportToCsv(`SOC2_MFA_Compliance_${dept}.csv`, data, [
        { label: 'Display Name', value: 'displayName' },
        { label: 'UPN', value: 'userPrincipalName' },
        { label: 'Department', value: 'department' },
        { label: 'Job Title', value: 'jobTitle' },
        { label: 'Highly Privileged', value: 'isPrivileged' },
        { label: 'MFA Status', value: 'mfaStatus' },
        { label: 'Risk Level', value: 'riskLevel' }
    ]);
}
window.soc2ExportMfaReport = soc2ExportMfaReport;

function soc2ExportRolesReport() {
    exportToCsv('SOC2_Privileged_Roles.csv', SOC2G.data.roles, [
        { label: 'Directory Role', value: 'role' },
        { label: 'Display Name', value: 'displayName' },
        { label: 'UPN', value: 'userPrincipalName' }
    ]);
}
window.soc2ExportRolesReport = soc2ExportRolesReport;

function soc2ExportInactiveReport() {
    const dept = soc2GetSelectedDept();
    let data = dept === 'ALL' ? SOC2G.data.users : SOC2G.data.users.filter(u => u.department === dept);

    // Filter to > 90 days inactive
    data = data.filter(u => window.daysSince(u.lastSignIn) > 90);

    exportToCsv(`SOC2_Inactive_90Days_${dept}.csv`, data, [
        { label: 'Display Name', value: 'displayName' },
        { label: 'UPN', value: 'userPrincipalName' },
        { label: 'Department', value: 'department' },
        { label: 'Last Sign In', value: 'lastSignIn' },
        { label: 'Days Inactive', value: user => window.daysSince(user.lastSignIn) }
    ]);
}
window.soc2ExportInactiveReport = soc2ExportInactiveReport;

function soc2ExportDeviceReport() {
    const dept = soc2GetSelectedDept();
    const data = dept === 'ALL' ? SOC2G.data.devices : SOC2G.data.devices.filter(d => d.department === dept);

    exportToCsv(`SOC2_Device_Encryption_${dept}.csv`, data, [
        { label: 'Device Name', value: 'deviceName' },
        { label: 'Owner UPN', value: 'userPrincipalName' },
        { label: 'Department', value: 'department' },
        { label: 'OS', value: 'operatingSystem' },
        { label: 'Compliance State', value: 'complianceState' },
        { label: 'Encrypted', value: 'isEncrypted' },
        { label: 'Defender Status', value: 'defenderStatus' }
    ]);
}
window.soc2ExportDeviceReport = soc2ExportDeviceReport;

function soc2ExportGuestReport() {
    exportToCsv(`SOC2_Guest_Users.csv`, SOC2G.data.guestUsers, [
        { label: 'Display Name', value: 'displayName' },
        { label: 'UPN', value: 'userPrincipalName' },
        { label: 'Created Date', value: 'createdDateTime' },
        { label: 'Account Enabled', value: 'accountEnabled' }
    ]);
}
window.soc2ExportGuestReport = soc2ExportGuestReport;

function soc2ExportPoliciesReport() {
    exportToCsv(`SOC2_CA_Policies.csv`, SOC2G.data.policies, [
        { label: 'Policy Name', value: 'displayName' },
        { label: 'State', value: 'state' }
    ]);
}
window.soc2ExportPoliciesReport = soc2ExportPoliciesReport;
