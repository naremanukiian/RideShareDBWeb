'use strict';
// ════════════════════════════════════════════════════════════
// RideSharingDB — In-Memory SQL Engine
// Mirrors ride_sharing.sql exactly.
// All tables in E are mutable. DB (from data.js) is read-only seed.
// ════════════════════════════════════════════════════════════

// Deep copy DB into mutable state
var E = {
  users:     JSON.parse(JSON.stringify(DB.users)),
  drivers:   JSON.parse(JSON.stringify(DB.drivers)),
  vehicles:  JSON.parse(JSON.stringify(DB.vehicles)),
  locations: JSON.parse(JSON.stringify(DB.locations)),
  rides:     JSON.parse(JSON.stringify(DB.rides)),
  payments:  JSON.parse(JSON.stringify(DB.payments)),
  ratings:   JSON.parse(JSON.stringify(DB.ratings)),
  promos:    JSON.parse(JSON.stringify(DB.promos)),
  _seq: { users: 43, rides: 43, payments: 43, ratings: 41 },
};

// ── Event bus ────────────────────────────────────────────────
function sqlFire(type, msg, sql) {
  document.dispatchEvent(new CustomEvent('sqlevent', { detail: { type, msg, sql: sql||null } }));
}

// ── 15 INDEX helpers ─────────────────────────────────────────
// Each function mirrors its CREATE INDEX from ride_sharing.sql
var IDX = {
  rides_user:      uid  => E.rides.filter(r => r.uid === uid),
  rides_driver:    did  => E.rides.filter(r => r.did === did),
  rides_status:    st   => E.rides.filter(r => r.status === st),
  rides_fare:      min  => E.rides.filter(r => r.fare > min),
  rides_startloc:  lid  => E.rides.filter(r => r.slid === lid),
  rides_endloc:    lid  => E.rides.filter(r => r.elid === lid),
  rides_starttime: (yr,mo) => E.rides.filter(r => {
    const d = new Date(r.start); return d.getFullYear()===yr && d.getMonth()+1===mo;
  }),
  rides_drv_status:(did,st) => E.rides.filter(r => r.did===did && r.status===st),
  payments_status: st   => E.payments.filter(p => p.status === st),
  payments_ride:   rid  => E.payments.filter(p => p.rid === rid),
  ratings_ride:    rid  => E.ratings.find(r => r.rid === rid),     // UNIQUE
  vehicles_driver: did  => E.vehicles.find(v => v.did === did),
  drivers_status:  st   => E.drivers.filter(d => d.status === st),
  promo_expiry:    ()   => E.promos.filter(p => new Date(p.expiry) > new Date()),
  locations_city:  city => E.locations.filter(l => l.city === city),
};

// ── Lookup helpers ────────────────────────────────────────────
var uname = id => { const u=E.users.find(x=>x.id===id);    return u ? u.first+' '+u.last : '—'; };
var dname = id => { const d=E.drivers.find(x=>x.id===id);  return d ? d.first+' '+d.last : '—'; };
var lname = id => { const l=E.locations.find(x=>x.id===id);return l ? l.name : '—'; };
var lcity = id => { const l=E.locations.find(x=>x.id===id);return l ? l.city : '—'; };

// ════════════════════════════════════════════════════════════
// 7 TRIGGERS
// ════════════════════════════════════════════════════════════

// BR-1: INSTEAD OF INSERT ON rides
function TRG_BR1(uid) {
  sqlFire('trigger','⚡ trg_no_concurrent_rides (BR-1) — INSTEAD OF INSERT ON rides',
    `IF EXISTS(SELECT 1 FROM rides r JOIN inserted i ON r.UserID=i.UserID WHERE r.Status='Pending')\n  RAISERROR('User already has an active pending ride.',16,1); RETURN;`);
  const has = IDX.rides_user(uid).find(r => r.status === 'Pending');
  if (has) {
    sqlFire('error', `  ✗ RAISERROR: UserID=${uid} has Pending RideID=${has.id} — INSERT blocked`);
    return { ok:false, msg:`You already have Pending ride #${has.id}. Cancel it first.\n\n↳ trg_no_concurrent_rides (BR-1) blocked this INSERT.` };
  }
  sqlFire('ok', `  ✓ BR-1 passed — no Pending ride for UserID=${uid}`);
  return { ok:true };
}

// BR-2: AFTER DELETE ON rides
function TRG_BR2(rid) {
  sqlFire('trigger','⚡ trg_prevent_delete_completed (BR-2) — AFTER DELETE ON rides',
    `IF EXISTS(SELECT 1 FROM deleted WHERE Status='Completed')\n  RAISERROR('Completed rides cannot be deleted.',16,1); ROLLBACK TRANSACTION;`);
  const r = E.rides.find(x => x.id === rid);
  if (r && r.status === 'Completed') {
    sqlFire('error', `  ✗ RAISERROR + ROLLBACK: RideID=${rid} is Completed — delete undone`);
    return { ok:false, msg:`Cannot delete ride #${rid} — Status='Completed'.\nCompleted rides are protected for the financial audit trail.\n\n↳ trg_prevent_delete_completed (BR-2) issued ROLLBACK TRANSACTION.` };
  }
  sqlFire('ok', `  ✓ BR-2 passed — RideID=${rid} is '${r?.status}', delete proceeds`);
  return { ok:true };
}

// BR-3: INSTEAD OF INSERT ON payments
function TRG_BR3(rid) {
  sqlFire('trigger',"⚡ trg_validate_payment_ride (BR-3) — INSTEAD OF INSERT ON payments",
    `IF EXISTS(SELECT 1 FROM inserted i JOIN rides r ON i.RideID=r.RideID WHERE r.Status='Cancelled')\n  RAISERROR('Cannot process payment for a cancelled ride.',16,1); RETURN;`);
  const r = E.rides.find(x => x.id === rid);
  if (!r) { sqlFire('error',`  ✗ FK: RideID=${rid} not found`); return { ok:false, msg:`RideID=${rid} does not exist.` }; }
  if (r.status === 'Cancelled') {
    sqlFire('error', `  ✗ RAISERROR: RideID=${rid} is Cancelled — payment INSERT blocked`);
    return { ok:false, msg:`Ride #${rid} is Cancelled — cannot record payment.\n\n↳ trg_validate_payment_ride (BR-3) blocked this INSERT.\n\nThis is the INSTEAD OF trigger — fires before the row is written.` };
  }
  sqlFire('ok', `  ✓ BR-3 passed — RideID=${rid} Status='${r.status}'`);
  return { ok:true };
}

// BR-4: AFTER INSERT ON ratings
function TRG_BR4(rideId) {
  sqlFire('trigger','⚡ trg_update_driver_rating (BR-4) — AFTER INSERT ON ratings',
    `UPDATE drivers SET Rating=(SELECT ROUND(AVG(CAST(ra.DriverRating AS FLOAT)),2)\nFROM ratings ra JOIN rides r ON ra.RideID=r.RideID WHERE r.DriverID=drivers.DriverID)\nWHERE DriverID IN (SELECT r.DriverID FROM inserted i JOIN rides r ON i.RideID=r.RideID)`);
  const ride = E.rides.find(x => x.id === rideId);
  if (!ride) return;
  const rids  = new Set(IDX.rides_driver(ride.did).map(r => r.id));
  const rats  = E.ratings.filter(r => rids.has(r.rid));
  if (!rats.length) return;
  const avg   = Math.round(rats.reduce((s,r) => s+r.dr, 0) / rats.length * 100) / 100;
  const driver = E.drivers.find(x => x.id === ride.did);
  if (driver) { const old=driver.rating; driver.rating=avg; sqlFire('ok',`  ✓ UPDATE drivers SET Rating=${avg} — DriverID=${ride.did} ${driver.first} ${driver.last} (was ${old})`); }
}

// BR-5: AFTER UPDATE ON rides (EndTime set)
function TRG_BR5(rid, start, end) {
  sqlFire('trigger','⚡ trg_calc_duration (BR-5) — AFTER UPDATE ON rides',
    `UPDATE rides SET RideDuration=DATEDIFF(MINUTE,i.StartTime,i.EndTime)\nFROM rides r JOIN inserted i ON r.RideID=i.RideID WHERE i.EndTime IS NOT NULL`);
  const mins = Math.round((new Date(end)-new Date(start))/60000);
  const r = E.rides.find(x => x.id === rid);
  if (r) r.dur = mins;
  sqlFire('ok', `  ✓ SET RideDuration=DATEDIFF(MINUTE,StartTime,EndTime)=${mins}min — RideID=${rid}`);
  return mins;
}

// BR-6: AFTER INSERT ON rides
function TRG_BR6(did) {
  sqlFire('trigger',"⚡ trg_driver_busy_on_ride (BR-6) — AFTER INSERT ON rides",
    `UPDATE drivers SET Status='Busy' FROM drivers d JOIN inserted i ON d.DriverID=i.DriverID WHERE i.Status='Pending'`);
  const d = E.drivers.find(x => x.id === did);
  if (d) { d.status='Busy'; sqlFire('ok',`  ✓ UPDATE drivers SET Status='Busy' — DriverID=${did} ${d.first} ${d.last}`); }
}

// BR-7: AFTER UPDATE ON rides (Completed or Cancelled)
function TRG_BR7(did) {
  sqlFire('trigger',"⚡ trg_driver_available_on_complete (BR-7) — AFTER UPDATE ON rides",
    `UPDATE drivers SET Status='Available' FROM drivers d JOIN inserted i ON d.DriverID=i.DriverID\nJOIN deleted dl ON i.RideID=dl.RideID WHERE i.Status IN ('Completed','Cancelled') AND dl.Status='Pending'`);
  const d = E.drivers.find(x => x.id === did);
  if (d) { d.status='Available'; sqlFire('ok',`  ✓ UPDATE drivers SET Status='Available' — DriverID=${did} ${d.first} ${d.last}`); }
}

// ════════════════════════════════════════════════════════════
// 8 STORED PROCEDURES
// ════════════════════════════════════════════════════════════
var SP = {

  get_user_rides(uid) {
    sqlFire('proc',`EXEC sp_get_user_rides @UserID=${uid}`,
      `SELECT * FROM vw_ride_details WHERE UserID=@UserID  -- idx_rides_user`);
    const rows = IDX.rides_user(uid).map(r => VIEW.rideRow(r));
    sqlFire('ok', `  → ${rows.length} row(s) returned`);
    return rows;
  },

  available_drivers(city) {
    sqlFire('proc',`EXEC sp_available_drivers${city?` @City='${city}'`:''}`,
      `SELECT d.*,v.Model,v.PlateNumber,v.Capacity FROM drivers d\nJOIN vehicles v ON d.DriverID=v.DriverID  -- idx_vehicles_driver\nWHERE d.Status='Available'  -- idx_drivers_status`);
    const rows = IDX.drivers_status('Available').map(d => {
      const v = IDX.vehicles_driver(d.id);
      return { ...d, model: v?.model||'—', plate: v?.plate||'—', cap: v?.cap||'—' };
    });
    sqlFire('ok', `  → ${rows.length} available driver(s)`);
    return rows;
  },

  complete_ride(rid, endTime, fare) {
    sqlFire('proc',`EXEC sp_complete_ride @RideID=${rid}, @EndTime='${endTime}', @Fare=${fare}`,
      `UPDATE rides SET Status='Completed',EndTime=@EndTime,Fare=@Fare WHERE RideID=@RideID AND Status='Pending'`);
    const r = E.rides.find(x => x.id === rid);
    if (!r) return { ok:false, msg:`RideID=${rid} not found.` };
    if (r.status !== 'Pending') return { ok:false, msg:`RideID=${rid} is not Pending (${r.status}).` };
    const did=r.did, start=r.start;
    r.status='Completed'; r.end=endTime; r.fare=Math.round(fare*100)/100;
    sqlFire('ok',`  Ride #${rid} → Completed, Fare=$${r.fare}`);
    TRG_BR5(rid, start, endTime);
    TRG_BR7(did);
    return { ok:true, msg:`Ride #${rid} completed ✓\n\n⚡ BR-5 fired → RideDuration auto-calculated.\n⚡ BR-7 fired → Driver status reset to Available.` };
  },

  apply_promo(rid, promoId) {
    sqlFire('proc',`EXEC sp_apply_promo @RideID=${rid}, @PromoID=${promoId}, @NewFare OUTPUT`,
      `DECLARE @D FLOAT;\nSELECT @D=Discount FROM promocodes WHERE PromoID=@PromoID AND ExpiryDate>GETDATE();  -- idx_promo_expiry\nIF @D IS NULL RAISERROR('Invalid or expired promo.',16,1);\nSET @NewFare=ROUND(@OldFare*(1.0-@D/100.0),2);\nUPDATE rides SET Fare=@NewFare,PromoID=@PromoID WHERE RideID=@RideID;`);
    const r = E.rides.find(x => x.id === rid);
    if (!r) return { ok:false, msg:`RideID=${rid} not found.` };
    const p = IDX.promo_expiry().find(x => x.id === promoId);
    if (!p) { sqlFire('error',`  ✗ Promo ${promoId} invalid or expired`); return { ok:false, msg:`Promo code is invalid or expired.\n\n↳ sp_apply_promo uses idx_promo_expiry — filters WHERE ExpiryDate > GETDATE()` }; }
    const old=r.fare, nf=Math.round(old*(1-p.discount/100)*100)/100;
    r.fare=nf; r.promo=promoId;
    sqlFire('ok',`  ✓ @NewFare OUTPUT = $${nf} (was $${old}, −${p.discount}% code:${p.code})`);
    return { ok:true, newFare:nf, oldFare:old, discount:p.discount, code:p.code, msg:`${p.code} applied ✓\n@NewFare = $${nf} (was $${old}, −${p.discount}%)` };
  },

  monthly_revenue(yr, mo) {
    sqlFire('proc',`EXEC sp_monthly_revenue @Year=${yr}, @Month=${mo}`,
      `SELECT COUNT(*) TotalRides,ROUND(SUM(Fare),2) TotalRevenue,ROUND(AVG(Fare),2) AvgFare,MIN(Fare) MinFare,MAX(Fare) MaxFare\nFROM rides WHERE Status='Completed' AND YEAR(StartTime)=@Year AND MONTH(StartTime)=@Month  -- idx_rides_starttime`);
    const rides = IDX.rides_starttime(yr,mo).filter(r=>r.status==='Completed');
    if (!rides.length) { sqlFire('warn',`  → 0 rows for ${yr}-${String(mo).padStart(2,'0')}`); return { ok:true, empty:true }; }
    const f=rides.map(r=>r.fare);
    const res = { TotalRides:rides.length, TotalRevenue:Math.round(f.reduce((a,b)=>a+b,0)*100)/100, AvgFare:Math.round(f.reduce((a,b)=>a+b,0)/f.length*100)/100, MinFare:Math.min(...f), MaxFare:Math.max(...f) };
    sqlFire('ok',`  → TotalRides=${res.TotalRides} Revenue=$${res.TotalRevenue} Avg=$${res.AvgFare}`);
    return { ok:true, res };
  },

  driver_earnings(did, s, e) {
    sqlFire('proc',`EXEC sp_driver_earnings @DriverID=${did}, @StartDate='${s}', @EndDate='${e}'`,
      `SELECT d.FirstName+' '+d.LastName DriverName,COUNT(r.RideID) Rides,ROUND(SUM(r.Fare),2) TotalEarnings\nFROM rides r JOIN drivers d ON r.DriverID=d.DriverID\nWHERE r.DriverID=@DriverID  -- idx_rides_driver\nAND CAST(r.StartTime AS DATE) BETWEEN @StartDate AND @EndDate AND r.Status='Completed'\nGROUP BY d.DriverID,d.FirstName,d.LastName`);
    const driver=E.drivers.find(x=>x.id===did);
    if(!driver) return {ok:false,msg:`DriverID=${did} not found.`};
    const rides=IDX.rides_driver(did).filter(r=>{if(r.status!=='Completed')return false; const d=r.start.slice(0,10); return d>=s&&d<=e;});
    const res={DriverName:driver.first+' '+driver.last,Rides:rides.length,TotalEarnings:Math.round(rides.reduce((a,r)=>a+r.fare,0)*100)/100};
    sqlFire('ok',`  → ${res.DriverName}: ${res.Rides} rides, $${res.TotalEarnings}`);
    return {ok:true,res};
  },

  register_user(first, last, email, phone) {
    sqlFire('proc',`EXEC sp_register_user @First='${first}', @Last='${last}', @Email='${email}'`,
      `IF EXISTS(SELECT 1 FROM users WHERE Email=@Email) RAISERROR('Email in use.',16,1);  -- UNIQUE(Email)\nIF @Email NOT LIKE '%@%.%' RAISERROR('Bad email.',16,1);  -- CHECK\nINSERT INTO users(FirstName,LastName,Email,Phone,RegistrationDate) VALUES(@First,@Last,@Email,@Phone,GETDATE());\nSELECT SCOPE_IDENTITY() AS NewUserID;`);
    if (E.users.find(u=>u.email.toLowerCase()===email.toLowerCase())) {
      sqlFire('error',`  ✗ UNIQUE(Email) violated: '${email}'`);
      return {ok:false,msg:`Email '${email}' already registered.\n\n↳ UNIQUE constraint on users.Email violated.`};
    }
    if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){sqlFire('error','  ✗ CHECK(Email LIKE "%@%.%") violated'); return {ok:false,msg:`Invalid email format.\n\n↳ CHECK(Email LIKE '%@%.%') violated.`};}
    if(!first.trim()||!last.trim()) return {ok:false,msg:'First and last name required.'};
    const id=E._seq.users++;
    E.users.push({id,first:first.trim(),last:last.trim(),email,phone:phone||'',reg:new Date().toISOString().slice(0,10)});
    sqlFire('ok',`  ✓ NewUserID=${id} (SCOPE_IDENTITY())`);
    return {ok:true,id,msg:`User registered ✓\nNewUserID = ${id} (SCOPE_IDENTITY())`};
  },

  cancel_ride(rid) {
    sqlFire('proc',`EXEC sp_cancel_ride @RideID=${rid}`,
      `UPDATE rides SET Status='Cancelled' WHERE RideID=@RideID AND Status='Pending';\nSELECT @@ROWCOUNT AS RowsUpdated;`);
    const r=E.rides.find(x=>x.id===rid);
    if(!r||r.status!=='Pending'){sqlFire('warn',`  RowsUpdated=0`);return{ok:false,msg:`Ride #${rid} not found or not Pending. RowsUpdated=0.`};}
    const did=r.did; r.status='Cancelled';
    sqlFire('ok',`  RowsUpdated=1 — Ride #${rid} → Cancelled`);
    TRG_BR7(did);
    return {ok:true,msg:`Ride #${rid} cancelled ✓\n\n⚡ BR-7 fired → Driver status reset to Available.`};
  },
};

// ════════════════════════════════════════════════════════════
// DML — INSERT / DELETE with full trigger chains
// ════════════════════════════════════════════════════════════
var DML = {

  insertRide(uid,did,slid,elid,fare,promoId) {
    sqlFire('sql',`INSERT INTO rides(UserID,DriverID,VehicleID,StartLocationID,EndLocationID,Fare,Status,StartTime)\nVALUES(${uid},${did},...,${slid},${elid},${fare},'Pending',GETDATE())`);
    if(!E.users.find(x=>x.id===uid))      return{ok:false,msg:`FK: UserID=${uid} not found.`};
    if(!E.drivers.find(x=>x.id===did))    return{ok:false,msg:`FK: DriverID=${did} not found.`};
    if(!E.locations.find(x=>x.id===slid)) return{ok:false,msg:`FK: StartLocationID=${slid} not found.`};
    if(!E.locations.find(x=>x.id===elid)) return{ok:false,msg:`FK: EndLocationID=${elid} not found.`};
    if(fare<0) return{ok:false,msg:`CHECK(Fare>=0) violated.`};
    const br1=TRG_BR1(uid); if(!br1.ok) return br1;
    const id=E._seq.rides++;
    const vid=(IDX.vehicles_driver(did)||{did}).did;
    const now=new Date().toISOString().replace('T',' ').slice(0,16);
    E.rides.push({id,uid,did,vid,slid,elid,start:now,end:null,fare,status:'Pending',dur:null,promo:promoId||null});
    sqlFire('ok',`  ✓ INSERT complete → RideID=${id} Status='Pending'`);
    TRG_BR6(did);
    return{ok:true,id,msg:`Ride #${id} booked ✓\n\n⚡ BR-6 fired → Driver status set to Busy.`};
  },

  insertPayment(rid,amount,method) {
    sqlFire('sql',`INSERT INTO payments(RideID,Amount,Method,PaymentDate,Status) VALUES(${rid},${amount},'${method}',GETDATE(),'Paid')`);
    if(amount<0) return{ok:false,msg:`CHECK(Amount>=0) violated.`};
    if(!['Cash','Card','Online'].includes(method)) return{ok:false,msg:`CHECK(Method IN 'Cash','Card','Online') violated.`};
    const br3=TRG_BR3(rid); if(!br3.ok) return br3;
    const id=E._seq.payments++;
    E.payments.push({pid:id,rid,amount,method,date:new Date().toISOString().slice(0,10),status:'Paid'});
    sqlFire('ok',`  ✓ PaymentID=${id}, $${amount} via ${method}`);
    return{ok:true,id,msg:`Payment #${id} recorded ✓`};
  },

  insertRating(rid,dr,ur,comment) {
    sqlFire('sql',`INSERT INTO ratings(RideID,DriverRating,UserRating,Comment) VALUES(${rid},${dr},${ur||'NULL'},'${comment||''}')`);
    if(IDX.ratings_ride(rid)){sqlFire('error',`  ✗ UNIQUE(RideID) violated`);return{ok:false,msg:`UNIQUE constraint on ratings.RideID — ride #${rid} already rated.`};}
    if(!dr||dr<1||dr>5) return{ok:false,msg:`CHECK(DriverRating BETWEEN 1 AND 5) NOT NULL violated.`};
    if(ur&&(ur<1||ur>5)) return{ok:false,msg:`CHECK(UserRating BETWEEN 1 AND 5) violated.`};
    if(!E.rides.find(x=>x.id===rid)) return{ok:false,msg:`FK: RideID=${rid} not found.`};
    E.ratings.push({rid,dr,ur:ur||null,comment:comment||null});
    sqlFire('ok',`  ✓ Rating inserted for RideID=${rid}`);
    TRG_BR4(rid);
    return{ok:true,msg:`Rating submitted ✓\n\n⚡ BR-4 fired → Driver.Rating recalculated = ROUND(AVG(DriverRating),2).`};
  },

  deleteRide(rid) {
    sqlFire('sql',`DELETE FROM rides WHERE RideID=${rid}`);
    const idx=E.rides.findIndex(x=>x.id===rid);
    if(idx===-1) return{ok:false,msg:`RideID=${rid} not found.`};
    const br2=TRG_BR2(rid); if(!br2.ok) return br2;
    E.rides.splice(idx,1);
    sqlFire('ok',`  ✓ RideID=${rid} deleted`);
    return{ok:true,msg:`Ride #${rid} deleted.`};
  },
};

// ════════════════════════════════════════════════════════════
// 8 VIEWS
// ════════════════════════════════════════════════════════════
var VIEW = {
  rideRow(r) {
    const u=E.users.find(x=>x.id===r.uid), d=E.drivers.find(x=>x.id===r.did);
    const v=E.vehicles.find(x=>x.did===r.did);
    const sl=E.locations.find(x=>x.id===r.slid), el=E.locations.find(x=>x.id===r.elid);
    const p=r.promo?E.promos.find(x=>x.id===r.promo):null;
    return {
      RideID:r.id, UserName:u?u.first+' '+u.last:'—', DriverName:d?d.first+' '+d.last:'—',
      Vehicle:v?v.model:'—', StartLocation:sl?sl.name:'—', EndLocation:el?el.name:'—',
      City:sl?sl.city:'—', StartTime:r.start, EndTime:r.end, DurationMin:r.dur,
      Fare:r.fare, Status:r.status, PromoCode:p?p.code:null, _r:r,
    };
  },
  vw_ride_details:    () => E.rides.map(r => VIEW.rideRow(r)),
  vw_driver_summary:  () => E.drivers.map(d=>{
    const rides=IDX.rides_driver(d.id).filter(r=>r.status==='Completed');
    const rids=new Set(rides.map(r=>r.id));
    const rats=E.ratings.filter(r=>rids.has(r.rid));
    return{DriverID:d.id,DriverName:d.first+' '+d.last,LicenseNumber:d.lic,Rating:d.rating,
      Status:d.status,TotalRides:rides.length,TotalEarnings:Math.round(rides.reduce((s,r)=>s+r.fare,0)*100)/100,
      AvgRating:rats.length?Math.round(rats.reduce((s,r)=>s+r.dr,0)/rats.length*10)/10:d.rating};
  }).sort((a,b)=>b.Rating-a.Rating),
  vw_user_activity:   () => E.users.map(u=>{
    const rides=IDX.rides_user(u.id).filter(r=>r.status==='Completed');
    const rids=new Set(rides.map(r=>r.id));
    const rats=E.ratings.filter(r=>rids.has(r.rid)&&r.ur);
    return{UserID:u.id,UserName:u.first+' '+u.last,Email:u.email,
      TotalRides:rides.length,TotalSpent:Math.round(rides.reduce((s,r)=>s+r.fare,0)*100)/100,
      AvgUserRating:rats.length?Math.round(rats.reduce((s,r)=>s+r.ur,0)/rats.length*10)/10:null};
  }),
  vw_revenue_by_city: () => {
    const m={};
    E.rides.filter(r=>r.status==='Completed').forEach(r=>{
      const c=lcity(r.slid); if(!c)return;
      m[c]=m[c]||{City:c,TotalRides:0,TotalRevenue:0};
      m[c].TotalRides++; m[c].TotalRevenue=Math.round((m[c].TotalRevenue+r.fare)*100)/100;
    });
    return Object.values(m).map(c=>({...c,AvgFare:Math.round(c.TotalRevenue/c.TotalRides*100)/100})).sort((a,b)=>b.TotalRevenue-a.TotalRevenue);
  },
  vw_payment_overview:() => E.payments.map(p=>{
    const r=E.rides.find(x=>x.id===p.rid), u=r?E.users.find(x=>x.id===r.uid):null;
    return{PaymentID:p.pid,RideID:p.rid,UserName:u?u.first+' '+u.last:'—',Amount:p.amount,Method:p.method,PaymentDate:p.date,Status:p.status};
  }),
  vw_active_promos:   () => IDX.promo_expiry(),
  vw_top_drivers:     () => E.drivers.filter(d=>d.rating>=4.5).sort((a,b)=>b.rating-a.rating),
  vw_pending_rides:   () => IDX.rides_status('Pending').map(r=>({RideID:r.id,UserName:uname(r.uid),DriverName:dname(r.did),StartLocation:lname(r.slid),StartTime:r.start,Fare:r.fare,_r:r})),
};

// ════════════════════════════════════════════════════════════
// 30 DQL QUERIES (σ π ⋈ γ ∪ ∩ − subqueries)
// ════════════════════════════════════════════════════════════
var DQL = {
  Q1: ()=>E.rides.filter(r=>r.status==='Completed'),
  Q2: ()=>IDX.drivers_status('Available'),
  Q3: ()=>IDX.rides_fare(25),
  Q4: ()=>E.users.filter(u=>u.reg>'2023-06-01'),
  Q5: ()=>IDX.promo_expiry().filter(p=>p.discount>20),
  Q6: ()=>E.rides.filter(r=>r.dur>40&&r.status==='Completed'),
  Q7: ()=>IDX.payments_status('Paid').filter(p=>p.method==='Card'),
  Q8: ()=>E.users.map(u=>({FirstName:u.first,LastName:u.last,Email:u.email})),
  Q9: ()=>[...E.drivers].sort((a,b)=>b.rating-a.rating).map(d=>({FirstName:d.first,LastName:d.last,Rating:d.rating})),
  Q10:()=>E.vehicles.map(v=>({PlateNumber:v.plate,Model:v.model,Year:v.year})),
  Q11:()=>E.rides.map(r=>{const u=E.users.find(x=>x.id===r.uid),d=E.drivers.find(x=>x.id===r.did);return{RideID:r.id,Passenger:u?u.first+' '+u.last:'—',Driver:d?d.first+' '+d.last:'—',Fare:r.fare,Status:r.status};}),
  Q12:()=>E.rides.map(r=>{const s=E.locations.find(x=>x.id===r.slid),e=E.locations.find(x=>x.id===r.elid);return{RideID:r.id,StartLocation:s?.name||'—',EndLocation:e?.name||'—',City:s?.city||'—',Fare:r.fare};}),
  Q13:()=>E.drivers.map(d=>{const v=IDX.vehicles_driver(d.id);return{Driver:d.first+' '+d.last,Rating:d.rating,Model:v?.model||'—',Plate:v?.plate||'—',Capacity:v?.cap||'—'};}),
  Q14:()=>E.rides.filter(r=>r.promo).map(r=>{const p=E.promos.find(x=>x.id===r.promo);return{RideID:r.id,Fare:r.fare,Code:p?.code||'—',Discount:p?.discount||0};}),
  Q15:()=>E.payments.map(p=>{const r=E.rides.find(x=>x.id===p.rid),u=r?E.users.find(x=>x.id===r.uid):null;return{PaymentID:p.pid,Passenger:u?u.first+' '+u.last:'—',Amount:p.amount,Method:p.method,Status:p.status};}),
  Q16:()=>{const m={};E.rides.filter(r=>r.status==='Completed').forEach(r=>{const k=dname(r.did);m[k]=m[k]||{Driver:k,Rides:0,TotalEarned:0};m[k].Rides++;m[k].TotalEarned=Math.round((m[k].TotalEarned+r.fare)*100)/100;});return Object.values(m).sort((a,b)=>b.TotalEarned-a.TotalEarned);},
  Q17:()=>VIEW.vw_revenue_by_city(),
  Q18:()=>{const m={};E.rides.forEach(r=>m[r.status]=(m[r.status]||0)+1);return Object.entries(m).map(([Status,Count])=>({Status,Count}));},
  Q19:()=>{const m={};E.drivers.forEach(d=>{const v=IDX.vehicles_driver(d.id);if(v){m[v.cap]=m[v.cap]||{Capacity:v.cap,r:[]};m[v.cap].r.push(d.rating);}});return Object.values(m).map(x=>({Capacity:x.Capacity,AvgRating:Math.round(x.r.reduce((a,b)=>a+b,0)/x.r.length*100)/100})).sort((a,b)=>a.Capacity-b.Capacity);},
  Q20:()=>{const m={};E.rides.filter(r=>r.status==='Completed').forEach(r=>{const k=dname(r.did);m[k]=m[k]||{Driver:k,Rides:0,TotalEarned:0};m[k].Rides++;m[k].TotalEarned=Math.round((m[k].TotalEarned+r.fare)*100)/100;});return Object.values(m).sort((a,b)=>b.TotalEarned-a.TotalEarned).slice(0,5).map((d,i)=>({Rank:i+1,...d}));},
  Q21:()=>{const u=E.users.map(x=>({Name:x.first+' '+x.last,Role:'User'}));const d=E.drivers.map(x=>({Name:x.first+' '+x.last,Role:'Driver'}));return[...u,...d].sort((a,b)=>a.Name.localeCompare(b.Name));},
  Q22:()=>{const s=new Set(E.users.map(u=>u.first));return E.drivers.filter(d=>s.has(d.first)).map(d=>({FirstName:d.first}));},
  Q23:()=>{const s=new Set(E.rides.map(r=>r.uid));return E.users.filter(u=>!s.has(u.id)).map(u=>({UserID:u.id,Name:u.first+' '+u.last}));},
  Q24:()=>{const s=new Set(E.rides.filter(r=>r.status==='Completed').map(r=>r.did));return E.drivers.filter(d=>!s.has(d.id)).map(d=>({DriverID:d.id,Name:d.first+' '+d.last}));},
  Q25:()=>{const c=E.rides.filter(r=>r.status==='Completed');const avg=c.reduce((s,r)=>s+r.fare,0)/Math.max(c.length,1);return c.filter(r=>r.fare>avg).map(r=>({RideID:r.id,Fare:r.fare,AvgFare:Math.round(avg*100)/100}));},
  Q26:()=>{const mx=Math.max(...E.drivers.map(d=>d.rating));return E.drivers.filter(d=>d.rating===mx).map(d=>({DriverID:d.id,Name:d.first+' '+d.last,Rating:d.rating}));},
  Q27:()=>{const sp={};E.rides.filter(r=>r.status==='Completed').forEach(r=>sp[r.uid]=(sp[r.uid]||0)+r.fare);const av=Object.values(sp).reduce((a,b)=>a+b,0)/Math.max(Object.keys(sp).length,1);return Object.entries(sp).filter(([,v])=>v>av).map(([uid,v])=>{const u=E.users.find(x=>x.id===+uid);return{UserName:u?u.first+' '+u.last:'—',TotalSpent:Math.round(v*100)/100};}).sort((a,b)=>b.TotalSpent-a.TotalSpent);},
  Q28:()=>{const c=E.rides.filter(r=>r.status==='Completed');const mx=Math.max(...c.map(r=>r.fare));return c.filter(r=>r.fare===mx).map(r=>{const u=E.users.find(x=>x.id===r.uid);return{RideID:r.id,Passenger:u?u.first+' '+u.last:'—',Fare:r.fare};});},
  Q29:()=>{const m={};E.rides.filter(r=>r.promo).forEach(r=>{const p=E.promos.find(x=>x.id===r.promo);if(p){m[p.id]=m[p.id]||{Code:p.code,TimesUsed:0};m[p.id].TimesUsed++;}});return Object.values(m).filter(x=>x.TimesUsed>1).sort((a,b)=>b.TimesUsed-a.TimesUsed);},
  Q30:()=>{const pr=new Set(IDX.payments_status('Paid').map(p=>p.rid));const rt=new Set(E.ratings.map(r=>r.rid));return E.rides.filter(r=>pr.has(r.id)&&rt.has(r.id)).map(r=>({RideID:r.id,Fare:r.fare,Status:r.status}));},
};

var QMETA = {
  Q1:{op:'σ',nm:'Selection',col:'#06b6d4',expr:"σ_{Status='Completed'}(rides)",sql:"SELECT * FROM rides\nWHERE Status = 'Completed'"},
  Q2:{op:'σ',nm:'Selection',col:'#06b6d4',expr:"σ_{Status='Available'}(drivers)",sql:"SELECT * FROM drivers\nWHERE Status = 'Available'  -- idx_drivers_status"},
  Q3:{op:'σ',nm:'Selection',col:'#06b6d4',expr:'σ_{Fare > 25}(rides)',sql:'SELECT * FROM rides\nWHERE Fare > 25  -- idx_rides_fare'},
  Q4:{op:'σ',nm:'Selection',col:'#06b6d4',expr:"σ_{RegistrationDate > '2023-06-01'}(users)",sql:"SELECT * FROM users\nWHERE RegistrationDate > '2023-06-01'"},
  Q5:{op:'σ',nm:'Selection',col:'#06b6d4',expr:'σ_{Discount>20 ∧ ExpiryDate>NOW}(promos)',sql:'SELECT * FROM promocodes\nWHERE Discount > 20\n  AND ExpiryDate > GETDATE()  -- idx_promo_expiry'},
  Q6:{op:'σ',nm:'Selection',col:'#06b6d4',expr:"σ_{RideDuration>40 ∧ Status='Completed'}(rides)",sql:"SELECT * FROM rides\nWHERE RideDuration > 40 AND Status='Completed'"},
  Q7:{op:'σ',nm:'Selection',col:'#06b6d4',expr:"σ_{Method='Card' ∧ Status='Paid'}(payments)",sql:"SELECT * FROM payments\nWHERE Method='Card' AND Status='Paid'  -- idx_payments_status"},
  Q8:{op:'π',nm:'Projection',col:'#8b5cf6',expr:'π_{FirstName,LastName,Email}(users)',sql:'SELECT FirstName, LastName, Email FROM users'},
  Q9:{op:'π',nm:'Projection',col:'#8b5cf6',expr:'π_{FirstName,LastName,Rating}(drivers) ORDER BY Rating DESC',sql:'SELECT FirstName, LastName, Rating FROM drivers ORDER BY Rating DESC'},
  Q10:{op:'π',nm:'Projection',col:'#8b5cf6',expr:'π_{PlateNumber,Model,Year}(vehicles)',sql:'SELECT PlateNumber, Model, Year FROM vehicles'},
  Q11:{op:'⋈',nm:'Natural Join',col:'#f59e0b',expr:'rides ⋈_{UserID} users ⋈_{DriverID} drivers',sql:"SELECT r.RideID,\n  u.FirstName+' '+u.LastName AS Passenger,\n  d.FirstName+' '+d.LastName AS Driver,\n  r.Fare, r.Status\nFROM rides r\nJOIN users   u ON r.UserID   = u.UserID\nJOIN drivers d ON r.DriverID = d.DriverID"},
  Q12:{op:'⋈',nm:'Natural Join',col:'#f59e0b',expr:'rides ⋈_{StartLocID} locs(s) ⋈_{EndLocID} locs(e)',sql:"SELECT r.RideID, s.Name AS StartLoc, e.Name AS EndLoc, s.City, r.Fare\nFROM rides r\nJOIN locations s ON r.StartLocationID = s.LocationID  -- idx_rides_startloc\nJOIN locations e ON r.EndLocationID   = e.LocationID  -- idx_rides_endloc"},
  Q13:{op:'⋈',nm:'Natural Join',col:'#f59e0b',expr:'drivers ⋈_{DriverID} vehicles',sql:"SELECT d.FirstName+' '+d.LastName AS Driver, d.Rating,\n  v.Model, v.PlateNumber, v.Capacity\nFROM drivers d\nJOIN vehicles v ON d.DriverID = v.DriverID  -- idx_vehicles_driver"},
  Q14:{op:'⋈',nm:'Natural Join',col:'#f59e0b',expr:'rides ⋈_{PromoID} promocodes',sql:'SELECT r.RideID, r.Fare, p.Code, p.Discount\nFROM rides r\nJOIN promocodes p ON r.PromoID = p.PromoID'},
  Q15:{op:'⋈',nm:'Natural Join',col:'#f59e0b',expr:'payments ⋈_{RideID} rides ⋈_{UserID} users',sql:"SELECT pay.PaymentID, u.FirstName+' '+u.LastName AS Passenger,\n  pay.Amount, pay.Method, pay.Status\nFROM payments pay\nJOIN rides r ON pay.RideID = r.RideID  -- idx_payments_ride\nJOIN users  u ON r.UserID  = u.UserID"},
  Q16:{op:'γ',nm:'Aggregation',col:'#10b981',expr:'γ_{DriverID} SUM(Fare), COUNT(*) (rides ⋈ drivers)',sql:"SELECT d.FirstName+' '+d.LastName AS Driver,\n  COUNT(*) AS Rides, ROUND(SUM(r.Fare),2) AS TotalEarned\nFROM rides r JOIN drivers d ON r.DriverID=d.DriverID\nWHERE r.Status='Completed'  -- idx_rides_driver\nGROUP BY d.DriverID,d.FirstName,d.LastName\nORDER BY TotalEarned DESC"},
  Q17:{op:'γ',nm:'Aggregation',col:'#10b981',expr:'γ_{City} SUM(Fare), COUNT(*) (rides ⋈ locations)',sql:"SELECT l.City, COUNT(*) TotalRides,\n  ROUND(SUM(r.Fare),2) TotalRevenue, ROUND(AVG(r.Fare),2) AvgFare\nFROM rides r\nJOIN locations l ON r.StartLocationID=l.LocationID  -- idx_rides_startloc\nWHERE r.Status='Completed'\nGROUP BY l.City ORDER BY TotalRevenue DESC"},
  Q18:{op:'γ',nm:'Aggregation',col:'#10b981',expr:'γ_{Status} COUNT(*) (rides)',sql:'SELECT Status, COUNT(*) AS RideCount FROM rides GROUP BY Status'},
  Q19:{op:'γ',nm:'Aggregation',col:'#10b981',expr:'γ_{Capacity} AVG(Rating) (drivers ⋈ vehicles)',sql:'SELECT v.Capacity, ROUND(AVG(d.Rating),2) AS AvgRating\nFROM drivers d JOIN vehicles v ON d.DriverID=v.DriverID\nGROUP BY v.Capacity ORDER BY v.Capacity'},
  Q20:{op:'γ',nm:'Aggregation',col:'#10b981',expr:'TOP 5: γ_{DriverID} SUM(Fare) DESC',sql:"SELECT TOP 5 d.FirstName+' '+d.LastName AS Driver,\n  ROUND(SUM(r.Fare),2) AS TotalEarned\nFROM rides r JOIN drivers d ON r.DriverID=d.DriverID\nWHERE r.Status='Completed'\nGROUP BY d.DriverID,d.FirstName,d.LastName\nORDER BY TotalEarned DESC"},
  Q21:{op:'∪',nm:'Union',col:'#ec4899',expr:"π_{Name}(users) ∪ π_{Name}(drivers)",sql:"SELECT FirstName+' '+LastName Name,'User' Role FROM users\nUNION\nSELECT FirstName+' '+LastName Name,'Driver' Role FROM drivers\nORDER BY Name"},
  Q22:{op:'∩',nm:'Intersection',col:'#f97316',expr:'π_{FirstName}(users) ∩ π_{FirstName}(drivers)',sql:'SELECT FirstName FROM users\nINTERSECT\nSELECT FirstName FROM drivers'},
  Q23:{op:'−',nm:'Difference',col:'#ef4444',expr:'π_{UserID}(users) − π_{UserID}(rides)',sql:'SELECT UserID,FirstName,LastName FROM users\nWHERE UserID NOT IN(SELECT DISTINCT UserID FROM rides)  -- idx_rides_user'},
  Q24:{op:'−',nm:'Difference',col:'#ef4444',expr:"π_{DriverID}(drivers) − π_{DriverID}(σ_{Completed}(rides))",sql:"SELECT DriverID,FirstName,LastName FROM drivers\nWHERE DriverID NOT IN(\n  SELECT DISTINCT DriverID FROM rides WHERE Status='Completed')"},
  Q25:{op:'+',nm:'Subquery',col:'#6366f1',expr:'σ_{Fare > AVG(Fare)}(σ_{Completed}(rides))',sql:"SELECT RideID,Fare FROM rides\nWHERE Status='Completed'\n  AND Fare>(SELECT AVG(Fare) FROM rides WHERE Status='Completed')"},
  Q26:{op:'+',nm:'Subquery',col:'#6366f1',expr:'σ_{Rating = MAX(Rating)}(drivers)',sql:"SELECT DriverID,FirstName+' '+LastName DriverName,Rating FROM drivers\nWHERE Rating=(SELECT MAX(Rating) FROM drivers)"},
  Q27:{op:'+',nm:'Subquery',col:'#6366f1',expr:'HAVING SUM(Fare) > AVG_spend_per_user',sql:"SELECT u.UserID,u.FirstName+' '+u.LastName UserName,ROUND(SUM(r.Fare),2) TotalSpent\nFROM users u JOIN rides r ON u.UserID=r.UserID AND r.Status='Completed'\nGROUP BY u.UserID,u.FirstName,u.LastName\nHAVING SUM(r.Fare)>(SELECT AVG(t) FROM(SELECT SUM(Fare) t FROM rides WHERE Status='Completed' GROUP BY UserID)s)"},
  Q28:{op:'+',nm:'Subquery',col:'#6366f1',expr:'σ_{Fare = MAX(Fare)}(completed rides ⋈ users)',sql:"SELECT r.RideID,u.FirstName+' '+u.LastName Passenger,r.Fare\nFROM rides r JOIN users u ON r.UserID=u.UserID\nWHERE r.Status='Completed'\n  AND r.Fare=(SELECT MAX(Fare) FROM rides WHERE Status='Completed')"},
  Q29:{op:'+',nm:'Subquery',col:'#6366f1',expr:'HAVING COUNT(RideID)>1 (γ_{PromoID}(rides ⋈ promos))',sql:'SELECT p.Code,p.Discount,COUNT(r.RideID) TimesUsed\nFROM rides r JOIN promocodes p ON r.PromoID=p.PromoID\nGROUP BY p.PromoID,p.Code,p.Discount\nHAVING COUNT(r.RideID)>1 ORDER BY TimesUsed DESC'},
  Q30:{op:'+',nm:'Subquery',col:'#6366f1',expr:'σ_{RideID∈paid ∧ RideID∈rated}(rides)',sql:"SELECT r.RideID,r.Fare,r.Status FROM rides r\nWHERE r.RideID IN(SELECT RideID FROM payments WHERE Status='Paid')  -- idx_payments_status\n  AND r.RideID IN(SELECT RideID FROM ratings)  -- idx_ratings_ride"},
};
