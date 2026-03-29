// ── app.js — RideShare DB Admin Dashboard ─────────────────
// POV: Database Administrator (ride_dba role) — full access
// Data sourced directly from ride_sharing_fixed.sql

'use strict';

// ── HELPERS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

function stars(n) {
  if (!n) return '<span class="muted">—</span>';
  return '<span class="stars">' + '★'.repeat(n) + '<span class="star-empty">' + '★'.repeat(5 - n) + '</span></span>';
}

function badge(text) {
  return `<span class="badge ${text.toLowerCase()}">${text}</span>`;
}

function fare(f) {
  return `<span class="fare">$${f.toFixed(2)}</span>`;
}

function rideId(id) {
  return `<span class="ride-id">#${String(id).padStart(3, '0')}</span>`;
}

function promoLabel(promoId) {
  if (!promoId) return '<span class="muted">—</span>';
  const p = DB.promos.find(x => x.id === promoId);
  return p ? `<span class="promo-code">${p.code} −${p.discount}%</span>` : '—';
}

function userName(uid) {
  const u = DB.users[uid - 1];
  return u ? u.first + ' ' + u.last : '—';
}

function driverName(did) {
  const d = DB.drivers[did - 1];
  return d ? d.first + ' ' + d.last : '—';
}

function locName(id) {
  const l = DB.locations[id - 1];
  return l ? l.name : '—';
}

function locCity(id) {
  const l = DB.locations[id - 1];
  return l ? l.city : '—';
}

function vehicleModel(vid) {
  const v = DB.vehicles[vid - 1];
  return v ? `${v.model} '${String(v.year).slice(2)}` : '—';
}

function formatDate(s) {
  if (!s) return '<span class="muted">—</span>';
  return s.slice(0, 10);
}

function durationStr(dur) {
  if (!dur) return '<span class="muted">—</span>';
  return dur + ' min';
}

// ── NAVIGATION ────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: ['Dashboard', 'Overview'],
  rides:     ['Rides', 'All Trips — vw_ride_details'],
  drivers:   ['Drivers', 'Driver Roster — vw_driver_summary'],
  users:     ['Users', 'User Registry'],
  payments:  ['Payments', 'Transaction Ledger — vw_payment_overview'],
  schema:    ['Schema', '8 Tables — Physical Design'],
  triggers:  ['Triggers', '7 Business Rules'],
  procedures:['Procedures', '8 Stored Procedures'],
  dcl:       ['Access Control', 'DCL — 3 User Roles'],
};

function showView(id, anchor) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const view = $('view-' + id);
  if (view) view.classList.add('active');
  if (anchor) anchor.classList.add('active');
  const [title, sub] = PAGE_TITLES[id] || [id, ''];
  $('pageTitle').textContent = title;
  $('breadSub').textContent  = sub;
  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('hamburger').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
  document.getElementById('hamburger').classList.toggle('open');
}

// ── SEARCH ────────────────────────────────────────────────
function handleSearch(val) {
  const q = val.trim().toLowerCase();
  // Search in active visible table rows
  document.querySelectorAll('.view.active tbody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
}

// ── DASHBOARD ─────────────────────────────────────────────
function buildDashboard() {
  const s = DB.stats;

  // stat cards
  const statCards = [
    { label: 'Total Revenue', value: '$' + s.total_rev.toFixed(2), sub: 'From 40 completed rides', color: 'green', icon: '💰' },
    { label: 'Registered Users', value: DB.users.length, sub: 'Jan–Nov 2023 registrations', color: 'blue', icon: '👥' },
    { label: 'Active Drivers', value: DB.drivers.length, sub: `${s.dstat.Available} available · ${s.dstat.Busy} busy`, color: 'amber', icon: '🚗' },
    { label: 'Avg Ride Duration', value: s.avg_dur + ' min', sub: `Avg fare $${s.avg_fare} per ride`, color: 'cyan', icon: '⏱' },
  ];
  const grid = $('statsGrid');
  grid.innerHTML = '';
  statCards.forEach(({ label, value, sub, color, icon }) => {
    const card = el('div', `stat-card`);
    card.innerHTML = `
      <div class="stat-bar ${color}"></div>
      <div class="stat-label">${label}</div>
      <div class="stat-value ${color}">${value}</div>
      <div class="stat-sub">${sub}</div>
      <div class="stat-icon-bg">${icon}</div>`;
    grid.appendChild(card);
  });

  // city bar chart
  const cityMax = Math.max(...Object.values(s.cities));
  const cityColors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981'];
  const cityChart = $('cityChart');
  cityChart.innerHTML = '';
  Object.entries(s.cities).sort((a, b) => b[1] - a[1]).forEach(([city, rev], i) => {
    cityChart.innerHTML += `
      <div class="bar-row">
        <div class="bar-label">${city.replace(' ', '&nbsp;')}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(rev/cityMax*100).toFixed(1)}%;background:${cityColors[i]}"></div></div>
        <div class="bar-val">$${rev.toFixed(2)}</div>
      </div>`;
  });

  // donut chart
  const donutData = [
    { label: 'Completed', count: 40, pct: 95.2, color: '#10b981' },
    { label: 'Pending',   count: 1,  pct: 2.4,  color: '#f59e0b' },
    { label: 'Cancelled', count: 1,  pct: 2.4,  color: '#ef4444' },
  ];
  const r = 48, cx = 65, cy = 65, circ = 2 * Math.PI * r;
  let offset = 0;
  const svg = $('donutSvg');
  svg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f3f4f8" stroke-width="16"/>`;
  donutData.forEach(({ count, pct, color }) => {
    const dash = (pct / 100) * circ;
    const gap  = circ - dash;
    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    seg.setAttribute('cx', cx); seg.setAttribute('cy', cy); seg.setAttribute('r', r);
    seg.setAttribute('fill', 'none'); seg.setAttribute('stroke', color); seg.setAttribute('stroke-width', '16');
    seg.setAttribute('stroke-dasharray', `${dash.toFixed(2)} ${gap.toFixed(2)}`);
    seg.setAttribute('stroke-dashoffset', (-offset + circ / 4).toFixed(2));
    seg.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    seg.style.transition = 'stroke-dasharray 1.2s ease';
    svg.appendChild(seg);
    offset += dash;
  });
  svg.innerHTML += `
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="16" font-weight="800" fill="#1a1a2e" font-family="Inter,sans-serif">42</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="9" fill="#8888a8" font-family="JetBrains Mono,monospace">rides</text>`;

  const legend = $('donutLegend');
  legend.innerHTML = donutData.map(({ label, count, pct, color }) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${color}"></div>
      <div class="legend-name">${label}</div>
      <div class="legend-val">${count} <span style="color:var(--muted);font-size:10px">(${pct}%)</span></div>
     </div>`
  ).join('') + `
    <div style="margin-top:8px;padding-top:10px;border-top:1px solid var(--border)">
      <div class="legend-item"><div class="legend-dot" style="background:var(--accent)"></div><div class="legend-name">Avg fare</div><div class="legend-val">$${s.avg_fare}</div></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--accent2)"></div><div class="legend-name">Avg duration</div><div class="legend-val">${s.avg_dur} min</div></div>
    </div>`;

  // payment method chart
  const methodMax = Math.max(...Object.values(s.methods));
  const mColors = { Card: '#6366f1', Cash: '#10b981', Online: '#06b6d4' };
  $('methodChart').innerHTML = Object.entries(s.methods).sort((a,b) => b[1]-a[1]).map(([m, c]) =>
    `<div class="bar-row">
      <div class="bar-label">${m}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(c/methodMax*100).toFixed(0)}%;background:${mColors[m]}"></div></div>
      <div class="bar-val">${c} txn</div>
     </div>`).join('');

  const psColors = { Paid: '#10b981', Pending: '#f59e0b', Failed: '#ef4444' };
  $('payStatusChart').innerHTML = Object.entries(s.pstat).map(([st, c]) =>
    `<div class="bar-row">
      <div class="bar-label">${st}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(c/42*100).toFixed(0)}%;background:${psColors[st]}"></div></div>
      <div class="bar-val">${c}</div>
     </div>`).join('');

  // top 5 table
  $('top5Table').innerHTML = `
    <thead><tr><th>#</th><th>Driver</th><th>Rating</th><th>Rides</th><th>Earnings</th></tr></thead>
    <tbody>${s.top5.map((d, i) => `
      <tr>
        <td style="color:${i===0?'var(--accent)':'var(--muted)'};font-weight:700">${String(i+1).padStart(2,'0')}</td>
        <td><strong>${d.name}</strong><div style="font-size:10px;color:var(--muted)">${d.lic}</div></td>
        <td>${stars(Math.round(d.rating))} <span style="font-size:10px;color:var(--muted)">${d.rating}</span></td>
        <td>${d.rides}</td>
        <td>${fare(d.earn)}</td>
      </tr>`).join('')}</tbody>`;

  // driver status chart
  const dsColors = { Available: '#10b981', Busy: '#f59e0b', Offline: '#6b7280' };
  $('drvStatusChart').innerHTML = Object.entries(s.dstat).map(([st, c]) =>
    `<div class="bar-row">
      <div class="bar-label">${st}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(c/42*100).toFixed(0)}%;background:${dsColors[st]}"></div></div>
      <div class="bar-val">${c} drivers</div>
     </div>`).join('');
}

// ── RIDES VIEW ────────────────────────────────────────────
function buildRides() {
  const s = DB.stats;
  $('ridesKpi').innerHTML = `
    <div class="kpi"><div class="kpi-icon g">✅</div><div><div class="kpi-val g">40</div><div class="kpi-label">Completed</div></div></div>
    <div class="kpi"><div class="kpi-icon a">⏳</div><div><div class="kpi-val a">1</div><div class="kpi-label">Pending</div></div></div>
    <div class="kpi"><div class="kpi-icon r">❌</div><div><div class="kpi-val r">1</div><div class="kpi-label">Cancelled</div></div></div>`;

  const tbody = $('ridesTbody');
  tbody.innerHTML = DB.rides.map(r => `
    <tr>
      <td>${rideId(r.id)}</td>
      <td>${userName(r.uid)}</td>
      <td>${driverName(r.did)}</td>
      <td style="font-size:11px">${locName(r.slid)}</td>
      <td style="font-size:11px">${locName(r.elid)}</td>
      <td><span style="font-size:11px;color:var(--text2)">${locCity(r.slid)}</span></td>
      <td style="font-size:11px;color:var(--text2)">${r.start}</td>
      <td>${durationStr(r.dur)}</td>
      <td>${r.fare > 0 ? fare(r.fare) : '<span class="muted">—</span>'}</td>
      <td>${promoLabel(r.promo)}</td>
      <td>${badge(r.status)}</td>
    </tr>`).join('');

  $('ridesFooter').textContent = '42 records · RideDuration auto-set by trg_calc_duration (BR-5) · PromoID nullable FK';
}

// ── DRIVERS VIEW ──────────────────────────────────────────
function buildDrivers() {
  const s = DB.stats;
  $('driversKpi').innerHTML = `
    <div class="kpi"><div class="kpi-icon g">🟢</div><div><div class="kpi-val g">${s.dstat.Available}</div><div class="kpi-label">Available</div></div></div>
    <div class="kpi"><div class="kpi-icon a">🟡</div><div><div class="kpi-val a">${s.dstat.Busy}</div><div class="kpi-label">Busy</div></div></div>
    <div class="kpi"><div class="kpi-icon b">⚫</div><div><div class="kpi-val b">${s.dstat.Offline}</div><div class="kpi-label">Offline</div></div></div>`;

  const tbody = $('driversTbody');
  tbody.innerHTML = DB.drivers.map(d => {
    const v = DB.vehicles.find(v => v.did === d.id);
    return `<tr>
      <td class="ride-id">${d.id}</td>
      <td><strong>${d.first} ${d.last}</strong></td>
      <td><span class="mono">${d.lic}</span></td>
      <td style="font-size:11px">${v ? v.model + ' \'' + String(v.year).slice(2) : '—'}</td>
      <td>${stars(Math.round(d.rating))} <span style="font-size:10px;color:var(--muted)">${d.rating}</span></td>
      <td>${badge(d.status)}</td>
    </tr>`;
  }).join('');

  const rtbody = $('ratingsTbody');
  rtbody.innerHTML = DB.ratings.map(r => `
    <tr>
      <td>${rideId(r.rid)}</td>
      <td>${stars(r.dr)}</td>
      <td>${r.ur ? stars(r.ur) : '<span class="muted">NULL</span>'}</td>
      <td style="font-size:11px;color:var(--text2)">${r.comment || '<span class="muted">—</span>'}</td>
    </tr>`).join('');
}

// ── USERS VIEW ────────────────────────────────────────────
function buildUsers() {
  const tbody = $('usersTbody');
  tbody.innerHTML = DB.users.map(u => `
    <tr>
      <td class="ride-id">${u.id}</td>
      <td><strong>${u.first} ${u.last}</strong></td>
      <td style="font-size:11px;color:var(--muted)">${u.email}</td>
      <td style="font-size:11px">${u.phone || '<span class="muted">NULL</span>'}</td>
      <td style="font-size:11px;color:var(--text2)">${u.reg}</td>
    </tr>`).join('');
}

// ── PAYMENTS VIEW ─────────────────────────────────────────
function buildPayments() {
  const s = DB.stats;
  const totalPaid = DB.payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  $('paymentsKpi').innerHTML = `
    <div class="kpi"><div class="kpi-icon g">💵</div><div><div class="kpi-val g">$${totalPaid.toFixed(2)}</div><div class="kpi-label">Total Paid</div></div></div>
    <div class="kpi"><div class="kpi-icon a">⏳</div><div><div class="kpi-val a">$18.00</div><div class="kpi-label">Pending</div></div></div>
    <div class="kpi"><div class="kpi-icon r">❗</div><div><div class="kpi-val r">$0.00</div><div class="kpi-label">Failed</div></div></div>`;

  const tbody = $('paymentsTbody');
  tbody.innerHTML = DB.payments.map(p => {
    const ride = DB.rides[p.rid - 1];
    const uid = ride ? ride.uid : 1;
    return `<tr>
      <td class="ride-id">${rideId(p.pid)}</td>
      <td>${rideId(p.rid)}</td>
      <td>${userName(uid)}</td>
      <td>${fare(p.amount)}</td>
      <td>${badge(p.method)}</td>
      <td style="font-size:11px;color:var(--text2)">${p.date}</td>
      <td>${badge(p.status)}</td>
    </tr>`;
  }).join('');
}

// ── SCHEMA VIEW ───────────────────────────────────────────
function buildSchema() {
  const tables = [
    { name: 'users', rows: 42, cols: [
      { name: 'UserID', tag: 'pk' }, { name: 'FirstName', type: 'varchar(50)' },
      { name: 'LastName', type: 'varchar(50)' }, { name: 'Email', type: 'UQ · CHK' },
      { name: 'Phone', type: 'nullable' }, { name: 'RegistrationDate', type: 'DEFAULT NOW' },
    ]},
    { name: 'drivers', rows: 42, cols: [
      { name: 'DriverID', tag: 'pk' }, { name: 'FirstName', type: 'varchar(50)' },
      { name: 'LastName', type: 'varchar(50)' }, { name: 'LicenseNumber', type: 'UNIQUE' },
      { name: 'Rating', type: '0–5 · DEFAULT 5.0' }, { name: 'Status', type: 'enum · CHK' },
    ]},
    { name: 'vehicles', rows: 42, cols: [
      { name: 'VehicleID', tag: 'pk' }, { name: 'DriverID', tag: 'fk', type: 'FK→drivers' },
      { name: 'PlateNumber', type: 'UNIQUE' }, { name: 'Model', type: 'varchar(50)' },
      { name: 'Year', type: '1990–2030 CHK' }, { name: 'Capacity', type: '1–20 CHK' },
    ]},
    { name: 'rides', rows: 42, cols: [
      { name: 'RideID', tag: 'pk' }, { name: 'UserID', tag: 'fk', type: 'FK→users CASCADE' },
      { name: 'DriverID', tag: 'fk', type: 'FK→drivers' }, { name: 'VehicleID', tag: 'fk', type: 'FK→vehicles' },
      { name: 'StartLocationID', tag: 'fk', type: 'FK→locations' }, { name: 'EndLocationID', tag: 'fk', type: 'FK→locations' },
      { name: 'Fare', type: '≥0 CHK' }, { name: 'Status', type: 'enum CHK' },
      { name: 'RideDuration', type: 'derived · trigger' }, { name: 'PromoID', type: 'FK NULL' },
    ]},
    { name: 'payments', rows: 42, cols: [
      { name: 'PaymentID', tag: 'pk' }, { name: 'RideID', tag: 'fk', type: 'FK→rides CASCADE' },
      { name: 'Amount', type: '≥0 CHK' }, { name: 'Method', type: 'Cash/Card/Online' },
      { name: 'PaymentDate', type: 'DEFAULT NOW' }, { name: 'Status', type: 'Paid/Pending/Failed' },
    ]},
    { name: 'ratings', rows: 40, cols: [
      { name: 'RatingID', tag: 'pk' }, { name: 'RideID', tag: 'fk', type: 'FK+UQ→rides' },
      { name: 'DriverRating', type: '1–5 NOT NULL' }, { name: 'UserRating', type: '1–5 nullable' },
      { name: 'Comment', type: 'varchar(500) NULL' },
    ]},
    { name: 'locations', rows: 42, cols: [
      { name: 'LocationID', tag: 'pk' }, { name: 'Name', type: 'varchar(100)' },
      { name: 'City', type: 'varchar(50)' },
    ]},
    { name: 'promocodes', rows: 42, cols: [
      { name: 'PromoID', tag: 'pk' }, { name: 'Code', type: 'UNIQUE' },
      { name: 'Discount', type: '0–100% CHK' }, { name: 'ExpiryDate', type: 'datetime' },
    ]},
  ];

  $('schemaGrid').innerHTML = tables.map(t => `
    <div class="schema-card">
      <div class="schema-card-header">
        <span class="schema-name">${t.name}</span>
        <span class="schema-rows">${t.rows} rows</span>
      </div>
      <div class="schema-cols">
        ${t.cols.map(c => `
          <div class="schema-col">
            <span class="col-name">${c.name}</span>
            ${c.tag === 'pk' ? '<span class="col-pk">PK</span>'
            : c.tag === 'fk' ? `<span class="col-fk">${c.type || 'FK'}</span>`
            : `<span class="col-type">${c.type || ''}</span>`}
          </div>`).join('')}
      </div>
    </div>`).join('');
}

// ── TRIGGERS VIEW ─────────────────────────────────────────
function buildTriggers() {
  const afterTriggers = [
    { name: 'trg_calc_duration', icon: '⏱', br: 'BR-5', table: 'rides', desc: 'Auto-sets RideDuration = DATEDIFF(MINUTE, StartTime, EndTime) when EndTime is written. Keeps derived column accurate without manual updates.' },
    { name: 'trg_update_driver_rating', icon: '⭐', br: 'BR-4', table: 'ratings', desc: 'Recalculates driver.Rating = ROUND(AVG(DriverRating), 2) across all rides after every new rating INSERT.' },
    { name: 'trg_driver_busy_on_ride', icon: '🚗', br: 'BR-6', table: 'rides', desc: 'Sets driver.Status = "Busy" automatically when a new Pending ride row is inserted into rides.' },
    { name: 'trg_driver_available_on_complete', icon: '✅', br: 'BR-7', table: 'rides', desc: 'Resets driver.Status = "Available" when a ride transitions Pending → Completed or Cancelled.' },
    { name: 'trg_prevent_delete_completed', icon: '🛡', br: 'BR-2', table: 'rides', desc: 'RAISERROR + ROLLBACK TRANSACTION if any Completed ride appears in the deleted set. Protects audit trail.', danger: true },
  ];
  const insteadTriggers = [
    { name: 'trg_no_concurrent_rides', icon: '🚫', br: 'BR-1', table: 'rides', desc: 'Blocks INSERT entirely if the user already has a Pending ride. Fires before storage engine — RAISERROR + RETURN.' },
    { name: 'trg_validate_payment_ride', icon: '💳', br: 'BR-3', table: 'payments', desc: 'Blocks payment INSERT if the associated ride.Status = "Cancelled". Prevents financial records on void rides.' },
  ];

  function triggerItem(t) {
    const cls = t.danger ? 'danger' : (t.br.includes('BR-1') || t.br.includes('BR-3') ? 'instead' : 'after');
    const tagCls = (cls === 'instead') ? 'tag-instead' : 'tag-after';
    return `<div class="trigger-item">
      <div class="trigger-icon ${cls}">${t.icon}</div>
      <div style="flex:1">
        <div class="trigger-name">${t.name}</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px">ON ${t.table}</div>
        <div class="trigger-desc">${t.desc}</div>
      </div>
      <span class="trigger-tag ${tagCls}">${t.br}</span>
    </div>`;
  }

  $('triggersGrid').innerHTML = `
    <div class="trigger-group">
      <div class="trigger-group-label after">AFTER Triggers (5)</div>
      <div class="trigger-list">${afterTriggers.map(triggerItem).join('')}</div>
    </div>
    <div class="trigger-group">
      <div class="trigger-group-label instead">INSTEAD OF Triggers (2)</div>
      <div class="trigger-list">${insteadTriggers.map(triggerItem).join('')}</div>
      <div class="why-box">
        <strong>Why INSTEAD OF?</strong><br>
        SQL Server AFTER triggers fire <em>after</em> the row is already written — they cannot prevent the INSERT.
        INSTEAD OF fires before the storage engine writes anything, allowing clean rejection via
        <code style="font-family:JetBrains Mono,monospace;font-size:10px">RAISERROR + RETURN</code> with zero side effects.
      </div>
    </div>`;
}

// ── PROCEDURES VIEW ───────────────────────────────────────
function buildProcedures() {
  const procs = [
    { name: 'sp_get_user_rides',     desc: 'Returns all rides for a given user via vw_ride_details — all IDs resolved to names, no manual JOINs needed.',
      params: [{ label: '@UserID INT', out: false }] },
    { name: 'sp_available_drivers',  desc: 'Returns all available drivers with vehicle details. Optionally filtered by city — ready for real-time dispatch.',
      params: [{ label: '@City VARCHAR(50) = NULL', out: false }] },
    { name: 'sp_complete_ride',      desc: 'Marks a ride Completed with EndTime and Fare. Automatically fires trg_calc_duration (BR-5) and trg_driver_available (BR-7).',
      params: [{ label: '@RideID INT', out: false }, { label: '@EndTime DATETIME', out: false }, { label: '@Fare FLOAT', out: false }] },
    { name: 'sp_apply_promo',        desc: 'Validates promo expiry, computes discounted fare = Fare × (1 − Discount/100), updates ride.Fare and PromoID atomically.',
      params: [{ label: '@RideID INT', out: false }, { label: '@PromoID INT', out: false }, { label: '@NewFare FLOAT', out: true }] },
    { name: 'sp_monthly_revenue',    desc: 'Returns TotalRides, TotalRevenue, AvgFare, MinFare, MaxFare for any given year + month combination.',
      params: [{ label: '@Year INT', out: false }, { label: '@Month INT', out: false }] },
    { name: 'sp_driver_earnings',    desc: 'Returns total completed rides and total earnings for a specific driver within a start/end date range.',
      params: [{ label: '@DriverID INT', out: false }, { label: '@StartDate DATE', out: false }, { label: '@EndDate DATE', out: false }] },
    { name: 'sp_register_user',      desc: 'Inserts a new user and returns the auto-generated IDENTITY UserID via SCOPE_IDENTITY() — safe for concurrent inserts.',
      params: [{ label: '@First VARCHAR', out: false }, { label: '@Last VARCHAR', out: false }, { label: '@Email VARCHAR', out: false }, { label: '@Phone VARCHAR', out: false }] },
    { name: 'sp_cancel_ride',        desc: 'Cancels a Pending ride (Status → Cancelled), triggering trg_driver_available (BR-7). Returns @@ROWCOUNT — 0 if not found.',
      params: [{ label: '@RideID INT', out: false }, { label: 'RowsUpdated INT', out: true }] },
  ];

  $('procGrid').innerHTML = procs.map(p => `
    <div class="proc-card">
      <div class="proc-name">${p.name}</div>
      <div class="proc-desc">${p.desc}</div>
      <div class="proc-params">
        ${p.params.map(param => `<span class="proc-param ${param.out ? 'output' : ''}">${param.out ? '⟵ ' : ''}${param.label}</span>`).join('')}
      </div>
    </div>`).join('');
}

// ── DCL VIEW ──────────────────────────────────────────────
function buildDCL() {
  const roles = [
    {
      cls: 'app', login: 'ride_app', role: 'Application User',
      pw: 'App@Secure123!',
      perms: [
        { icon: '✅', label: 'SELECT — read all data' },
        { icon: '✅', label: 'INSERT — add new records' },
        { icon: '✅', label: 'UPDATE — modify existing records' },
        { icon: '🚫', label: 'DELETE — explicitly DENIED' },
      ],
      purpose: 'Used by the backend API layer. Cannot permanently delete records — prevents accidental mass deletions or SQL injection damage.'
    },
    {
      cls: 'report', login: 'ride_report', role: 'Read-Only Analyst',
      pw: 'Report@Secure123!',
      perms: [
        { icon: '✅', label: 'SELECT — read all data' },
        { icon: '❌', label: 'INSERT — not granted' },
        { icon: '❌', label: 'UPDATE — not granted' },
        { icon: '❌', label: 'DELETE — not granted' },
      ],
      purpose: 'Used by BI dashboards, analytics tools, and data exports. Cannot modify anything — true read-only isolation.'
    },
    {
      cls: 'dba', login: 'ride_dba', role: 'Database Administrator',
      pw: 'DBA@Secure123!',
      perms: [
        { icon: '✅', label: 'SELECT — full read access' },
        { icon: '✅', label: 'INSERT — full write access' },
        { icon: '✅', label: 'UPDATE — full modify access' },
        { icon: '✅', label: 'DELETE — full delete access' },
      ],
      purpose: 'db_owner role — full database control. Used for schema changes, maintenance, index rebuilds, and deployment scripts.'
    },
  ];

  $('dclGrid').innerHTML = roles.map(r => `
    <div class="dcl-card ${r.cls}">
      <div class="dcl-login">${r.login}</div>
      <div class="dcl-role">${r.role}</div>
      <div class="dcl-pw">${r.pw}</div>
      <div class="dcl-perms">${r.perms.map(p => `
        <div class="dcl-perm">
          <span class="perm-icon">${p.icon}</span>
          <span class="perm-label">${p.label}</span>
        </div>`).join('')}
      </div>
      <div class="dcl-purpose">${r.purpose}</div>
    </div>`).join('');
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildDashboard();
  buildRides();
  buildDrivers();
  buildUsers();
  buildPayments();
  buildSchema();
  buildTriggers();
  buildProcedures();
  buildDCL();

  // animate bars after page loads
  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach(b => {
      const w = b.style.width;
      b.style.width = '0';
      setTimeout(() => { b.style.width = w; }, 50);
    });
  }, 100);
});
