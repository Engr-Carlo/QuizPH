# QuizPH

QuizPH is a Next.js + Prisma quiz platform with role-based dashboards and anti-cheat monitoring.

## Getting Started

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Push Prisma schema to your database:

```bash
npm run db:push
```

4. Start development server:

```bash
npm run dev
```

## Email Verification Flow

- New registrations create an account with `emailVerifiedAt = null`.
- The backend sends a 6-digit verification code via SMTP email.
- User verifies code on `/verify-email`.
- Login is blocked until email is verified.

## SMTP Setup (Required for Production)

Set these in `.env` (or Vercel Environment Variables):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `EMAIL_VERIFICATION_SECRET`

### Gmail setup (quick option)

1. Create or use a Gmail account for QuizPH.
2. Enable 2-Step Verification.
3. Generate an App Password (Google Account -> Security -> App Passwords).
4. Use:
	- `SMTP_HOST=smtp.gmail.com`
	- `SMTP_PORT=587`
	- `SMTP_USER=your-gmail@gmail.com`
	- `SMTP_PASS=your-16-char-app-password`
	- `SMTP_FROM=QuizPH <your-gmail@gmail.com>`

## Notes

- In development, if SMTP is not configured, the app logs a preview code in server logs and may return it in API response for testing.
- Use `npx prisma generate` after schema changes if needed.
