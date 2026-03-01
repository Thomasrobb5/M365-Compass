/**
 * soc2gov/pages/overview.js – Dashboard for SOC2 Module
 */

function soc2RenderOverview() {
    const container = document.getElementById('page-soc2-overview');
    if (!container) return;

    if (!SOC2G.data.lastSync) {
        container.innerHTML = `<div class="p-8 text-center text-gray-400">Loading audit data...</div>`;
        return;
    }

    const mfaMissing = SOC2G.data.users.filter(u => u.mfaStatus === 'None' || u.mfaStatus === 'Weak').length;
    const privilegedMfaMissing = SOC2G.data.users.filter(u => u.isPrivileged && (u.mfaStatus === 'None' || u.mfaStatus === 'Weak')).length;
    let privilegedIssue = privilegedMfaMissing > 0 ? `<p class="text-xs text-red-500 mt-1"><i data-lucide="alert-triangle" class="w-3 h-3 inline"></i> ${privilegedMfaMissing} Admin lacks MFA!</p>` : `<p class="text-xs text-green-500 mt-1"><i data-lucide="check-circle" class="w-3 h-3 inline"></i> All Admins Secured</p>`;

    const devicesUnencrypted = SOC2G.data.devices.filter(d => !d.isEncrypted && d.operatingSystem === 'Windows').length;
    let encryptionIssue = devicesUnencrypted > 0 ? `<p class="text-xs text-amber-500 mt-1">${devicesUnencrypted} Windows devices lack BitLocker.</p>` : `<p class="text-xs text-green-500 mt-1"><i data-lucide="check-circle" class="w-3 h-3 inline"></i> Encrypted</p>`;

    const guests = SOC2G.data.guestUsers.length;

    const policiesEnabled = SOC2G.data.policies.filter(p => p.state === 'enabled').length;
    const policiesTotal = SOC2G.data.policies.length;

    let totalScore = 100;
    if (mfaMissing > 0) totalScore -= 20;
    if (privilegedMfaMissing > 0) totalScore -= 30;
    if (devicesUnencrypted > 0) totalScore -= 20;
    if (totalScore < 0) totalScore = 0;

    let scoreColor = 'text-green-500';
    if (totalScore < 80) scoreColor = 'text-amber-500';
    if (totalScore < 50) scoreColor = 'text-red-500';

    let html = `
        <div class="mb-6 flex justify-between items-end">
            <div>
                <h2 class="text-2xl font-semibold mb-1">SOC 2 Audit Posture</h2>
                <p class="text-sm text-gray-400">High-level compliance overview based on live configuration data.</p>
            </div>
            <div class="text-right">
                <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Overall Audit Score</p>
                <div class="text-4xl font-bold ${scoreColor}">${totalScore}%</div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Access Control -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700">
                <div class="flex items-center gap-3 mb-2">
                    <div class="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><i data-lucide="shield-check"></i></div>
                    <h3 class="font-medium">Logical Access</h3>
                </div>
                <p class="text-2xl font-bold">${mfaMissing} <span class="text-sm font-normal text-gray-400">users lack MFA</span></p>
                ${privilegedIssue}
            </div>

            <!-- Endpoint Security -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700">
                <div class="flex items-center gap-3 mb-2">
                    <div class="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><i data-lucide="laptop"></i></div>
                    <h3 class="font-medium">Device Security</h3>
                </div>
                <p class="text-2xl font-bold">${devicesUnencrypted} <span class="text-sm font-normal text-gray-400">unencrypted</span></p>
                ${encryptionIssue}
            </div>

            <!-- Guest Access -->
            <div class="bg-gray-800 rounded-lg p-5 border border-gray-700">
                <div class="flex items-center gap-3 mb-2">
                    <div class="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><i data-lucide="users"></i></div>
                    <h3 class="font-medium">External Access</h3>
                </div>
                <p class="text-2xl font-bold">${guests} <span class="text-sm font-normal text-gray-400">guest accounts</span></p>
                <p class="text-xs text-gray-500 mt-1">Review required for stale guests.</p>
            </div>

             <!-- Configuration -->
             <div class="bg-gray-800 rounded-lg p-5 border border-gray-700">
                <div class="flex items-center gap-3 mb-2">
                    <div class="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><i data-lucide="settings"></i></div>
                    <h3 class="font-medium">Configurations</h3>
                </div>
                <p class="text-2xl font-bold">${policiesEnabled}/${policiesTotal} <span class="text-sm font-normal text-gray-400">CA policies active</span></p>
                 <p class="text-xs text-gray-500 mt-1">Conditional Access rules.</p>
            </div>
        </div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 class="font-medium mb-4">Recommended Next Steps</h3>
            <ul class="space-y-3 text-sm text-gray-300">
               ${privilegedMfaMissing > 0 ? `<li class="flex items-start gap-2 text-red-400"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5"></i> <strong>Critical:</strong> Enforce MFA for the ${privilegedMfaMissing} highly privileged accounts immediately.</li>` : ''}
               ${devicesUnencrypted > 0 ? `<li class="flex items-start gap-2 text-amber-400"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5"></i> <strong>High:</strong> Enable BitLocker on the ${devicesUnencrypted} unencrypted Windows endpoints via Intune.</li>` : ''}
               ${mfaMissing > 0 ? `<li class="flex items-start gap-2"><i data-lucide="info" class="w-4 h-4 mt-0.5"></i> <strong>Medium:</strong> Rollout MFA to the remaining ${mfaMissing} standard users.</li>` : ''}
               <li class="flex items-start gap-2"><i data-lucide="file-text" class="w-4 h-4 mt-0.5"></i> Generate exports from the <strong>Reports</strong> tab to provide to your auditor.</li>
            </ul>
        </div>
    `;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}
window.soc2RenderOverview = soc2RenderOverview;
