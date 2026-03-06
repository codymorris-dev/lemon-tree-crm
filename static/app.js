'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let allLeads = [];
let currentLeadId = null;
let sortField = 'created_at';
let sortDir = 'desc';   // 'asc' | 'desc'

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadLeads();
  document.getElementById('modal-notes').addEventListener('input', updateCharCount);
});

// ── Data ───────────────────────────────────────────────────────────────────
async function loadLeads() {
  try {
    const res = await fetch('/api/leads');
    if (!res.ok) throw new Error('Failed to fetch leads');
    allLeads = await res.json();
    renderStats();
    populateTypeFilter();
    filterLeads();
  } catch (err) {
    showToast('Error loading leads: ' + err.message, 'error');
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────
function renderStats() {
  const counts = { new: 0, contacted: 0, interested: 0, converted: 0 };
  allLeads.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++; });

  document.getElementById('stat-total').textContent     = allLeads.length;
  document.getElementById('stat-new').textContent       = counts.new;
  document.getElementById('stat-contacted').textContent = counts.contacted;
  document.getElementById('stat-interested').textContent = counts.interested;
  document.getElementById('stat-converted').textContent = counts.converted;
}

// ── Filter / Sort / Render ─────────────────────────────────────────────────
function populateTypeFilter() {
  const types = [...new Set(allLeads.map(l => l.business_type))].sort();
  const sel = document.getElementById('filter-type');
  // Keep the "All Types" option, replace the rest
  sel.innerHTML = '<option value="">All Types</option>' +
    types.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');
}

function filterLeads() {
  const query     = document.getElementById('search-input').value.toLowerCase().trim();
  const status    = document.getElementById('filter-status').value;
  const type      = document.getElementById('filter-type').value;
  const contacted = document.getElementById('filter-contacted').value;

  let filtered = allLeads.filter(l => {
    if (query && ![l.name, l.address, l.phone, l.notes].some(f => (f || '').toLowerCase().includes(query))) return false;
    if (status    && l.status !== status) return false;
    if (type      && l.business_type !== type) return false;
    if (contacted === 'true'  && !l.contacted) return false;
    if (contacted === 'false' && l.contacted)  return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let av = a[sortField] ?? '';
    let bv = b[sortField] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  document.getElementById('results-count').textContent =
    filtered.length === allLeads.length
      ? `${allLeads.length} leads`
      : `${filtered.length} of ${allLeads.length} leads`;

  renderTable(filtered);
}

function sortBy(field) {
  if (sortField === field) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDir = 'asc';
  }
  // Update sort icons
  ['name','business_type','status','created_at'].forEach(f => {
    const el = document.getElementById('sort-' + f);
    if (!el) return;
    el.textContent = f === sortField ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
  });
  filterLeads();
}

function renderTable(leads) {
  const tbody = document.getElementById('leads-tbody');

  if (leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          No leads match your filters
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const websiteCell = lead.website
      ? `<a href="${escHtml(lead.website)}" target="_blank" onclick="event.stopPropagation()" title="${escHtml(lead.website)}">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:3px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Visit
         </a>`
      : `<span class="no-data">—</span>`;

    const contactedCell = lead.contacted
      ? `<span class="contacted-yes" title="Contacted">✓</span>`
      : `<span class="contacted-no" title="Not contacted">–</span>`;

    return `
      <tr onclick="openModal('${escHtml(lead.id)}')" class="lead-row">
        <td class="lead-name">${escHtml(lead.name)}</td>
        <td><span class="type-badge">${escHtml(lead.business_type)}</span></td>
        <td>${lead.phone ? escHtml(lead.phone) : '<span class="no-data">—</span>'}</td>
        <td>${websiteCell}</td>
        <td><span class="status-badge status-${lead.status}">${capitalize(lead.status)}</span></td>
        <td>${contactedCell}</td>
        <td style="color:var(--gray-500);font-size:0.82rem">${formatDate(lead.created_at)}</td>
        <td>
          <button class="btn-edit" onclick="event.stopPropagation(); openModal('${escHtml(lead.id)}')">Edit</button>
        </td>
      </tr>`;
  }).join('');
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function openModal(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  currentLeadId = id;

  document.getElementById('modal-title').textContent     = lead.name;
  document.getElementById('modal-type-badge').textContent = lead.business_type;
  document.getElementById('modal-address').textContent   = lead.address || '—';
  document.getElementById('modal-phone').textContent     = lead.phone   || '—';
  document.getElementById('modal-date').textContent      = formatDate(lead.created_at);

  const websiteEl = document.getElementById('modal-website');
  if (lead.website) {
    websiteEl.href        = lead.website;
    websiteEl.textContent = lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    document.getElementById('modal-website-row').style.display = 'flex';
  } else {
    document.getElementById('modal-website-row').style.display = 'none';
  }

  if (lead.rating) {
    document.getElementById('modal-rating').textContent =
      `★ ${lead.rating}  (${lead.review_count ?? '?'} reviews)`;
    document.getElementById('modal-rating-row').style.display = 'flex';
  } else {
    document.getElementById('modal-rating-row').style.display = 'none';
  }

  document.getElementById('modal-status').value      = lead.status;
  document.getElementById('modal-contacted').checked = lead.contacted;
  document.getElementById('modal-notes').value       = lead.notes || '';
  updateCharCount();

  document.getElementById('modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  currentLeadId = null;
}

function updateCharCount() {
  const len = document.getElementById('modal-notes').value.length;
  document.getElementById('char-count').textContent = len > 0 ? `${len} characters` : '';
}

// Only called from the status select — keep badge in sync
function updateStatusBadge() { /* visual only, saved on submit */ }

async function saveLead() {
  if (!currentLeadId) return;
  const data = {
    status:    document.getElementById('modal-status').value,
    contacted: document.getElementById('modal-contacted').checked,
    notes:     document.getElementById('modal-notes').value,
  };

  try {
    const res = await fetch(`/api/leads/${currentLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Save failed');
    const updated = await res.json();
    const idx = allLeads.findIndex(l => l.id === currentLeadId);
    if (idx !== -1) allLeads[idx] = updated;
    closeModal();
    renderStats();
    filterLeads();
    showToast('Lead saved!', 'success');
  } catch (err) {
    showToast('Error saving lead: ' + err.message, 'error');
  }
}

async function deleteLead() {
  if (!currentLeadId) return;
  const lead = allLeads.find(l => l.id === currentLeadId);
  if (!confirm(`Delete "${lead?.name}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/leads/${currentLeadId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    allLeads = allLeads.filter(l => l.id !== currentLeadId);
    closeModal();
    renderStats();
    filterLeads();
    showToast('Lead deleted.', 'success');
  } catch (err) {
    showToast('Error deleting lead: ' + err.message, 'error');
  }
}

// ── Add Modal ──────────────────────────────────────────────────────────────
function openAddModal() {
  ['add-name','add-type','add-address','add-phone','add-website'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('add-modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('add-name').focus(), 50);
}

function closeAddModal() {
  document.getElementById('add-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

async function createLead() {
  const name = document.getElementById('add-name').value.trim();
  if (!name) {
    document.getElementById('add-name').focus();
    showToast('Business name is required.', 'error');
    return;
  }

  const data = {
    name,
    business_type: document.getElementById('add-type').value.trim()    || 'Other',
    address:       document.getElementById('add-address').value.trim(),
    phone:         document.getElementById('add-phone').value.trim(),
    website:       document.getElementById('add-website').value.trim(),
  };

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Create failed');
    const lead = await res.json();
    allLeads.unshift(lead);
    closeAddModal();
    populateTypeFilter();
    renderStats();
    filterLeads();
    showToast(`"${lead.name}" added!`, 'success');
  } catch (err) {
    showToast('Error adding lead: ' + err.message, 'error');
  }
}

// ── Export ─────────────────────────────────────────────────────────────────
function exportCSV() {
  const headers = ['Name','Type','Address','Phone','Website','Status','Contacted','Notes','Rating','Reviews','Added'];
  const rows = allLeads.map(l => [
    l.name, l.business_type, l.address, l.phone, l.website,
    l.status, l.contacted ? 'Yes' : 'No', l.notes,
    l.rating ?? '', l.review_count ?? '', l.created_at,
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `lemon-tree-leads-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported!', 'success');
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'default') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast';
  if (type === 'success') el.classList.add('toast-success');
  if (type === 'error')   el.classList.add('toast-error');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeAddModal();
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
