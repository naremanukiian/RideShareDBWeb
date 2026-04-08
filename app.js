'use strict';
// RideShareDB — app.js
// Data source: supabase.js fetches live data and calls window.showRoleScreen() when ready.
// All rendering logic is unchanged — reads window.DB in the same shape as before.

// Called by supabase.js after window.DB is successfully populated
window.showRoleScreen = function() {
  document.getElementById('roleScreen').classList.remove('hidden');
};

// ── UTILS ───────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const ht = (el, h)   => { el.innerHTML = h; };

const B    = t  => `<span class="badge ${t.toLowerCase()}">${t}</span>`;
const FARE = f  => `<span class="fare">$${Number(f).toFixed(2)}</span>`;
const ID   = id => `<span class="tid">#${String(id).padStart(3,'0')}</span>`;
const DUR  = d  => d ? `${d} min` : `<span class="muted">—</span>`;
const MONO = t  => `<span class="mono">${t}</span>`;
const STARS = n => {
  if (!n) return '<span class="muted">—</span>';
  return `<span class="stars-on">${'★'.repeat(n)}</span><span class="stars-off">${'★'.repeat(5 - n)}</span>`;
};
const uname = id => { const u = DB.users[id-1];    return u ? u.first+' '+u.last : '—'; };
const dname = id => { const d = DB.drivers[id-1];  return d ? d.first+' '+d.last : '—'; };
const lname = id => { const l = DB.locations[id-1];return l ? l.name : '—'; };
const lcity = id => { const l = DB.locations[id-1];return l ? l.city : '—'; };
const promo = id => {
  if (!id) return '<span class="muted">—</span>';
  const p = DB.promos.find(x => x.id === id);
  return p ? `<span class="promo-tag">${p.code} −${p.discount}%</span>` : '—';
};

// ── SVG ICONS ───────────────────────────────────────────────────
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICO = {
  dash:   SVG('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
  ride:   SVG('<path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v5a2 2 0 01-2 2h-2"/><circle cx="9" cy="21" r="2"/><circle cx="19" cy="21" r="2"/>'),
  car:    SVG('<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
  pay:    SVG('<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>'),
  star:   SVG('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  person: SVG('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  users:  SVG('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  tag:    SVG('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  db:     SVG('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
  bolt:   SVG('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  code:   SVG('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
  lock:   SVG('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'),
};

// ── STATE ───────────────────────────────────────────────────────
let ROLE = null;
const ME_USER   = 1; // Alice Johnson
const ME_DRIVER = 1; // James Cooper

// ── ROLE CONFIG ─────────────────────────────────────────────────
const ROLES = {
  passenger: {
    label:'Passenger', av:'PA', color:'#06b6d4', login:'ride_app',
    nav:[
      { group:'My Account' },
      { id:'p-rides',  label:'My Rides',    ico:ICO.ride },
      { id:'p-book',   label:'Book a Ride', ico:ICO.car  },
      { id:'p-pays',   label:'My Payments', ico:ICO.pay  },
      { id:'p-promos', label:'Promo Codes', ico:ICO.tag  },
    ],
    home:'p-rides',
  },
  driver: {
    label:'Driver', av:'DR', color:'#10b981', login:'ride_app',
    nav:[
      { group:'My Portal' },
      { id:'d-trips',   label:'My Trips',   ico:ICO.ride },
      { id:'d-earn',    label:'Earnings',   ico:ICO.pay  },
      { id:'d-ratings', label:'My Ratings', ico:ICO.star },
      { id:'d-vehicle', label:'My Vehicle', ico:ICO.car  },
    ],
    home:'d-trips',
  },
  analyst: {
    label:'Analyst', av:'AN', color:'#f59e0b', login:'ride_report',
    nav:[
      { group:'Analytics' },
      { id:'a-overview', label:'Overview',    ico:ICO.dash,   cnt:''},
      { id:'a-rides',    label:'All Rides',   ico:ICO.ride,   cnt:'42'},
      { id:'a-drivers',  label:'All Drivers', ico:ICO.person, cnt:'42'},
      { id:'a-revenue',  label:'Revenue',     ico:ICO.pay },
      { id:'a-users',    label:'Users',       ico:ICO.users,  cnt:'42'},
      { id:'a-queries',  label:'Algebra Queries', ico:ICO.code, cnt:'30'},
    ],
    home:'a-overview',
  },
  dba: {
    label:'DBA Admin', av:'DB', color:'#6366f1', login:'ride_dba',
    nav:[
      { group:'Operations' },
      { id:'dba-dash',  label:'Dashboard', ico:ICO.dash },
      { id:'dba-rides', label:'Rides',     ico:ICO.ride,   cnt:'42'},
      { id:'dba-drvs',  label:'Drivers',   ico:ICO.person, cnt:'42'},
      { id:'dba-usrs',  label:'Users',     ico:ICO.users,  cnt:'42'},
      { id:'dba-pays',  label:'Payments',  ico:ICO.pay,    cnt:'42'},
      { group:'Database' },
      { id:'dba-schema', label:'Schema',         ico:ICO.db },
      { id:'dba-trg',    label:'Triggers',       ico:ICO.bolt, cnt:'7'},
      { id:'dba-proc',   label:'Procedures',     ico:ICO.code, cnt:'8'},
      { id:'dba-dcl',    label:'Access Control', ico:ICO.lock },
      { id:'dba-queries',label:'Algebra Queries',ico:ICO.ride, cnt:'30'},
    ],
    home:'dba-dash',
  },
};

const TITLES = {
  'p-rides':['My Rides','Trip History'],
  'p-book': ['Book a Ride','Available Drivers — sp_available_drivers'],
  'p-pays': ['My Payments','Transaction History'],
  'p-promos':['Promo Codes','Active Discounts — vw_active_promos'],
  'd-trips':['My Trips','Completed Rides'],
  'd-earn': ['Earnings','Revenue — sp_driver_earnings'],
  'd-ratings':['My Ratings','Passenger Feedback'],
  'd-vehicle':['My Vehicle','Vehicle Details'],
  'a-overview':['Overview','Analytics Dashboard'],
  'a-rides':  ['All Rides','vw_ride_details — 42 records'],
  'a-drivers':['All Drivers','vw_driver_summary — 42 drivers'],
  'a-revenue':['Revenue','vw_revenue_by_city'],
  'a-users':  ['Users','users table — 42 users'],
  'a-queries':  ['Algebra Queries','30 DQL Queries — All 7 Relational Algebra Operations'],
  'dba-dash': ['DBA Dashboard','Full System Overview'],
  'dba-rides':['Rides','vw_ride_details — 42 records'],
  'dba-drvs': ['Drivers','vw_driver_summary — 42 drivers'],
  'dba-usrs': ['Users','users table — 42 users'],
  'dba-pays': ['Payments','vw_payment_overview — 42 records'],
  'dba-schema':['Schema','8 Tables — Physical Design'],
  'dba-trg':  ['Triggers','7 Business Rule Automations'],
  'dba-proc': ['Procedures','8 Stored Procedures'],
  'dba-dcl':  ['Access Control','DCL — 3 User Roles'],
  'dba-queries':['Algebra Queries','30 DQL Queries — All 7 Relational Algebra Operations'],
};

// ── SELECT ROLE ─────────────────────────────────────────────────
function selectRole(role) {
  ROLE = role;
  const def = ROLES[role];
  $('app').setAttribute('data-role', role);

  // role pill
  $('sbRoleAv').textContent  = def.av;
  $('sbRoleAv').style.background = def.color;
  $('sbRoleName').textContent  = def.label;
  $('sbRoleLogin').textContent = def.login;
  $('tbAv').textContent = def.av;
  $('tbAv').style.background = def.color;

  // ── BUILD NAV — ONLY createElement, NEVER innerHTML += ──────
  // This is the root cause of broken clicks: mixing innerHTML += with
  // appendChild destroys all previously attached event listeners.
  // Solution: clear once with innerHTML='', then only use appendChild.
  const nav = $('sbNav');
  nav.innerHTML = ''; // clear once — safe

  def.nav.forEach(item => {
    if (item.group) {
      // group label — use textContent, not innerHTML +=
      const lbl = mk('div', 'nav-label');
      lbl.textContent = item.group;
      nav.appendChild(lbl);
      return;
    }

    const btn = mk('button', 'nav-item');
    btn.setAttribute('data-view', item.id);

    const icoWrap = mk('span', 'ni');
    icoWrap.innerHTML = item.ico; // only inner content
    btn.appendChild(icoWrap);

    const txt = mk('span');
    txt.textContent = item.label;
    btn.appendChild(txt);

    if (item.cnt !== undefined && item.cnt !== '') {
      const cnt = mk('span', 'nav-count');
      cnt.textContent = item.cnt;
      btn.appendChild(cnt);
    }

    // attach listener — survives because no innerHTML += after this
    btn.addEventListener('click', function() {
      showView(item.id, btn);
    });

    nav.appendChild(btn);
  });

  // build all views for this role
  buildViews(role);

  // switch screens
  $('roleScreen').classList.add('hidden');
  $('app').classList.remove('hidden');

  // activate home view
  const homeBtn = nav.querySelector(`[data-view="${def.home}"]`);
  showView(def.home, homeBtn);
}

function backToRole() {
  $('roleScreen').classList.remove('hidden');
  $('app').classList.add('hidden');
  $('page').innerHTML = '';
  ROLE = null;
}

// wire switch buttons (set once, not per-role)
document.addEventListener('DOMContentLoaded', () => {
  $('sbRolePill').addEventListener('click', backToRole);
  $('sbRoleSwitch').addEventListener('click', backToRole);
  $('tbAv').addEventListener('click', backToRole);
  $('hamburger').addEventListener('click', toggleSidebar);
  $('overlay').addEventListener('click', toggleSidebar);
});

// ── NAVIGATION ──────────────────────────────────────────────────
function showView(id, btn) {
  // deactivate all
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // activate
  const v = $('v-' + id);
  if (v) v.classList.add('active');
  if (btn) btn.classList.add('active');
  // titles
  const [t, s] = TITLES[id] || [id, ''];
  $('tbTitle').textContent = t;
  $('tbSub').textContent   = s;
  // close mobile sidebar
  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('show');
  $('hamburger').classList.remove('open');
}

function toggleSidebar() {
  $('sidebar').classList.toggle('open');
  $('overlay').classList.toggle('show');
  $('hamburger').classList.toggle('open');
}

function doSearch(val) {
  const q = val.trim().toLowerCase();
  document.querySelectorAll('.view.active tbody tr').forEach(r => {
    r.style.display = (!q || r.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

// ── VIEW FACTORY ─────────────────────────────────────────────────
function V(id) {
  const d = mk('div', 'view');
  d.id = 'v-' + id;
  return d;
}

function buildViews(role) {
  const pg = $('page');
  pg.innerHTML = '';
  if (role === 'passenger') buildPassenger(pg);
  if (role === 'driver')    buildDriver(pg);
  if (role === 'analyst')   buildAnalyst(pg);
  if (role === 'dba')       buildDBA(pg);
}

// ── HTML HELPERS ─────────────────────────────────────────────────
function vhdr(title, desc) {
  return `<div class="vhdr"><div class="vtitle">${title}</div><div class="vdesc">${desc}</div></div>`;
}
function welcome(icon, name, sub) {
  return `<div class="welcome-card"><div class="wc-bg">${icon}</div><div class="wc-tag">Welcome back</div><div class="wc-name">${name}</div><div class="wc-sub">${sub}</div></div>`;
}
function SC(label, val, sub, vc, tc, ico) {
  return `<div class="sc"><div class="sc-bar" style="background:${tc}"></div><div class="sc-label">${label}</div><div class="sc-val" style="color:${vc}">${val}</div><div class="sc-sub">${sub}</div><div class="sc-ico">${ico}</div></div>`;
}
function KPI(icon, val, label, color) {
  return `<div class="kpi"><div class="kpi-ico" style="background:${color}22">${icon}</div><div><div class="kpi-val" style="color:${color}">${val}</div><div class="kpi-lbl">${label}</div></div></div>`;
}
function bars(rows) {
  return `<div class="barchart">${rows.map(([l,p,c,v]) =>
    `<div class="bar-row"><div class="bar-lbl">${l}</div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c}"></div></div><div class="bar-val">${v}</div></div>`
  ).join('')}</div>`;
}
function warn(msg) {
  return `<div class="warn-bar">⚠ ${msg}</div>`;
}

// ── TABLE HELPERS ─────────────────────────────────────────────────
function ridesTable(list, title = 'All Rides — vw_ride_details') {
  return `<div class="card">
    <div class="card-hdr"><div class="card-title">${title}</div><div class="card-meta">${list.length} records</div></div>
    <div class="twrap"><table class="tbl">
      <thead><tr><th>ID</th><th>Passenger</th><th>Driver</th><th>From</th><th>To</th><th>City</th><th>Date</th><th>Dur</th><th>Fare</th><th>Promo</th><th>Status</th></tr></thead>
      <tbody>${list.map(r => `<tr>
        <td>${ID(r.id)}</td>
        <td style="white-space:nowrap">${uname(r.uid)}</td>
        <td style="white-space:nowrap">${dname(r.did)}</td>
        <td style="font-size:11px">${lname(r.slid)}</td>
        <td style="font-size:11px">${lname(r.elid)}</td>
        <td style="font-size:11px;color:var(--t2)">${lcity(r.slid)}</td>
        <td style="font-size:11px;color:var(--t2)">${r.start.slice(0,10)}</td>
        <td>${DUR(r.dur)}</td>
        <td>${r.fare > 0 ? FARE(r.fare) : '<span class="muted">—</span>'}</td>
        <td>${promo(r.promo)}</td>
        <td>${B(r.status)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="tbl-foot">RideDuration auto-set by trg_calc_duration (BR-5) · PromoID nullable FK</div>
  </div>`;
}
function driversTable(list, title = 'Driver Roster — vw_driver_summary') {
  const sorted = [...list].sort((a, b) => b.rating - a.rating);
  return `<div class="card">
    <div class="card-hdr"><div class="card-title">${title}</div><div class="card-meta">${sorted.length} drivers</div></div>
    <div class="twrap"><table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Licence</th><th>Vehicle</th><th>Rating ↓</th><th>Status</th></tr></thead>
      <tbody>${sorted.map(d => {
        const v = DB.vehicles.find(x => x.did === d.id);
        return `<tr>
          <td class="tid">${d.id}</td>
          <td><strong>${d.first} ${d.last}</strong></td>
          <td>${MONO(d.lic)}</td>
          <td style="font-size:11px">${v ? v.model + " '" + String(v.year).slice(2) : '—'}</td>
          <td>${STARS(Math.round(d.rating))} <span style="font-size:10px;color:var(--t3)">${d.rating}</span></td>
          <td>${B(d.status)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="tbl-foot">Rating auto-recalculated by trg_update_driver_rating (BR-4) · Status by BR-6 &amp; BR-7</div>
  </div>`;
}
function usersTable(list) {
  return `<div class="card">
    <div class="card-hdr"><div class="card-title">User Registry — users table</div><div class="card-meta">${list.length} users</div></div>
    <div class="twrap"><table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th></tr></thead>
      <tbody>${list.map(u => `<tr>
        <td class="tid">${u.id}</td>
        <td><strong>${u.first} ${u.last}</strong></td>
        <td style="font-size:11px;color:var(--t2)">${u.email}</td>
        <td style="font-size:11px">${u.phone || '<span class="muted">NULL</span>'}</td>
        <td style="font-size:11px;color:var(--t2)">${u.reg}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="tbl-foot">Email UNIQUE + CHECK(LIKE '%@%.%') · Phone nullable · RegistrationDate DEFAULT GETDATE()</div>
  </div>`;
}
function paymentsTable(list, title = 'Payment Ledger — vw_payment_overview') {
  return `<div class="card">
    <div class="card-hdr"><div class="card-title">${title}</div><div class="card-meta">${list.length} records</div></div>
    <div class="twrap"><table class="tbl">
      <thead><tr><th>Pay ID</th><th>Ride</th><th>Passenger</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>${list.map(p => {
        const ride = DB.rides[p.rid - 1];
        return `<tr>
          <td>${ID(p.pid)}</td>
          <td>${ID(p.rid)}</td>
          <td>${ride ? uname(ride.uid) : '—'}</td>
          <td>${FARE(p.amount)}</td>
          <td>${B(p.method)}</td>
          <td style="font-size:11px;color:var(--t2)">${p.date}</td>
          <td>${B(p.status)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="tbl-foot">trg_validate_payment_ride (BR-3) · INSTEAD OF INSERT blocks payment on cancelled rides</div>
  </div>`;
}

// ═══════════════════════════════════════════════
// PASSENGER VIEWS
// ═══════════════════════════════════════════════
function buildPassenger(pg) {
  const u = DB.users[ME_USER - 1];
  const myR = DB.rides.filter(r => r.uid === ME_USER);
  const myP = DB.payments.filter(p => { const r = DB.rides[p.rid-1]; return r && r.uid === ME_USER; });
  const today = new Date();
  const activePromos = DB.promos.filter(p => new Date(p.expiry) > today);

  // My Rides
  const v1 = V('p-rides');
  ht(v1, welcome('👤', u.first+' '+u.last, `You have ${myR.length} rides in your history.`)
    + `<div class="kpi-row">
        ${KPI('✅', myR.filter(r=>r.status==='Completed').length, 'Completed', '#10b981')}
        ${KPI('⏳', myR.filter(r=>r.status==='Pending').length,   'Pending',   '#f59e0b')}
        ${KPI('💵', '$'+myR.reduce((s,r)=>s+r.fare,0).toFixed(2), 'Total Spent','#6366f1')}
       </div>`
    + `<div class="card">
        <div class="card-hdr"><div class="card-title">My Trip History</div><div class="card-meta">${myR.length} rides</div></div>
        <div class="twrap"><table class="tbl">
          <thead><tr><th>Ride</th><th>Driver</th><th>From</th><th>To</th><th>Date</th><th>Dur</th><th>Fare</th><th>Promo</th><th>Status</th></tr></thead>
          <tbody>${myR.map(r=>`<tr>
            <td>${ID(r.id)}</td><td>${dname(r.did)}</td>
            <td style="font-size:11px">${lname(r.slid)}</td>
            <td style="font-size:11px">${lname(r.elid)}</td>
            <td style="font-size:11px;color:var(--t2)">${r.start.slice(0,10)}</td>
            <td>${DUR(r.dur)}</td>
            <td>${r.fare>0?FARE(r.fare):'<span class="muted">—</span>'}</td>
            <td>${promo(r.promo)}</td><td>${B(r.status)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <div class="tbl-foot">Your rides only · RideDuration auto-set by trg_calc_duration (BR-5)</div>
       </div>`);
  pg.appendChild(v1);

  // Book
  const v2 = V('p-book');
  ht(v2, vhdr('Book a Ride', 'Choose from <strong>'+DB.drivers.filter(d=>d.status==='Available').length+' available drivers</strong> right now. One active Pending ride per user — <code>trg_no_concurrent_rides</code> (BR-1).')
    + warn('ride_app role · SELECT, INSERT, UPDATE allowed · DELETE explicitly denied')
    + driversTable(DB.drivers.filter(d => d.status === 'Available'), 'Available Drivers — sp_available_drivers'));
  pg.appendChild(v2);

  // My Payments
  const v3 = V('p-pays');
  ht(v3, vhdr('My Payments', 'Your payment history from <code>vw_payment_overview</code>. Cancelled rides cannot be paid — <strong>trg_validate_payment_ride</strong> (BR-3).')
    + paymentsTable(myP, 'My Payment History'));
  pg.appendChild(v3);

  // Promos
  const v4 = V('p-promos');
  ht(v4, vhdr('Promo Codes', 'Active non-expired codes from <code>vw_active_promos</code>. Apply via <code>sp_apply_promo</code>.')
    + `<div class="card">
        <div class="card-hdr"><div class="card-title">Active Promo Codes — vw_active_promos</div><div class="card-meta">${activePromos.length} available</div></div>
        <div class="twrap"><table class="tbl">
          <thead><tr><th>Code</th><th>Discount</th><th>Expires</th></tr></thead>
          <tbody>${activePromos.map(p=>`<tr>
            <td><span class="promo-tag">${p.code}</span></td>
            <td><strong style="color:var(--green)">−${p.discount}%</strong></td>
            <td style="font-size:11px;color:var(--t2)">${p.expiry}</td>
          </tr>`).join('')}</tbody>
        </table></div>
       </div>`);
  pg.appendChild(v4);
}

// ═══════════════════════════════════════════════
// DRIVER VIEWS
// ═══════════════════════════════════════════════
function buildDriver(pg) {
  const d  = DB.drivers[ME_DRIVER - 1];
  const v  = DB.vehicles.find(x => x.did === ME_DRIVER);
  const myR   = DB.rides.filter(r => r.did === ME_DRIVER && r.status === 'Completed');
  const myRat = DB.ratings.filter(r => { const ride = DB.rides[r.rid-1]; return ride && ride.did === ME_DRIVER; }).sort((a, b) => b.dr - a.dr);
  const earn  = myR.reduce((s, r) => s + r.fare, 0);

  // My Trips
  const v1 = V('d-trips');
  ht(v1, welcome('🚗', d.first+' '+d.last, `Driver ${d.id} · ${d.lic} · Status: ${d.status}. Auto-managed by triggers BR-6 &amp; BR-7.`)
    + `<div class="kpi-row">
        ${KPI('🏁', myR.length, 'Completed Rides', '#10b981')}
        ${KPI('💰', '$'+earn.toFixed(2), 'Total Earnings', '#10b981')}
        ${KPI('⭐', d.rating, 'My Rating', '#f59e0b')}
       </div>`
    + `<div class="card">
        <div class="card-hdr"><div class="card-title">My Completed Trips</div><div class="card-meta">${myR.length} rides · sp_driver_earnings</div></div>
        <div class="twrap"><table class="tbl">
          <thead><tr><th>Ride</th><th>Passenger</th><th>From</th><th>To</th><th>Date</th><th>Dur</th><th>Fare</th></tr></thead>
          <tbody>${myR.map(r=>`<tr>
            <td>${ID(r.id)}</td><td>${uname(r.uid)}</td>
            <td style="font-size:11px">${lname(r.slid)}</td>
            <td style="font-size:11px">${lname(r.elid)}</td>
            <td style="font-size:11px;color:var(--t2)">${r.start.slice(0,10)}</td>
            <td>${DUR(r.dur)}</td><td>${FARE(r.fare)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
       </div>`);
  pg.appendChild(v1);

  // Earnings
  const monthly = {};
  myR.forEach(r => { const m = r.start.slice(0,7); monthly[m] = (monthly[m]||0) + r.fare; });
  const mMax = Math.max(...Object.values(monthly), 1);
  const v2 = V('d-earn');
  ht(v2, vhdr('My Earnings', 'Revenue from <code>sp_driver_earnings</code>. Completed rides only.')
    + `<div class="card">
        <div class="card-hdr"><div class="card-title">Monthly Earnings</div><div class="card-meta">2024</div></div>
        <div class="card-body">${bars(Object.entries(monthly).sort().map(([m,val])=>
          [m, (val/mMax*100).toFixed(0), '#10b981', '$'+val.toFixed(2)]
        ))}</div>
       </div>`);
  pg.appendChild(v2);

  // My Ratings
  const v3 = V('d-ratings');
  ht(v3, vhdr('My Ratings', 'Passenger feedback. Auto-recalculated by <strong>trg_update_driver_rating</strong> (BR-4). Current average: <strong>'+d.rating+'</strong>.')
    + `<div class="card">
        <div class="card-hdr"><div class="card-title">Rating History</div><div class="card-meta">${myRat.length} ratings</div></div>
        <div class="twrap"><table class="tbl">
          <thead><tr><th>Ride</th><th>Driver ★</th><th>User ★</th><th>Comment</th></tr></thead>
          <tbody>${myRat.map(r=>`<tr>
            <td>${ID(r.rid)}</td><td>${STARS(r.dr)}</td>
            <td>${r.ur ? STARS(r.ur) : '<span class="muted">NULL</span>'}</td>
            <td style="font-size:11px;color:var(--t2)">${r.comment || '<span class="muted">—</span>'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <div class="tbl-foot">UNIQUE(RideID) — one rating per ride · DriverRating NOT NULL</div>
       </div>`);
  pg.appendChild(v3);

  // My Vehicle
  const v4 = V('d-vehicle');
  ht(v4, vhdr('My Vehicle', 'Registered vehicle from the <code>vehicles</code> table. FK→drivers ON DELETE CASCADE.')
    + `<div class="card"><div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          ${v ? [['Vehicle ID',v.did],['Plate Number',v.plate],['Model',v.model],['Year',v.year],['Capacity',v.cap+' passengers'],['Driver ID',d.id]]
            .map(([k,val])=>`<div>
              <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">${k}</div>
              <div style="font-size:18px;font-weight:800;color:var(--t1)">${val}</div>
            </div>`).join('') : '<div>No vehicle found</div>'}
        </div>
       </div></div>`);
  pg.appendChild(v4);
}

// ═══════════════════════════════════════════════
// ANALYST VIEWS
// ═══════════════════════════════════════════════
function buildAnalyst(pg) {
  const s = DB.stats;
  const CC = {'New York':'#6366f1','Chicago':'#06b6d4','Los Angeles':'#10b981','San Francisco':'#f59e0b'};
  const cMax = Math.max(...Object.values(s.cities));

  // Overview
  const v1 = V('a-overview');
  ht(v1, vhdr('Analytics Overview', 'Read-only view. Logged in as <code>ride_report</code> — SELECT only, no writes.')
    + warn('ride_report role · SELECT only · No INSERT, UPDATE or DELETE access')
    + `<div class="stats4">
        ${SC('Total Revenue','$'+s.total_rev.toFixed(2),'40 completed rides','#10b981','#10b981','💰')}
        ${SC('Total Rides','42','40 completed · 1 pending · 1 cancelled','#6366f1','#6366f1','🚕')}
        ${SC('Drivers','42',s.dstat.Available+' available · '+s.dstat.Busy+' busy','#f59e0b','#f59e0b','🚗')}
        ${SC('Avg Fare','$'+s.avg_fare,'Avg duration '+s.avg_dur+' min','#06b6d4','#06b6d4','📊')}
       </div>
       <div class="g2">
         <div class="card">
           <div class="card-hdr"><div class="card-title">Revenue by City</div><div class="card-meta">vw_revenue_by_city</div></div>
           <div class="card-body">${bars(Object.entries(s.cities).sort((a,b)=>b[1]-a[1]).map(([c,r])=>[c,(r/cMax*100).toFixed(1),CC[c]||'#6366f1','$'+r.toFixed(2)]))}</div>
         </div>
         <div class="card">
           <div class="card-hdr"><div class="card-title">Payment Methods</div><div class="card-meta">42 transactions</div></div>
           <div class="card-body">
             ${bars(Object.entries(s.methods).sort((a,b)=>b[1]-a[1]).map(([m,c])=>[m,(c/15*100).toFixed(0),'var(--acc)',c+' txn']))}
             <div class="bar-sep"></div>
             ${bars([['Paid',95,'#10b981','40'],['Pending',3,'#f59e0b','1'],['Failed',3,'#ef4444','1']])}
           </div>
         </div>
       </div>`);
  pg.appendChild(v1);

  const v2 = V('a-rides');
  ht(v2, vhdr('All Rides','Full dataset from <code>vw_ride_details</code>.') + ridesTable(DB.rides));
  pg.appendChild(v2);

  const v3 = V('a-drivers');
  ht(v3, vhdr('All Drivers','Full roster from <code>vw_driver_summary</code>.') + driversTable(DB.drivers));
  pg.appendChild(v3);

  // Revenue
  const v4 = V('a-revenue');
  ht(v4, vhdr('Revenue','City revenue from <code>vw_revenue_by_city</code> and top earners.')
    + `<div class="g2">
        <div class="card">
          <div class="card-hdr"><div class="card-title">Revenue by City</div><div class="card-meta">vw_revenue_by_city</div></div>
          <div class="twrap"><table class="tbl">
            <thead><tr><th>City</th><th>Rides</th><th>Revenue</th><th>Avg Fare</th></tr></thead>
            <tbody>${Object.entries(s.cities).sort((a,b)=>b[1]-a[1]).map(([city,rev])=>{
              const n = DB.rides.filter(r=>r.status==='Completed'&&DB.locations[r.slid-1]?.city===city).length;
              return `<tr><td><strong>${city}</strong></td><td>${n}</td><td>${FARE(rev)}</td><td>${FARE(rev/Math.max(n,1))}</td></tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-hdr"><div class="card-title">Top 5 Earning Drivers</div><div class="card-meta">Q1 2024</div></div>
          <div class="twrap"><table class="tbl">
            <thead><tr><th>#</th><th>Driver</th><th>Rating</th><th>Rides</th><th>Earned</th></tr></thead>
            <tbody>${s.top5.map((d,i)=>`<tr>
              <td style="font-weight:800;color:${i===0?'var(--acc)':'var(--t3)'}">${String(i+1).padStart(2,'0')}</td>
              <td><strong>${d.name}</strong></td>
              <td>${STARS(Math.round(d.rating))} <small style="color:var(--t3)">${d.rating}</small></td>
              <td>${d.rides}</td><td>${FARE(d.earn)}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>
       </div>`);
  pg.appendChild(v4);

  const v5 = V('a-users');
  ht(v5, vhdr('Users','All 42 registered passengers from the <code>users</code> table.') + usersTable(DB.users));
  pg.appendChild(v5);

  const v6 = V('a-queries');
  ht(v6, buildAlgebraQueries());
  pg.appendChild(v6);
}

// ═══════════════════════════════════════════════
// DBA VIEWS
// ═══════════════════════════════════════════════
function buildDBA(pg) {
  const s = DB.stats;
  const CC = {'New York':'#6366f1','Chicago':'#06b6d4','Los Angeles':'#10b981','San Francisco':'#f59e0b'};
  const cMax = Math.max(...Object.values(s.cities));

  // Dashboard
  const v0 = V('dba-dash');
  ht(v0, vhdr('DBA Dashboard','Full system overview. <code>ride_dba</code> with <code>db_owner</code> — complete control over all objects and data.')
    + `<div class="stats4">
        ${SC('Total Revenue','$'+s.total_rev.toFixed(2),'40 completed rides · Jan–Feb 2024','#10b981','#10b981','💰')}
        ${SC('Total Rides','42','40 completed · 1 pending · 1 cancelled','#6366f1','#6366f1','🚕')}
        ${SC('Drivers','42',s.dstat.Available+' available · '+s.dstat.Busy+' busy · '+s.dstat.Offline+' offline','#f59e0b','#f59e0b','🚗')}
        ${SC('Avg Fare','$'+s.avg_fare,'Avg duration '+s.avg_dur+' min · 4 cities','#06b6d4','#06b6d4','📊')}
       </div>
       <div class="g2">
         <div class="card">
           <div class="card-hdr"><div class="card-title">Revenue by City</div><div class="card-meta">vw_revenue_by_city</div></div>
           <div class="card-body">${bars(Object.entries(s.cities).sort((a,b)=>b[1]-a[1]).map(([c,r])=>[c,(r/cMax*100).toFixed(1),CC[c],'$'+r.toFixed(2)]))}</div>
         </div>
         <div class="card">
           <div class="card-hdr"><div class="card-title">Top 5 Drivers by Earnings</div><div class="card-meta">Q1 2024</div></div>
           <div class="twrap"><table class="tbl">
             <thead><tr><th>#</th><th>Name</th><th>Rating</th><th>Rides</th><th>Earned</th></tr></thead>
             <tbody>${s.top5.map((d,i)=>`<tr>
               <td style="font-weight:800;color:${i===0?'var(--acc)':'var(--t3)'}">${String(i+1).padStart(2,'0')}</td>
               <td><strong>${d.name}</strong><div style="font-size:10px;color:var(--t3)">${d.lic}</div></td>
               <td>${STARS(Math.round(d.rating))} <small style="color:var(--t3)">${d.rating}</small></td>
               <td>${d.rides}</td><td>${FARE(d.earn)}</td>
             </tr>`).join('')}</tbody>
           </table></div>
         </div>
       </div>
       <div class="g2">
         <div class="card">
           <div class="card-hdr"><div class="card-title">Payment Breakdown</div><div class="card-meta">42 transactions</div></div>
           <div class="card-body">
             ${bars(Object.entries(s.methods).sort((a,b)=>b[1]-a[1]).map(([m,c])=>[m,(c/15*100).toFixed(0),'var(--acc)',c+' txn']))}
             <div class="bar-sep"></div>
             ${bars([['Paid',95,'#10b981','40'],['Pending',3,'#f59e0b','1'],['Failed',3,'#ef4444','1']])}
           </div>
         </div>
         <div class="card">
           <div class="card-hdr"><div class="card-title">Driver Status</div><div class="card-meta">triggers BR-6 &amp; BR-7</div></div>
           <div class="card-body">${bars([
             ['Available',(s.dstat.Available/42*100).toFixed(0),'#10b981',s.dstat.Available+' drivers'],
             ['Busy',     (s.dstat.Busy/42*100).toFixed(0),     '#f59e0b',s.dstat.Busy+' drivers'],
             ['Offline',  (s.dstat.Offline/42*100).toFixed(0),  '#6b7280',s.dstat.Offline+' drivers'],
           ])}</div>
         </div>
       </div>`);
  pg.appendChild(v0);

  // ── These 4 views are each independent — appended separately ──
  // Each view is its own DOM element with its own id.
  // Nav listeners point to these ids directly.
  // No shared state, no innerHTML += involved.

  const vR = V('dba-rides');
  ht(vR, vhdr('All Rides','Complete dataset from <code>vw_ride_details</code>. Completed rides cannot be deleted (trg_prevent_delete_completed · BR-2).') + ridesTable(DB.rides));
  pg.appendChild(vR);

  const vD = V('dba-drvs');
  ht(vD, vhdr('All Drivers','Full roster from <code>vw_driver_summary</code>.') + driversTable(DB.drivers));
  pg.appendChild(vD);

  const vU = V('dba-usrs');
  ht(vU, vhdr('All Users','All 42 registered passengers from the <code>users</code> table.') + usersTable(DB.users));
  pg.appendChild(vU);

  const vP = V('dba-pays');
  ht(vP, vhdr('All Payments','Full ledger from <code>vw_payment_overview</code>. <strong>trg_validate_payment_ride</strong> (BR-3) blocks payments on cancelled rides.') + paymentsTable(DB.payments));
  pg.appendChild(vP);

  // Schema
  const vS = V('dba-schema');
  ht(vS, vhdr('Database Schema','8 tables · 10 FK constraints · 12 CHECK · 6 UNIQUE · 8 DEFAULT · Full 3NF · 15 indexes') + '<div class="schema-grid" id="schemaGrid"></div>');
  pg.appendChild(vS);

  // Triggers — placeholder filled after append so getElementById works
  const vT = V('dba-trg');
  ht(vT, vhdr('Triggers','All 7 triggers enforce business rules at the SQL Server engine level — independently of application code.') + '<div id="trgContainer"></div>');
  pg.appendChild(vT);

  // Procedures
  const vPr = V('dba-proc');
  ht(vPr, vhdr('Stored Procedures','All 8 parameterised stored procedures. Each uses <code>SET NOCOUNT ON</code> and proper T-SQL error handling.') + '<div class="proc-grid" id="procGrid"></div>');
  pg.appendChild(vPr);

  // DCL
  const vDCL = V('dba-dcl');
  ht(vDCL, vhdr('Access Control (DCL)','3 roles created with <code>CREATE LOGIN</code>, <code>CREATE USER</code>, <code>GRANT</code>, <code>DENY</code>, and <code>ALTER ROLE</code>. Principle of least privilege.') + '<div id="dclContainer"></div>');
  pg.appendChild(vDCL);

  // Algebra Queries
  const vQ = V('dba-queries');
  ht(vQ, buildAlgebraQueries());
  pg.appendChild(vQ);

  // Now all placeholder divs exist in the DOM — safe to fill them
  buildSchema();
  buildTriggers();
  buildProcedures();
  buildDCL();
}

// ── SCHEMA ───────────────────────────────────────────────────────
function buildSchema() {
  const el = $('schemaGrid');
  if (!el) return;
  const T = [
    {name:'users',    rows:42,cols:[{n:'UserID',t:'pk'},{n:'FirstName',v:'varchar(50)'},{n:'LastName',v:'varchar(50)'},{n:'Email',v:'UQ · CHK'},{n:'Phone',v:'nullable'},{n:'RegistrationDate',v:'DEFAULT NOW'}]},
    {name:'drivers',  rows:42,cols:[{n:'DriverID',t:'pk'},{n:'FirstName',v:'varchar(50)'},{n:'LicenseNumber',v:'UNIQUE'},{n:'Rating',v:'0–5 DEFAULT 5.0'},{n:'Status',v:'enum CHK'}]},
    {name:'vehicles', rows:42,cols:[{n:'VehicleID',t:'pk'},{n:'DriverID',t:'fk',v:'FK→drivers CASCADE'},{n:'PlateNumber',v:'UNIQUE'},{n:'Model',v:'varchar(50)'},{n:'Year',v:'1990–2030'},{n:'Capacity',v:'1–20 CHK'}]},
    {name:'rides',    rows:42,cols:[{n:'RideID',t:'pk'},{n:'UserID',t:'fk',v:'FK→users CASCADE'},{n:'DriverID',t:'fk',v:'FK→drivers'},{n:'VehicleID',t:'fk',v:'FK→vehicles'},{n:'StartLocationID',t:'fk',v:'FK→locations'},{n:'EndLocationID',t:'fk',v:'FK→locations'},{n:'Fare',v:'≥0 CHK'},{n:'Status',v:'enum CHK'},{n:'RideDuration',v:'derived·trigger'},{n:'PromoID',v:'FK NULL'}]},
    {name:'payments', rows:42,cols:[{n:'PaymentID',t:'pk'},{n:'RideID',t:'fk',v:'FK→rides CASCADE'},{n:'Amount',v:'≥0 CHK'},{n:'Method',v:'Cash/Card/Online'},{n:'PaymentDate',v:'DEFAULT NOW'},{n:'Status',v:'Paid/Pending/Failed'}]},
    {name:'ratings',  rows:40,cols:[{n:'RatingID',t:'pk'},{n:'RideID',t:'fk',v:'FK+UQ→rides'},{n:'DriverRating',v:'1–5 NOT NULL'},{n:'UserRating',v:'1–5 nullable'},{n:'Comment',v:'varchar(500) NULL'}]},
    {name:'locations',rows:42,cols:[{n:'LocationID',t:'pk'},{n:'Name',v:'varchar(100)'},{n:'City',v:'varchar(50)'}]},
    {name:'promocodes',rows:42,cols:[{n:'PromoID',t:'pk'},{n:'Code',v:'UNIQUE'},{n:'Discount',v:'0–100% CHK'},{n:'ExpiryDate',v:'datetime'}]},
  ];
  ht(el, T.map(t => `
    <div class="sch-card">
      <div class="sch-hdr"><span class="sch-name">${t.name}</span><span class="sch-rows">${t.rows} rows</span></div>
      <div class="sch-cols">${t.cols.map(c=>`
        <div class="sch-col">
          <span class="col-n">${c.n}</span>
          ${c.t==='pk'?'<span class="col-pk">PK</span>':c.t==='fk'?`<span class="col-fk">${c.v}</span>`:`<span class="col-t">${c.v||''}</span>`}
        </div>`).join('')}
      </div>
    </div>`).join(''));
}

// ── TRIGGERS ─────────────────────────────────────────────────────
function buildTriggers() {
  const el = $('trgContainer');
  if (!el) return;

  const AFTER = [
    { name:'trg_calc_duration', on:'rides', type:'AFTER UPDATE', br:'BR-5', ico:'⏱', cls:'ti-a', brc:'br-a',
      desc:'Sets <strong>RideDuration = DATEDIFF(MINUTE, StartTime, EndTime)</strong> automatically whenever EndTime is written. Keeps the derived column accurate without any manual updates.',
      sql:`<span class="cm">-- BR-5: Auto-calculate ride duration when EndTime is set</span>
<span class="kw">CREATE TRIGGER</span> trg_calc_duration
<span class="kw">ON</span> rides <span class="kw">AFTER UPDATE AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">UPDATE</span> rides
    <span class="kw">SET</span>    RideDuration = <span class="kw">DATEDIFF</span>(MINUTE, i.StartTime, i.EndTime)
    <span class="kw">FROM</span>   rides r <span class="kw">JOIN</span> inserted i <span class="kw">ON</span> r.RideID = i.RideID
    <span class="kw">WHERE</span>  i.EndTime <span class="kw">IS NOT NULL</span>;
<span class="kw">END</span>;` },
    { name:'trg_update_driver_rating', on:'ratings', type:'AFTER INSERT', br:'BR-4', ico:'⭐', cls:'ti-a', brc:'br-a',
      desc:'Recalculates <strong>driver.Rating = ROUND(AVG(DriverRating), 2)</strong> across all that driver\'s rides after every new rating is inserted.',
      sql:`<span class="cm">-- BR-4: Recalculate driver average rating after each new rating</span>
<span class="kw">CREATE TRIGGER</span> trg_update_driver_rating
<span class="kw">ON</span> ratings <span class="kw">AFTER INSERT AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">UPDATE</span> drivers
    <span class="kw">SET</span> Rating = (
        <span class="kw">SELECT</span> <span class="kw">ROUND</span>(<span class="kw">AVG</span>(<span class="kw">CAST</span>(ra.DriverRating <span class="kw">AS FLOAT</span>)), 2)
        <span class="kw">FROM</span>   ratings ra <span class="kw">JOIN</span> rides r <span class="kw">ON</span> ra.RideID = r.RideID
        <span class="kw">WHERE</span>  r.DriverID = drivers.DriverID)
    <span class="kw">WHERE</span> DriverID <span class="kw">IN</span> (
        <span class="kw">SELECT</span> r.DriverID <span class="kw">FROM</span> inserted i
        <span class="kw">JOIN</span>   rides r <span class="kw">ON</span> i.RideID = r.RideID);
<span class="kw">END</span>;` },
    { name:'trg_driver_busy_on_ride', on:'rides', type:'AFTER INSERT', br:'BR-6', ico:'🚗', cls:'ti-a', brc:'br-a',
      desc:'Sets <strong>driver.Status = \'Busy\'</strong> automatically when a new Pending ride row is inserted into the rides table.',
      sql:`<span class="cm">-- BR-6: Mark driver as Busy when assigned a new ride</span>
<span class="kw">CREATE TRIGGER</span> trg_driver_busy_on_ride
<span class="kw">ON</span> rides <span class="kw">AFTER INSERT AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">UPDATE</span> drivers <span class="kw">SET</span> Status = <span class="str">'Busy'</span>
    <span class="kw">FROM</span>   drivers d <span class="kw">JOIN</span> inserted i <span class="kw">ON</span> d.DriverID = i.DriverID
    <span class="kw">WHERE</span>  i.Status = <span class="str">'Pending'</span>;
<span class="kw">END</span>;` },
    { name:'trg_driver_available_on_complete', on:'rides', type:'AFTER UPDATE', br:'BR-7', ico:'✅', cls:'ti-a', brc:'br-a',
      desc:'Resets <strong>driver.Status = \'Available\'</strong> when a ride transitions from Pending → Completed or Cancelled.',
      sql:`<span class="cm">-- BR-7: Free driver when ride ends (Completed or Cancelled)</span>
<span class="kw">CREATE TRIGGER</span> trg_driver_available_on_complete
<span class="kw">ON</span> rides <span class="kw">AFTER UPDATE AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">UPDATE</span> drivers <span class="kw">SET</span> Status = <span class="str">'Available'</span>
    <span class="kw">FROM</span>   drivers d
    <span class="kw">JOIN</span>   inserted i  <span class="kw">ON</span> d.DriverID = i.DriverID
    <span class="kw">JOIN</span>   deleted  dl <span class="kw">ON</span> i.RideID   = dl.RideID
    <span class="kw">WHERE</span>  i.Status  <span class="kw">IN</span> (<span class="str">'Completed'</span>, <span class="str">'Cancelled'</span>)
      <span class="kw">AND</span>  dl.Status = <span class="str">'Pending'</span>;
<span class="kw">END</span>;` },
    { name:'trg_prevent_delete_completed', on:'rides', type:'AFTER DELETE', br:'BR-2', ico:'🛡', cls:'ti-d', brc:'br-a',
      desc:'<strong>RAISERROR + ROLLBACK TRANSACTION</strong> if any Completed ride appears in the deleted set. Permanently protects the financial audit trail.',
      sql:`<span class="cm">-- BR-2: Block deletion of any Completed ride (audit trail)</span>
<span class="kw">CREATE TRIGGER</span> trg_prevent_delete_completed
<span class="kw">ON</span> rides <span class="kw">AFTER DELETE AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">IF EXISTS</span> (<span class="kw">SELECT</span> 1 <span class="kw">FROM</span> deleted <span class="kw">WHERE</span> Status = <span class="str">'Completed'</span>)
    <span class="kw">BEGIN</span>
        <span class="kw">RAISERROR</span>(<span class="str">'Completed rides cannot be deleted.'</span>, 16, 1);
        <span class="kw">ROLLBACK TRANSACTION</span>;
    <span class="kw">END</span>;
<span class="kw">END</span>;` },
  ];

  const INSTEAD = [
    { name:'trg_no_concurrent_rides', on:'rides', type:'INSTEAD OF INSERT', br:'BR-1', ico:'🚫', cls:'ti-i', brc:'br-i',
      desc:'Blocks the INSERT entirely if the user already has a Pending ride. Fires <em>before</em> the storage engine writes anything — <strong>RAISERROR + RETURN</strong> with zero side effects.',
      sql:`<span class="cm">-- BR-1: One active ride per user at a time</span>
<span class="kw">CREATE TRIGGER</span> trg_no_concurrent_rides
<span class="kw">ON</span> rides <span class="kw">INSTEAD OF INSERT AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">IF EXISTS</span> (
        <span class="kw">SELECT</span> 1 <span class="kw">FROM</span> rides r
        <span class="kw">JOIN</span>   inserted i <span class="kw">ON</span> r.UserID = i.UserID
        <span class="kw">WHERE</span>  r.Status = <span class="str">'Pending'</span>)
    <span class="kw">BEGIN</span>
        <span class="kw">RAISERROR</span>(<span class="str">'User already has an active pending ride.'</span>, 16, 1);
        <span class="kw">RETURN</span>;
    <span class="kw">END</span>;
    <span class="kw">INSERT INTO</span> rides(UserID, DriverID, VehicleID,
        StartLocationID, EndLocationID, StartTime,
        EndTime, Fare, Status, RideDuration, PromoID)
    <span class="kw">SELECT</span> UserID, DriverID, VehicleID,
        StartLocationID, EndLocationID, StartTime,
        EndTime, Fare, Status, RideDuration, PromoID
    <span class="kw">FROM</span> inserted;
<span class="kw">END</span>;` },
    { name:'trg_validate_payment_ride', on:'payments', type:'INSTEAD OF INSERT', br:'BR-3', ico:'💳', cls:'ti-i', brc:'br-i',
      desc:'Blocks payment INSERT if the associated <strong>ride.Status = \'Cancelled\'</strong>. Prevents financial records from being created for void rides.',
      sql:`<span class="cm">-- BR-3: No payment for a cancelled ride</span>
<span class="kw">CREATE TRIGGER</span> trg_validate_payment_ride
<span class="kw">ON</span> payments <span class="kw">INSTEAD OF INSERT AS</span>
<span class="kw">BEGIN</span>
    <span class="kw">SET NOCOUNT ON</span>;
    <span class="kw">IF EXISTS</span> (
        <span class="kw">SELECT</span> 1 <span class="kw">FROM</span> inserted i
        <span class="kw">JOIN</span>   rides r <span class="kw">ON</span> i.RideID = r.RideID
        <span class="kw">WHERE</span>  r.Status = <span class="str">'Cancelled'</span>)
    <span class="kw">BEGIN</span>
        <span class="kw">RAISERROR</span>(<span class="str">'Cannot process payment for a cancelled ride.'</span>, 16, 1);
        <span class="kw">RETURN</span>;
    <span class="kw">END</span>;
    <span class="kw">INSERT INTO</span> payments(RideID, Amount, Method, PaymentDate, Status)
    <span class="kw">SELECT</span> RideID, Amount, Method, PaymentDate, Status
    <span class="kw">FROM</span> inserted;
<span class="kw">END</span>;` },
  ];

  const trgRow = t => {
    const id = 'trg-' + t.name;
    return `<div class="trg-item" id="${id}">
      <div class="trg-header" onclick="toggleExpand('${id}')">
        <div class="trg-ico ${t.cls}">${t.ico}</div>
        <div style="flex:1;min-width:0">
          <div class="trg-name">${t.name}</div>
          <div class="trg-on">${t.type} ON ${t.on}</div>
          <div class="trg-desc">${t.desc}</div>
        </div>
        <span class="trg-br ${t.brc}">${t.br}</span>
        <span class="trg-chevron">▼</span>
      </div>
      <div class="trg-expand">
        <div class="trg-expand-label">T-SQL Definition</div>
        <div class="code-block">${t.sql}</div>
      </div>
    </div>`;
  };

  ht(el, `
    <p style="font-size:12px;color:var(--t3);margin-bottom:14px">Click any trigger to see its T-SQL definition ↓</p>
    <div class="g2">
      <div>
        <div class="trg-group-lbl after">AFTER Triggers — ${AFTER.length}</div>
        <div class="trg-list">${AFTER.map(trgRow).join('')}</div>
      </div>
      <div>
        <div class="trg-group-lbl instead">INSTEAD OF Triggers — ${INSTEAD.length}</div>
        <div class="trg-list">${INSTEAD.map(trgRow).join('')}</div>
        <div class="why-box" style="margin-top:12px">
          <strong>Why INSTEAD OF for BR-1 and BR-3?</strong><br>
          AFTER triggers fire after the row is already written — they cannot prevent the INSERT.
          INSTEAD OF fires before the storage engine writes anything, allowing clean rejection
          via RAISERROR + RETURN with zero side effects.<br><br>
          <strong>Why AFTER DELETE + ROLLBACK for BR-2?</strong><br>
          SQL Server prohibits INSTEAD OF DELETE on tables with cascading FK children.
          AFTER DELETE + ROLLBACK TRANSACTION achieves the same result atomically.
        </div>
      </div>
    </div>`);
}

// ── PROCEDURES ───────────────────────────────────────────────────
function buildProcedures() {
  const el = $('procGrid');
  if (!el) return;

  const PROCS = [
    { name:'sp_get_user_rides', ret:'Result set', params:[{l:'@UserID INT'}],
      desc:'Returns all rides for a given user via <code>vw_ride_details</code> — all IDs already resolved to names, no manual JOINs needed.',
      exec:`<span class="kw">EXEC</span> sp_get_user_rides <span class="kw">@UserID</span> = 1;`,
      output:`<span class="cm">-- Returns all rides for Alice Johnson (UserID=1)</span>
RideID  UserName       DriverName      StartLocation    City       Fare    Status
------  -------------  --------------  ---------------  ---------  ------  ---------
1       Alice Johnson  James Cooper    Central Station  New York   15.50   Completed` },

    { name:'sp_available_drivers', ret:'Result set', params:[{l:'@City VARCHAR(50) = NULL'}],
      desc:'Returns all currently available drivers with vehicle details. Optionally filtered by city — ready for real-time dispatch.',
      exec:`<span class="kw">EXEC</span> sp_available_drivers;
<span class="cm">-- or filter by city:</span>
<span class="kw">EXEC</span> sp_available_drivers <span class="kw">@City</span> = <span class="str">'New York'</span>;`,
      output:`<span class="cm">-- Returns available drivers (21 rows without filter)</span>
DriverID  DriverName      Rating  Model          Capacity
--------  --------------  ------  -------------  --------
1         James Cooper    4.9     Toyota Camry   4
3         Robert Cox      4.5     Ford Fusion    4
5         Michael Foster  4.6     Nissan Altima  4
...` },

    { name:'sp_complete_ride', ret:'Confirmation', params:[{l:'@RideID INT'},{l:'@EndTime DATETIME'},{l:'@Fare FLOAT'}],
      desc:'Marks a ride Completed with EndTime and Fare. Automatically fires <code>trg_calc_duration</code> (BR-5) and <code>trg_driver_available</code> (BR-7).',
      exec:`<span class="kw">EXEC</span> sp_complete_ride
    <span class="kw">@RideID</span>  = 41,
    <span class="kw">@EndTime</span> = <span class="str">'2024-02-15 12:35:00'</span>,
    <span class="kw">@Fare</span>    = 22.50;`,
      output:`Result
--------------------------------
Ride 41 completed successfully.

<span class="cm">-- trg_calc_duration auto-sets RideDuration = 35 min
-- trg_driver_available_on_complete sets DriverID=41 Status='Available'</span>` },

    { name:'sp_apply_promo', ret:'OUTPUT @NewFare', params:[{l:'@RideID INT'},{l:'@PromoID INT'},{l:'@NewFare FLOAT',o:true}],
      desc:'Validates promo expiry, computes discounted fare = Fare × (1 − Discount/100), updates <code>ride.Fare</code> and <code>PromoID</code> atomically.',
      exec:`<span class="kw">DECLARE</span> @newFare <span class="kw">FLOAT</span>;
<span class="kw">EXEC</span> sp_apply_promo
    <span class="kw">@RideID</span>  = 41,
    <span class="kw">@PromoID</span> = 1,   <span class="cm">-- SAVE10 = 10% off</span>
    <span class="kw">@NewFare</span> = @newFare <span class="kw">OUTPUT</span>;
<span class="kw">SELECT</span> @newFare <span class="kw">AS</span> DiscountedFare;`,
      output:`DiscountedFare
--------------
20.25

<span class="cm">-- Original fare $22.50 × (1 - 10/100) = $20.25
-- ride.Fare updated, ride.PromoID = 1</span>` },

    { name:'sp_monthly_revenue', ret:'Aggregate row', params:[{l:'@Year INT'},{l:'@Month INT'}],
      desc:'Returns TotalRides, TotalRevenue, AvgFare, MinFare, MaxFare for any given year + month combination.',
      exec:`<span class="kw">EXEC</span> sp_monthly_revenue
    <span class="kw">@Year</span>  = 2024,
    <span class="kw">@Month</span> = 1;`,
      output:`TotalRides  TotalRevenue  AvgFare  MinFare  MaxFare
----------  ------------  -------  -------  -------
20          468.25        23.41    8.50     38.00` },

    { name:'sp_driver_earnings', ret:'Aggregate row', params:[{l:'@DriverID INT'},{l:'@StartDate DATE'},{l:'@EndDate DATE'}],
      desc:'Total completed rides and earnings for a specific driver within a start/end date range.',
      exec:`<span class="kw">EXEC</span> sp_driver_earnings
    <span class="kw">@DriverID</span>  = 1,
    <span class="kw">@StartDate</span> = <span class="str">'2024-01-01'</span>,
    <span class="kw">@EndDate</span>   = <span class="str">'2024-12-31'</span>;`,
      output:`DriverName    Rides  TotalEarnings
------------  -----  -------------
James Cooper  1      15.50` },

    { name:'sp_register_user', ret:'NewUserID', params:[{l:'@First VARCHAR'},{l:'@Last VARCHAR'},{l:'@Email VARCHAR'},{l:'@Phone VARCHAR'}],
      desc:'Inserts a new user and returns the auto-generated IDENTITY UserID via <code>SCOPE_IDENTITY()</code> — safe for concurrent inserts.',
      exec:`<span class="kw">EXEC</span> sp_register_user
    <span class="kw">@First</span> = <span class="str">'Sarah'</span>,
    <span class="kw">@Last</span>  = <span class="str">'Connor'</span>,
    <span class="kw">@Email</span> = <span class="str">'s.connor@email.com'</span>,
    <span class="kw">@Phone</span> = <span class="str">'555-9999'</span>;`,
      output:`NewUserID
---------
43

<span class="cm">-- New row inserted into users table
-- SCOPE_IDENTITY() returns the new auto-incremented UserID</span>` },

    { name:'sp_cancel_ride', ret:'RowsUpdated', params:[{l:'@RideID INT'},{l:'RowsUpdated INT',o:true}],
      desc:'Cancels a Pending ride (Status → Cancelled), triggering <code>trg_driver_available</code> (BR-7). Returns 0 if ride is not found or not Pending.',
      exec:`<span class="kw">EXEC</span> sp_cancel_ride <span class="kw">@RideID</span> = 41;`,
      output:`RowsUpdated
-----------
1

<span class="cm">-- ride.Status updated to 'Cancelled'
-- trg_driver_available_on_complete fires: driver Status → 'Available'
-- Returns 0 if RideID not found or already Completed/Cancelled</span>` },
  ];

  ht(el, `<p style="font-size:12px;color:var(--t3);margin-bottom:14px;grid-column:1/-1">Click any procedure to see the EXEC call and sample output ↓</p>`
    + PROCS.map(p => {
      const id = 'proc-' + p.name;
      return `<div class="proc-card" id="${id}">
        <div class="proc-header" onclick="toggleExpand('${id}')">
          <div class="proc-header-row">
            <div class="proc-name">${p.name}</div>
            <span class="proc-chevron">▼</span>
          </div>
          <div class="proc-ret">Returns: <em>${p.ret}</em></div>
          <div class="proc-desc">${p.desc}</div>
          <div class="proc-params" style="margin-top:10px">${p.params.map(pm =>
            `<span class="pp${pm.o?' out':''}">${pm.o ? '⟵ ' : ''}${pm.l}</span>`
          ).join('')}</div>
        </div>
        <div class="proc-expand">
          <div class="proc-expand-tabs">
            <span class="pet active" onclick="showProcTab('${id}','exec',this)">EXEC Call</span>
            <span class="pet" onclick="showProcTab('${id}','output',this)">Sample Output</span>
          </div>
          <div class="proc-tab" data-tab="exec" data-id="${id}">
            <div class="code-block">${p.exec}</div>
          </div>
          <div class="proc-tab" data-tab="output" data-id="${id}" style="display:none">
            <div class="code-block">${p.output}</div>
          </div>
        </div>
      </div>`;
    }).join(''));
}

// ── DCL ──────────────────────────────────────────────────────────
function buildDCL() {
  const el = $('dclContainer');
  if (!el) return;

  const ROLES_DCL = [
    {
      login:'ride_app', role:'Application User', pw:'App@Secure123!', color:'#6366f1',
      perms:[
        { icon:'✅', label:'SELECT', detail:'Read all data'         },
        { icon:'✅', label:'INSERT', detail:'Add new records'       },
        { icon:'✅', label:'UPDATE', detail:'Modify records'        },
        { icon:'❌', label:'DELETE', detail:'Explicitly DENIED'     },
      ],
      sql:'GRANT SELECT, INSERT, UPDATE\n  ON SCHEMA::dbo TO ride_app;\nDENY DELETE\n  ON SCHEMA::dbo TO ride_app;',
      purpose:'Backend API layer. Cannot permanently delete records — limits accidental mass deletions and SQL injection damage.',
    },
    {
      login:'ride_report', role:'Read-Only Analyst', pw:'Report@Secure123!', color:'#06b6d4',
      perms:[
        { icon:'✅', label:'SELECT', detail:'Full read access' },
        { icon:'❌', label:'INSERT', detail:'Not granted'      },
        { icon:'❌', label:'UPDATE', detail:'Not granted'      },
        { icon:'❌', label:'DELETE', detail:'Not granted'      },
      ],
      sql:'GRANT SELECT ON SCHEMA::dbo TO ride_report;',
      purpose:'BI dashboards, analytics tools, and data exports. Cannot modify anything — true read-only isolation.',
    },
    {
      login:'ride_dba', role:'DBA / db_owner', pw:'DBA@Secure123!', color:'#10b981',
      perms:[
        { icon:'✅', label:'SELECT', detail:'Full read access'   },
        { icon:'✅', label:'INSERT', detail:'Full write access'  },
        { icon:'✅', label:'UPDATE', detail:'Full modify access' },
        { icon:'✅', label:'DELETE', detail:'Full delete access' },
      ],
      sql:'ALTER ROLE db_owner ADD MEMBER ride_dba;',
      purpose:'db_owner — full database control. Schema changes, maintenance, index rebuilds, and deployment scripts.',
    },
  ];

  ht(el, `
    <div class="dcl-grid">
      ${ROLES_DCL.map(r => `
        <div class="dcl-card">
          <div class="dcl-top-bar" style="background:${r.color}"></div>
          <div class="dcl-body">
            <div class="dcl-login" style="color:${r.color}">${r.login}</div>
            <div class="dcl-role">${r.role}</div>
            <code class="dcl-pw">${r.pw}</code>
            <div class="dcl-perms">
              ${r.perms.map(p => `
                <div class="dcl-perm">
                  <span class="dcl-perm-icon">${p.icon}</span>
                  <span class="dcl-perm-label">${p.label}</span>
                  <span class="dcl-perm-detail">${p.detail}</span>
                </div>`).join('')}
            </div>
            <div class="dcl-sql"><code>${r.sql}</code></div>
            <div class="dcl-purpose">${r.purpose}</div>
          </div>
        </div>`).join('')}
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-hdr"><div class="card-title">Full DCL Script</div><div class="card-meta">Section 8 — ride_sharing.sql</div></div>
      <div class="card-body">
        <div class="code-block"><span class="cm">-- Application user: read/write, no delete</span>
<span class="kw">CREATE LOGIN</span> ride_app    <span class="kw">WITH PASSWORD</span> = <span class="str">'App@Secure123!'</span>;
<span class="kw">CREATE USER</span>  ride_app    <span class="kw">FOR LOGIN</span> ride_app;
<span class="kw">GRANT</span> <span class="kw">SELECT</span>, <span class="kw">INSERT</span>, <span class="kw">UPDATE</span> <span class="kw">ON SCHEMA</span>::dbo <span class="kw">TO</span> ride_app;
<span class="kw">DENY</span>  <span class="kw">DELETE</span>                  <span class="kw">ON SCHEMA</span>::dbo <span class="kw">TO</span> ride_app;

<span class="cm">-- Report user: read only</span>
<span class="kw">CREATE LOGIN</span> ride_report <span class="kw">WITH PASSWORD</span> = <span class="str">'Report@Secure123!'</span>;
<span class="kw">CREATE USER</span>  ride_report <span class="kw">FOR LOGIN</span> ride_report;
<span class="kw">GRANT</span> <span class="kw">SELECT</span> <span class="kw">ON SCHEMA</span>::dbo <span class="kw">TO</span> ride_report;

<span class="cm">-- DBA: full control</span>
<span class="kw">CREATE LOGIN</span> ride_dba    <span class="kw">WITH PASSWORD</span> = <span class="str">'DBA@Secure123!'</span>;
<span class="kw">CREATE USER</span>  ride_dba    <span class="kw">FOR LOGIN</span> ride_dba;
<span class="kw">ALTER ROLE</span> db_owner <span class="kw">ADD MEMBER</span> ride_dba;</div>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="card-hdr"><div class="card-title">Verify Permissions in SSMS</div><div class="card-meta">Run after executing the script</div></div>
      <div class="card-body">
        <div class="code-block"><span class="kw">SELECT</span>
    dp.name           <span class="kw">AS</span> LoginName,
    p.permission_name <span class="kw">AS</span> Permission,
    p.state_desc      <span class="kw">AS</span> State
<span class="kw">FROM</span>   sys.database_permissions  p
<span class="kw">JOIN</span>   sys.database_principals   dp
    <span class="kw">ON</span> p.grantee_principal_id = dp.principal_id
<span class="kw">WHERE</span>  dp.name <span class="kw">IN</span> (<span class="str">'ride_app'</span>, <span class="str">'ride_report'</span>, <span class="str">'ride_dba'</span>)
<span class="kw">ORDER</span> <span class="kw">BY</span> dp.name, p.permission_name;</div>
      </div>
    </div>`);
}

// ── ALGEBRA QUERIES ──────────────────────────────────────────────
function buildAlgebraQueries() {
  const GROUPS = [
    {
      sym: 'σ', name: 'Selection', color: '#06b6d4', colorL: 'rgba(6,182,212,.13)',
      desc: 'Filter rows satisfying a condition',
      queries: [
        { n:'Q1',  expr:'σ<sub>Status=\'Completed\'</sub>(rides)',
          sql:`SELECT * FROM rides\nWHERE Status = 'Completed';`,
          result:'40 completed ride records' },
        { n:'Q2',  expr:'σ<sub>Status=\'Available\'</sub>(drivers)',
          sql:`SELECT * FROM drivers\nWHERE Status = 'Available';`,
          result:'All currently available drivers' },
        { n:'Q3',  expr:'σ<sub>Fare &gt; 25</sub>(rides)',
          sql:`SELECT * FROM rides\nWHERE Fare > 25;`,
          result:'Rides with fare exceeding $25' },
        { n:'Q4',  expr:'σ<sub>RegistrationDate &gt; \'2023-06-01\'</sub>(users)',
          sql:`SELECT * FROM users\nWHERE RegistrationDate > '2023-06-01';`,
          result:'Users who registered after June 2023' },
        { n:'Q5',  expr:'σ<sub>Discount&gt;20 ∧ ExpiryDate&gt;NOW</sub>(promocodes)',
          sql:`SELECT * FROM promocodes\nWHERE Discount > 20\n  AND ExpiryDate > GETDATE();`,
          result:'Active promos offering more than 20% discount' },
        { n:'Q6',  expr:'σ<sub>RideDuration&gt;40 ∧ Status=\'Completed\'</sub>(rides)',
          sql:`SELECT * FROM rides\nWHERE RideDuration > 40\n  AND Status = 'Completed';`,
          result:'Completed rides lasting over 40 minutes' },
        { n:'Q7',  expr:'σ<sub>Method=\'Card\' ∧ Status=\'Paid\'</sub>(payments)',
          sql:`SELECT * FROM payments\nWHERE Method = 'Card'\n  AND Status = 'Paid';`,
          result:'Successfully paid card transactions' },
      ]
    },
    {
      sym: 'π', name: 'Projection', color: '#8b5cf6', colorL: 'rgba(139,92,246,.13)',
      desc: 'Return only specified columns',
      queries: [
        { n:'Q8',  expr:'π<sub>FirstName, LastName, Email</sub>(users)',
          sql:`SELECT FirstName, LastName, Email\nFROM users;`,
          result:'User contact details — no sensitive fields' },
        { n:'Q9',  expr:'π<sub>FirstName, LastName, Rating</sub>(drivers) ORDER BY Rating DESC',
          sql:`SELECT FirstName, LastName, Rating\nFROM drivers\nORDER BY Rating DESC;`,
          result:'Driver names ranked by rating descending' },
        { n:'Q10', expr:'π<sub>PlateNumber, Model, Year</sub>(vehicles)',
          sql:`SELECT PlateNumber, Model, Year\nFROM vehicles;`,
          result:'Vehicle registry summary' },
      ]
    },
    {
      sym: '⋈', name: 'Natural Join', color: '#f59e0b', colorL: 'rgba(245,158,11,.13)',
      desc: 'Combine rows from related tables via FK',
      queries: [
        { n:'Q11', expr:'rides ⋈<sub>UserID</sub> users ⋈<sub>DriverID</sub> drivers',
          sql:`SELECT r.RideID,\n  u.FirstName+' '+u.LastName AS Passenger,\n  d.FirstName+' '+d.LastName AS Driver,\n  r.Fare, r.Status\nFROM rides r\nJOIN users   u ON r.UserID   = u.UserID\nJOIN drivers d ON r.DriverID = d.DriverID;`,
          result:'Each ride with passenger and driver full names resolved' },
        { n:'Q12', expr:'rides ⋈<sub>StartLocID</sub> locations(s) ⋈<sub>EndLocID</sub> locations(e)',
          sql:`SELECT r.RideID,\n  s.Name AS StartLocation,\n  e.Name AS EndLocation,\n  s.City, r.Fare\nFROM rides r\nJOIN locations s ON r.StartLocationID = s.LocationID\nJOIN locations e ON r.EndLocationID   = e.LocationID;`,
          result:'Rides with start and end location names — self-join on locations' },
        { n:'Q13', expr:'drivers ⋈<sub>DriverID</sub> vehicles',
          sql:`SELECT d.FirstName+' '+d.LastName AS Driver,\n  d.Rating, v.Model, v.PlateNumber, v.Capacity\nFROM drivers d\nJOIN vehicles v ON d.DriverID = v.DriverID;`,
          result:'Each driver paired with their registered vehicle details' },
        { n:'Q14', expr:'rides ⋈<sub>PromoID</sub> promocodes',
          sql:`SELECT r.RideID, r.Fare,\n  p.Code, p.Discount\nFROM rides r\nJOIN promocodes p ON r.PromoID = p.PromoID;`,
          result:'Only rides where a promo code was applied — with code and discount' },
        { n:'Q15', expr:'payments ⋈<sub>RideID</sub> rides ⋈<sub>UserID</sub> users',
          sql:`SELECT pay.PaymentID,\n  u.FirstName+' '+u.LastName AS Passenger,\n  pay.Amount, pay.Method, pay.Status\nFROM payments pay\nJOIN rides r ON pay.RideID = r.RideID\nJOIN users  u ON r.UserID  = u.UserID;`,
          result:'Full payment ledger with the passenger name for each transaction' },
      ]
    },
    {
      sym: 'γ', name: 'Aggregation', color: '#10b981', colorL: 'rgba(16,185,129,.13)',
      desc: 'Group rows and compute summary statistics',
      queries: [
        { n:'Q16', expr:'γ<sub>DriverID</sub> SUM(Fare), COUNT(*) (rides ⋈ drivers)',
          sql:`SELECT d.FirstName+' '+d.LastName AS Driver,\n  COUNT(*) AS Rides,\n  ROUND(SUM(r.Fare),2) AS TotalEarned\nFROM rides r\nJOIN drivers d ON r.DriverID = d.DriverID\nWHERE r.Status = 'Completed'\nGROUP BY d.DriverID, d.FirstName, d.LastName\nORDER BY TotalEarned DESC;`,
          result:'Total earnings and ride count per driver — ranked highest first' },
        { n:'Q17', expr:'γ<sub>City</sub> AVG(Fare), SUM(Fare) (rides ⋈ locations)',
          sql:`SELECT l.City,\n  COUNT(*) AS TotalRides,\n  ROUND(SUM(r.Fare),2) AS TotalRevenue,\n  ROUND(AVG(r.Fare),2) AS AvgFare\nFROM rides r\nJOIN locations l ON r.StartLocationID = l.LocationID\nWHERE r.Status = 'Completed'\nGROUP BY l.City\nORDER BY TotalRevenue DESC;`,
          result:'Average and total revenue per city for completed rides' },
        { n:'Q18', expr:'γ<sub>Status</sub> COUNT(*) (rides)',
          sql:`SELECT Status,\n  COUNT(*) AS RideCount\nFROM rides\nGROUP BY Status;`,
          result:'Number of rides in each status category' },
        { n:'Q19', expr:'γ<sub>Capacity</sub> AVG(Rating) (drivers ⋈ vehicles)',
          sql:`SELECT v.Capacity,\n  ROUND(AVG(d.Rating),2) AS AvgRating\nFROM drivers d\nJOIN vehicles v ON d.DriverID = v.DriverID\nGROUP BY v.Capacity\nORDER BY v.Capacity;`,
          result:'Average driver rating grouped by vehicle passenger capacity' },
        { n:'Q20', expr:'TOP 5: γ<sub>DriverID</sub> SUM(Fare) DESC (rides ⋈ drivers)',
          sql:`SELECT TOP 5\n  d.FirstName+' '+d.LastName AS Driver,\n  ROUND(SUM(r.Fare),2) AS TotalEarned\nFROM rides r\nJOIN drivers d ON r.DriverID = d.DriverID\nWHERE r.Status = 'Completed'\nGROUP BY d.DriverID, d.FirstName, d.LastName\nORDER BY TotalEarned DESC;`,
          result:'Leaderboard: top 5 highest-earning drivers' },
      ]
    },
    {
      sym: '∪', name: 'Union', color: '#ec4899', colorL: 'rgba(236,72,153,.13)',
      desc: 'Combine rows from two compatible relations',
      queries: [
        { n:'Q21', expr:'π<sub>FirstName,LastName</sub>(users) ∪ π<sub>FirstName,LastName</sub>(drivers)',
          sql:`SELECT FirstName, LastName, 'User' AS Role\nFROM users\nUNION\nSELECT FirstName, LastName, 'Driver' AS Role\nFROM drivers\nORDER BY LastName;`,
          result:'All people in the system — users and drivers listed with their role' },
      ]
    },
    {
      sym: '∩', name: 'Intersection', color: '#f97316', colorL: 'rgba(249,115,22,.13)',
      desc: 'Rows present in both relations',
      queries: [
        { n:'Q22', expr:'π<sub>FirstName</sub>(users) ∩ π<sub>FirstName</sub>(drivers)',
          sql:`SELECT FirstName FROM users\nINTERSECT\nSELECT FirstName FROM drivers;`,
          result:'First names that appear in both the user pool and the driver pool' },
      ]
    },
    {
      sym: '−', name: 'Difference', color: '#ef4444', colorL: 'rgba(239,68,68,.13)',
      desc: 'Rows in the first relation but not the second',
      queries: [
        { n:'Q23', expr:'π<sub>UserID</sub>(users) − π<sub>UserID</sub>(rides)',
          sql:`SELECT UserID, FirstName, LastName\nFROM users\nWHERE UserID NOT IN (\n  SELECT DISTINCT UserID FROM rides\n);`,
          result:'Registered users who have never booked a single ride' },
        { n:'Q24', expr:'π<sub>DriverID</sub>(drivers) − π<sub>DriverID</sub>(σ<sub>Completed</sub>(rides))',
          sql:`SELECT DriverID, FirstName, LastName\nFROM drivers\nWHERE DriverID NOT IN (\n  SELECT DISTINCT DriverID\n  FROM rides\n  WHERE Status = 'Completed'\n);`,
          result:'Registered drivers who have never completed a ride' },
      ]
    },
    {
      sym: '+', name: 'Subqueries', color: '#6366f1', colorL: 'rgba(99,102,241,.13)',
      desc: 'Nested expressions and correlated queries',
      queries: [
        { n:'Q25', expr:'σ<sub>Fare &gt; AVG_fare</sub>(σ<sub>Completed</sub>(rides))',
          sql:`SELECT RideID, Fare, Status\nFROM rides\nWHERE Status = 'Completed'\n  AND Fare > (\n    SELECT AVG(Fare)\n    FROM rides\n    WHERE Status = 'Completed'\n  );`,
          result:'Completed rides whose fare exceeded the overall average' },
        { n:'Q26', expr:'σ<sub>Rating = MAX(Rating)</sub>(drivers)',
          sql:`SELECT DriverID, FirstName, LastName, Rating\nFROM drivers\nWHERE Rating = (\n  SELECT MAX(Rating) FROM drivers\n);`,
          result:'Driver(s) holding the highest rating in the system' },
        { n:'Q27', expr:'σ<sub>SUM(Fare) &gt; AVG_per_user(SUM(Fare))</sub>(users ⋈ rides)',
          sql:`SELECT u.UserID,\n  u.FirstName+' '+u.LastName AS UserName,\n  ROUND(SUM(r.Fare),2) AS TotalSpent\nFROM users u\nJOIN rides r ON u.UserID = r.UserID\n  AND r.Status = 'Completed'\nGROUP BY u.UserID, u.FirstName, u.LastName\nHAVING SUM(r.Fare) > (\n  SELECT AVG(total)\n  FROM (\n    SELECT SUM(Fare) AS total\n    FROM rides WHERE Status = 'Completed'\n    GROUP BY UserID\n  ) sub\n);`,
          result:'Users whose total spend exceeded the average total spend per user' },
        { n:'Q28', expr:'σ<sub>Fare = MAX(Fare)</sub>(σ<sub>Completed</sub>(rides) ⋈ users)',
          sql:`SELECT r.RideID,\n  u.FirstName+' '+u.LastName AS Passenger,\n  r.Fare\nFROM rides r\nJOIN users u ON r.UserID = u.UserID\nWHERE r.Status = 'Completed'\n  AND r.Fare = (\n    SELECT MAX(Fare)\n    FROM rides\n    WHERE Status = 'Completed'\n  );`,
          result:'The single most expensive completed ride with the passenger name' },
        { n:'Q29', expr:'HAVING COUNT(RideID) &gt; 1 (γ<sub>PromoID</sub>(rides ⋈ promos))',
          sql:`SELECT p.Code, p.Discount,\n  COUNT(r.RideID) AS TimesUsed\nFROM rides r\nJOIN promocodes p ON r.PromoID = p.PromoID\nGROUP BY p.PromoID, p.Code, p.Discount\nHAVING COUNT(r.RideID) > 1\nORDER BY TimesUsed DESC;`,
          result:'Promo codes used across more than one ride' },
        { n:'Q30', expr:'σ<sub>RideID ∈ paid_payments ∧ RideID ∈ rated</sub>(rides)',
          sql:`SELECT r.RideID, r.Fare, r.Status\nFROM rides r\nWHERE r.RideID IN (\n  SELECT RideID FROM payments\n  WHERE Status = 'Paid'\n)\nAND r.RideID IN (\n  SELECT RideID FROM ratings\n);`,
          result:'Rides that have both a confirmed Paid payment and a submitted rating' },
      ]
    },
  ];

  const opCards = GROUPS.map(g => {
    const qRows = g.queries.map(q => {
      const id = 'alg-' + q.n;
      return `<div class="alg-item" id="${id}">
        <div class="alg-header" onclick="toggleExpand('${id}')">
          <span class="alg-num">${q.n}</span>
          <div class="alg-expr">${q.expr}</div>
          <span class="alg-result-inline">${q.result}</span>
          <span class="trg-chevron">▼</span>
        </div>
        <div class="trg-expand">
          <div class="trg-expand-label">SQL — ${q.n}</div>
          <div class="code-block" style="white-space:pre;font-size:12px;line-height:1.7">${q.sql.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          <div style="margin-top:8px;font-size:11px;color:var(--green)">↳ ${q.result}</div>
        </div>
      </div>`;
    }).join('');

    return `<div class="alg-group">
      <div class="alg-group-hdr" style="border-color:${g.color}">
        <span class="alg-sym" style="color:${g.color};background:${g.colorL}">${g.sym}</span>
        <div>
          <div class="alg-gname">${g.name}</div>
          <div class="alg-gdesc">${g.desc} &nbsp;·&nbsp; <strong style="color:${g.color}">${g.queries.length} quer${g.queries.length===1?'y':'ies'}</strong></div>
        </div>
      </div>
      <div class="alg-list">${qRows}</div>
    </div>`;
  }).join('');

  return vhdr('Relational Algebra Queries', 'All 30 DQL queries demonstrating 7 formal operations — click any query to expand its T-SQL.')
    + `<p style="font-size:12px;color:var(--t3);margin-bottom:18px">Click any row to see the T-SQL definition ↓</p>`
    + `<div class="alg-grid">${opCards}</div>`;
}

// ── EXPAND / COLLAPSE (triggers + procedures + algebra) ──────────
function toggleExpand(id) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle('open');
}

function showProcTab(procId, tab, clickedBtn) {
  // switch tab content
  document.querySelectorAll(`.proc-tab[data-id="${procId}"]`).forEach(t => {
    t.style.display = t.getAttribute('data-tab') === tab ? 'block' : 'none';
  });
  // switch active tab button
  clickedBtn.closest('.proc-expand-tabs').querySelectorAll('.pet').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
}

// ── BAR ANIMATION ────────────────────────────────────────────────
// Observe view activation and animate bars in
const barObs = new MutationObserver(mutations => {
  mutations.forEach(m => {
    if (m.target.classList && m.target.classList.contains('active') && m.target.classList.contains('view')) {
      setTimeout(() => {
        m.target.querySelectorAll('.bar-fill').forEach(b => {
          const w = b.style.width;
          b.style.width = '0';
          requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = w; }));
        });
      }, 60);
    }
  });
});

// Re-attach observer whenever new views are added
new MutationObserver(() => {
  document.querySelectorAll('.view').forEach(v => {
    barObs.observe(v, { attributes: true, attributeFilter: ['class'] });
  });
}).observe(document.getElementById('page') || document.body, { childList: true, subtree: true });
