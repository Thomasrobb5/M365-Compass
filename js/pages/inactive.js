/**
 * pages/inactive.js – Inactive Licensed Users page with slider + filters + CSV export
 */

function _getBaseInactive(days) {
  const { users } = LG.data;

  // Build set of visible SKU IDs (respect user's exclusion preferences)
  const visibleSkus = typeof getVisibleSkus === 'function' ? getVisibleSkus(LG.data.skus) : LG.data.skus;
  const visibleSkuIds = new Set(visibleSkus.map(s => s.skuId));

  return users.filter(u => {
    if (!u._isLicensed) return false;
    if (u._daysInactive !== null && u._daysInactive < days) return false;
    // Exclude users whose ALL licences are hidden (e.g. PHONESYSTEM_VIRTUALUSER only)
    const hasVisibleLicence = (u.assignedLicenses || []).some(al => visibleSkuIds.has(al.skuId));
    return hasVisibleLicence;
  }).sort((a, b) => (b._daysInactive ?? 9999) - (a._daysInactive ?? 9999));
}

function _applyInactiveFilters(users) {
  const dept = (document.getElementById('inactive-dept-filter')?.value || '').trim();
  const lic = (document.getElementById('inactive-lic-filter')?.value || '').trim();
  return users.filter(u => {
    if (dept && (u.department || '') !== dept) return false;
    if (lic && !u._licenseNames.includes(lic)) return false;
    return true;
  });
}

function _populateInactiveFilters(baseUsers) {
  const deptSel = document.getElementById('inactive-dept-filter');
  const licSel = document.getElementById('inactive-lic-filter');
  if (!deptSel || !licSel) return;

  const savedDept = deptSel.value;
  const savedLic = licSel.value;

  // Departments
  const depts = [...new Set(baseUsers.map(u => u.department).filter(Boolean))].sort();
  deptSel.innerHTML = '<option value="">All Departments</option>' +
    depts.map(d => `<option value="${d}">${d}</option>`).join('');
  if (savedDept) deptSel.value = savedDept;

  // Licence names
  const lics = [...new Set(baseUsers.flatMap(u => u._licenseNames))].sort();
  licSel.innerHTML = '<option value="">All Licences</option>' +
    lics.map(l => `<option value="${l}">${l.length > 30 ? l.slice(0, 30) + '\u2026' : l}</option>`).join('');
  if (savedLic) licSel.value = savedLic;
}

function renderInactivePage(overrideDays) {
  const days = overrideDays !== undefined ? overrideDays : LG.inactivityDays;

  // Sync slider
  if (overrideDays === undefined) {
    const slider = document.getElementById('inactive-slider');
    if (slider) { slider.value = days; document.getElementById('inactive-slider-val').textContent = days + 'd'; }
  }

  const baseUsers = _getBaseInactive(days);
  _populateInactiveFilters(baseUsers);
  const inactiveUsers = _applyInactiveFilters(baseUsers);

  const totalCost = inactiveUsers.reduce((s, u) => s + u._monthlyCost, 0);
  document.getElementById('inactive-count').textContent = inactiveUsers.length;
  document.getElementById('inactive-cost').textContent = '$' + totalCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const tbody = document.getElementById('inactive-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  inactiveUsers.forEach(user => {
    const isPremium = user._licenseNames.some(n => PREMIUM_SKUS.includes(n));
    const daysInactive = user._daysInactive;
    const daysLabel = daysInactive !== null ? `${daysInactive}` : '\u221e (never)';
    const costStr = '$' + user._monthlyCost.toFixed(2);

    const licBadges = user._licenseNames.map(n =>
      `<span class="badge ${PREMIUM_SKUS.includes(n) ? 'badge-premium' : 'badge-license'}">${n.length > 20 ? n.slice(0, 20) + '\u2026' : n}</span>`
    ).join(' ');

    const severity = !daysInactive ? 'border-l-4 border-red-500' :
      daysInactive >= 90 ? 'border-l-4 border-red-500' :
        daysInactive >= 60 ? 'border-l-4 border-amber-500' : '';

    const tr = document.createElement('tr');
    tr.className = severity;
    tr.innerHTML = `
      <td>
        <div class="flex items-center gap-2">
          ${isPremium ? '<span class="w-2.5 h-2.5 rounded-full bg-purple-400" title="Premium license"></span>' : ''}
          <span class="font-medium text-slate-200">${user.displayName || '\u2014'}</span>
        </div>
      </td>
      <td class="text-slate-400 text-xs">${user.userPrincipalName || '\u2014'}</td>
      <td class="text-slate-400">${user.department || '\u2014'}</td>
      <td><div class="flex flex-wrap gap-1">${licBadges}</div></td>
      <td class="text-right font-bold ${daysInactive === null || daysInactive >= 90 ? 'text-red-400' : 'text-amber-400'}">${daysLabel}</td>
      <td class="text-right text-emerald-400 font-medium">${costStr}</td>
      <td class="text-center">
        <button class="btn-secondary btn-sm" onclick="openUserModal(LG.data.users.find(u=>u.id==='${user.id}'))">
          View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (!inactiveUsers.length) {
    const base = baseUsers.length;
    const msg = base > 0
      ? `No results match your filters (${base} total inactive users before filter)`
      : `No inactive licensed users found for the ${days}-day threshold`;
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-500 py-8">${msg}</td></tr>`;
  }
}

function exportInactiveCSV() {
  const days = LG.inactivityDays;
  const baseUsers = _getBaseInactive(days);
  const inactiveUsers = _applyInactiveFilters(baseUsers);

  const headers = ['Display Name', 'UPN', 'Department', 'Job Title', 'Licenses', 'Last Sign-in', 'Days Inactive', 'Account Enabled', 'Est. Monthly Cost', 'Is Premium'];
  const rows = inactiveUsers.map(u => [
    u.displayName, u.userPrincipalName, u.department, u.jobTitle,
    u._licenseNames.join('; '),
    u._lastSignIn ? formatDate(u._lastSignIn) : 'Never',
    u._daysInactive !== null ? u._daysInactive : 'Never signed in',
    u.accountEnabled ? 'Yes' : 'No',
    '$' + u._monthlyCost.toFixed(2),
    u._licenseNames.some(n => PREMIUM_SKUS.includes(n)) ? 'Yes' : 'No'
  ]);
  exportCSV(`inactive_users_${days}days.csv`, headers, rows);
}

window.renderInactivePage = renderInactivePage;
window.exportInactiveCSV = exportInactiveCSV;
