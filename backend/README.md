# Backend password hashing

## Setup

Run these commands from `backend/`:

```bash
python -m venv .venv
```

Activate the environment on Windows with `.venv\Scripts\activate`, or on
macOS/Linux with `source .venv/bin/activate`. Then:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env`. Set `SECRET_KEY` to a random secret, which you can
generate with `python -c "import secrets; print(secrets.token_hex(32))"`.
Leave `DATABASE_URL` empty to use SQLite (`punchlist.db`), or set it to the
PostgreSQL connection URL. Start the API:

```bash
uvicorn app.main:app --reload --port 4000
```

Open http://localhost:4000/docs to try the endpoints.

## Register and verify a password

Send `POST /api/auth/register` with JSON:

```json
{
  "email": "student@example.com",
  "password": "example-password",
  "full_name": "Test Student",
  "role": "field_inspector"
}
```

Registration requires at least 8 characters and at most 72 UTF-8 bytes. A fresh
bcrypt salt is generated for each password with cost 12. Only the complete hash
is stored in `users.hashed_pw`; it includes the salt and cost, so no separate
salt column is needed. Passwords are never truncated. The hash is omitted from
registration, profile, and user-management responses.

Send `POST /api/auth/token` as form data, using the email as `username` and
the original password as `password`. Login checks the supplied password against
the saved bcrypt hash and returns a bearer token on success, or HTTP 401 on
failure. Hashes created by the previous bcrypt implementation remain usable.

In Swagger, use **Authorize**, enter the email in the username field, and enter
the password. Then call `GET /api/auth/me`.

## Verify the task

```bash
python -m unittest discover -s tests -v
```

Tests use a separate in-memory database. They cover fresh salts, hash storage,
successful and failed logins, invalid passwords, duplicate emails, and responses
that exclude hashes. No development database is modified.

This task implements password hashing and storage. The existing self-selected
registration roles and default development JWT key still need a separate access
control/configuration task before deployment.
