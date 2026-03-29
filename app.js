'use strict';
// ─── RideShareDB Dashboard ────────────────────────────────────
// Fixed: nav onclick, all triggers/procedures visible, DCL layout

const $ = id => document.getElementById(id);
const mk = (tag, cls, html) => { const e=document.createElement(tag); if(cls) e.className=cls; if(html!==undefined) e.innerHTML=html; return e; };
const stars   = n => n ? `<span class="stars-gold">${'★'.repeat(n)}</span><span class="stars-empty">${'★'.repeat(5-n)}</span>` : '<span class="muted">—</span>';
const badge   = t => `<span class="badge ${t.toLowerCase()}">${t}</span>`;
const mono    = t => `<span class="mono">${t}</span>`;
const fare    = f => `<span class="fare">$${f.toFixed(2)}</span>`;
const rid2str = id => `<span class="id">#${String(id).padStart(3,'0')}</span>`;
const durStr  = d => d ? `${d} min` : '<span class="muted">—</span>';
const u2name  = id => { const u=DB.users[id-1];    return u?u.first+' '+u.last:'—'; };
const d2name  = id => { const d=DB.drivers[id-1];  return d?d.first+' '+d.last:'—'; };
const l2name  = id => { const l=DB.locations[id-1];return l?l.name:'—'; };
const l2city  = id => { const l=DB.locations[id-1];return l?l.city:'—'; };
const promoTag = id => { if(!id) return '<span class="muted">—</span>'; const p=DB.promos.find(x=>x.id===id); return p?`<span class="promo-tag">${p.code} −${p.discount}%</span>`:'—'; };

let ROLE=null;
const USER_ID=1, DRIVER_ID=1;

// ─── ROLE DEFINITIONS ─────────────────────────────────────────
const ROLES = {
  passenger:{ label:'Passenger',  avatarText:'PA', color:'#06b6d4', login:'ride_app',
    groups:[{ label:'My Account', items:[
      {id:'my-rides', label:'My Rides',    icon:rideI()},
      {id:'book',     label:'Book a Ride', icon:carI()},
      {id:'my-pays',  label:'My Payments', icon:payI()},
      {id:'promos',   label:'Promo Codes', icon:tagI()},
    ]}], home:'my-rides' },
  driver:{ label:'Driver', avatarText:'DR', color:'#10b981', login:'ride_app',
    groups:[{ label:'My Portal', items:[
      {id:'my-trips',   label:'My Trips',   icon:rideI()},
      {id:'earnings',   label:'Earnings',   icon:payI()},
      {id:'my-ratings', label:'My Ratings', icon:starI()},
      {id:'my-vehicle', label:'My Vehicle', icon:carI()},
    ]}], home:'my-trips' },
  analyst:{ label:'Analyst', avatarText:'AN', color:'#f59e0b', login:'ride_report',
    groups:[{ label:'Analytics', items:[
      {id:'overview',   label:'Overview',   icon:dashI(),  count:''},
      {id:'all-rides',  label:'All Rides',  icon:rideI(),  count:'42'},
      {id:'all-drivers',label:'All Drivers',icon:personI(),count:'42'},
      {id:'revenue',    label:'Revenue',    icon:payI()},
      {id:'all-users',  label:'Users',      icon:usersI(), count:'42'},
    ]}], home:'overview' },
  dba:{ label:'DBA Admin', avatarText:'DB', color:'#6366f1', login:'ride_dba',
    groups:[
      { label:'Operations', items:[
        {id:'dashboard',    label:'Dashboard', icon:dashI()},
        {id:'rides-all',    label:'Rides',     icon:rideI(),  count:'42'},
        {id:'drivers-all',  label:'Drivers',   icon:personI(),count:'42'},
        {id:'users-all',    label:'Users',     icon:usersI(), count:'42'},
        {id:'payments-all', label:'Payments',  icon:payI(),   count:'42'},
      ]},
      { label:'Database', items:[
        {id:'schema',    label:'Schema',         icon:dbI()},
        {id:'triggers',  label:'Triggers',       icon:boltI(), count:'7'},
        {id:'procedures',label:'Procedures',     icon:codeI(), count:'8'},
        {id:'dcl',       label:'Access Control', icon:lockI()},
      ]},
    ], home:'dashboard' },
};

// ─── ICONS ────────────────────────────────────────────────────
const si=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
function dashI()  {return si('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>');}
function rideI()  {return si('<path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v5a2 2 0 01-2 2h-2"/><circle cx="9" cy="21" r="2"/><circle cx="19" cy="21" r="2"/>');}
function carI()   {return si('<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>');}
function payI()   {return si('<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>');}
function starI()  {return si('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>');}
function personI(){return si('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>');}
function usersI() {return si('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>');}
function tagI()   {return si('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>');}
function dbI()    {return si('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>');}
function boltI()  {return si('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>');}
function codeI()  {return si('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>');}
function lockI()  {return si('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>');}

// ─── ROLE SELECT ──────────────────────────────────────────────
function selectRole(role) {
  ROLE = role;
  const def = ROLES[role];
  $('app').setAttribute('data-role', role);
  $('sbRoleAvatar').textContent = def.avatarText;
  $('sbRoleAvatar').style.background = def.color;
  $('sbRoleName').textContent  = def.label;
  $('sbRoleLogin').textContent = def.login;
  $('tbAvatar').textContent    = def.avatarText;
  $('tbAvatar').style.background = def.color;

  // ── NAV: use ONLY createElement + addEventListener ──────────
  const nav = $('sbNav');
  nav.innerHTML = '';
  def.groups.forEach(group => {
    nav.appendChild(mk('div','sb-nav-label', group.label));
    group.items.forEach(item => {
      const li = mk('div','sb-nav-item');
      li.setAttribute('data-view', item.id);
      const iconW = mk('span','nav-icon-wrap'); iconW.innerHTML = item.icon; li.appendChild(iconW);
      li.appendChild(mk('span','', ' '+item.label));
      if (item.count) li.appendChild(mk('span','sb-nav-count', item.count));
      li.addEventListener('click', () => showView(item.id, li));
      nav.appendChild(li);
    });
  });

  buildViews(role);
  $('roleScreen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('app').classList.add('entering');
  setTimeout(()=>$('app').classList.remove('entering'), 500);
  showView(def.home, nav.querySelector(`[data-view="${def.home}"]`));
}

function backToRoleScreen() {
  $('roleScreen').classList.remove('hidden');
  $('app').classList.add('hidden');
  $('pageContent').innerHTML='';
  ROLE=null;
}

// ─── NAVIGATION ───────────────────────────────────────────────
const PAGE_TITLES = {
  'my-rides':['My Rides','Trip History'],'book':['Book a Ride','Available Drivers — sp_available_drivers'],
  'my-pays':['My Payments','Transaction History'],'promos':['Promo Codes','Active Discounts — vw_active_promos'],
  'my-trips':['My Trips','Completed Rides'],'earnings':['Earnings','Revenue — sp_driver_earnings'],
  'my-ratings':['My Ratings','Passenger Feedback'],'my-vehicle':['My Vehicle','Vehicle Details'],
  'overview':['Overview','Analytics Dashboard'],'all-rides':['All Rides','vw_ride_details — 42 records'],
  'all-drivers':['All Drivers','vw_driver_summary — 42 drivers'],'revenue':['Revenue','vw_revenue_by_city'],
  'all-users':['Users','users table — 42 users'],'dashboard':['DBA Dashboard','Full System Overview'],
  'rides-all':['Rides','vw_ride_details — 42 records'],'drivers-all':['Drivers','vw_driver_summary — 42 drivers'],
  'users-all':['Users','users table — 42 users'],'payments-all':['Payments','vw_payment_overview — 42 records'],
  'schema':['Schema','8 Tables — Physical Design'],'triggers':['Triggers','7 Business Rule Automations'],
  'procedures':['Procedures','8 Stored Procedures'],'dcl':['Access Control','DCL — 3 User Roles'],
};

function showView(id, navEl) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.sb-nav-item').forEach(n=>n.classList.remove('active'));
  const v=$('view-'+id); if(v) v.classList.add('active');
  if(navEl) navEl.classList.add('active');
  const [t,s]=PAGE_TITLES[id]||[id,''];
  $('tbTitle').textContent=t; $('tbSub').textContent=s;
  $('sidebar').classList.remove('open');
  $('sbOverlay').classList.remove('show');
  $('hamburger').classList.remove('open');
}

function toggleSidebar() {
  $('sidebar').classList.toggle('open');
  $('sbOverlay').classList.toggle('show');
  $('hamburger').classList.toggle('open');
}

function handleSearch(val) {
  const q=val.trim().toLowerCase();
  document.querySelectorAll('.view.active tbody tr').forEach(r=>{r.style.display=(!q||r.textContent.toLowerCase().includes(q))?'':'none';});
}

// ─── VIEWS ────────────────────────────────────────────────────
function vw(id){ const d=mk('div','view'); d.id='view-'+id; return d; }
function buildViews(role){ const pc=$('pageContent'); pc.innerHTML='';
  if(role==='passenger') buildPassenger(pc);
  if(role==='driver')    buildDriver(pc);
  if(role==='analyst')   buildAnalyst(pc);
  if(role==='dba')       buildDBA(pc);
}

// ─── REUSABLE COMPONENTS ──────────────────────────────────────
function hdr(title,desc){return `<div class="view-header"><div class="view-title">${title}</div><div class="view-desc">${desc}</div></div>`;}
function welcome(icon,name,sub){return `<div class="welcome-card"><div class="welcome-card-bg">${icon}</div><div class="welcome-tag">Welcome back</div><div class="welcome-name">${name}</div><div class="welcome-sub">${sub}</div></div>`;}
function scard(label,val,sub,vc,tc,icon){return `<div class="stat-card"><div class="stat-card-top" style="background:${tc}"></div><div class="stat-card-shine"></div><div class="sc-label">${label}</div><div class="sc-value" style="color:${vc}">${val}</div><div class="sc-sub">${sub}</div><div class="sc-icon">${icon}</div></div>`;}
function kpi3(a,b,c){const ki=({icon,val,label,col})=>`<div class="kpi"><div class="kpi-icon" style="background:${col}22">${icon}</div><div><div class="kpi-val" style="color:${col}">${val}</div><div class="kpi-label">${label}</div></div></div>`;return `<div class="kpi-row">${ki(a)}${ki(b)}${ki(c)}</div>`;}
function barchart(rows){return `<div class="bar-chart">${rows.map(([l,p,c,v])=>`<div class="bar-row"><div class="bar-label">${l}</div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c}"></div></div><div class="bar-val">${v}</div></div>`).join('')}</div>`;}
function rnote(msg){return `<div class="restrict-note">⚠ ${msg}</div>`;}

// ─── TABLE HTML ────────────────────────────────────────────────
function ridesHTML(rides,title='All Rides — vw_ride_details'){
  return `<div class="card"><div class="card-header"><div class="card-title">${title}</div><div class="card-meta">${rides.length} records</div></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Passenger</th><th>Driver</th><th>From</th><th>To</th><th>City</th><th>Date</th><th>Dur</th><th>Fare</th><th>Promo</th><th>Status</th></tr></thead>
  <tbody>${rides.map(r=>`<tr><td>${rid2str(r.id)}</td><td style="white-space:nowrap">${u2name(r.uid)}</td><td style="white-space:nowrap">${d2name(r.did)}</td>
  <td style="font-size:11px">${l2name(r.slid)}</td><td style="font-size:11px">${l2name(r.elid)}</td><td style="font-size:11px;color:var(--t2)">${l2city(r.slid)}</td>
  <td style="font-size:11px;color:var(--t2)">${r.start.slice(0,10)}</td><td>${durStr(r.dur)}</td>
  <td>${r.fare>0?fare(r.fare):'<span class="muted">—</span>'}</td><td>${promoTag(r.promo)}</td><td>${badge(r.status)}</td></tr>`).join('')}</tbody>
  </table></div><div class="tbl-footer">RideDuration auto-set by trg_calc_duration (BR-5) · PromoID nullable FK</div></div>`;
}
function driversHTML(drivers,title='Driver Roster — vw_driver_summary'){
  return `<div class="card"><div class="card-header"><div class="card-title">${title}</div><div class="card-meta">${drivers.length} drivers</div></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Licence</th><th>Vehicle</th><th>Rating</th><th>Status</th></tr></thead>
  <tbody>${drivers.map(d=>{const v=DB.vehicles.find(x=>x.did===d.id);return `<tr><td class="id">${d.id}</td><td><strong>${d.first} ${d.last}</strong></td>
  <td>${mono(d.lic)}</td><td style="font-size:11px">${v?v.model+" '"+String(v.year).slice(2):'—'}</td>
  <td>${stars(Math.round(d.rating))} <span style="font-size:10px;color:var(--t3)">${d.rating}</span></td><td>${badge(d.status)}</td></tr>`;}).join('')}</tbody>
  </table></div><div class="tbl-footer">Rating auto-recalculated by trg_update_driver_rating (BR-4) · Status by BR-6 &amp; BR-7</div></div>`;
}
function usersHTML(users){
  return `<div class="card"><div class="card-header"><div class="card-title">User Registry — users table</div><div class="card-meta">${users.length} users</div></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th></tr></thead>
  <tbody>${users.map(u=>`<tr><td class="id">${u.id}</td><td><strong>${u.first} ${u.last}</strong></td>
  <td style="font-size:11px;color:var(--t2)">${u.email}</td><td style="font-size:11px">${u.phone||'<span class="muted">NULL</span>'}</td>
  <td style="font-size:11px;color:var(--t2)">${u.reg}</td></tr>`).join('')}</tbody>
  </table></div><div class="tbl-footer">Email UNIQUE + CHECK(LIKE '%@%.%') · Phone nullable · DEFAULT GETDATE()</div></div>`;
}
function paymentsHTML(payments,title='Payment Ledger — vw_payment_overview'){
  return `<div class="card"><div class="card-header"><div class="card-title">${title}</div><div class="card-meta">${payments.length} records</div></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>Pay ID</th><th>Ride</th><th>Passenger</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
  <tbody>${payments.map(p=>{const ride=DB.rides[p.rid-1];return `<tr><td>${rid2str(p.pid)}</td><td>${rid2str(p.rid)}</td>
  <td>${ride?u2name(ride.uid):'—'}</td><td>${fare(p.amount)}</td><td>${badge(p.method)}</td>
  <td style="font-size:11px;color:var(--t2)">${p.date}</td><td>${badge(p.status)}</td></tr>`;}).join('')}</tbody>
  </table></div><div class="tbl-footer">trg_validate_payment_ride (BR-3) · INSTEAD OF INSERT blocks payment on cancelled rides</div></div>`;
}

// ═══ PASSENGER ════════════════════════════════════════════════
function buildPassenger(pc){
  const u=DB.users[USER_ID-1];
  const myR=DB.rides.filter(r=>r.uid===USER_ID);
  const myP=DB.payments.filter(p=>{const r=DB.rides[p.rid-1];return r&&r.uid===USER_ID;});

  const v1=vw('my-rides'); v1.innerHTML=welcome('👤',u.first+' '+u.last,`You have ${myR.length} rides in your history.`)
    +kpi3({icon:'✅',val:myR.filter(r=>r.status==='Completed').length,label:'Completed',col:'#10b981'},
           {icon:'⏳',val:myR.filter(r=>r.status==='Pending').length,label:'Pending',col:'#f59e0b'},
           {icon:'💵',val:'$'+myR.reduce((s,r)=>s+r.fare,0).toFixed(2),label:'Total Spent',col:'#6366f1'})
    +`<div class="card"><div class="card-header"><div class="card-title">My Trip History</div><div class="card-meta">${myR.length} rides</div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Ride</th><th>Driver</th><th>From</th><th>To</th><th>Date</th><th>Dur</th><th>Fare</th><th>Promo</th><th>Status</th></tr></thead>
    <tbody>${myR.map(r=>`<tr><td>${rid2str(r.id)}</td><td>${d2name(r.did)}</td><td style="font-size:11px">${l2name(r.slid)}</td>
    <td style="font-size:11px">${l2name(r.elid)}</td><td style="font-size:11px;color:var(--t2)">${r.start.slice(0,10)}</td>
    <td>${durStr(r.dur)}</td><td>${r.fare>0?fare(r.fare):'<span class="muted">—</span>'}</td><td>${promoTag(r.promo)}</td><td>${badge(r.status)}</td></tr>`).join('')}</tbody>
    </table></div><div class="tbl-footer">Your rides only · RideDuration auto-set by trg_calc_duration (BR-5)</div></div>`;
  pc.appendChild(v1);

  const v2=vw('book'); v2.innerHTML=hdr('Book a Ride','Choose from <strong>'+DB.drivers.filter(d=>d.status==='Available').length+' available drivers</strong>. One active ride per user — <code>trg_no_concurrent_rides</code> (BR-1).')
    +rnote('ride_app role · SELECT, INSERT, UPDATE allowed · DELETE denied')
    +driversHTML(DB.drivers.filter(d=>d.status==='Available'),'Available Drivers — sp_available_drivers'); pc.appendChild(v2);

  const today=new Date();
  const v3=vw('my-pays'); v3.innerHTML=hdr('My Payments','Your payment history. Cancelled rides cannot be paid — <strong>trg_validate_payment_ride</strong> (BR-3).')+paymentsHTML(myP,'My Payment History'); pc.appendChild(v3);

  const v4=vw('promos'); const ap=DB.promos.filter(p=>new Date(p.expiry)>today);
  v4.innerHTML=hdr('Promo Codes','Active non-expired codes from <code>vw_active_promos</code>. Apply via <code>sp_apply_promo</code>.')
    +`<div class="card"><div class="card-header"><div class="card-title">Active Promo Codes — vw_active_promos</div><div class="card-meta">${ap.length} available</div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Discount</th><th>Expires</th></tr></thead>
    <tbody>${ap.map(p=>`<tr><td><span class="promo-tag">${p.code}</span></td><td><strong style="color:var(--green)">−${p.discount}%</strong></td>
    <td style="font-size:11px;color:var(--t2)">${p.expiry}</td></tr>`).join('')}</tbody></table></div></div>`;
  pc.appendChild(v4);
}

// ═══ DRIVER ═══════════════════════════════════════════════════
function buildDriver(pc){
  const d=DB.drivers[DRIVER_ID-1], v=DB.vehicles.find(x=>x.did===DRIVER_ID);
  const myR=DB.rides.filter(r=>r.did===DRIVER_ID&&r.status==='Completed');
  const myRat=DB.ratings.filter(r=>{const ride=DB.rides[r.rid-1];return ride&&ride.did===DRIVER_ID;});
  const earn=myR.reduce((s,r)=>s+r.fare,0);

  const v1=vw('my-trips'); v1.innerHTML=welcome('🚗',d.first+' '+d.last,`Driver ${d.id} · ${d.lic} · Status: ${d.status}. Auto-managed by triggers BR-6 & BR-7.`)
    +kpi3({icon:'🏁',val:myR.length,label:'Completed Rides',col:'#10b981'},{icon:'💰',val:'$'+earn.toFixed(2),label:'Total Earnings',col:'#10b981'},{icon:'⭐',val:d.rating,label:'My Rating',col:'#f59e0b'})
    +`<div class="card"><div class="card-header"><div class="card-title">My Completed Trips</div><div class="card-meta">${myR.length} rides</div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Ride</th><th>Passenger</th><th>From</th><th>To</th><th>Date</th><th>Dur</th><th>Fare</th></tr></thead>
    <tbody>${myR.map(r=>`<tr><td>${rid2str(r.id)}</td><td>${u2name(r.uid)}</td><td style="font-size:11px">${l2name(r.slid)}</td>
    <td style="font-size:11px">${l2name(r.elid)}</td><td style="font-size:11px;color:var(--t2)">${r.start.slice(0,10)}</td>
    <td>${durStr(r.dur)}</td><td>${fare(r.fare)}</td></tr>`).join('')}</tbody></table></div></div>`;
  pc.appendChild(v1);

  const monthly={}; myR.forEach(r=>{const m=r.start.slice(0,7);monthly[m]=(monthly[m]||0)+r.fare;});
  const mMax=Math.max(...Object.values(monthly),1);
  const v2=vw('earnings'); v2.innerHTML=hdr('My Earnings','Revenue from <code>sp_driver_earnings</code>. Completed rides only.')
    +`<div class="card"><div class="card-header"><div class="card-title">Monthly Earnings</div><div class="card-meta">2024</div></div>
    <div class="card-body">${barchart(Object.entries(monthly).sort().map(([m,val])=>[m,(val/mMax*100).toFixed(0),'#10b981','$'+val.toFixed(2)]))}</div></div>`;
  pc.appendChild(v2);

  const v3=vw('my-ratings'); v3.innerHTML=hdr('My Ratings','Auto-recalculated by <strong>trg_update_driver_rating</strong> (BR-4). Current average: <strong>'+d.rating+'</strong>.')
    +`<div class="card"><div class="card-header"><div class="card-title">Rating History</div><div class="card-meta">${myRat.length} ratings</div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Ride</th><th>Driver ★</th><th>User ★</th><th>Comment</th></tr></thead>
    <tbody>${myRat.map(r=>`<tr><td>${rid2str(r.rid)}</td><td>${stars(r.dr)}</td>
    <td>${r.ur?stars(r.ur):'<span class="muted">NULL</span>'}</td><td style="font-size:11px;color:var(--t2)">${r.comment||'—'}</td></tr>`).join('')}</tbody>
    </table></div><div class="tbl-footer">UNIQUE(RideID) · DriverRating NOT NULL</div></div>`;
  pc.appendChild(v3);

  const v4=vw('my-vehicle'); v4.innerHTML=hdr('My Vehicle','Your registered vehicle from <code>vehicles</code> table. One per driver — FK cascades on driver deletion.')
    +`<div class="card"><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    ${v?[['Vehicle ID',v.did],['Plate Number',v.plate],['Model',v.model],['Year',v.year],['Capacity',v.cap+' passengers'],['Driver ID',d.id]]
      .map(([k,val])=>`<div><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">${k}</div><div style="font-size:18px;font-weight:800;color:var(--t1)">${val}</div></div>`).join(''):'No vehicle found'}
    </div></div></div>`;
  pc.appendChild(v4);
}

// ═══ ANALYST ══════════════════════════════════════════════════
function buildAnalyst(pc){
  const s=DB.stats;
  const cc={'New York':'#6366f1','Chicago':'#06b6d4','Los Angeles':'#10b981','San Francisco':'#f59e0b'};
  const cMax=Math.max(...Object.values(s.cities));

  const v1=vw('overview'); v1.innerHTML=hdr('Analytics Overview','Read-only. Logged in as <code>ride_report</code> — SELECT only.')
    +rnote('ride_report role · SELECT only · No INSERT, UPDATE or DELETE')
    +`<div class="stats-grid">${scard('Total Revenue','$'+s.total_rev.toFixed(2),'40 completed rides','#10b981','#10b981','💰')}${scard('Total Rides','42','40 completed · 1 pending · 1 cancelled','#6366f1','#6366f1','🚕')}${scard('Drivers','42',s.dstat.Available+' available · '+s.dstat.Busy+' busy','#f59e0b','#f59e0b','🚗')}${scard('Avg Fare','$'+s.avg_fare,'Avg duration '+s.avg_dur+' min','#06b6d4','#06b6d4','📊')}</div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">Revenue by City</div><div class="card-meta">vw_revenue_by_city</div></div>
      <div class="card-body">${barchart(Object.entries(s.cities).sort((a,b)=>b[1]-a[1]).map(([city,rev])=>[city,(rev/cMax*100).toFixed(1),cc[city]||'#6366f1','$'+rev.toFixed(2)]))}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">Payment Methods</div><div class="card-meta">42 transactions</div></div>
      <div class="card-body">${barchart(Object.entries(s.methods).sort((a,b)=>b[1]-a[1]).map(([m,c])=>[m,(c/15*100).toFixed(0),'var(--accent)',c+' txn']))}
      <div class="chart-divider"></div>${barchart([['Paid',95,'#10b981','40'],['Pending',3,'#f59e0b','1'],['Failed',3,'#ef4444','1']])}</div></div>
    </div>`;
  pc.appendChild(v1);

  const v2=vw('all-rides'); v2.innerHTML=hdr('All Rides','Full dataset from <code>vw_ride_details</code>.')+ridesHTML(DB.rides); pc.appendChild(v2);
  const v3=vw('all-drivers'); v3.innerHTML=hdr('All Drivers','Full roster from <code>vw_driver_summary</code>.')+driversHTML(DB.drivers); pc.appendChild(v3);

  const v4=vw('revenue'); v4.innerHTML=hdr('Revenue','City revenue from <code>vw_revenue_by_city</code> and top earners.')
    +`<div class="grid-2">
    <div class="card"><div class="card-header"><div class="card-title">Revenue by City</div><div class="card-meta">vw_revenue_by_city</div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>City</th><th>Rides</th><th>Revenue</th><th>Avg Fare</th></tr></thead>
    <tbody>${Object.entries(s.cities).sort((a,b)=>b[1]-a[1]).map(([city,rev])=>{const n=DB.rides.filter(r=>r.status==='Completed'&&DB.locations[r.slid-1]?.city===city).length;
    return `<tr><td><strong>${city}</strong></td><td>${n}</td><td>${fare(rev)}</td><td>${fare(rev/Math.max(n,1))}</td></tr>`;}).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-header"><div class="card-title">Top 5 Earning Drivers</div><div class="card-meta">Q1 2024</div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Driver</th><th>Rating</th><th>Rides</th><th>Earned</th></tr></thead>
    <tbody>${s.top5.map((d,i)=>`<tr><td style="font-weight:800;color:${i===0?'var(--accent)':'var(--t3)'}">${String(i+1).padStart(2,'0')}</td>
    <td><strong>${d.name}</strong></td><td>${stars(Math.round(d.rating))} <small style="color:var(--t3)">${d.rating}</small></td>
    <td>${d.rides}</td><td>${fare(d.earn)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  pc.appendChild(v4);

  const v5=vw('all-users'); v5.innerHTML=hdr('Users','All 42 registered passengers.')+usersHTML(DB.users); pc.appendChild(v5);
}

// ═══ DBA ══════════════════════════════════════════════════════
function buildDBA(pc){
  const s=DB.stats;
  const cc={'New York':'#6366f1','Chicago':'#06b6d4','Los Angeles':'#10b981','San Francisco':'#f59e0b'};
  const cMax=Math.max(...Object.values(s.cities));

  // Dashboard
  const v0=vw('dashboard'); v0.innerHTML=hdr('DBA Dashboard','Full system overview. <code>ride_dba</code> with <code>db_owner</code> — complete control.')
    +`<div class="stats-grid">${scard('Total Revenue','$'+s.total_rev.toFixed(2),'40 completed rides · Jan–Feb 2024','#10b981','#10b981','💰')}${scard('Total Rides','42','40 completed · 1 pending · 1 cancelled','#6366f1','#6366f1','🚕')}${scard('Active Drivers','42',s.dstat.Available+' available · '+s.dstat.Busy+' busy · '+s.dstat.Offline+' offline','#f59e0b','#f59e0b','🚗')}${scard('Avg Fare','$'+s.avg_fare,'Avg duration '+s.avg_dur+' min · 4 cities','#06b6d4','#06b6d4','📊')}</div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">Revenue by City</div><div class="card-meta">vw_revenue_by_city</div></div>
      <div class="card-body">${barchart(Object.entries(s.cities).sort((a,b)=>b[1]-a[1]).map(([city,rev])=>[city,(rev/cMax*100).toFixed(1),cc[city],'$'+rev.toFixed(2)]))}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">Top 5 Drivers</div><div class="card-meta">by earnings · Q1 2024</div></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Name</th><th>Rating</th><th>Rides</th><th>Earned</th></tr></thead>
      <tbody>${s.top5.map((d,i)=>`<tr><td style="font-weight:800;color:${i===0?'var(--accent)':'var(--t3)'}">${String(i+1).padStart(2,'0')}</td>
      <td><strong>${d.name}</strong><div style="font-size:10px;color:var(--t3)">${d.lic}</div></td>
      <td>${stars(Math.round(d.rating))} <small style="color:var(--t3)">${d.rating}</small></td>
      <td>${d.rides}</td><td>${fare(d.earn)}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">Payment Breakdown</div><div class="card-meta">42 transactions</div></div>
      <div class="card-body">${barchart(Object.entries(s.methods).sort((a,b)=>b[1]-a[1]).map(([m,c])=>[m,(c/15*100).toFixed(0),'var(--accent)',c+' txn']))}
      <div class="chart-divider"></div>${barchart([['Paid',95,'#10b981','40'],['Pending',3,'#f59e0b','1'],['Failed',3,'#ef4444','1']])}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">Driver Status</div><div class="card-meta">triggers BR-6 &amp; BR-7</div></div>
      <div class="card-body">${barchart([['Available',(s.dstat.Available/42*100).toFixed(0),'#10b981',s.dstat.Available+' drivers'],['Busy',(s.dstat.Busy/42*100).toFixed(0),'#f59e0b',s.dstat.Busy+' drivers'],['Offline',(s.dstat.Offline/42*100).toFixed(0),'#6b7280',s.dstat.Offline+' drivers']])}</div></div>
    </div>`;
  pc.appendChild(v0);

  // Data views — each is its own independently appended view
  const vRides=vw('rides-all');    vRides.innerHTML=hdr('All Rides','Complete dataset from <code>vw_ride_details</code>. Completed rides cannot be deleted (BR-2).')+ridesHTML(DB.rides); pc.appendChild(vRides);
  const vDrv=vw('drivers-all');   vDrv.innerHTML=hdr('All Drivers','Full roster from <code>vw_driver_summary</code>.')+driversHTML(DB.drivers); pc.appendChild(vDrv);
  const vUsr=vw('users-all');     vUsr.innerHTML=hdr('All Users','All 42 registered passengers.')+usersHTML(DB.users); pc.appendChild(vUsr);
  const vPay=vw('payments-all');  vPay.innerHTML=hdr('All Payments','Full ledger from <code>vw_payment_overview</code>. <strong>trg_validate_payment_ride</strong> (BR-3) blocks payments on cancelled rides.')+paymentsHTML(DB.payments); pc.appendChild(vPay);

  // Schema
  const vSch=vw('schema'); vSch.innerHTML=hdr('Database Schema','8 tables · 10 FK constraints · 12 CHECK · 6 UNIQUE · 8 DEFAULT · Full 3NF · 15 indexes')+'<div class="schema-grid" id="schemaGrid"></div>'; pc.appendChild(vSch);

  // Triggers — placeholder div, filled after append
  const vTrg=vw('triggers'); vTrg.innerHTML=hdr('Triggers','7 triggers enforce business rules at the SQL Server engine level — independently of application code. All 7 shown below.')+'<div id="triggersContainer"></div>'; pc.appendChild(vTrg);

  // Procedures
  const vPro=vw('procedures'); vPro.innerHTML=hdr('Stored Procedures','8 parameterised stored procedures. Each uses <code>SET NOCOUNT ON</code> and proper T-SQL error handling.')+'<div class="proc-grid" id="procGrid"></div>'; pc.appendChild(vPro);

  // DCL
  const vDCL=vw('dcl'); vDCL.innerHTML=hdr('Access Control (DCL)','3 roles created with <code>CREATE LOGIN</code>, <code>CREATE USER</code>, <code>GRANT</code>, <code>DENY</code>, and <code>ALTER ROLE</code>.')+'<div id="dclContainer"></div>'; pc.appendChild(vDCL);

  // Now build complex sections (IDs exist in DOM)
  buildSchema(); buildTriggers(); buildProcedures(); buildDCL();
}

// ─── SCHEMA ───────────────────────────────────────────────────
function buildSchema(){
  const T=[
    {name:'users',    rows:42,cols:[{n:'UserID',t:'pk'},{n:'FirstName',v:'varchar(50)'},{n:'LastName',v:'varchar(50)'},{n:'Email',v:'UQ · CHK'},{n:'Phone',v:'nullable'},{n:'RegistrationDate',v:'DEFAULT NOW'}]},
    {name:'drivers',  rows:42,cols:[{n:'DriverID',t:'pk'},{n:'FirstName',v:'varchar(50)'},{n:'LicenseNumber',v:'UNIQUE'},{n:'Rating',v:'0–5 DEFAULT 5.0'},{n:'Status',v:'enum CHK'}]},
    {name:'vehicles', rows:42,cols:[{n:'VehicleID',t:'pk'},{n:'DriverID',t:'fk',v:'FK→drivers CASCADE'},{n:'PlateNumber',v:'UNIQUE'},{n:'Model',v:'varchar(50)'},{n:'Year',v:'1990–2030'},{n:'Capacity',v:'1–20 CHK'}]},
    {name:'rides',    rows:42,cols:[{n:'RideID',t:'pk'},{n:'UserID',t:'fk',v:'FK→users CASCADE'},{n:'DriverID',t:'fk',v:'FK→drivers'},{n:'VehicleID',t:'fk',v:'FK→vehicles'},{n:'StartLocationID',t:'fk',v:'FK→locations'},{n:'EndLocationID',t:'fk',v:'FK→locations'},{n:'Fare',v:'≥0 CHK'},{n:'Status',v:'enum CHK'},{n:'RideDuration',v:'derived·trigger'},{n:'PromoID',v:'FK NULL'}]},
    {name:'payments', rows:42,cols:[{n:'PaymentID',t:'pk'},{n:'RideID',t:'fk',v:'FK→rides CASCADE'},{n:'Amount',v:'≥0 CHK'},{n:'Method',v:'Cash/Card/Online'},{n:'PaymentDate',v:'DEFAULT NOW'},{n:'Status',v:'Paid/Pending/Failed'}]},
    {name:'ratings',  rows:40,cols:[{n:'RatingID',t:'pk'},{n:'RideID',t:'fk',v:'FK+UQ→rides'},{n:'DriverRating',v:'1–5 NOT NULL'},{n:'UserRating',v:'1–5 nullable'},{n:'Comment',v:'varchar(500) NULL'}]},
    {name:'locations',rows:42,cols:[{n:'LocationID',t:'pk'},{n:'Name',v:'varchar(100)'},{n:'City',v:'varchar(50)'}]},
    {name:'promocodes',rows:42,cols:[{n:'PromoID',t:'pk'},{n:'Code',v:'UNIQUE'},{n:'Discount',v:'0–100% CHK'},{n:'ExpiryDate',v:'datetime'}]},
  ];
  $('schemaGrid').innerHTML=T.map(t=>`<div class="schema-card">
    <div class="schema-card-header"><span class="schema-tname">${t.name}</span><span class="schema-rows">${t.rows} rows</span></div>
    <div class="schema-cols">${t.cols.map(c=>`<div class="schema-col"><span class="col-name">${c.n}</span>
    ${c.t==='pk'?'<span class="col-pk">PK</span>':c.t==='fk'?`<span class="col-fk">${c.v}</span>`:`<span class="col-type">${c.v||''}</span>`}</div>`).join('')}
    </div></div>`).join('');
}

// ─── TRIGGERS ─────────────────────────────────────────────────
function buildTriggers(){
  const con=$('triggersContainer'); if(!con) return;
  const ALL=[
    {name:'trg_calc_duration',               table:'rides',   type:'AFTER UPDATE',      br:'BR-5',icon:'⏱',cls:'ti-after',  brC:'br-after',  desc:'Sets <strong>RideDuration = DATEDIFF(MINUTE, StartTime, EndTime)</strong> automatically when EndTime is written. Keeps the derived column accurate.'},
    {name:'trg_update_driver_rating',         table:'ratings', type:'AFTER INSERT',      br:'BR-4',icon:'⭐',cls:'ti-after',  brC:'br-after',  desc:'Recalculates <strong>driver.Rating = ROUND(AVG(DriverRating), 2)</strong> across all that driver\'s rides after every new rating INSERT.'},
    {name:'trg_driver_busy_on_ride',          table:'rides',   type:'AFTER INSERT',      br:'BR-6',icon:'🚗',cls:'ti-after',  brC:'br-after',  desc:'Sets <strong>driver.Status = \'Busy\'</strong> automatically when a new Pending ride is inserted.'},
    {name:'trg_driver_available_on_complete', table:'rides',   type:'AFTER UPDATE',      br:'BR-7',icon:'✅',cls:'ti-after',  brC:'br-after',  desc:'Resets <strong>driver.Status = \'Available\'</strong> when a ride transitions from Pending → Completed or Cancelled.'},
    {name:'trg_prevent_delete_completed',     table:'rides',   type:'AFTER DELETE',      br:'BR-2',icon:'🛡',cls:'ti-danger', brC:'br-after',  desc:'<strong>RAISERROR + ROLLBACK TRANSACTION</strong> if any Completed ride is in the deleted set. Protects the financial audit trail permanently.'},
    {name:'trg_no_concurrent_rides',          table:'rides',   type:'INSTEAD OF INSERT', br:'BR-1',icon:'🚫',cls:'ti-instead',brC:'br-instead',desc:'Blocks INSERT entirely if the user already has a Pending ride. Fires before the storage engine — <strong>RAISERROR + RETURN</strong>.'},
    {name:'trg_validate_payment_ride',        table:'payments',type:'INSTEAD OF INSERT', br:'BR-3',icon:'💳',cls:'ti-instead',brC:'br-instead',desc:'Blocks payment INSERT if the associated <strong>ride.Status = \'Cancelled\'</strong>. Prevents financial records on void rides.'},
  ];
  const ti=t=>`<div class="trigger-item"><div class="trigger-icon ${t.cls}">${t.icon}</div>
    <div style="flex:1;min-width:0"><div class="trigger-name">${t.name}</div>
    <div class="trigger-on">${t.type} ON ${t.table}</div>
    <div class="trigger-desc">${t.desc}</div></div>
    <span class="trigger-br ${t.brC}">${t.br}</span></div>`;
  const after=ALL.filter(t=>!t.type.includes('INSTEAD'));
  const instead=ALL.filter(t=>t.type.includes('INSTEAD'));
  con.innerHTML=`<div class="grid-2">
    <div>
      <div class="trigger-group-label tgl-after">AFTER Triggers (${after.length})</div>
      <div class="trigger-list">${after.map(ti).join('')}</div>
    </div>
    <div>
      <div class="trigger-group-label tgl-instead">INSTEAD OF Triggers (${instead.length})</div>
      <div class="trigger-list">${instead.map(ti).join('')}</div>
      <div class="why-box" style="margin-top:12px"><strong>Why INSTEAD OF?</strong><br>
      AFTER triggers fire after the row is already written — they cannot prevent an INSERT.
      INSTEAD OF fires before the storage engine writes anything, allowing clean rejection via RAISERROR + RETURN.<br><br>
      <strong>Why AFTER DELETE + ROLLBACK for BR-2?</strong><br>
      SQL Server prohibits INSTEAD OF DELETE on tables with cascading FK children.
      AFTER DELETE + ROLLBACK TRANSACTION achieves the same result atomically.</div>
    </div>
  </div>`;
}

// ─── PROCEDURES ───────────────────────────────────────────────
function buildProcedures(){
  const P=[
    {name:'sp_get_user_rides',    ret:'Result set',   params:[{l:'@UserID INT'}],                                                                  desc:'Returns all rides for a user via <code>vw_ride_details</code> — all IDs resolved to names, no manual JOINs.'},
    {name:'sp_available_drivers', ret:'Result set',   params:[{l:'@City VARCHAR(50) = NULL'}],                                                     desc:'Returns available drivers with vehicle details. Optionally filtered by city — ready for real-time dispatch.'},
    {name:'sp_complete_ride',     ret:'Confirmation', params:[{l:'@RideID INT'},{l:'@EndTime DATETIME'},{l:'@Fare FLOAT'}],                        desc:'Marks ride Completed with EndTime and Fare. Fires <code>trg_calc_duration</code> (BR-5) and <code>trg_driver_available</code> (BR-7).'},
    {name:'sp_apply_promo',       ret:'OUTPUT param', params:[{l:'@RideID INT'},{l:'@PromoID INT'},{l:'@NewFare FLOAT',o:true}],                   desc:'Validates promo expiry, computes Fare × (1 − Discount/100), updates <code>ride.Fare</code> and <code>PromoID</code> atomically.'},
    {name:'sp_monthly_revenue',   ret:'Aggregate row',params:[{l:'@Year INT'},{l:'@Month INT'}],                                                   desc:'Returns TotalRides, TotalRevenue, AvgFare, MinFare, MaxFare for any given year + month.'},
    {name:'sp_driver_earnings',   ret:'Aggregate row',params:[{l:'@DriverID INT'},{l:'@StartDate DATE'},{l:'@EndDate DATE'}],                      desc:'Total completed rides and earnings for a specific driver within a date range.'},
    {name:'sp_register_user',     ret:'NewUserID',    params:[{l:'@First VARCHAR'},{l:'@Last VARCHAR'},{l:'@Email VARCHAR'},{l:'@Phone VARCHAR'}],  desc:'Inserts a new user and returns the IDENTITY UserID via <code>SCOPE_IDENTITY()</code> — safe for concurrent inserts.'},
    {name:'sp_cancel_ride',       ret:'RowsUpdated',  params:[{l:'@RideID INT'},{l:'RowsUpdated INT',o:true}],                                    desc:'Cancels a Pending ride → triggers <code>trg_driver_available</code> (BR-7). Returns 0 if ride not found or not Pending.'},
  ];
  $('procGrid').innerHTML=P.map(p=>`<div class="proc-card">
    <div class="proc-name">${p.name}</div>
    <div class="proc-ret">Returns: <span>${p.ret}</span></div>
    <div class="proc-desc">${p.desc}</div>
    <div class="proc-params">${p.params.map(pm=>`<span class="proc-param${pm.o?' out':''}">${pm.o?'⟵ ':''}${pm.l}</span>`).join('')}</div>
  </div>`).join('');
}

// ─── DCL ──────────────────────────────────────────────────────
function buildDCL(){
  const con=$('dclContainer'); if(!con) return;
  const roles=[
    {cls:'app',    login:'ride_app',    role:'Application User', pw:'App@Secure123!',    color:'#6366f1',
     perms:[{g:1,label:'SELECT',detail:'Read all data'},{g:1,label:'INSERT',detail:'Add records'},{g:1,label:'UPDATE',detail:'Modify records'},{g:0,label:'DELETE',detail:'Explicitly DENIED'}],
     sql:'GRANT SELECT, INSERT, UPDATE ON SCHEMA::dbo TO ride_app;\nDENY  DELETE ON SCHEMA::dbo TO ride_app;',
     purpose:'Backend API layer. Cannot delete records — prevents accidental mass deletions and limits SQL injection damage.'},
    {cls:'report', login:'ride_report', role:'Read-Only Analyst', pw:'Report@Secure123!', color:'#06b6d4',
     perms:[{g:1,label:'SELECT',detail:'Full read access'},{g:0,label:'INSERT',detail:'Not granted'},{g:0,label:'UPDATE',detail:'Not granted'},{g:0,label:'DELETE',detail:'Not granted'}],
     sql:'GRANT SELECT ON SCHEMA::dbo TO ride_report;',
     purpose:'BI dashboards, analytics tools, and data exports. Cannot modify anything — true read-only isolation.'},
    {cls:'dba',    login:'ride_dba',    role:'DBA / db_owner',   pw:'DBA@Secure123!',    color:'#10b981',
     perms:[{g:1,label:'SELECT',detail:'Full read'},{g:1,label:'INSERT',detail:'Full write'},{g:1,label:'UPDATE',detail:'Full modify'},{g:1,label:'DELETE',detail:'Full delete'}],
     sql:'ALTER ROLE db_owner ADD MEMBER ride_dba;',
     purpose:'db_owner — full database control. Schema changes, maintenance, index rebuilds, and deployment scripts.'},
  ];
  con.innerHTML=`
    <div class="dcl-grid">${roles.map(r=>`
      <div class="dcl-card ${r.cls}">
        <div class="dcl-card-accent" style="background:${r.color}"></div>
        <div class="dcl-login" style="color:${r.color}">${r.login}</div>
        <div class="dcl-role-label">${r.role}</div>
        <code class="dcl-pw">${r.pw}</code>
        <div class="dcl-perms-grid">
          ${r.perms.map(p=>`<div class="dcl-perm-row">
            <span>${p.g?'✅':'❌'}</span>
            <span class="dcl-perm-name" style="color:${p.g?'var(--green)':'var(--red)';}">${p.label}</span>
            <span class="dcl-perm-detail">${p.detail}</span>
          </div>`).join('')}
        </div>
        <div class="dcl-sql-mini"><code>${r.sql}</code></div>
        <div class="dcl-purpose">${r.purpose}</div>
      </div>`).join('')}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><div class="card-title">Full DCL Script</div><div class="card-meta">Section 8 — ride_sharing_fixed.sql</div></div>
      <div class="card-body"><div class="code-block"><span class="kw">-- Application user: read/write, no delete</span>
<span class="kw">CREATE LOGIN</span> ride_app    <span class="kw">WITH PASSWORD</span> = <span class="str">'App@Secure123!'</span>;
<span class="kw">CREATE USER</span>  ride_app    <span class="kw">FOR LOGIN</span> ride_app;
<span class="kw">GRANT</span> <span class="kw">SELECT</span>, <span class="kw">INSERT</span>, <span class="kw">UPDATE</span> <span class="kw">ON SCHEMA</span>::dbo <span class="kw">TO</span> ride_app;
<span class="kw">DENY</span>  <span class="kw">DELETE</span>                  <span class="kw">ON SCHEMA</span>::dbo <span class="kw">TO</span> ride_app;

<span class="kw">-- Report user: read only</span>
<span class="kw">CREATE LOGIN</span> ride_report <span class="kw">WITH PASSWORD</span> = <span class="str">'Report@Secure123!'</span>;
<span class="kw">CREATE USER</span>  ride_report <span class="kw">FOR LOGIN</span> ride_report;
<span class="kw">GRANT</span> <span class="kw">SELECT</span> <span class="kw">ON SCHEMA</span>::dbo <span class="kw">TO</span> ride_report;

<span class="kw">-- DBA: full control</span>
<span class="kw">CREATE LOGIN</span> ride_dba    <span class="kw">WITH PASSWORD</span> = <span class="str">'DBA@Secure123!'</span>;
<span class="kw">CREATE USER</span>  ride_dba    <span class="kw">FOR LOGIN</span> ride_dba;
<span class="kw">ALTER ROLE</span> db_owner <span class="kw">ADD MEMBER</span> ride_dba;</div></div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-header"><div class="card-title">Verify Permissions in SSMS</div><div class="card-meta">Run after executing the script</div></div>
      <div class="card-body"><div class="code-block"><span class="kw">SELECT</span>
    dp.name           <span class="kw">AS</span> LoginName,
    p.permission_name <span class="kw">AS</span> Permission,
    p.state_desc      <span class="kw">AS</span> State
<span class="kw">FROM</span>   sys.database_permissions  p
<span class="kw">JOIN</span>   sys.database_principals   dp
    <span class="kw">ON</span> p.grantee_principal_id = dp.principal_id
<span class="kw">WHERE</span>  dp.name <span class="kw">IN</span> (<span class="str">'ride_app'</span>, <span class="str">'ride_report'</span>, <span class="str">'ride_dba'</span>)
<span class="kw">ORDER</span> <span class="kw">BY</span> dp.name, p.permission_name;</div></div>
    </div>`;
}

// ─── BAR ANIMATION ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const obs = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.target.classList.contains('active') && m.target.classList.contains('view')) {
        setTimeout(() => {
          m.target.querySelectorAll('.bar-fill').forEach(b => {
            const w=b.style.width; b.style.width='0';
            requestAnimationFrame(()=>requestAnimationFrame(()=>{b.style.width=w;}));
          });
        }, 60);
      }
    });
  });
  const pc=$('pageContent');
  if(pc){ new MutationObserver(()=>{ document.querySelectorAll('.view').forEach(v=>obs.observe(v,{attributes:true,attributeFilter:['class']})); }).observe(pc,{childList:true,subtree:true}); }
});
