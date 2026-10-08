MY PET CENTER - RAILWAY DEPLOYMENT

This package is prepared for Railway.

Before deploying:
1) Revoke/rotate the Hugging Face token that existed in the original ZIP's .git configuration.
2) Use a NEW My Pet Center admin password because an older one was committed previously.
3) Push these cleaned files to GitHub.
4) Create a Railway project from the GitHub repository.
5) Add PostgreSQL to the same Railway project.
6) In the app service Variables tab, set:
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<new random secret>
   ADMIN_EMAIL=admin@mypetcenter.com
   ADMIN_PHONE=01200888841
   ADMIN_PASSWORD=<new strong password>
7) Generate a public domain for the app service.
8) Test the homepage, booking flow, and admin panel.

The FastAPI service serves both the API and the built React frontend from the same public URL.
