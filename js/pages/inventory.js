/**
 * pages/inventory.js – License Inventory table
 */

function renderInventoryPage() {
  const skus = typeof getVisibleSkus === 'function' ? getVisibleSkus(LG.data.skus) : LG.data.skus;
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  skus.forEach(sku => {
    const name = getSkuName(sku.skuId, sku.skuPartNumber);
    const purchased = sku.prepaidUnits?.enabled || 0;
    const assigned = sku.consumedUnits || 0;
    const available = purchased - assigned;
    const pct = purchased > 0 ? Math.round((assigned / purchased) * 100) : 0;
    const isPremium = PREMIUM_SKUS.includes(name);

    // Utilization color
    const fillClass = pct >= 90 ? 'high' : pct >= 60 ? 'medium' : 'low';
    const statusBadge = available <= 0
      ? '<span class="badge badge-inactive">No Seats Left</span>'
      : pct >= 90
        ? '<span class="badge badge-warning">Near Capacity</span>'
        : pct < 50
          ? '<span class="badge" style="background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.3)">Under-used</span>'
          : '<span class="badge badge-active">Healthy</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="flex items-center gap-2">
          ${isPremium ? '<span class="w-2 h-2 rounded-full bg-purple-400 shrink-0" title="Premium license"></span>' : '<span class="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>'}
          <span class="font-medium text-slate-200">${name}</span>
        </div>
      </td>
      <td><code class="text-xs text-slate-500 bg-surface-900 px-1.5 py-0.5 rounded">${sku.skuPartNumber || '—'}</code></td>
      <td class="text-right font-mono text-slate-300">${purchased.toLocaleString()}</td>
      <td class="text-right font-mono text-slate-300">${assigned.toLocaleString()}</td>
      <td class="text-right font-mono ${available < 5 ? 'text-red-400' : 'text-slate-300'}">${available.toLocaleString()}</td>
      <td class="text-center">
        <div class="flex items-center justify-center gap-2">
          <div class="util-bar"><div class="util-fill ${fillClass}" style="width:${pct}%"></div></div>
          <span class="text-xs font-mono text-slate-400 w-8">${pct}%</span>
        </div>
      </td>
      <td class="text-center">${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });

  if (!skus.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-slate-500 py-8">No license data available</td></tr>';
  }
}

function exportInventoryCSV() {
  const { skus } = LG.data;
  const headers = ['Friendly Name', 'SKU Part Number', 'SKU ID', 'Purchased', 'Assigned', 'Available', '% Utilized'];
  const rows = skus.map(s => {
    const p = s.prepaidUnits?.enabled || 0;
    const a = s.consumedUnits || 0;
    return [getSkuName(s.skuId, s.skuPartNumber), s.skuPartNumber, s.skuId, p, a, p - a, p > 0 ? Math.round((a / p) * 100) + '%' : '0%'];
  });
  exportCSV('license_inventory.csv', headers, rows);
}

window.renderInventoryPage = renderInventoryPage;
window.exportInventoryCSV = exportInventoryCSV;
