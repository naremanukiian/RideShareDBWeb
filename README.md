# RideSharingDB System

> Complete SQL Server database for a ride-sharing service with full lifecycle management, automation, and data integrity.

---

## 🌐 Live Demo

**[→ View the Interactive Dashboard](https://naremanukiian.github.io/RideSharingDBSystem)**

The dashboard is a fully interactive web interface built directly from the SQL data. Select your role and explore the database from four different perspectives:

| Role | SQL Login | Access |
|------|-----------|--------|
| 🧑 Passenger | `ride_app` | My rides, payments, promo codes |
| 🚗 Driver | `ride_app` | My trips, earnings, ratings, vehicle |
| 📊 Analyst | `ride_report` | All data — read-only analytics |
| 🛡 DBA Admin | `ride_dba` | Full system — schema, triggers, procedures, DCL |

No installation needed — runs entirely in the browser.

---

## 📁 Repository Structure

```
RideSharingDBSystem/
│
├── ride_sharing.sql   ← Complete SQL Server script (1,279 lines)
│
├── index.html               ← Dashboard web app
├── style.css                ← Styles
├── app.js                   ← Application logic
└── data.js                  ← Pre-extracted database data (JSON)
```

---

## 🗄️ Database Overview

**DBMS:** Microsoft SQL Server 2019+ (T-SQL · SSMS 22)

| Component | Count | Details |
|-----------|-------|---------|
| Tables | 8 | users, drivers, vehicles, locations, rides, payments, ratings, promocodes |
| Records | 336 | 42 rows per table (40 for ratings) |
| Foreign Keys | 9 | With CASCADE and NO ACTION constraints |
| CHECK Constraints | 12 | Enum values, ranges, email format |
| UNIQUE Constraints | 6 | Email, LicenseNumber, PlateNumber, Code, RideID in ratings |
| Indexes | 15 | Non-clustered on high-traffic columns |
| Views | 8 | vw_ride_details, vw_driver_summary, vw_revenue_by_city, and more |
| Triggers | 7 | AFTER + INSTEAD OF — business rules at engine level |
| Stored Procedures | 8 | Full application operation coverage |
| DQL Queries | 30 | All 7 relational algebra operations |
| DCL Users | 3 | ride_app, ride_report, ride_dba |

---

## 🏗️ Schema

```
users ──────────────────────────────────────────── rides
drivers ──────── vehicles                            │
locations (×2 — start + end) ────────────────────── │
promocodes (optional FK) ────────────────────────── │
                                                     ├── payments
                                                     └── ratings
```

**Normalisation:** Full 3NF — all transitive dependencies eliminated.

---

## ⚡ Triggers — Business Rules at Engine Level

| Trigger | Table | Type | Rule |
|---------|-------|------|------|
| `trg_calc_duration` | rides | AFTER UPDATE | Auto-computes RideDuration |
| `trg_update_driver_rating` | ratings | AFTER INSERT | Recalculates driver avg rating |
| `trg_driver_busy_on_ride` | rides | AFTER INSERT | Sets driver Busy on new ride |
| `trg_driver_available_on_complete` | rides | AFTER UPDATE | Resets driver to Available |
| `trg_no_concurrent_rides` | rides | INSTEAD OF INSERT | Blocks duplicate active rides |
| `trg_validate_payment_ride` | payments | INSTEAD OF INSERT | Blocks payment on cancelled rides |
| `trg_prevent_delete_completed` | rides | AFTER DELETE | ROLLBACK on completed ride delete |

---

## 🔐 Access Control (DCL)

```sql
-- App user: read/write, no delete
GRANT SELECT, INSERT, UPDATE ON SCHEMA::dbo TO ride_app;
DENY  DELETE                  ON SCHEMA::dbo TO ride_app;

-- Report user: read only
GRANT SELECT ON SCHEMA::dbo TO ride_report;

-- DBA: full control
ALTER ROLE db_owner ADD MEMBER ride_dba;
```

---

## 🚀 How to Deploy

1. Open **SSMS 22** and connect to SQL Server
2. Open `ride_sharing.sql`
3. Press **Ctrl + Shift + Enter**
4. Script is idempotent — safe to run multiple times

---

## 🌐 Live Dashboard

The interactive dashboard at **[naremanukiian.github.io/RideSharingDBSystem](https://naremanukiian.github.io/RideSharingDBSystem)** runs entirely in the browser. All data was extracted directly from `ride_sharing.sql`. The four role views match what each SQL login can actually access in SQL Server.

---

*SQL Server 2019+ · T-SQL · SSMS 22 · Full 3NF · Zero errors*
