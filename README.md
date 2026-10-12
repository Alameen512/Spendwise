# 💰 SpendWise

A modern, responsive full-stack personal finance web application. Track income, expenses,
budgets and savings goals, and see it all visualized in a clean fintech-style dashboard.

> **Stack:** HTML5 · CSS3 · Bootstrap 5 · Vanilla JavaScript (Fetch API) · Python · Django ·
> Django REST Framework · SQLite

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running the Development Server](#running-the-development-server)
- [API Endpoints](#api-endpoints)
- [Example API Requests](#example-api-requests)
- [Testing with Postman](#testing-with-postman)
- [Security & Permissions](#security--permissions)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Overview

SpendWise lets a user register, log in, and manage their personal finances: recording
transactions, organizing them into categories, setting category budgets, tracking savings
goals, and reviewing spending analytics — all currency-formatted in Nigerian Naira (₦) by
default (configurable per-user).

The **frontend never talks to the database directly**. Every piece of data — dashboard
stats, transactions, budgets, savings goals, analytics — is fetched from and written to a
Django REST Framework API using the browser's native `fetch()` API.

## Features

- 🔐 Token-based authentication (register, login, logout, change password, profile)
- 📊 Personalized dashboard with live totals (Balance, Income, Expenses, Savings), filterable
  by week / month / year
- 💸 Full transaction CRUD with search, category filter, type filter, date range filter, and
  sortable columns
- 🏷️ Default + custom categories, scoped per user
- 🎯 Category-based budgets with live "spent / remaining" calculation and progress bars
- 🐖 Savings goals with progress tracking and an "Add Funds" flow
- 📈 Analytics page (income vs. expenses trend, spending by category, monthly spend, savings
  progress) rendered with Chart.js from a dedicated API endpoint
- 🌗 Light / dark theme toggle
- 📱 Fully responsive: collapsible sidebar, stacked cards, responsive tables on mobile
- 🔔 Toast notifications, loading skeletons, and empty states throughout
- 🛡️ Every endpoint is user-scoped — nobody can see or touch another user's data

## Tech Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Frontend   | HTML5, CSS3, Bootstrap 5, Vanilla JavaScript  |
| Charts     | Chart.js                                      |
| Backend    | Python, Django                                |
| API        | Django REST Framework                         |
| Auth       | DRF Token Authentication + Django sessions    |
| Database   | SQLite                                        |

**Deliberately not used:** React, Next.js, Tailwind CSS, TypeScript, Node.js frameworks.

## Architecture

```
HTML / CSS / Bootstrap
        ↓
  Vanilla JavaScript
        ↓
      Fetch API
        ↓
Django REST Framework
        ↓
     Django ORM
        ↓
      SQLite
```

The frontend is a set of server-rendered HTML "shells" (via Django templates) with **no
data baked in** — every number, table row, chart, and progress bar is populated client-side
via `fetch()` calls to `/api/...`. Financial calculations (balance, budget remaining, etc.)
are computed on the backend, so the API is always the source of truth.

## Project Structure

```
spendwise/
├── manage.py
├── requirements.txt
├── .gitignore
├── db.sqlite3                 (created after migration)
│
├── spendwise/                 # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
│
├── finance/                   # The one Django app powering everything
│   ├── models.py              # Profile, Category, Transaction, Budget, SavingsGoal, Notification
│   ├── serializers.py         # DRF serializers for every model
│   ├── api_views.py           # Auth views, ViewSets, Dashboard & Analytics APIViews
│   ├── api_urls.py            # /api/... routes
│   ├── views.py                # Server-rendered page "shells"
│   ├── permissions.py         # IsOwner object-level permission
│   ├── signals.py             # Auto-create Profile + default categories on registration
│   └── admin.py                # Customized Django Admin
│
├── templates/                 # Django templates (base + one per page)
│   ├── base.html               # App shell: sidebar + topbar
│   ├── home.html, login.html, register.html
│   └── dashboard.html, transactions.html, budgets.html, savings.html, analytics.html, profile.html
│
└── static/
    ├── css/style.css           # Design tokens, light/dark theme, components
    └── js/
        ├── main.js             # fetch() wrapper, toasts, theme, sidebar
        ├── auth.js             # login / register / logout / session guard
        ├── dashboard.js
        ├── transactions.js
        ├── budgets.js
        ├── savings.js
        ├── analytics.js
        └── profile.js
```

## Installation

> Requires **Python 3.10+**.

```bash
# 1. Clone / unzip the project, then move into it
cd spendwise

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Apply migrations (creates db.sqlite3 and all tables)
python manage.py makemigrations
python manage.py migrate

# 5. Create a superuser (for /admin/)
python manage.py createsuperuser
```

## Running the Development Server

```bash
python manage.py runserver
```

Then open:

- **App:** http://127.0.0.1:8000/
- **Django Admin:** http://127.0.0.1:8000/admin/
- **API root:** http://127.0.0.1:8000/api/

Register a new account from the UI (this automatically creates a `Profile` and the default
category set — Food, Transport, Education, Entertainment, Shopping, Bills, Health, Savings,
Other — via a `post_save` signal on `User`).

## API Endpoints

All endpoints below are prefixed with `/api/`. Endpoints other than `auth/register/` and
`auth/login/` require the header `Authorization: Token <your-token>`.

### Auth
| Method | Endpoint                      | Description                          |
|--------|--------------------------------|---------------------------------------|
| POST   | `/api/auth/register/`         | Create an account, returns user + token |
| POST   | `/api/auth/login/`            | Log in, returns user + token          |
| POST   | `/api/auth/logout/`           | Invalidate the current token          |
| GET    | `/api/auth/me/`               | Current user + profile                |
| POST   | `/api/auth/change-password/`  | Change password (rotates token)       |

### Profile
| Method       | Endpoint          | Description        |
|--------------|-------------------|---------------------|
| GET/PUT/PATCH| `/api/profile/`   | View/update the logged-in user's profile |

### Categories
| Method | Endpoint                    |
|--------|-------------------------------|
| GET    | `/api/categories/`            |
| POST   | `/api/categories/`            |
| GET    | `/api/categories/<id>/`       |
| PUT/PATCH | `/api/categories/<id>/`    |
| DELETE | `/api/categories/<id>/`       |

### Transactions
| Method | Endpoint                        |
|--------|-----------------------------------|
| GET    | `/api/transactions/` *(supports `?type=`, `?category=`, `?date_from=`, `?date_to=`, `?period=`, `?q=`, `?ordering=`)* |
| POST   | `/api/transactions/`              |
| GET    | `/api/transactions/<id>/`         |
| PUT/PATCH | `/api/transactions/<id>/`      |
| DELETE | `/api/transactions/<id>/`         |

### Budgets
| Method | Endpoint                    |
|--------|-------------------------------|
| GET/POST | `/api/budgets/`              |
| GET/PUT/PATCH/DELETE | `/api/budgets/<id>/` |

### Savings Goals
| Method | Endpoint                        |
|--------|-----------------------------------|
| GET/POST | `/api/savings-goals/`            |
| GET/PUT/PATCH/DELETE | `/api/savings-goals/<id>/` |

### Notifications
| Method | Endpoint                        |
|--------|-----------------------------------|
| GET    | `/api/notifications/`             |
| PATCH  | `/api/notifications/<id>/` *(mark read)* |
| DELETE | `/api/notifications/<id>/`        |

### Dashboard & Analytics
| Method | Endpoint                              |
|--------|-----------------------------------------|
| GET    | `/api/dashboard/?period=week\|month\|year\|all` |
| GET    | `/api/analytics/?months=6`             |

## Example API Requests

**Register**
```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "ada",
  "email": "ada@example.com",
  "password": "SuperSecret123",
  "password2": "SuperSecret123"
}
```

**Login**
```http
POST /api/auth/login/
Content-Type: application/json

{ "username": "ada", "password": "SuperSecret123" }
```
Response includes `"token": "..."` — send it back as `Authorization: Token <token>` on every
subsequent request.

**Create a transaction**
```http
POST /api/transactions/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
Content-Type: application/json

{
  "transaction_type": "expense",
  "description": "Groceries",
  "amount": "12500.00",
  "date": "2026-08-15",
  "category": 1,
  "notes": "Weekly shopping"
}
```

**Get dashboard totals for this month**
```http
GET /api/dashboard/?period=month
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4
```

## Testing with Postman

1. Import a new collection and set a collection variable `base_url = http://127.0.0.1:8000/api`.
2. Call `POST {{base_url}}/auth/login/` with your credentials; copy the `token` from the response.
3. In your collection's **Authorization** tab, choose **API Key**, key `Authorization`, value
   `Token <paste-token-here>`, and add it to the header.
4. You can now exercise every resource: `GET/POST {{base_url}}/transactions/`,
   `GET/PUT/PATCH/DELETE {{base_url}}/transactions/1/`, and likewise for `categories`,
   `budgets`, and `savings-goals`.
5. Expected status codes: `200` (read/update), `201` (created), `204` (deleted / logged out),
   `400` (validation error), `401` (missing/invalid token), `403` (not your resource), `404`
   (not found).

## Security & Permissions

- Passwords are hashed with Django's built-in password hasher — never stored in plain text.
- Every list/detail endpoint filters its queryset by `request.user`, and object-level access
  is additionally enforced by a custom `IsOwner` permission — a user can never read, edit, or
  delete another user's transactions, budgets, categories, or savings goals.
- Financial totals (balance, budget spent/remaining, savings percentage) are computed
  server-side in `models.py` / `api_views.py`, not trusted from the client.
- Session-based CSRF protection remains active for the Django Admin and any session-based
  requests; the JSON API primarily uses DRF Token Authentication.

## Future Improvements

- Recurring transactions and scheduled budgets
- CSV/PDF export of transactions and reports
- Push/email notifications for budget overspend and upcoming savings deadlines
- Multi-currency conversion using a live exchange-rate API
- Shared/household budgets with multiple users per account

## Author

Built as a demonstration full-stack project showcasing Django, Django REST Framework, REST
API design, and vanilla JavaScript `fetch()`-driven frontends.
