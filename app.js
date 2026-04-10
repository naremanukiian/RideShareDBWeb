'use strict';
// ═══════════════════════════════════════════════════════════════
// RideShareDB App — UI Layer
// Every render reads live from E (engine state)
// Every action calls DML.* or SP.* — triggers fire automatically
// ═══════════════════════════════════════════════════════════════

// ── Utilities ───────────────────────────────────────────────────
var $ = function(id){ return document.getElementById(id); };
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (html) e.innerHTML   = html;
  return e;
}

// ── SVG icon helper ─────────────────────────────────────────────
function ico(path) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
}

var ICONS = {
  dash:  ico('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
  rides: ico('<path d="M19 17H5a2 2 0 01-2-2V7a2 2 0 012-2h3l2 3h6l2-2h1a2 2 0 012 2v7a2 2 0 01-2 2z"/>'),
  pay:   ico('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>'),
  star:  ico('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  user:  ico('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  users: ico('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  tag:   ico('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  db:    ico('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
  bolt:  ico('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  code:  ico('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
  lock:  ico('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'),
  chart: ico('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
  idx:   ico('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>'),
  car:   ico('<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
  warn:  ico('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  info:  ico('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
};

// ── Formatting helpers ───────────────────────────────────────────
var F = {
  id:    function(n) { return '<span class="row-id">#' + String(n).padStart(3,'0') + '</span>'; },
  money: function(v) { return '<span class="amount">$' + Number(v).toFixed(2) + '</span>'; },
  dur:   function(d) { return d != null ? d + ' min' : '<span style="color:var(--tx3)">—</span>'; },
  date:  function(d) { return (d||'').slice(0,10); },
  nil:   function()  { return '<span style="color:var(--tx3)">NULL</span>'; },
  mono:  function(t) { return '<span class="mono">' + (t||'') + '</span>'; },
  promo: function(c) { return c ? '<span class="promo-chip">' + c + '</span>' : '<span style="color:var(--tx3)">—</span>'; },
  stars: function(n) {
    if (!n) return '<span style="color:var(--tx3)">—</span>';
    return '<span class="stars-on">' + '★'.repeat(n) + '</span><span class="stars-off">' + '★'.repeat(5-n) + '</span>';
  },
  badge: function(v) {
    var map = {
      'Completed':'badge-green','Available':'badge-green','Paid':'badge-green',
      'Pending':'badge-amber','Busy':'badge-amber',
      'Cancelled':'badge-red','Failed':'badge-red','Offline':'badge-red',
      'Card':'badge-blue','Online':'badge-blue','Cash':'badge-gray'
    };
    return '<span class="badge ' + (map[v]||'badge-gray') + '">' + (v||'—') + '</span>';
  }
};

// ── SQL event log ────────────────────────────────────────────────
document.addEventListener('sqlevent', function(ev) {
  var log = $('sqlLog');
  if (!log) return;
  var d = ev.detail;
  var colors = { trigger:'#f59e0b', proc:'#3d9be9', sql:'#7dd3fc', ok:'#34d399', error:'#f87171', warn:'#fbbf24' };
  var entry = el('div', 'log-entry');
  entry.style.color = colors[d.type] || '#888';
  entry.textContent = d.msg;
  log.insertBefore(entry, log.firstChild);
  while (log.children.length > 6) log.removeChild(log.lastChild);
  log.classList.add('has-entries');
});

// ── Toast ─────────────────────────────────────────────────────────
function toast(type, title, body) {
  var zone = $('toastZone');
  if (!zone) return;
  var t = el('div', 'toast toast-' + type);
  t.innerHTML = '<div class="toast-title">' + title + '</div>' + (body ? '<div class="toast-body">' + body.replace(/\n/g,'<br>') + '</div>' : '');
  zone.appendChild(t);
  setTimeout(function(){ t.classList.add('show'); }, 10);
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 5000);
}

// ── Modal ────────────────────────────────────────────────────────
function openModal(html) { $('modalBox').innerHTML = html; $('modalOverlay').classList.remove('hidden'); }
window.closeModal = function() { $('modalOverlay').classList.add('hidden'); };

// ── Table builder ─────────────────────────────────────────────────
function buildTable(cols, rows, foot) {
  if (!rows.length) return '<div class="table-empty">No records found.</div>';
  var head = cols.map(function(c){ return '<th>' + c.h + '</th>'; }).join('');
  var body = rows.map(function(r){
    return '<tr>' + cols.map(function(c){
      var val = c.r ? c.r(r) : (r[c.k] != null ? r[c.k] : '—');
      return '<td' + (c.s ? ' style="' + c.s + '"' : '') + '>' + val + '</td>';
    }).join('') + '</tr>';
  }).join('');
  return '<div class="table-wrap"><table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    (foot ? '<div class="table-footer">' + foot + '</div>' : '');
}

function buildCard(title, sub, body, foot) {
  return '<div class="card"><div class="card-header"><div class="card-title">' + title + '</div><div class="card-subtitle">' + (sub||'') + '</div></div>' +
    body + (foot ? '<div class="card-footer">' + foot + '</div>' : '') + '</div>';
}

function vhdr(title, sub) {
  return '<div class="vhdr"><div class="vhdr-title">' + title + '</div><div class="vhdr-sub">' + sub + '</div></div>';
}

function alertBar(type, msg) {
  return '<div class="alert alert-' + type + '"><span>' + ICONS[type==='warn'?'warn':'info'] + '</span>' + msg + '</div>';
}

function actionBar(btns) { return '<div class="action-bar">' + btns + '</div>'; }

function btn(cls, label, fn) {
  return '<button class="btn ' + cls + '" onclick="' + fn + '">' + label + '</button>';
}

function kpiGrid(items) {
  return '<div class="kpi-grid">' + items.map(function(it) {
    return '<div class="kpi-card"><div class="kpi-icon" style="background:' + it[3] + ';color:' + it[4] + '">' + ICONS[it[0]] + '</div>' +
      '<div><div class="kpi-val">' + it[1] + '</div><div class="kpi-label">' + it[2] + '</div></div></div>';
  }).join('') + '</div>';
}

function barChart(rows) {
  var max = Math.max.apply(null, rows.map(function(r){ return +r[1] || 0; })) || 1;
  return '<div class="bar-chart">' + rows.map(function(r){
    var pct = ((r[1]/max)*100).toFixed(1);
    return '<div class="bar-row"><div class="bar-label">' + r[0] + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + r[2] + '"></div></div>' +
      '<div class="bar-value">' + r[3] + '</div></div>';
  }).join('') + '</div>';
}

// ── Engine result handler ─────────────────────────────────────────
function handleResult(res) {
  if (res.ok) {
    toast('success', 'Success', res.msg);
    closeModal();
    rebuildCurrentView();
    refreshMeta();
    refreshCounts();
  } else {
    toast('error', 'Blocked by SQL Engine', res.msg);
  }
}

// ── Live option lists ─────────────────────────────────────────────
var opts = {
  users:    function(){ return E.users.map(function(u){ return [u.id, u.first+' '+u.last+' (#'+u.id+')']; }); },
  drivers:  function(){ return E.drivers.map(function(d){ return [d.id, d.first+' '+d.last+' · '+d.status+' ★'+d.rating]; }); },
  avail:    function(){ return IDX.drivers_status('Available').map(function(d){ return [d.id, d.first+' '+d.last+' — ★'+d.rating]; }); },
  locs:     function(){ return E.locations.map(function(l){ return [l.id, l.name+' · '+l.city]; }); },
  promos:   function(){ return IDX.promo_expiry().map(function(p){ return [p.id, p.code+' −'+p.discount+'%']; }); },
  pending:  function(){ return IDX.rides_status('Pending').map(function(r){ return [r.id, '#'+r.id+' — '+uname(r.uid)+' $'+r.fare]; }); },
  completed:function(){ return DQL.Q1().map(function(r){ return [r.id, '#'+r.id+' — '+uname(r.uid)+' $'+r.fare]; }); },
  unrated:  function(){ return DQL.Q1().filter(function(r){ return !IDX.ratings_ride(r.id); }).map(function(r){ return [r.id, '#'+r.id+' — $'+r.fare]; }); },
  noPay:    function(){ return E.rides.filter(function(r){ return !IDX.payments_ride(r.id).length; }).map(function(r){ return [r.id, '#'+r.id+' '+r.status+' $'+r.fare]; }); },
  all:      function(){ return E.rides.map(function(r){ return [r.id, '#'+r.id+' '+r.status+' — '+uname(r.uid)]; }); },
};

function selOpts(id, arr, empty) {
  return '<select id="' + id + '">' + (empty ? '<option value="">' + empty + '</option>' : '') +
    arr.map(function(o){ return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>';
}
function inp(id, type, val, ph) {
  return '<input id="' + id + '" type="' + (type||'text') + '" value="' + (val||'') + '" placeholder="' + (ph||'') + '"/>';
}
function formGroup(label, input, hint) {
  return '<div class="form-group"><label class="form-label">' + label + '</label>' + input + (hint ? '<div class="form-hint">' + hint + '</div>' : '') + '</div>';
}
function mBtn(cls, label, fn) {
  return '<button type="button" class="mbtn ' + cls + '" onclick="' + fn + '">' + label + '</button>';
}
function trigNote(html) { return '<div class="modal-trigger-note">' + html + '</div>'; }

// ═══════════════════════════════════════════════════════════════
// LOGIN SYSTEM
// ═══════════════════════════════════════════════════════════════
var CREDENTIALS = {
  passenger: { user:'passenger', pass:'demo', role:'passenger' },
  driver:    { user:'driver',    pass:'demo', role:'driver'    },
  analyst:   { user:'analyst',   pass:'demo', role:'analyst'   },
  dba:       { user:'dba',       pass:'demo', role:'dba'       },
};

var selectedRole = 'passenger';

window.selectLoginRole = function(role, btn) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  $('loginUser').value = role;
};

window.handleLogin = function(e) {
  e.preventDefault();
  var user = ($('loginUser').value || '').trim().toLowerCase();
  var pass = ($('loginPass').value || '').trim();
  var errEl = $('loginError');
  errEl.classList.remove('show');

  // Resolve role from username or selected role
  var matched = CREDENTIALS[user] || CREDENTIALS[selectedRole];

  if (!matched || pass !== 'demo') {
    errEl.classList.add('show');
    return;
  }
  enterApp(matched.role);
};

// ═══════════════════════════════════════════════════════════════
// ROLE CONFIG
// ═══════════════════════════════════════════════════════════════
var ROLES = {
  passenger: {
    label: 'Passenger',  av: 'PA', color: '#3d5a80', login: 'ride_app', home: 'p-dash',
    nav: [
      { section: 'My Account' },
      { id:'p-dash',    label:'Dashboard',    icon:'dash'  },
      { id:'p-rides',   label:'My Rides',     icon:'rides', cnt:function(){ return IDX.rides_user(ME_P).length; } },
      { id:'p-book',    label:'Book a Ride',  icon:'car'   },
      { id:'p-pays',    label:'My Payments',  icon:'pay'   },
      { id:'p-promos',  label:'Promo Codes',  icon:'tag',   cnt:function(){ return IDX.promo_expiry().length + ' active'; } },
      { id:'p-ratings', label:'Rate a Ride',  icon:'star'  },
    ]
  },
  driver: {
    label: 'Driver', av: 'DR', color: '#2d6a4f', login: 'ride_app', home: 'd-dash',
    nav: [
      { section: 'My Portal' },
      { id:'d-dash',    label:'Dashboard',       icon:'dash' },
      { id:'d-pending', label:'Active Rides',    icon:'car',   cnt:function(){ return IDX.rides_drv_status(ME_D,'Pending').length; } },
      { id:'d-trips',   label:'Completed Trips', icon:'rides' },
      { id:'d-earn',    label:'Earnings',        icon:'pay'  },
      { id:'d-ratings', label:'My Ratings',      icon:'star' },
      { id:'d-vehicle', label:'My Vehicle',      icon:'db'   },
    ]
  },
  analyst: {
    label: 'Analyst', av: 'AN', color: '#92400e', login: 'ride_report', home: 'a-overview',
    nav: [
      { section: 'Analytics' },
      { id:'a-overview', label:'Overview',        icon:'dash'  },
      { id:'a-rides',    label:'All Rides',       icon:'rides', cnt:function(){ return E.rides.length; } },
      { id:'a-drivers',  label:'Driver Summary',  icon:'users', cnt:function(){ return E.drivers.length; } },
      { id:'a-revenue',  label:'Revenue',         icon:'chart' },
      { id:'a-users',    label:'User Activity',   icon:'user'  },
      { id:'a-pays',     label:'Payments',        icon:'pay'   },
      { section: 'Queries & Objects' },
      { id:'a-queries',  label:'30 Algebra Queries', icon:'code', cnt:function(){ return 30; } },
      { id:'a-views',    label:'8 SQL Views',     icon:'db',   cnt:function(){ return 8; } },
      { id:'a-indexes',  label:'15 Indexes',      icon:'idx',  cnt:function(){ return 15; } },
    ]
  },
  dba: {
    label: 'DBA Admin', av: 'DB', color: '#1e40af', login: 'ride_dba', home: 'dba-dash',
    nav: [
      { section: 'Operations' },
      { id:'dba-dash',  label:'Dashboard',    icon:'dash',  },
      { id:'dba-rides', label:'All Rides',    icon:'rides', cnt:function(){ return E.rides.length; } },
      { id:'dba-drvs',  label:'All Drivers',  icon:'users', cnt:function(){ return E.drivers.length; } },
      { id:'dba-usrs',  label:'All Users',    icon:'user',  cnt:function(){ return E.users.length; } },
      { id:'dba-pays',  label:'All Payments', icon:'pay',   cnt:function(){ return E.payments.length; } },
      { section: 'Database Objects' },
      { id:'dba-schema', label:'Schema',           icon:'db'   },
      { id:'dba-trg',    label:'7 Triggers',       icon:'bolt', cnt:function(){ return 7; } },
      { id:'dba-proc',   label:'8 Procedures',     icon:'code', cnt:function(){ return 8; } },
      { id:'dba-queries',label:'30 Queries',       icon:'code', cnt:function(){ return 30; } },
      { id:'dba-views',  label:'8 Views',          icon:'db',   cnt:function(){ return 8; } },
      { id:'dba-indexes',label:'15 Indexes',       icon:'idx',  cnt:function(){ return 15; } },
      { id:'dba-dcl',    label:'Access Control',   icon:'lock' },
    ]
  }
};

var TITLES = {
  'p-dash':    ['Dashboard', 'Passenger overview'],
  'p-rides':   ['My Rides', 'sp_get_user_rides — vw_ride_details'],
  'p-book':    ['Book a Ride', 'sp_available_drivers · INSERT INTO rides'],
  'p-pays':    ['My Payments', 'INSERT INTO payments · trg_validate_payment_ride (BR-3)'],
  'p-promos':  ['Promo Codes', 'vw_active_promos · sp_apply_promo'],
  'p-ratings': ['Rate a Ride', 'INSERT INTO ratings · trg_update_driver_rating (BR-4)'],
  'd-dash':    ['Driver Dashboard', 'Driver portal overview'],
  'd-pending': ['Active Rides', 'sp_complete_ride · sp_cancel_ride · vw_pending_rides'],
  'd-trips':   ['Completed Trips', 'sp_driver_earnings · vw_ride_details'],
  'd-earn':    ['Earnings', 'sp_monthly_revenue · idx_rides_starttime'],
  'd-ratings': ['My Ratings', 'trg_update_driver_rating (BR-4) keeps this live'],
  'd-vehicle': ['My Vehicle', 'vehicles table · idx_vehicles_driver'],
  'a-overview':['Overview', 'ride_report — SELECT only'],
  'a-rides':   ['All Rides', 'vw_ride_details — 7-table JOIN'],
  'a-drivers': ['Driver Summary', 'vw_driver_summary — sorted by rating'],
  'a-revenue': ['Revenue', 'vw_revenue_by_city · Q17 · Q20'],
  'a-users':   ['User Activity', 'vw_user_activity'],
  'a-pays':    ['Payments', 'vw_payment_overview'],
  'a-queries': ['30 Algebra Queries', 'Select any query to run it live'],
  'a-views':   ['8 SQL Views', 'Click Run to execute any view'],
  'a-indexes': ['15 Indexes', 'All non-clustered indexes from ride_sharing.sql'],
  'dba-dash':  ['DBA Dashboard', 'db_owner — full control'],
  'dba-rides': ['All Rides', 'vw_ride_details · DELETE triggers BR-2'],
  'dba-drvs':  ['All Drivers', 'vw_driver_summary'],
  'dba-usrs':  ['All Users', 'sp_register_user · UNIQUE(Email)'],
  'dba-pays':  ['All Payments', 'INSERT triggers BR-3'],
  'dba-schema':['Schema', '8 tables · 10 FK · 12 CHECK · 6 UNIQUE'],
  'dba-trg':   ['7 Triggers', 'T-SQL shown · test live'],
  'dba-proc':  ['8 Procedures', 'Execute with live parameters'],
  'dba-queries':['30 Queries', 'Run live against the engine'],
  'dba-views': ['8 Views', 'Run live'],
  'dba-indexes':['15 Indexes', 'Full index catalog'],
  'dba-dcl':   ['Access Control', 'DCL · GRANT · DENY · db_owner'],
};

// Demo personas
var ME_P = 1;  // Alice Johnson (passenger)
var ME_D = 1;  // James Cooper (driver)

// ═══════════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════════
var CURRENT_ROLE = null;
var CURRENT_VIEW = null;

function enterApp(role) {
  CURRENT_ROLE = role;
  var def = ROLES[role];
  $('loginScreen').classList.add('hidden');
  $('app').classList.remove('hidden');

  // Avatars
  $('sbAvatar').textContent     = def.av;
  $('sbAvatar').style.background = def.color;
  $('sbUserName').textContent   = def.label;
  $('sbUserRole').textContent   = def.login;
  $('tbAvatar').textContent     = def.av;
  $('tbAvatar').style.background = def.color;

  // Build nav
  buildNav(def);

  // Mobile
  $('hamburger').onclick = function() {
    $('sidebar').classList.toggle('open');
    $('overlay').classList.toggle('show');
    $('hamburger').classList.toggle('open');
  };
  $('overlay').onclick = closeDrawer;

  // First view
  var pg = $('page'); pg.innerHTML = '';
  var homeEl = buildView(def.home);
  pg.appendChild(homeEl);
  var homeBtn = $('sbNav').querySelector('[data-vid="' + def.home + '"]');
  activateView(def.home, homeBtn, true);
  refreshMeta();
  refreshCounts();
}

window.signOut = function() {
  CURRENT_ROLE = null; CURRENT_VIEW = null;
  $('app').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
  $('page').innerHTML = '';
  $('sqlLog').innerHTML = '';
  $('sqlLog').classList.remove('has-entries');
  $('loginPass').value = '';
  $('loginError').classList.remove('show');
};

function closeDrawer() {
  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('show');
  $('hamburger').classList.remove('open');
}

function buildNav(def) {
  var nav = $('sbNav'); nav.innerHTML = '';
  def.nav.forEach(function(item) {
    if (item.section) {
      var s = document.createElement('div');
      s.className = 'nav-section'; s.textContent = item.section;
      nav.appendChild(s); return;
    }
    var b = document.createElement('button');
    b.className = 'nav-item'; b.dataset.vid = item.id;
    b.innerHTML = '<span class="ni">' + ICONS[item.icon] + '</span><span>' + item.label + '</span>';
    if (item.cnt) {
      var badge = document.createElement('span');
      badge.className = 'nav-badge'; badge.id = 'nb-' + item.id;
      badge.textContent = typeof item.cnt === 'function' ? item.cnt() : item.cnt;
      b.appendChild(badge);
    }
    b.addEventListener('click', function() { gotoView(item.id, b); });
    nav.appendChild(b);
  });
}

function gotoView(id, btn) {
  // Always rebuild from live engine state so changes from any role are reflected
  var existing = document.getElementById('vw-' + id);
  var newEl = buildView(id);
  if (existing) {
    $('page').replaceChild(newEl, existing);
  } else {
    $('page').appendChild(newEl);
  }
  activateView(id, btn, false);
}

window.nav2 = function(id) {
  var btn = $('sbNav').querySelector('[data-vid="' + id + '"]');
  gotoView(id, btn);
};

function activateView(id, btn, already) {
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var v = document.getElementById('vw-' + id);
  if (v) v.classList.add('active');
  if (btn) btn.classList.add('active');
  var ti = TITLES[id] || [id, ''];
  $('tbTitle').textContent = ti[0]; $('tbSub').textContent = ti[1];
  CURRENT_VIEW = id;
  closeDrawer();
}

function rebuildCurrentView() {
  if (!CURRENT_ROLE || !CURRENT_VIEW) return;
  var old = document.getElementById('vw-' + CURRENT_VIEW);
  if (!old) return;
  var fresh = buildView(CURRENT_VIEW);
  $('page').replaceChild(fresh, old);
  fresh.classList.add('active');
}

function refreshMeta() {
  var rev = E.rides.filter(function(r){ return r.status==='Completed'; }).reduce(function(s,r){ return s+r.fare; }, 0);
  $('sbMeta').textContent = E.rides.length + ' rides · ' + IDX.drivers_status('Available').length + ' avail · $' + rev.toFixed(2);
}

function refreshCounts() {
  var def = ROLES[CURRENT_ROLE]; if (!def) return;
  def.nav.filter(function(n){ return n.cnt; }).forEach(function(item) {
    var el = document.getElementById('nb-' + item.id);
    if (el) el.textContent = typeof item.cnt === 'function' ? item.cnt() : item.cnt;
  });
}

window.doSearch = function(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll('.view.active tbody tr').forEach(function(r){
    r.style.display = (!q || r.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
};

// ═══════════════════════════════════════════════════════════════
// VIEW BUILDER
// ═══════════════════════════════════════════════════════════════
function buildView(id) {
  var d = document.createElement('div');
  d.className = 'view'; d.id = 'vw-' + id;
  var BUILDERS = {
    'p-dash':V_pDash,'p-rides':V_pRides,'p-book':V_pBook,'p-pays':V_pPays,'p-promos':V_pPromos,'p-ratings':V_pRatings,
    'd-dash':V_dDash,'d-pending':V_dPending,'d-trips':V_dTrips,'d-earn':V_dEarn,'d-ratings':V_dRatings,'d-vehicle':V_dVehicle,
    'a-overview':V_aOverview,'a-rides':V_aRides,'a-drivers':V_aDrivers,'a-revenue':V_aRevenue,'a-users':V_aUsers,'a-pays':V_aPays,
    'a-queries':V_Queries,'a-views':V_Views,'a-indexes':V_Indexes,
    'dba-dash':V_dbaDash,'dba-rides':V_dbaRides,'dba-drvs':V_dbaDrvs,'dba-usrs':V_dbaUsrs,'dba-pays':V_dbaPays,
    'dba-schema':V_dbaSchema,'dba-trg':V_dbaTrg,'dba-proc':V_dbaProc,
    'dba-queries':V_Queries,'dba-views':V_Views,'dba-indexes':V_Indexes,'dba-dcl':V_dbaDCL,
  };
  if (BUILDERS[id]) d.innerHTML = BUILDERS[id]();
  return d;
}

// ═══════════════════════════════════════════════════════════════
// PASSENGER VIEWS
// ═══════════════════════════════════════════════════════════════
function V_pDash() {
  var u = E.users.find(function(x){ return x.id===ME_P; });
  var myR = IDX.rides_user(ME_P);
  var done = myR.filter(function(r){ return r.status==='Completed'; });
  var spent = done.reduce(function(s,r){ return s+r.fare; }, 0);
  var pend = myR.filter(function(r){ return r.status==='Pending'; }).length;
  return vhdr('Welcome back, ' + u.first + ' ' + u.last, 'Logged in as ride_app · SELECT · INSERT · UPDATE · DENY DELETE') +
    alertBar('warn','Your role (ride_app) cannot DELETE any records — enforced by DCL DENY statement.') +
    kpiGrid([
      ['rides', myR.length,       'Total Rides',    '#eef2f7','#3d5a80'],
      ['rides', done.length,      'Completed',      '#eaf4ef','#2d6a4f'],
      ['warn',  pend,             'Pending',        '#fef3c7','#92400e'],
      ['pay',   '$'+spent.toFixed(2), 'Total Spent','#eaf4ef','#2d6a4f'],
    ]) +
    actionBar(btn('btn-primary','Book a Ride','mBookRide()') + btn('btn-secondary','My Rides',"nav2('p-rides')") + btn('btn-secondary','Payments',"nav2('p-pays')") + btn('btn-secondary','Promos',"nav2('p-promos')"));
}

function V_pRides() {
  var rows = SP.get_user_rides(ME_P);
  return vhdr('My Rides', 'sp_get_user_rides — uses idx_rides_user index · returns vw_ride_details for UserID=' + ME_P) +
    actionBar(btn('btn-primary','Book New Ride','mBookRide()')) +
    buildCard('Trip History', rows.length + ' rides', buildTable([
      { h:'ID',         r:function(r){ return F.id(r.RideID); } },
      { h:'Driver',     k:'DriverName', s:'font-weight:500' },
      { h:'From',       k:'StartLocation', s:'font-size:11px;color:var(--tx3)' },
      { h:'To',         k:'EndLocation',   s:'font-size:11px;color:var(--tx3)' },
      { h:'City',       k:'City',          s:'font-size:11px;color:var(--tx3)' },
      { h:'Duration',   r:function(r){ return F.dur(r.DurationMin); } },
      { h:'Fare',       r:function(r){ return F.money(r.Fare); } },
      { h:'Promo',      r:function(r){ return F.promo(r.PromoCode); } },
      { h:'Status',     r:function(r){ return F.badge(r.Status); } },
      { h:'',           r:function(r){
        if (r.Status==='Pending') return '<button class="tbtn tbtn-red" onclick="mCancelRide('+r._r.id+')">Cancel</button>';
        if (r.Status==='Completed' && !IDX.ratings_ride(r._r.id)) return '<button class="tbtn" onclick="mRateRide('+r._r.id+')">Rate</button>';
        return '';
      }},
    ], rows, 'RideDuration auto-set by trg_calc_duration (BR-5) · PromoCode via LEFT JOIN promocodes'));
}

function V_pBook() {
  var avail = SP.available_drivers();
  return vhdr('Book a Ride', 'sp_available_drivers → idx_drivers_status · INSERT INTO rides → triggers BR-1 + BR-6') +
    actionBar(btn('btn-primary','Book a Ride','mBookRide()')) +
    buildCard('Available Drivers', avail.length + ' ready · sp_available_drivers', buildTable([
      { h:'Driver',   r:function(d){ return '<strong>'+d.first+' '+d.last+'</strong>'; } },
      { h:'Rating',   r:function(d){ return F.stars(Math.round(d.rating)) + ' <small>' + d.rating + '</small>'; } },
      { h:'Vehicle',  k:'model',  s:'font-size:12px' },
      { h:'Plate',    r:function(d){ return F.mono(d.plate); } },
      { h:'Status',   r:function(d){ return F.badge(d.status); } },
      { h:'',         r:function(d){ return '<button class="tbtn tbtn-green" onclick="mBookRide('+d.id+')">Book</button>'; } },
    ], avail, 'Sorted by rating · idx_drivers_status + idx_vehicles_driver'));
}

function V_pPays() {
  var rids = new Set(IDX.rides_user(ME_P).map(function(r){ return r.id; }));
  var rows = E.payments.filter(function(p){ return rids.has(p.rid); });
  return vhdr('My Payments', 'INSERT INTO payments → trg_validate_payment_ride (BR-3) — blocked on Cancelled rides') +
    actionBar(btn('btn-primary','Record Payment','mPayment()')) +
    buildCard('Payment History', rows.length + ' transactions', buildTable([
      { h:'ID',     r:function(p){ return F.id(p.pid); } },
      { h:'Ride',   r:function(p){ return F.id(p.rid); } },
      { h:'Amount', r:function(p){ return F.money(p.amount); } },
      { h:'Method', r:function(p){ return F.badge(p.method); } },
      { h:'Date',   k:'date', s:'font-size:11px;color:var(--tx3)' },
      { h:'Status', r:function(p){ return F.badge(p.status); } },
    ], rows, 'trg_validate_payment_ride (BR-3) — INSTEAD OF INSERT — fires before row is written'));
}

function V_pPromos() {
  var active = IDX.promo_expiry();
  return vhdr('Promo Codes', 'vw_active_promos · idx_promo_expiry · sp_apply_promo') +
    actionBar(btn('btn-primary','Apply Promo to Ride','mApplyPromo()')) +
    buildCard('Active Promo Codes', active.length + ' — WHERE ExpiryDate > GETDATE()', buildTable([
      { h:'Code',     r:function(p){ return F.promo(p.code); } },
      { h:'Discount', r:function(p){ return '<strong style="color:var(--green)">−'+p.discount+'%</strong>'; } },
      { h:'Expires',  k:'expiry', s:'font-size:11px;color:var(--tx3)' },
      { h:'',         r:function(p){ return '<button class="tbtn tbtn-green" onclick="mApplyPromo(null,'+p.id+')">Apply</button>'; } },
    ], active, 'Uses idx_promo_expiry · CHECK(Discount BETWEEN 0 AND 100)'));
}

function V_pRatings() {
  var rids = new Set(IDX.rides_user(ME_P).map(function(r){ return r.id; }));
  var rated = E.ratings.filter(function(r){ return rids.has(r.rid); }).sort(function(a,b){ return b.dr-a.dr; });
  var unrated = DQL.Q1().filter(function(r){ return rids.has(r.id) && !IDX.ratings_ride(r.id); });
  return vhdr('Rate a Ride', 'INSERT INTO ratings · trg_update_driver_rating (BR-4) · UNIQUE(RideID)') +
    (unrated.length ? actionBar(btn('btn-primary','Submit Rating','mRateRide()')) : '') +
    buildCard('My Ratings', rated.length + ' submitted · sorted by DriverRating', buildTable([
      { h:'Ride',    r:function(r){ return F.id(r.rid); } },
      { h:'Driver',  r:function(r){ return F.stars(r.dr); } },
      { h:'User',    r:function(r){ return r.ur ? F.stars(r.ur) : F.nil(); } },
      { h:'Comment', k:'comment', s:'font-size:11px;color:var(--tx2)', r:function(r){ return r.comment||'—'; } },
    ], rated, 'UNIQUE(RideID) · BR-4 recalculates Driver.Rating = ROUND(AVG(DriverRating),2) after every INSERT'));
}

// ═══════════════════════════════════════════════════════════════
// DRIVER VIEWS
// ═══════════════════════════════════════════════════════════════
function V_dDash() {
  var d = E.drivers.find(function(x){ return x.id===ME_D; });
  var myR = IDX.rides_driver(ME_D);
  var done = myR.filter(function(r){ return r.status==='Completed'; });
  return vhdr(d.first + ' ' + d.last + ' — Driver Portal', 'Status: ' + d.status + ' · Rating: ' + d.rating + ' · ' + d.lic) +
    kpiGrid([
      ['car',   IDX.rides_drv_status(ME_D,'Pending').length, 'Active Rides', '#fef3c7','#92400e'],
      ['rides', done.length,    'Completed',  '#eaf4ef','#2d6a4f'],
      ['star',  d.rating,       'My Rating',  '#fef3c7','#92400e'],
      ['pay',   '$'+done.reduce(function(s,r){return s+r.fare;},0).toFixed(2), 'Total Earned', '#eaf4ef','#2d6a4f'],
    ]) +
    actionBar(btn('btn-primary','View Active Rides',"nav2('d-pending')") + btn('btn-secondary','Earnings',"nav2('d-earn')") + btn('btn-secondary','Monthly Report','mMonthly()'));
}

function V_dPending() {
  var rows = VIEW.vw_pending_rides().filter(function(r){ return r._r.did===ME_D; });
  return vhdr('Active Rides', 'sp_complete_ride (BR-5, BR-7) · sp_cancel_ride (BR-7) · vw_pending_rides') +
    buildCard('Pending Rides', rows.length + ' pending', buildTable([
      { h:'ID',        r:function(r){ return F.id(r.RideID); } },
      { h:'Passenger', k:'UserName', s:'font-weight:500' },
      { h:'From',      k:'StartLocation', s:'font-size:11px;color:var(--tx3)' },
      { h:'Start',     k:'StartTime',     s:'font-size:11px;color:var(--tx3)' },
      { h:'Fare',      r:function(r){ return F.money(r.Fare); } },
      { h:'Actions',   r:function(r){ return '<button class="tbtn tbtn-green" onclick="mCompleteRide('+r._r.id+','+r._r.fare+')">Complete</button> <button class="tbtn tbtn-red" onclick="mCancelRide('+r._r.id+')">Cancel</button>'; } },
    ], rows, 'sp_complete_ride → BR-5 trg_calc_duration + BR-7 trg_driver_available_on_complete'));
}

function V_dTrips() {
  var res = SP.driver_earnings(ME_D, '2024-01-01', '2025-12-31');
  var rows = VIEW.vw_ride_details().filter(function(r){ return r._r.did===ME_D && r.Status==='Completed'; });
  return vhdr('Completed Trips', 'sp_driver_earnings · vw_ride_details · idx_rides_driver') +
    (res.ok && !res.empty ? kpiGrid([
      ['rides', res.res.Rides, 'Total Rides', '#eef2f7','#3d5a80'],
      ['pay', '$'+res.res.TotalEarnings, 'Total Earned', '#eaf4ef','#2d6a4f'],
    ]) : '') +
    buildCard('Trip History', rows.length + ' completed', buildTable([
      { h:'ID',       r:function(r){ return F.id(r.RideID); } },
      { h:'Passenger',k:'UserName', s:'font-weight:500' },
      { h:'From',     k:'StartLocation', s:'font-size:11px;color:var(--tx3)' },
      { h:'To',       k:'EndLocation',   s:'font-size:11px;color:var(--tx3)' },
      { h:'Duration', r:function(r){ return F.dur(r.DurationMin); } },
      { h:'Fare',     r:function(r){ return F.money(r.Fare); } },
    ], rows, 'RideDuration set by trg_calc_duration (BR-5) · idx_rides_driver index'));
}

function V_dEarn() {
  var months = [{y:2024,m:1,l:'Jan'},{y:2024,m:2,l:'Feb'},{y:2024,m:3,l:'Mar'},{y:2024,m:4,l:'Apr'}];
  var data = months.map(function(mo){ return Object.assign({}, mo, SP.monthly_revenue(mo.y, mo.m)); });
  var city = VIEW.vw_revenue_by_city();
  var CC = {'New York':'#3d5a80','Chicago':'#2d6a4f','Los Angeles':'#92400e','San Francisco':'#1e40af'};
  return vhdr('Earnings', 'sp_monthly_revenue · sp_driver_earnings · idx_rides_starttime') +
    actionBar(btn('btn-primary','Custom Report','mMonthly()') + btn('btn-secondary','Driver Earnings','mDriverEarnings()')) +
    '<div class="grid-2">' +
    buildCard('Monthly Revenue', 'sp_monthly_revenue · idx_rides_starttime', '<div class="card-body">' + barChart(data.filter(function(r){ return r.res; }).map(function(r){ return [r.l, r.res.TotalRevenue, '#3d5a80', '$'+r.res.TotalRevenue.toFixed(2)]; })) + '</div>') +
    buildCard('Revenue by City', 'vw_revenue_by_city', '<div class="card-body">' + barChart(city.map(function(c){ return [c.City, c.TotalRevenue, CC[c.City]||'#3d5a80', '$'+c.TotalRevenue]; })) + '</div>') +
    '</div>';
}

function V_dRatings() {
  var d = E.drivers.find(function(x){ return x.id===ME_D; });
  var rids = new Set(IDX.rides_driver(ME_D).map(function(r){ return r.id; }));
  var rows = E.ratings.filter(function(r){ return rids.has(r.rid); }).sort(function(a,b){ return b.dr-a.dr; });
  return vhdr('My Ratings', 'Current: ' + d.rating + ' — auto-recalculated by trg_update_driver_rating (BR-4)') +
    buildCard('Rating History', rows.length + ' ratings · sorted by DriverRating', buildTable([
      { h:'Ride',    r:function(r){ return F.id(r.rid); } },
      { h:'Driver',  r:function(r){ return F.stars(r.dr); } },
      { h:'User',    r:function(r){ return r.ur ? F.stars(r.ur) : F.nil(); } },
      { h:'Comment', k:'comment', s:'font-size:11px;color:var(--tx2)', r:function(r){ return r.comment||'—'; } },
    ], rows, 'UNIQUE(RideID) · DriverRating NOT NULL · BR-4 fires AFTER INSERT on ratings'));
}

function V_dVehicle() {
  var v = IDX.vehicles_driver(ME_D);
  if (!v) return vhdr('My Vehicle','No vehicle registered');
  return vhdr('My Vehicle', 'vehicles table · idx_vehicles_driver · FK → drivers ON DELETE CASCADE') +
    buildCard('Vehicle Details', '', '<div class="card-body"><div class="detail-grid">' +
      [['Vehicle ID',v.did],['Plate Number',v.plate],['Model',v.model],['Year',v.year],['Capacity',v.cap+' passengers']].map(function(it){
        return '<div class="detail-item"><div class="detail-label">'+it[0]+'</div><div class="detail-value">'+it[1]+'</div></div>';
      }).join('') + '</div></div>', 'UNIQUE(PlateNumber) · CHECK(Capacity BETWEEN 1 AND 20) · CHECK(Year BETWEEN 1990 AND 2030)');
}

// ═══════════════════════════════════════════════════════════════
// ANALYST VIEWS
// ═══════════════════════════════════════════════════════════════
function V_aOverview() {
  var rev = E.rides.filter(function(r){return r.status==='Completed';}).reduce(function(s,r){return s+r.fare;},0);
  var cnt = E.rides.filter(function(r){return r.status==='Completed';}).length;
  var city = VIEW.vw_revenue_by_city();
  var CC = {'New York':'#3d5a80','Chicago':'#2d6a4f','Los Angeles':'#92400e','San Francisco':'#1e40af'};
  return vhdr('Analytics Overview', 'ride_report — SELECT only · no INSERT, UPDATE, or DELETE') +
    alertBar('warn', 'Read-only access (ride_report) — no write operations permitted.') +
    kpiGrid([
      ['pay',   '$'+rev.toFixed(2),    'Total Revenue',    '#eaf4ef','#2d6a4f'],
      ['rides', E.rides.length,        'Total Rides',      '#eef2f7','#3d5a80'],
      ['users', IDX.drivers_status('Available').length, 'Available Drivers', '#fef3c7','#92400e'],
      ['chart', '$'+(cnt?rev/cnt:0).toFixed(2), 'Avg Fare',  '#eef2f7','#3d5a80'],
    ]) +
    '<div class="grid-2">' +
    buildCard('Revenue by City', 'vw_revenue_by_city · Q17', '<div class="card-body">' + barChart(city.map(function(c){ return [c.City, c.TotalRevenue, CC[c.City]||'#3d5a80', '$'+c.TotalRevenue]; })) + '</div>') +
    buildCard('Ride Status', 'Q18 · GROUP BY Status', '<div class="card-body">' + barChart([
      ['Completed', E.rides.filter(function(r){return r.status==='Completed';}).length, '#2d6a4f', E.rides.filter(function(r){return r.status==='Completed';}).length + ' rides'],
      ['Pending',   E.rides.filter(function(r){return r.status==='Pending';}).length,   '#92400e', E.rides.filter(function(r){return r.status==='Pending';}).length + ' rides'],
      ['Cancelled', E.rides.filter(function(r){return r.status==='Cancelled';}).length, '#9b1c1c', E.rides.filter(function(r){return r.status==='Cancelled';}).length + ' rides'],
    ]) + '</div>') + '</div>';
}

function V_aRides() {
  var rows = VIEW.vw_ride_details();
  return vhdr('All Rides', 'vw_ride_details — 7-table JOIN: rides + users + drivers + vehicles + locations(×2) + promocodes') +
    buildCard('vw_ride_details', rows.length + ' records', buildTable([
      { h:'ID',        r:function(r){ return F.id(r.RideID); } },
      { h:'Passenger', k:'UserName', s:'font-weight:500;font-size:12px' },
      { h:'Driver',    k:'DriverName', s:'font-size:12px' },
      { h:'From',      k:'StartLocation', s:'font-size:11px;color:var(--tx3)' },
      { h:'To',        k:'EndLocation',   s:'font-size:11px;color:var(--tx3)' },
      { h:'City',      k:'City',          s:'font-size:11px;color:var(--tx3)' },
      { h:'Duration',  r:function(r){ return F.dur(r.DurationMin); } },
      { h:'Fare',      r:function(r){ return F.money(r.Fare); } },
      { h:'Promo',     r:function(r){ return F.promo(r.PromoCode); } },
      { h:'Status',    r:function(r){ return F.badge(r.Status); } },
    ], rows, 'RideDuration derived by trg_calc_duration (BR-5)'));
}

function V_aDrivers() {
  var rows = VIEW.vw_driver_summary();
  return vhdr('Driver Summary', 'vw_driver_summary — sorted by Rating — Rating kept live by trg_update_driver_rating (BR-4)') +
    buildCard('vw_driver_summary', rows.length + ' drivers', buildTable([
      { h:'Driver',   k:'DriverName', s:'font-weight:500' },
      { h:'Licence',  r:function(r){ return F.mono(r.LicenseNumber); } },
      { h:'Rating',   r:function(r){ return F.stars(Math.round(r.Rating)) + ' <small>'+r.Rating+'</small>'; } },
      { h:'Status',   r:function(r){ return F.badge(r.Status); } },
      { h:'Rides',    k:'TotalRides' },
      { h:'Earned',   r:function(r){ return F.money(r.TotalEarnings); } },
    ], rows, 'Status managed by BR-6 (Busy on ride INSERT) and BR-7 (Available on complete/cancel)'));
}

function V_aRevenue() {
  var city = VIEW.vw_revenue_by_city();
  var top5 = DQL.Q20();
  return vhdr('Revenue Analytics', 'vw_revenue_by_city · Q16 · Q17 · Q20') +
    '<div class="grid-2">' +
    buildCard('Revenue by City', 'vw_revenue_by_city · Q17', buildTable([
      { h:'City',    k:'City' },
      { h:'Rides',   k:'TotalRides' },
      { h:'Revenue', r:function(r){ return F.money(r.TotalRevenue); } },
      { h:'Avg Fare',r:function(r){ return F.money(r.AvgFare); } },
    ], city)) +
    buildCard('Top 5 Earners', 'Q20 — TOP 5 γ SUM(Fare) DESC', buildTable([
      { h:'Rank',   k:'Rank' },
      { h:'Driver', k:'Driver' },
      { h:'Rides',  k:'Rides' },
      { h:'Earned', r:function(r){ return F.money(r.TotalEarned); } },
    ], top5)) + '</div>';
}

function V_aUsers() {
  return vhdr('User Activity', 'vw_user_activity — users + rides + ratings · idx_rides_user') +
    buildCard('vw_user_activity', E.users.length + ' users', buildTable([
      { h:'Name',       k:'UserName', s:'font-weight:500' },
      { h:'Email',      k:'Email',    s:'font-size:11px;color:var(--tx3)' },
      { h:'Rides',      k:'TotalRides' },
      { h:'Spent',      r:function(r){ return F.money(r.TotalSpent); } },
      { h:'Avg Rating', r:function(r){ return r.AvgUserRating ? r.AvgUserRating+'★' : F.nil(); } },
    ], VIEW.vw_user_activity()));
}

function V_aPays() {
  var rows = VIEW.vw_payment_overview();
  return vhdr('Payments', 'vw_payment_overview — payments + rides + users') +
    buildCard('vw_payment_overview', rows.length + ' records', buildTable([
      { h:'ID',        r:function(p){ return F.id(p.PaymentID); } },
      { h:'Ride',      r:function(p){ return F.id(p.RideID); } },
      { h:'Passenger', k:'UserName', s:'font-size:12px' },
      { h:'Amount',    r:function(p){ return F.money(p.Amount); } },
      { h:'Method',    r:function(p){ return F.badge(p.Method); } },
      { h:'Date',      k:'PaymentDate', s:'font-size:11px;color:var(--tx3)' },
      { h:'Status',    r:function(p){ return F.badge(p.Status); } },
    ], rows, 'trg_validate_payment_ride (BR-3) — INSTEAD OF INSERT — blocks payments on Cancelled rides'));
}

// ═══════════════════════════════════════════════════════════════
// SHARED: QUERIES, VIEWS, INDEXES
// ═══════════════════════════════════════════════════════════════
function V_Queries() {
  var groups = [
    { op:'σ', nm:'Selection',   col:'#1e40af', bg:'#eff6ff', qs:['Q1','Q2','Q3','Q4','Q5','Q6','Q7'] },
    { op:'π', nm:'Projection',  col:'#5b21b6', bg:'#f5f3ff', qs:['Q8','Q9','Q10'] },
    { op:'⋈', nm:'Natural Join',col:'#92400e', bg:'#fef3c7', qs:['Q11','Q12','Q13','Q14','Q15'] },
    { op:'γ', nm:'Aggregation', col:'#2d6a4f', bg:'#eaf4ef', qs:['Q16','Q17','Q18','Q19','Q20'] },
    { op:'∪', nm:'Union',       col:'#9b1c1c', bg:'#fef2f2', qs:['Q21'] },
    { op:'∩', nm:'Intersection',col:'#92400e', bg:'#fef3c7', qs:['Q22'] },
    { op:'−', nm:'Difference',  col:'#374151', bg:'#f9fafb', qs:['Q23','Q24'] },
    { op:'+', nm:'Subquery',    col:'#3d5a80', bg:'#eef2f7', qs:['Q25','Q26','Q27','Q28','Q29','Q30'] },
  ];
  return vhdr('30 Relational Algebra Queries', 'Select any query to run it live against the in-memory database') +
    '<div class="alg-groups">' + groups.map(function(g) {
      return '<div class="alg-group">' +
        '<div class="alg-group-header" style="border-color:' + g.col + '">' +
        '<div class="alg-op" style="background:' + g.bg + ';color:' + g.col + '">' + g.op + '</div>' +
        '<div><div class="alg-group-name">' + g.nm + '</div><div class="alg-group-desc">' + g.qs.length + ' quer' + (g.qs.length>1?'ies':'y') + '</div></div></div>' +
        '<div class="alg-list">' + g.qs.map(function(q) {
          var m = QMETA[q];
          return '<div class="alg-item" id="aqi-' + q + '">' +
            '<div class="alg-row" onclick="runQ(\'' + q + '\')">' +
            '<span class="alg-qnum">' + q + '</span>' +
            '<div class="alg-expr">' + m.expr + '</div>' +
            '<button class="run-btn">Run</button></div>' +
            '<div class="alg-result" id="aqr-' + q + '"></div></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
}

window.runQ = function(q) {
  var item = document.getElementById('aqi-' + q);
  var res  = document.getElementById('aqr-' + q);
  if (!item || !res) return;
  item.classList.toggle('open');
  if (!item.classList.contains('open')) { res.innerHTML = ''; return; }
  var m = QMETA[q];
  var data = DQL[q]();
  sqlFire('sql', '[' + q + '] ' + m.nm + ': ' + m.expr, m.sql);
  var keys = data.length ? Object.keys(data[0]).filter(function(k){ return k!=='_r'; }) : [];
  res.innerHTML = '<div class="alg-sql"><div class="alg-sql-label">T-SQL — ride_sharing.sql</div><pre>' + m.sql + '</pre></div>' +
    '<div class="alg-row-count">' + data.length + ' row(s) returned' + (data.length>50?' — showing first 50':'') + '</div>' +
    (data.length ? '<div class="table-wrap"><table class="data-table"><thead><tr>' + keys.map(function(k){ return '<th>'+k+'</th>'; }).join('') + '</tr></thead><tbody>' +
      data.slice(0,50).map(function(r){ return '<tr>' + keys.map(function(k){
        var v = r[k];
        if (k==='Status'||k==='Method') return '<td>' + F.badge(v) + '</td>';
        if (typeof v==='number' && /earn|revenue|fare|spent|amount/i.test(k)) return '<td>' + F.money(v) + '</td>';
        return '<td style="font-size:11px">' + (v!=null?v:'<span style="color:var(--tx3)">NULL</span>') + '</td>';
      }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'
    : '<div class="table-empty">No rows returned.</div>');
};

function V_Views() {
  var VWS = [
    { n:'vw_ride_details',    d:'Full ride info — all IDs resolved to names (7-table JOIN)',    fn:'rideDetails' },
    { n:'vw_driver_summary',  d:'Driver KPIs: rides, earnings, avg rating — sorted by rating', fn:'driverSummary' },
    { n:'vw_user_activity',   d:'Per-user spending and rating summary',                         fn:'userActivity' },
    { n:'vw_revenue_by_city', d:'City-level revenue aggregation — GROUP BY City',               fn:'revByCity' },
    { n:'vw_payment_overview',d:'Payment ledger with passenger names resolved',                 fn:'payOverview' },
    { n:'vw_active_promos',   d:'Promo codes WHERE ExpiryDate > GETDATE()',                     fn:'activePromos' },
    { n:'vw_top_drivers',     d:'Drivers WHERE Rating >= 4.5 — sorted by rating descending',   fn:'topDrivers' },
    { n:'vw_pending_rides',   d:'Active rides awaiting completion',                             fn:'pendingRides' },
  ];
  return vhdr('8 SQL Views', 'Click Run to execute any view live against the engine') +
    '<div class="view-list">' + VWS.map(function(v) {
      return '<div class="view-item" id="vwi-' + v.fn + '">' +
        '<div class="view-item-header" onclick="runView(\'' + v.fn + '\')">' +
        '<div style="flex:1"><div class="view-item-name">' + v.n + '</div><div class="view-item-desc">' + v.d + '</div></div>' +
        '<button class="run-btn">Run</button></div>' +
        '<div class="view-item-body" id="vwb-' + v.fn + '"></div></div>';
    }).join('') + '</div>';
}

window.runView = function(fn) {
  var card = document.getElementById('vwi-' + fn);
  var body = document.getElementById('vwb-' + fn);
  if (!card || !body) return;
  card.classList.toggle('open');
  if (!card.classList.contains('open')) { body.innerHTML = ''; return; }
  var FNS = {
    rideDetails:VIEW.vw_ride_details, driverSummary:VIEW.vw_driver_summary,
    userActivity:VIEW.vw_user_activity, revByCity:VIEW.vw_revenue_by_city,
    payOverview:VIEW.vw_payment_overview, activePromos:VIEW.vw_active_promos,
    topDrivers:VIEW.vw_top_drivers, pendingRides:VIEW.vw_pending_rides,
  };
  var data = FNS[fn]();
  sqlFire('sql', 'SELECT * FROM ' + fn);
  var keys = data.length ? Object.keys(data[0]).filter(function(k){ return k!=='_r'; }) : [];
  body.innerHTML = data.length ? '<div class="table-wrap"><table class="data-table"><thead><tr>' + keys.map(function(k){ return '<th>'+k+'</th>'; }).join('') + '</tr></thead><tbody>' +
    data.slice(0,30).map(function(r){ return '<tr>' + keys.map(function(k){
      var v = r[k];
      if (k==='Status'||k==='Method') return '<td>' + F.badge(v) + '</td>';
      if (typeof v==='number' && /earn|revenue|fare|spent|amount/i.test(k)) return '<td>' + F.money(v) + '</td>';
      return '<td style="font-size:11px">' + (v!=null?v:'<span style="color:var(--tx3)">NULL</span>') + '</td>';
    }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'
    : '<div class="table-empty">No rows.</div>';
};

function V_Indexes() {
  var IDXS = [
    {n:'idx_rides_user',      t:'rides',     c:'UserID',         u:'Passenger ride history',         q:'sp_get_user_rides · Q23'},
    {n:'idx_rides_driver',    t:'rides',     c:'DriverID',       u:'Driver earnings & dashboard',    q:'sp_driver_earnings · Q16'},
    {n:'idx_rides_status',    t:'rides',     c:'Status',         u:'Filter by ride status',          q:'Q1 · Q6 · Q24'},
    {n:'idx_rides_starttime', t:'rides',     c:'StartTime',      u:'Monthly revenue reports',        q:'sp_monthly_revenue'},
    {n:'idx_rides_drv_status',t:'rides',     c:'DriverID, Status','u':'Composite: driver dispatch',  q:'vw_pending_rides'},
    {n:'idx_rides_fare',      t:'rides',     c:'Fare',           u:'Revenue aggregation',            q:'Q3 · Q25'},
    {n:'idx_rides_startloc',  t:'rides',     c:'StartLocationID',u:'City revenue grouping',          q:'Q12 · Q17'},
    {n:'idx_rides_endloc',    t:'rides',     c:'EndLocationID',  u:'Destination analysis',           q:'Q12'},
    {n:'idx_payments_status', t:'payments',  c:'Status',         u:'Filter payment status',          q:'Q7 · Q30'},
    {n:'idx_payments_ride',   t:'payments',  c:'RideID',         u:'Payment per ride JOIN',          q:'Q15 · BR-3'},
    {n:'idx_ratings_ride',    t:'ratings',   c:'RideID (UNIQUE)',u:'UNIQUE enforcement — one rating/ride',q:'BR-4'},
    {n:'idx_vehicles_driver', t:'vehicles',  c:'DriverID',       u:"Find driver's vehicle",          q:'Q13 · sp_available_drivers'},
    {n:'idx_drivers_status',  t:'drivers',   c:'Status',         u:'Find available drivers',         q:'Q2 · sp_available_drivers'},
    {n:'idx_promo_expiry',    t:'promocodes',c:'ExpiryDate',     u:'Real-time promo validation',     q:'Q5 · sp_apply_promo'},
    {n:'idx_locations_city',  t:'locations', c:'City',           u:'Filter locations by city',       q:'Q17'},
  ];
  return vhdr('15 Non-Clustered Indexes', 'All indexes from ride_sharing.sql — each actively used by queries, procedures, or triggers') +
    buildCard('Index Catalog', '15 non-clustered indexes', '<div class="table-wrap"><table class="index-table"><thead><tr><th>Index Name</th><th>Table</th><th>Column(s)</th><th>Optimises</th><th>Used In</th></tr></thead><tbody>' +
      IDXS.map(function(i){ return '<tr><td>' + F.mono(i.n) + '</td><td><span class="badge badge-blue">'+i.t+'</span></td><td>' + F.mono(i.c) + '</td><td style="font-size:11px;color:var(--tx2)">' + i.u + '</td><td style="font-size:11px;color:var(--tx3)">' + i.q + '</td></tr>'; }).join('') +
      '</tbody></table></div>', '8 indexes on rides (highest-traffic table) · 1 composite index (DriverID, Status) · idx_ratings_ride enforces UNIQUE');
}

// ═══════════════════════════════════════════════════════════════
// DBA VIEWS
// ═══════════════════════════════════════════════════════════════
function V_dbaDash() {
  var rev = E.rides.filter(function(r){return r.status==='Completed';}).reduce(function(s,r){return s+r.fare;},0);
  var city = VIEW.vw_revenue_by_city();
  var CC = {'New York':'#3d5a80','Chicago':'#2d6a4f','Los Angeles':'#92400e','San Francisco':'#1e40af'};
  return vhdr('DBA Dashboard', 'ride_dba — db_owner — full database control') +
    kpiGrid([
      ['pay',   '$'+rev.toFixed(2),   'Total Revenue',  '#eaf4ef','#2d6a4f'],
      ['rides', E.rides.length,       'Total Rides',    '#eef2f7','#3d5a80'],
      ['users', E.drivers.length,     'Drivers',        '#fef3c7','#92400e'],
      ['user',  E.users.length,       'Users',          '#eef2f7','#3d5a80'],
    ]) +
    '<div class="grid-2">' +
    buildCard('Revenue by City','vw_revenue_by_city','<div class="card-body">'+barChart(city.map(function(c){return [c.City,c.TotalRevenue,CC[c.City]||'#3d5a80','$'+c.TotalRevenue];}))+'\</div>') +
    buildCard('Driver Status','BR-6 sets Busy · BR-7 sets Available','<div class="card-body">'+barChart([
      ['Available',IDX.drivers_status('Available').length,'#2d6a4f',IDX.drivers_status('Available').length+' drivers'],
      ['Busy',IDX.drivers_status('Busy').length,'#92400e',IDX.drivers_status('Busy').length+' drivers'],
      ['Offline',E.drivers.filter(function(d){return d.status==='Offline';}).length,'#6b7280',E.drivers.filter(function(d){return d.status==='Offline';}).length+' drivers'],
    ])+'\</div>') + '</div>' +
    actionBar(btn('btn-primary','Insert Ride','mBookRide()') + btn('btn-secondary','Register User','mRegisterUser()') + btn('btn-secondary','Complete Ride','mCompleteAny()') + btn('btn-danger','Test BR-2 Delete','mDeleteRide()'));
}

function V_dbaRides() {
  var rows = VIEW.vw_ride_details();
  return vhdr('All Rides', 'vw_ride_details · DELETE triggers trg_prevent_delete_completed (BR-2) on Completed rows') +
    actionBar(btn('btn-primary','Insert Ride','mBookRide()') + btn('btn-secondary','Complete','mCompleteAny()') + btn('btn-secondary','Cancel','mCancelAny()')) +
    buildCard('vw_ride_details', rows.length + ' records', buildTable([
      { h:'ID',       r:function(r){ return F.id(r.RideID); } },
      { h:'Passenger',k:'UserName', s:'font-weight:500;font-size:12px' },
      { h:'Driver',   k:'DriverName', s:'font-size:12px' },
      { h:'City',     k:'City', s:'font-size:11px;color:var(--tx3)' },
      { h:'Duration', r:function(r){ return F.dur(r.DurationMin); } },
      { h:'Fare',     r:function(r){ return F.money(r.Fare); } },
      { h:'Status',   r:function(r){ return F.badge(r.Status); } },
      { h:'',         r:function(r){ return '<button class="tbtn tbtn-red" onclick="dbaDeleteRide('+r._r.id+')" title="DELETE — BR-2 fires if Completed">Delete</button>'; } },
    ], rows, 'Try deleting a Completed ride — trg_prevent_delete_completed (BR-2) issues ROLLBACK TRANSACTION'));
}
window.dbaDeleteRide = function(id) {
  if (confirm('DELETE rides WHERE RideID=' + id + '?\n\nIf Status=\'Completed\' → trg_prevent_delete_completed (BR-2) fires ROLLBACK TRANSACTION.\nThis is the only way to demo this trigger.')) {
    handleResult(DML.deleteRide(id));
  }
};

function V_dbaDrvs() {
  return vhdr('All Drivers', 'vw_driver_summary — Rating auto-updated by BR-4 · Status managed by BR-6 and BR-7') +
    buildCard('vw_driver_summary', E.drivers.length + ' drivers', buildTable([
      { h:'Driver',   k:'DriverName', s:'font-weight:500' },
      { h:'Licence',  r:function(r){ return F.mono(r.LicenseNumber); } },
      { h:'Rating',   r:function(r){ return F.stars(Math.round(r.Rating)) + ' <small>'+r.Rating+'</small>'; } },
      { h:'Status',   r:function(r){ return F.badge(r.Status); } },
      { h:'Rides',    k:'TotalRides' },
      { h:'Earned',   r:function(r){ return F.money(r.TotalEarnings); } },
    ], VIEW.vw_driver_summary()));
}

function V_dbaUsrs() {
  return vhdr('All Users', 'users table · sp_register_user · UNIQUE(Email) · SCOPE_IDENTITY()') +
    actionBar(btn('btn-primary','Register New User','mRegisterUser()')) +
    buildCard('users', E.users.length + ' records', buildTable([
      { h:'ID',    r:function(u){ return F.id(u.id); } },
      { h:'Name',  r:function(u){ return '<strong>'+u.first+' '+u.last+'</strong>'; } },
      { h:'Email', k:'email', s:'font-size:11px;color:var(--tx3)' },
      { h:'Phone', r:function(u){ return u.phone||F.nil(); }, s:'font-size:11px;color:var(--tx3)' },
      { h:'Registered', k:'reg', s:'font-size:11px;color:var(--tx3)' },
    ], E.users, 'UNIQUE(Email) · CHECK(Email LIKE \'%@%.%\') · DEFAULT RegistrationDate=GETDATE() · SCOPE_IDENTITY() returns NewUserID'));
}

function V_dbaPays() {
  var rows = VIEW.vw_payment_overview();
  return vhdr('All Payments', 'INSERT INTO payments → trg_validate_payment_ride (BR-3) — try a Cancelled ride') +
    actionBar(btn('btn-primary','Insert Payment','mPayment()')) +
    buildCard('vw_payment_overview', rows.length + ' records', buildTable([
      { h:'ID',       r:function(p){ return F.id(p.PaymentID); } },
      { h:'Ride',     r:function(p){ return F.id(p.RideID); } },
      { h:'Passenger',k:'UserName', s:'font-size:12px' },
      { h:'Amount',   r:function(p){ return F.money(p.Amount); } },
      { h:'Method',   r:function(p){ return F.badge(p.Method); } },
      { h:'Date',     k:'PaymentDate', s:'font-size:11px;color:var(--tx3)' },
      { h:'Status',   r:function(p){ return F.badge(p.Status); } },
    ], rows, 'Select a Cancelled ride when inserting to see BR-3 block it'));
}

function V_dbaSchema() {
  var tables = [
    {n:'users',     rows:E.users.length,    cols:[{c:'UserID INT',t:'PK IDENTITY'},{c:'FirstName / LastName',t:'NOT NULL'},{c:'Email',t:'UNIQUE · CHK(format)'},{c:'Phone',t:'NULL'},{c:'RegistrationDate',t:'DEFAULT GETDATE()'}]},
    {n:'drivers',   rows:E.drivers.length,  cols:[{c:'DriverID INT',t:'PK IDENTITY'},{c:'FirstName / LastName',t:'NOT NULL'},{c:'LicenseNumber',t:'UNIQUE NOT NULL'},{c:'Rating FLOAT',t:'CHK(0-5) · DEFAULT 0'},{c:'Status',t:"CHK('Available','Busy','Offline')"}]},
    {n:'vehicles',  rows:E.vehicles.length, cols:[{c:'VehicleID INT',t:'PK IDENTITY'},{c:'DriverID',t:'FK → drivers CASCADE'},{c:'PlateNumber',t:'UNIQUE NOT NULL'},{c:'Year INT',t:'CHK(1990-2030)'},{c:'Capacity INT',t:'CHK(1-20)'}]},
    {n:'locations', rows:E.locations.length,cols:[{c:'LocationID INT',t:'PK IDENTITY'},{c:'Name',t:'NOT NULL'},{c:'City',t:'NOT NULL'}]},
    {n:'promocodes',rows:E.promos.length,   cols:[{c:'PromoID INT',t:'PK IDENTITY'},{c:'Code',t:'UNIQUE NOT NULL'},{c:'Discount FLOAT',t:'CHK(0-100)'},{c:'ExpiryDate',t:'NOT NULL'}]},
    {n:'rides',     rows:E.rides.length,    cols:[{c:'RideID INT',t:'PK IDENTITY'},{c:'UserID / DriverID',t:'FK → users / drivers'},{c:'VehicleID / LocationIDs',t:'FK → vehicles / locations'},{c:'Fare FLOAT',t:'CHK(≥ 0)'},{c:'Status',t:"CHK('Pending','Completed','Cancelled')"},{c:'RideDuration INT',t:'DERIVED by BR-5'},{c:'PromoID',t:'FK → promocodes NULL'}]},
    {n:'payments',  rows:E.payments.length, cols:[{c:'PaymentID INT',t:'PK IDENTITY'},{c:'RideID',t:'FK → rides CASCADE'},{c:'Amount FLOAT',t:'CHK(≥ 0)'},{c:'Method',t:"CHK('Cash','Card','Online')"},{c:'Status',t:"CHK('Paid','Pending','Failed')"}]},
    {n:'ratings',   rows:E.ratings.length,  cols:[{c:'RatingID INT',t:'PK IDENTITY'},{c:'RideID',t:'FK + UNIQUE → rides CASCADE'},{c:'DriverRating INT',t:'NOT NULL · CHK(1-5)'},{c:'UserRating INT',t:'NULL · CHK(1-5)'},{c:'Comment',t:'NULL'}]},
  ];
  return vhdr('Database Schema', '8 tables · 10 FK constraints · 12 CHECK · 6 UNIQUE · 8 DEFAULT · Full 3NF') +
    '<div class="schema-grid">' + tables.map(function(t){
      return '<div class="schema-table"><div class="schema-table-header"><span class="schema-table-name">'+t.n+'</span><span class="schema-table-rows">'+t.rows+' rows</span></div>' +
        t.cols.map(function(c){ return '<div class="schema-col"><span class="schema-col-name">'+c.c+'</span><span class="schema-col-type">'+c.t+'</span></div>'; }).join('') + '</div>';
    }).join('') + '</div>';
}

function V_dbaTrg() {
  var trgs = [
    {n:'trg_no_concurrent_rides',    t:'rides',    ev:'INSTEAD OF INSERT',br:'BR-1',col:'#92400e',bg:'#fef3c7',
     desc:'Blocks INSERT if the user already has a Pending ride. Fires before the storage engine — the row never reaches the table.',
     sql:'CREATE TRIGGER trg_no_concurrent_rides ON rides\nINSTEAD OF INSERT AS\nBEGIN\n  SET NOCOUNT ON;\n  IF EXISTS (\n    SELECT 1 FROM rides r\n    JOIN inserted i ON r.UserID = i.UserID\n    WHERE r.Status = \'Pending\'\n  )\n  BEGIN\n    RAISERROR(\'User already has an active pending ride.\', 16, 1);\n    RETURN;\n  END;\n  INSERT INTO rides\n    (UserID,DriverID,VehicleID,StartLocationID,EndLocationID,\n     StartTime,EndTime,Fare,Status,RideDuration,PromoID)\n  SELECT\n    UserID,DriverID,VehicleID,StartLocationID,EndLocationID,\n    StartTime,EndTime,Fare,Status,RideDuration,PromoID\n  FROM inserted;\nEND',
     testFn:'mBookRide()', testLabel:'Test — Book a Ride'},
    {n:'trg_prevent_delete_completed',t:'rides',  ev:'AFTER DELETE',      br:'BR-2',col:'#9b1c1c',bg:'#fef2f2',
     desc:'Issues RAISERROR + ROLLBACK TRANSACTION if any Completed ride is in the deleted set. Protects the financial audit trail.',
     sql:'CREATE TRIGGER trg_prevent_delete_completed ON rides\nAFTER DELETE AS\nBEGIN\n  SET NOCOUNT ON;\n  IF EXISTS (SELECT 1 FROM deleted WHERE Status = \'Completed\')\n  BEGIN\n    RAISERROR(\'Completed rides cannot be deleted.\', 16, 1);\n    ROLLBACK TRANSACTION;\n  END;\nEND',
     testFn:'mDeleteRide()', testLabel:'Test — Delete a Ride'},
    {n:'trg_validate_payment_ride',  t:'payments', ev:'INSTEAD OF INSERT',br:'BR-3',col:'#92400e',bg:'#fef3c7',
     desc:'Blocks payment INSERT if the ride is Cancelled. Fires before write — completely prevents the INSERT.',
     sql:'CREATE TRIGGER trg_validate_payment_ride ON payments\nINSTEAD OF INSERT AS\nBEGIN\n  SET NOCOUNT ON;\n  IF EXISTS (\n    SELECT 1 FROM inserted i\n    JOIN rides r ON i.RideID = r.RideID\n    WHERE r.Status = \'Cancelled\'\n  )\n  BEGIN\n    RAISERROR(\'Cannot process payment for a cancelled ride.\', 16, 1);\n    RETURN;\n  END;\n  INSERT INTO payments (RideID,Amount,Method,PaymentDate,Status)\n  SELECT RideID,Amount,Method,PaymentDate,Status FROM inserted;\nEND',
     testFn:'mPayment()', testLabel:'Test — Insert Payment'},
    {n:'trg_update_driver_rating',   t:'ratings',  ev:'AFTER INSERT',     br:'BR-4',col:'#2d6a4f',bg:'#eaf4ef',
     desc:'Recalculates driver.Rating = ROUND(AVG(DriverRating), 2) over all rides for that driver after every new rating.',
     sql:'CREATE TRIGGER trg_update_driver_rating ON ratings\nAFTER INSERT AS\nBEGIN\n  SET NOCOUNT ON;\n  UPDATE drivers\n  SET Rating = (\n    SELECT ROUND(AVG(CAST(ra.DriverRating AS FLOAT)), 2)\n    FROM ratings ra\n    JOIN rides r ON ra.RideID = r.RideID\n    WHERE r.DriverID = drivers.DriverID\n  )\n  WHERE DriverID IN (\n    SELECT r.DriverID FROM inserted i\n    JOIN rides r ON i.RideID = r.RideID\n  );\nEND',
     testFn:'mRateRide()', testLabel:'Test — Submit Rating'},
    {n:'trg_calc_duration',          t:'rides',    ev:'AFTER UPDATE',     br:'BR-5',col:'#1e40af',bg:'#eff6ff',
     desc:'Sets RideDuration = DATEDIFF(MINUTE, StartTime, EndTime) when EndTime is written during ride completion.',
     sql:'CREATE TRIGGER trg_calc_duration ON rides\nAFTER UPDATE AS\nBEGIN\n  SET NOCOUNT ON;\n  UPDATE rides\n  SET RideDuration = DATEDIFF(MINUTE, i.StartTime, i.EndTime)\n  FROM rides r\n  JOIN inserted i ON r.RideID = i.RideID\n  WHERE i.EndTime IS NOT NULL;\nEND',
     testFn:'mCompleteAny()', testLabel:'Test — Complete a Ride'},
    {n:'trg_driver_busy_on_ride',    t:'rides',    ev:'AFTER INSERT',     br:'BR-6',col:'#5b21b6',bg:'#f5f3ff',
     desc:"Sets driver.Status = 'Busy' automatically when a new Pending ride is inserted. No manual update needed.",
     sql:'CREATE TRIGGER trg_driver_busy_on_ride ON rides\nAFTER INSERT AS\nBEGIN\n  SET NOCOUNT ON;\n  UPDATE drivers\n  SET Status = \'Busy\'\n  FROM drivers d\n  JOIN inserted i ON d.DriverID = i.DriverID\n  WHERE i.Status = \'Pending\';\nEND',
     testFn:'mBookRide()', testLabel:'Test — Book a Ride'},
    {n:'trg_driver_available_on_complete',t:'rides',ev:'AFTER UPDATE',    br:'BR-7',col:'#2d6a4f',bg:'#eaf4ef',
     desc:"Resets driver.Status = 'Available' when a ride transitions from Pending to Completed or Cancelled.",
     sql:'CREATE TRIGGER trg_driver_available_on_complete ON rides\nAFTER UPDATE AS\nBEGIN\n  SET NOCOUNT ON;\n  UPDATE drivers\n  SET Status = \'Available\'\n  FROM drivers d\n  JOIN inserted i  ON d.DriverID = i.DriverID\n  JOIN deleted  dl ON i.RideID   = dl.RideID\n  WHERE i.Status  IN (\'Completed\', \'Cancelled\')\n    AND dl.Status = \'Pending\';\nEND',
     testFn:'mCompleteAny()', testLabel:'Test — Complete or Cancel'},
  ];
  var ioTrgs  = trgs.filter(function(t){ return t.ev.includes('INSTEAD'); });
  var aftTrgs = trgs.filter(function(t){ return !t.ev.includes('INSTEAD'); });
  return vhdr('7 Triggers', 'All business rules enforced at the SQL Server engine level — expand any trigger to see its T-SQL') +
    '<div class="why-box"><strong>Why INSTEAD OF for BR-1 and BR-3?</strong> AFTER triggers fire after the row is already stored — too late to prevent it. INSTEAD OF fires before the storage engine writes anything, so the INSERT can be blocked entirely via RAISERROR + RETURN.<br><br><strong>Why AFTER DELETE + ROLLBACK for BR-2?</strong> SQL Server prohibits INSTEAD OF DELETE on tables with CASCADE FK children. AFTER DELETE + ROLLBACK TRANSACTION achieves the same result atomically.</div>' +
    '<div class="grid-2"><div><div class="trigger-type-label">INSTEAD OF Triggers — ' + ioTrgs.length + '</div>' + ioTrgs.map(trgCard).join('') + '</div>' +
    '<div><div class="trigger-type-label">AFTER Triggers — ' + aftTrgs.length + '</div>' + aftTrgs.map(trgCard).join('') + '</div></div>';
}

function trgCard(t) {
  var id = 'trgc-' + t.n;
  return '<div class="trigger-card" id="' + id + '">' +
    '<div class="trigger-header" onclick="xToggle(\'' + id + '\')">' +
    '<span class="trigger-br" style="background:' + t.bg + ';color:' + t.col + '">' + t.br + '</span>' +
    '<div style="flex:1;min-width:0"><div class="trigger-name">' + t.n + '</div>' +
    '<div class="trigger-event">' + t.ev + ' ON ' + t.t + '</div>' +
    '<div class="trigger-desc">' + t.desc + '</div></div>' +
    '<span class="chevron">&#8964;</span></div>' +
    '<div class="trigger-body"><div class="code-block"><pre>' + t.sql + '</pre></div>' +
    '<div class="action-bar" style="margin-top:10px"><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();' + t.testFn + '">' + t.testLabel + '</button></div>' +
    '</div></div>';
}

function V_dbaProc() {
  var procs = [
    {n:'sp_get_user_rides',     p:'@UserID INT',              ret:'vw_ride_details rows for user',   idx:'idx_rides_user',          d:'Index seek on UserID — all rides for a passenger.',           fn:'mGetUserRides'},
    {n:'sp_available_drivers',  p:'@City VARCHAR(50) = NULL', ret:'Available drivers + vehicle info', idx:'idx_drivers_status + idx_vehicles_driver',d:'Returns all Available drivers with their vehicle.',fn:'mAvailDrivers'},
    {n:'sp_complete_ride',      p:'@RideID, @EndTime, @Fare', ret:'Confirmation — fires BR-5, BR-7',  idx:'—',                       d:'Marks ride Completed. Two triggers fire automatically.',      fn:'mCompleteAny'},
    {n:'sp_apply_promo',        p:'@RideID, @PromoID, @NewFare OUTPUT',ret:'OUTPUT @NewFare',         idx:'idx_promo_expiry',        d:'Validates expiry, computes Fare×(1−Discount/100), updates row.',fn:'mApplyPromo'},
    {n:'sp_monthly_revenue',    p:'@Year INT, @Month INT',    ret:'TotalRides, Revenue, Avg, Min, Max',idx:'idx_rides_starttime',    d:'Date-range aggregate via idx_rides_starttime.',               fn:'mMonthly'},
    {n:'sp_driver_earnings',    p:'@DriverID, @StartDate, @EndDate',ret:'DriverName, Rides, Earnings',idx:'idx_rides_driver',        d:'Earnings over a date range via idx_rides_driver.',            fn:'mDriverEarnings'},
    {n:'sp_register_user',      p:'@First, @Last, @Email, @Phone',ret:'NewUserID (SCOPE_IDENTITY())', idx:'UNIQUE(Email)',           d:'INSERT + UNIQUE(Email) + CHECK(format). Returns generated ID.',fn:'mRegisterUser'},
    {n:'sp_cancel_ride',        p:'@RideID, @RowsUpdated OUTPUT',ret:'OUTPUT @RowsUpdated',           idx:'—',                       d:'Cancels Pending ride. BR-7 fires. Returns RowsUpdated.',      fn:'mCancelAny'},
  ];
  return vhdr('8 Stored Procedures', 'Expand any procedure and click Execute to run it live with real parameters') +
    '<div class="proc-grid">' + procs.map(function(p) {
      var id = 'prc-' + p.n;
      return '<div class="proc-card" id="' + id + '">' +
        '<div class="proc-header" onclick="xToggle(\'' + id + '\')">' +
        '<span class="proc-name">' + p.n + '</span><span class="chevron">&#8964;</span></div>' +
        '<div class="proc-body"><div class="proc-meta">' +
        '<div class="proc-meta-row"><span class="pm-label">Params</span><span class="pm-val">' + p.p + '</span></div>' +
        '<div class="proc-meta-row"><span class="pm-label">Returns</span><span class="pm-val">' + p.ret + '</span></div>' +
        '<div class="proc-meta-row"><span class="pm-label">Index</span><span class="pm-val">' + F.mono(p.idx) + '</span></div>' +
        '<div class="proc-meta-row"><span class="pm-label">Note</span><span class="pm-val">' + p.d + '</span></div>' +
        '</div><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();' + p.fn + '()">Execute ' + p.n + '</button></div></div>';
    }).join('') + '</div>';
}

function V_dbaDCL() {
  var roles = [
    {login:'ride_app',    role:'Standard User',   col:'#3d5a80', topCol:'#3d5a80',
     grant:'SELECT, INSERT, UPDATE on SCHEMA::dbo', deny:'DELETE on SCHEMA::dbo',
     note:'Backend app layer. DENY DELETE prevents mass deletions and SQL injection damage.',
     sql:'GRANT SELECT, INSERT, UPDATE ON SCHEMA::dbo TO ride_app;\nDENY  DELETE               ON SCHEMA::dbo TO ride_app;'},
    {login:'ride_report', role:'Read-Only Analyst',col:'#92400e', topCol:'#92400e',
     grant:'SELECT on SCHEMA::dbo', deny:'INSERT, UPDATE, DELETE (not granted)',
     note:'BI dashboards and exports. True read-only isolation — cannot modify anything.',
     sql:'GRANT SELECT ON SCHEMA::dbo TO ride_report;'},
    {login:'ride_dba',    role:'DBA / db_owner',  col:'#2d6a4f', topCol:'#2d6a4f',
     grant:'db_owner (all permissions)', deny:'None — full control',
     note:'Database maintenance, schema changes, deployment. Full db_owner membership.',
     sql:'ALTER ROLE db_owner ADD MEMBER ride_dba;'},
  ];
  return vhdr('Access Control (DCL)', '3 logins · GRANT · DENY · db_owner · Principle of Least Privilege') +
    '<div class="dcl-grid">' + roles.map(function(r) {
      return '<div class="dcl-card"><div class="dcl-top" style="background:' + r.topCol + '"></div><div class="dcl-body">' +
        '<div class="dcl-login" style="color:' + r.col + '">' + r.login + '</div>' +
        '<div class="dcl-role">' + r.role + '</div>' +
        '<div class="dcl-row"><span class="dcl-key">GRANT</span><span class="dcl-val" style="color:var(--green)">' + r.grant + '</span></div>' +
        '<div class="dcl-row"><span class="dcl-key">DENY</span><span class="dcl-val" style="color:var(--red)">' + r.deny + '</span></div>' +
        '<div class="dcl-row"><span class="dcl-key">Use</span><span class="dcl-val">' + r.note + '</span></div>' +
        '<div class="code-block" style="margin-top:12px"><pre>' + r.sql + '</pre></div>' +
        '</div></div>';
    }).join('') + '</div>' +
    '<div style="margin-top:16px">' + buildCard('Verify in SSMS', 'Run after executing ride_sharing.sql',
      '<div class="card-body"><div class="code-block"><pre>SELECT dp.name AS LoginName, p.permission_name, p.state_desc\nFROM   sys.database_permissions p\nJOIN   sys.database_principals  dp ON p.grantee_principal_id = dp.principal_id\nWHERE  dp.name IN (\'ride_app\', \'ride_report\', \'ride_dba\')\nORDER  BY dp.name, p.permission_name;</pre></div></div>') + '</div>';
}

// ── Toggle helper ─────────────────────────────────────────────
window.xToggle = function(id) { var e = document.getElementById(id); if (e) e.classList.toggle('open'); };

// ═══════════════════════════════════════════════════════════════
// ACTION MODALS
// ═══════════════════════════════════════════════════════════════
window.mBookRide = function(preDid) {
  var av = opts.avail();
  if (!av.length) { toast('info', 'No available drivers', 'All drivers are currently Busy or Offline.'); return; }
  openModal('<div class="modal-header"><div class="modal-title">Book a Ride</div>' +
    '<div class="modal-subtitle">Triggers: BR-1 checks for duplicate pending rides · BR-6 sets driver status to Busy after INSERT</div></div>' +
    '<div class="modal-body">' +
    formGroup('Passenger', selOpts('m-uid', opts.users())) +
    formGroup('Driver', selOpts('m-did', av, '— Select an available driver —')) +
    formGroup('From Location', selOpts('m-sl', opts.locs())) +
    formGroup('To Location', selOpts('m-el', opts.locs())) +
    formGroup('Estimated Fare ($)', inp('m-fare','number','22.50'), 'CHECK(Fare >= 0) constraint enforced') +
    formGroup('Promo Code (optional)', selOpts('m-promo', opts.promos(), '— None —')) +
    trigNote('trg_no_concurrent_rides (BR-1) — INSTEAD OF INSERT — fires before the row is written, RAISERROR if user has a Pending ride') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary', 'INSERT INTO rides', 'execBookRide()') + '</div>');
  if (preDid) { setTimeout(function(){ var s=$('m-did'); if(s)s.value=preDid; },0); }
};
window.execBookRide = function() {
  var uid=+$('m-uid').value, did=+$('m-did').value, sl=+$('m-sl').value, el=+$('m-el').value;
  var fare=+$('m-fare').value, promo=$('m-promo').value?+$('m-promo').value:null;
  if (!did) { toast('error','Select a driver',''); return; }
  handleResult(DML.insertRide(uid,did,sl,el,fare,promo));
};

window.mCompleteRide = function(rid, fare) {
  openModal('<div class="modal-header"><div class="modal-title">Complete Ride</div>' +
    '<div class="modal-subtitle">Triggers: BR-5 calculates RideDuration · BR-7 resets driver status to Available</div></div>' +
    '<div class="modal-body">' +
    formGroup('Ride ID', inp('m-crid','text',rid,''), '') +
    formGroup('Final Fare ($)', inp('m-cfar','number',fare||'22.50')) +
    trigNote('trg_calc_duration (BR-5) auto-sets RideDuration = DATEDIFF(MINUTE, StartTime, EndTime) · trg_driver_available_on_complete (BR-7) resets driver.Status') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-success','EXEC sp_complete_ride','execCompleteRide()') + '</div>');
  setTimeout(function(){ var i=$('m-crid'); if(i)i.setAttribute('readonly',''); },0);
};
window.execCompleteRide = function() {
  var now = new Date().toISOString().replace('T',' ').slice(0,16);
  handleResult(SP.complete_ride(+$('m-crid').value, now, +$('m-cfar').value));
};

window.mCompleteAny = function() {
  var p = opts.pending();
  if (!p.length) { toast('info','No pending rides',''); return; }
  openModal('<div class="modal-header"><div class="modal-title">Complete a Ride</div>' +
    '<div class="modal-subtitle">Triggers: BR-5 trg_calc_duration · BR-7 trg_driver_available_on_complete</div></div>' +
    '<div class="modal-body">' +
    formGroup('Pending Ride', selOpts('m-crid2', p, '— Select —')) +
    formGroup('Final Fare ($)', inp('m-cfar2','number','22.50')) +
    trigNote('Both BR-5 and BR-7 fire automatically after this UPDATE') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-success','EXEC sp_complete_ride','execCompleteAny()') + '</div>');
};
window.execCompleteAny = function() {
  var rid=+$('m-crid2').value; if(!rid){toast('error','Select a ride','');return;}
  var now=new Date().toISOString().replace('T',' ').slice(0,16);
  handleResult(SP.complete_ride(rid, now, +$('m-cfar2').value));
};

window.mCancelRide = function(rid) {
  openModal('<div class="modal-header"><div class="modal-title">Cancel Ride</div>' +
    '<div class="modal-subtitle">Trigger: BR-7 trg_driver_available_on_complete fires · @RowsUpdated OUTPUT</div></div>' +
    '<div class="modal-body">' +
    formGroup('Ride ID', inp('m-xrid','text',rid,''), '') +
    trigNote('trg_driver_available_on_complete (BR-7) resets driver.Status = \'Available\' automatically') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-danger','EXEC sp_cancel_ride','execCancelRide()') + '</div>');
  setTimeout(function(){ var i=$('m-xrid'); if(i)i.setAttribute('readonly',''); },0);
};
window.execCancelRide = function() { handleResult(SP.cancel_ride(+$('m-xrid').value)); };

window.mCancelAny = function() {
  var p = opts.pending();
  if (!p.length) { toast('info','No pending rides',''); return; }
  openModal('<div class="modal-header"><div class="modal-title">Cancel a Ride</div>' +
    '<div class="modal-subtitle">Trigger: BR-7 fires · @RowsUpdated OUTPUT returned</div></div>' +
    '<div class="modal-body">' +
    formGroup('Pending Ride', selOpts('m-xrid2', p, '— Select —')) +
    trigNote('BR-7 trg_driver_available_on_complete fires on AFTER UPDATE') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-danger','EXEC sp_cancel_ride','execCancelAny()') + '</div>');
};
window.execCancelAny = function() {
  var rid=+$('m-xrid2').value; if(!rid){toast('error','Select a ride','');return;}
  handleResult(SP.cancel_ride(rid));
};

window.mPayment = function() {
  var o = opts.noPay();
  openModal('<div class="modal-header"><div class="modal-title">Record Payment</div>' +
    '<div class="modal-subtitle">Trigger: BR-3 trg_validate_payment_ride — INSTEAD OF INSERT — try selecting a Cancelled ride!</div></div>' +
    '<div class="modal-body">' +
    formGroup('Ride (no payment yet)', selOpts('m-prid', o, '— Select ride —'), 'Select a Cancelled ride to test BR-3') +
    formGroup('Amount ($)', inp('m-pamt','number','22.50'), 'CHECK(Amount >= 0)') +
    formGroup('Payment Method', selOpts('m-pmth',[['Cash','Cash'],['Card','Card'],['Online','Online']]), "CHECK(Method IN 'Cash','Card','Online')") +
    trigNote('trg_validate_payment_ride (BR-3) — INSTEAD OF INSERT — fires before the row is written and blocks payment on Cancelled rides') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','INSERT INTO payments','execPayment()') + '</div>');
};
window.execPayment = function() {
  var rid=+$('m-prid').value; if(!rid){toast('error','Select a ride','');return;}
  handleResult(DML.insertPayment(rid, +$('m-pamt').value, $('m-pmth').value));
};

window.mRateRide = function(preRid) {
  var u = opts.unrated();
  if (!u.length) { toast('info','No unrated rides','All completed rides have been rated.'); return; }
  openModal('<div class="modal-header"><div class="modal-title">Rate a Ride</div>' +
    '<div class="modal-subtitle">Trigger: BR-4 trg_update_driver_rating fires · UNIQUE(RideID) enforced</div></div>' +
    '<div class="modal-body">' +
    formGroup('Completed Ride (unrated)', selOpts('m-rrid', u, '— Select —')) +
    formGroup('Driver Rating (1–5)', selOpts('m-rdr',[[5,'5 — Excellent'],[4,'4 — Good'],[3,'3 — Average'],[2,'2 — Below Average'],[1,'1 — Poor']]), 'NOT NULL — required') +
    formGroup('Your Rating (1–5)', selOpts('m-rur',[['','NULL — skip'],['5','5 — Excellent'],['4','4 — Good'],['3','3 — Average'],['2','2 — Below Average'],['1','1 — Poor']]), 'NULL allowed') +
    formGroup('Comment', inp('m-rcmt','text',''), 'Optional') +
    trigNote('trg_update_driver_rating (BR-4) — AFTER INSERT — recalculates Driver.Rating = ROUND(AVG(DriverRating),2) across all their rides') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','INSERT INTO ratings','execRate()') + '</div>');
  if (preRid) { setTimeout(function(){ var s=$('m-rrid'); if(s)s.value=preRid; },0); }
};
window.execRate = function() {
  var rid=+$('m-rrid').value; if(!rid){toast('error','Select a ride','');return;}
  var ur=$('m-rur').value?+$('m-rur').value:null;
  handleResult(DML.insertRating(rid, +$('m-rdr').value, ur, $('m-rcmt').value));
};

window.mApplyPromo = function(preRid, prePid) {
  var c=opts.completed(), p=opts.promos();
  if (!c.length) { toast('info','No completed rides',''); return; }
  if (!p.length) { toast('info','No active promo codes',''); return; }
  openModal('<div class="modal-header"><div class="modal-title">Apply Promo Code</div>' +
    '<div class="modal-subtitle">sp_apply_promo — validates idx_promo_expiry — OUTPUT @NewFare parameter</div></div>' +
    '<div class="modal-body">' +
    formGroup('Completed Ride', selOpts('m-aprid', c, '— Select —')) +
    formGroup('Promo Code', selOpts('m-appid', p, '— Select active code —')) +
    trigNote('Uses idx_promo_expiry to filter WHERE ExpiryDate > GETDATE() · Fare × (1 − Discount/100) · @NewFare OUTPUT') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','EXEC sp_apply_promo','execPromo()') +
    '<div id="promo-result" class="inline-result"></div></div>');
  if (preRid) { setTimeout(function(){ var s=$('m-aprid'); if(s)s.value=preRid; },0); }
  if (prePid) { setTimeout(function(){ var s=$('m-appid'); if(s)s.value=prePid; },0); }
};
window.execPromo = function() {
  var rid=+$('m-aprid').value, pid=+$('m-appid').value;
  if (!rid||!pid) { toast('error','Select both ride and promo',''); return; }
  var r = SP.apply_promo(rid, pid);
  if (r.ok) {
    toast('success','Promo Applied', r.msg);
    var el = $('promo-result');
    el.innerHTML = '@NewFare OUTPUT = <strong>$' + r.newFare.toFixed(2) + '</strong> (was $' + r.oldFare.toFixed(2) + ', code: ' + r.code + ', −' + r.discount + '%)';
    el.classList.add('show');
    rebuildCurrentView(); refreshMeta();
  } else toast('error','Blocked', r.msg);
};

window.mMonthly = function() {
  openModal('<div class="modal-header"><div class="modal-title">Monthly Revenue Report</div>' +
    '<div class="modal-subtitle">sp_monthly_revenue — uses idx_rides_starttime index</div></div>' +
    '<div class="modal-body">' +
    formGroup('Year', inp('m-ry','number','2024')) +
    formGroup('Month', selOpts('m-rm',[[1,'January'],[2,'February'],[3,'March'],[4,'April'],[5,'May'],[6,'June']])) + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','EXEC sp_monthly_revenue','execMonthly()') +
    '<div id="rev-result" style="margin-top:8px"></div></div>');
};
window.execMonthly = function() {
  var r = SP.monthly_revenue(+$('m-ry').value, +$('m-rm').value);
  var el = $('rev-result');
  if (r.empty) { el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px 0">No completed rides for that period.</div>'; return; }
  el.innerHTML='<table class="data-table"><thead><tr><th>Rides</th><th>Revenue</th><th>Avg</th><th>Min</th><th>Max</th></tr></thead><tbody><tr><td>'+r.res.TotalRides+'</td><td>$'+r.res.TotalRevenue+'</td><td>$'+r.res.AvgFare+'</td><td>$'+r.res.MinFare+'</td><td>$'+r.res.MaxFare+'</td></tr></tbody></table>';
  toast('success','sp_monthly_revenue', r.res.TotalRides + ' rides · $' + r.res.TotalRevenue);
};

window.mDriverEarnings = function() {
  openModal('<div class="modal-header"><div class="modal-title">Driver Earnings Report</div>' +
    '<div class="modal-subtitle">sp_driver_earnings — uses idx_rides_driver index</div></div>' +
    '<div class="modal-body">' +
    formGroup('Driver', selOpts('m-deid', opts.drivers())) +
    formGroup('Start Date', inp('m-des','date','2024-01-01')) +
    formGroup('End Date',   inp('m-dee','date','2024-12-31')) + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','EXEC sp_driver_earnings','execDriverEarn()') +
    '<div id="earn-result" class="inline-result"></div></div>');
};
window.execDriverEarn = function() {
  var r = SP.driver_earnings(+$('m-deid').value, $('m-des').value, $('m-dee').value);
  var el = $('earn-result');
  if (!r.ok) { toast('error','Error',r.msg); return; }
  el.innerHTML = r.res.DriverName + ': <strong>' + r.res.Rides + ' rides</strong> · <strong>$' + r.res.TotalEarnings + '</strong> total earnings';
  el.classList.add('show');
  toast('success','sp_driver_earnings', r.res.Rides + ' rides · $' + r.res.TotalEarnings);
};

window.mRegisterUser = function() {
  openModal('<div class="modal-header"><div class="modal-title">Register New User</div>' +
    '<div class="modal-subtitle">sp_register_user — UNIQUE(Email) · CHECK(format) · SCOPE_IDENTITY() returns NewUserID</div></div>' +
    '<div class="modal-body">' +
    formGroup('First Name', inp('m-rf','text','Sarah')) +
    formGroup('Last Name',  inp('m-rl','text','Connor')) +
    formGroup('Email', inp('m-re','email','sarah.connor@email.com'), 'UNIQUE constraint · CHECK(Email LIKE \'%@%.%\') · try alice.johnson@email.com to test the UNIQUE violation') +
    formGroup('Phone (optional)', inp('m-rp','text','555-9999'), 'NULL allowed') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','EXEC sp_register_user','execRegister()') + '</div>');
};
window.execRegister = function() {
  handleResult(SP.register_user($('m-rf').value.trim(),$('m-rl').value.trim(),$('m-re').value.trim(),$('m-rp').value.trim()));
};

window.mDeleteRide = function() {
  var o = opts.all();
  openModal('<div class="modal-header"><div class="modal-title">Delete a Ride</div>' +
    '<div class="modal-subtitle">Trigger: BR-2 trg_prevent_delete_completed — AFTER DELETE — select a Completed ride to see ROLLBACK TRANSACTION</div></div>' +
    '<div class="modal-body">' +
    formGroup('Ride to DELETE', selOpts('m-drid', o), 'Select a Completed ride to trigger BR-2') +
    trigNote('trg_prevent_delete_completed (BR-2) — AFTER DELETE — if Status=\'Completed\' → RAISERROR + ROLLBACK TRANSACTION. This is the only way to demo this trigger, available to ride_dba only.') + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-danger','DELETE FROM rides','execDelete()') + '</div>');
};
window.execDelete = function() { handleResult(DML.deleteRide(+$('m-drid').value)); };

window.mGetUserRides = function() {
  openModal('<div class="modal-header"><div class="modal-title">Get User Rides</div>' +
    '<div class="modal-subtitle">sp_get_user_rides — vw_ride_details — idx_rides_user index seek</div></div>' +
    '<div class="modal-body">' + formGroup('User', selOpts('m-guid', opts.users())) + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','EXEC sp_get_user_rides','execGetRides()') +
    '<div id="gr-result" style="margin-top:8px"></div></div>');
};
window.execGetRides = function() {
  var rows = SP.get_user_rides(+$('m-guid').value);
  $('gr-result').innerHTML = rows.length ? buildTable([
    {h:'ID',r:function(r){return F.id(r.RideID);}},{h:'Driver',k:'DriverName'},{h:'From',k:'StartLocation',s:'font-size:11px'},
    {h:'Fare',r:function(r){return F.money(r.Fare);}},{h:'Status',r:function(r){return F.badge(r.Status);}}
  ], rows) : '<div class="table-empty">No rides found.</div>';
};

window.mAvailDrivers = function() {
  openModal('<div class="modal-header"><div class="modal-title">Available Drivers</div>' +
    '<div class="modal-subtitle">sp_available_drivers — idx_drivers_status + idx_vehicles_driver</div></div>' +
    '<div class="modal-body">' + formGroup('City (optional)', selOpts('m-acity',[['','All cities'],['New York','New York'],['Chicago','Chicago'],['Los Angeles','Los Angeles'],['San Francisco','San Francisco']])) + '</div>' +
    '<div class="modal-footer">' + mBtn('mbtn-primary','EXEC sp_available_drivers','execAvailDrivers()') +
    '<div id="av-result" style="margin-top:8px"></div></div>');
};
window.execAvailDrivers = function() {
  var rows = SP.available_drivers($('m-acity').value||null);
  $('av-result').innerHTML = buildTable([
    {h:'Driver',r:function(d){return d.first+' '+d.last;}},{h:'Rating',r:function(d){return F.stars(Math.round(d.rating))+' <small>'+d.rating+'</small>';}},
    {h:'Vehicle',k:'model',s:'font-size:11px'},{h:'Plate',r:function(d){return F.mono(d.plate);}},{h:'Status',r:function(d){return F.badge(d.status);}}
  ], rows);
};

// ── Bar animation ────────────────────────────────────────────
new MutationObserver(function() {
  document.querySelectorAll('.bar-fill:not([data-animated])').forEach(function(b) {
    b.dataset.animated = '1';
    var w = b.style.width; b.style.width = '0';
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ b.style.width = w; }); });
  });
}).observe(document.body, { childList:true, subtree:true });
