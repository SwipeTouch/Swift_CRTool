# MySQL import scripts

## Full import (schema + demo data)

**File:** [`crms-full-import.sql`](./crms-full-import.sql)

Creates database `crms`, all tables, and demo data matching `npm run db:seed`:

| Data | Count |
|------|-------|
| Institutions | 5 |
| Users | 12 (4 internal + 8 client raisers) |
| Change requests | 21 |
| Notifications | 42 |

**Password for every account:** `demo123`

### Import on a server

```bash
mysql -u YOUR_USER -p < docs/sql/crms-full-import.sql
```

Or via Adminer / phpMyAdmin / Plesk: upload `crms-full-import.sql` and execute.

### Import locally (Docker)

```bash
docker compose up -d
docker compose exec -T mysql mysql -uroot -pcrms_dev_root < docs/sql/crms-full-import.sql
```

Then set `.env`:

```
DATABASE_URL="mysql://crms:crms_dev@localhost:3307/crms"
```

### Regenerate after schema/seed changes

```bash
npm run sql:generate --workspace=@crms/api
```

## Demo logins

| Role | Email | Org code |
|------|-------|----------|
| Admin | `admin@swipetouch.local` | — |
| Approver | `approver@swipetouch.local` | — |
| Staff | `staff1@swipetouch.local`, `staff2@swipetouch.local` | — |
| Client | `client@demoschool.local` | `demoschool` |
| Client | `admin@greenvalley.edu.in` | `greenvalley` |
| Client | `cr@stmarys.edu.in` | `stmarys` |
| Client | `office@davcm.edu.in` | `davcollege` |
| Client | `hello@sunriseacademy.in` | `sunrise` |
