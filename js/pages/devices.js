/**
 * pages/devices.js – Device & Usage Insights page
 */

function renderDevicesPage() {
  const { users } = LG.data;
  renderDeviceCharts(users);
  renderDevicesTable(users);
}

function renderDevicesTable(users) {
  const tbody = document.getElementById('devices-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Filter to premium license holders only
  const premiumUsers = users.filter(u =>
    u._isLicensed && u._licenseNames.some(n => PREMIUM_SKUS.includes(n))
  );

  if (!premiumUsers.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 py-8">No premium license holders found</td></tr>';
    return;
  }

  premiumUsers.slice(0, 50).forEach(user => {
    const device = user._lastDevice || '';
    const browser = user._lastBrowser || '';

    const deviceLower = device.toLowerCase();
    const isDesktop = /windows|mac|linux/i.test(device);
    const isMobile = /iphone|android|ipad/i.test(device);
    const isBrowserOnly = !isDesktop && !isMobile && !!device && device !== 'Signed In';
    const primaryLicense = user._licenseNames.find(n => PREMIUM_SKUS.includes(n)) || user._licenseNames[0] || '—';

    // Display string for Last Device column
    let deviceDisplay;
    if (!device) {
      deviceDisplay = '<span class="text-slate-600">No data</span>';
    } else if (device === 'Signed In') {
      deviceDisplay = '<span class="text-slate-500 italic">Signed in (no detail)</span>';
    } else {
      deviceDisplay = `<span class="text-slate-300">${device}</span>${browser ? '<span class="text-slate-500"> / ' + browser + '</span>' : ''}`;
    }

    const checkIcon = '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20"><svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></span>';
    const crossIcon = '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800"><svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></span>';
    const dashCell = '<span class="text-slate-600 text-lg leading-none">—</span>';

    const noData = !device || device === 'Signed In';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
            ${(user.displayName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p class="text-sm font-medium text-slate-200">${user.displayName || '—'}</p>
            <p class="text-xs text-slate-500">${user.department || ''}</p>
          </div>
        </div>
      </td>
      <td><span class="badge badge-premium">${primaryLicense.length > 24 ? primaryLicense.slice(0, 24) + '…' : primaryLicense}</span></td>
      <td class="text-center">${noData ? dashCell : (isDesktop && !isMobile ? checkIcon : crossIcon)}</td>
      <td class="text-center">${noData ? dashCell : (isMobile ? checkIcon : crossIcon)}</td>
      <td class="text-center">${noData ? dashCell : (isBrowserOnly ? checkIcon : crossIcon)}</td>
      <td class="text-sm">${deviceDisplay}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.renderDevicesPage = renderDevicesPage;
