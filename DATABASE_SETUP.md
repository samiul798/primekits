# Primkits PostgreSQL setup

This project uses Next.js + Drizzle ORM + PostgreSQL.

## 1. Create the database
In pgAdmin Query Tool or psql:

```sql
CREATE DATABASE "Primkits";
```

If it already exists, do nothing.

## 2. Create `.env`
Copy `.env.example` to `.env` and replace `YOUR_POSTGRES_PASSWORD` with your PostgreSQL password.

Example:

```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/Primkits
JWT_SECRET=replace-with-a-long-random-secret
SEED_SECRET=replace-with-a-separate-long-random-secret
SEED_ADMIN_PASSWORD=choose-a-strong-initial-admin-password
```

## 3. Install dependencies

```bash
npm install
```

## 4. Create/sync all database tables from `src/db/schema.ts`

```bash
npm run db:push
```

## 5. Start the website

```bash
npm run dev
```

Then open:

`http://localhost:3000`

## 6. Seed demo/admin data
After the server starts, send an authorized POST request to:

`http://localhost:3000/api/seed`

Include the `x-seed-secret` header with the value of `SEED_SECRET`. This creates
the initial admin, categories, couriers, supplier, coupon and demo products if
they do not already exist.

The initial administrator is:
- Email: `admin@primekits.studio`
- Password: the value of `SEED_ADMIN_PASSWORD`

Change the admin password after first login.
