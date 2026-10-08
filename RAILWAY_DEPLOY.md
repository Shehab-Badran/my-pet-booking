# My Pet Center — Railway Deployment

This project is prepared for Railway as one Docker web service plus one Railway PostgreSQL service.

## Railway services
1. App service: connect the GitHub repository. Railway will detect the root `Dockerfile`.
2. PostgreSQL: add a PostgreSQL database to the same Railway project.

## App service variables
Set these in the app service's **Variables** tab:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate a new strong random secret>
ADMIN_EMAIL=admin@mypetcenter.com
ADMIN_PHONE=01200888841
ADMIN_PASSWORD=<set a new strong password>
```

If your Railway database service has a name other than `Postgres`, change the `Postgres` namespace in `DATABASE_URL` to match its service name.

Optional password-reset email settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your SMTP username>
SMTP_PASSWORD=<your SMTP/app password>
SMTP_FROM_EMAIL=<sender email>
SMTP_FROM_NAME=My Pet Center
FRONTEND_URL=https://<your Railway public domain>
```

## Networking
Generate a public domain for the app service from Railway Networking. PostgreSQL can remain private.

## Health check
`/health` returns HTTP 200 and is configured in `railway.json`.

## Security
- Never commit `.env` files, database files, admin passwords, JWT secrets, or API tokens.
- Rotate the Hugging Face token that was present in the original project's Git metadata.
- Use a new admin password because the old deployment password was previously committed.
