# Multi-Company Management System

This is a simple management system for 5 companies. Every company has its own PostgreSQL database, but all of them use the same backend and the same React frontend. Users from any company log in on the same login page and they can only see their own company details and users.

## Tech Stack

- Frontend: React (Vite)
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JWT, passwords hashed with bcrypt

## How it works

- There is one main database called `mcms_master`. It only stores the list of companies and which company each username belongs to.
- Each company has a separate database (`mcms_company_1` to `mcms_company_5`). Company details and users are stored there.
- When a user logs in, the backend first checks `mcms_master` to find the company, then connects to that company's database and checks the password.
- After login a JWT token is created with the user id, role and company id. For every API request the backend reads the company id from this token and uses only that company's database. So one company can't see another company's data.
- Admin can add, edit, deactivate and delete users and also edit company details. Employee can only view. This is checked in the backend also, not only in the UI.

## Database Details

### Databases

| Database | Used for |
|---|---|
| mcms_master | Company list and username to company mapping |
| mcms_company_1 | YM AUTOMATION Pvt Ltd |
| mcms_company_2 | STEEL ENGINEERING PVT Ltd |
| mcms_company_3 | MSC Logistics |
| mcms_company_4 | Omega Health Care |
| mcms_company_5 | Sakthi Finance |

### mcms_master tables

**companies**
- id (serial, primary key)
- code (unique)
- db_name (unique)
- created_at

**user_directory**
- username (primary key, unique across all companies)
- company_id (references companies.id)

### Company database tables (same in all 5)

**company** (only one row)
- id, name, industry, email, phone, address, website, updated_at

**users**
- id (serial, primary key)
- username (unique)
- password_hash
- full_name
- email
- role (Admin / Employee)
- is_active (inactive users can't log in)
- created_at, updated_at

SQL files are in `backend/sql/`.

### Login details for testing

All Admin passwords are `Admin@123` and all Employee passwords are `Employee@123`.

| Company | Role | Username |
|---|---|---|
| YM AUTOMATION Pvt Ltd | Admin | ym.admin |
| YM AUTOMATION Pvt Ltd | Employee | ym.priya |
| YM AUTOMATION Pvt Ltd | Employee | ym.karthik |
| STEEL ENGINEERING PVT Ltd | Admin | steel.admin |
| STEEL ENGINEERING PVT Ltd | Employee | steel.rahul |
| MSC Logistics | Admin | msc.admin |
| MSC Logistics | Employee | msc.anita |
| Omega Health Care | Admin | omega.admin |
| Omega Health Care | Employee | omega.joseph |
| Sakthi Finance | Admin | sakthi.admin |
| Sakthi Finance | Employee | sakthi.divya |

## Project Setup

### Requirements

- Node.js 18 or above
- PostgreSQL (I used version 17)

### Backend

```
cd backend
npm install
copy .env.example .env
```

Open `.env` and change `PGPASSWORD` to your PostgreSQL password. You can also change `JWT_SECRET`.

Create the databases and sample data:

```
npm run db:setup
```

This creates `mcms_master` and the 5 company databases with tables and sample users. To delete everything and create again, use `npm run db:reset`.

Start the backend:

```
npm run dev
```

Backend runs on http://localhost:5000

### Frontend

Open another terminal:

```
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173. API calls go to the backend through the Vite proxy.

### Testing

1. Login with `ym.admin`. You will see YM AUTOMATION details and its users with Add, Edit, Deactivate and Delete options.
2. Logout and login with `msc.admin`. Now you will see MSC Logistics details and a different user list.
3. Login with `ym.priya` (Employee). Only view is possible, no edit options.

## API Endpoints

| Method | URL | Who can use | Description |
|---|---|---|---|
| POST | /api/auth/login | Everyone | Login |
| GET | /api/auth/me | Logged in user | Current user details |
| GET | /api/company | Logged in user | Get company details |
| PUT | /api/company | Admin | Update company details |
| GET | /api/users | Logged in user | Get all users of the company |
| POST | /api/users | Admin | Add user |
| PUT | /api/users/:id | Admin | Edit user / activate / deactivate |
| DELETE | /api/users/:id | Admin | Delete user |

All APIs except login need the token in the header: `Authorization: Bearer <token>`

## Notes

- Username should be unique across all companies because the login page uses it to find the company. Username can't be changed after creating.
- Deactivate keeps the user but blocks login. Delete removes the user fully.
- Admin can't delete or deactivate their own account.

## Folder Structure

```
backend/
  scripts/setup-db.js     - creates databases and sample data
  sql/master.sql          - master database tables
  sql/company.sql         - company database tables
  src/index.js            - express server
  src/config/db.js        - database connections
  src/middleware/auth.js  - JWT check and role check
  src/routes/             - auth, company and users APIs
frontend/
  src/App.jsx
  src/api.js
  src/pages/LoginPage.jsx
  src/pages/UserPage.jsx
  src/components/         - CompanyCard, UserFormModal
```