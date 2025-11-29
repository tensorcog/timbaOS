# Invoice Feature Implementation - Environment Variables

## Required Environment Variables

Add these to your `.env` file:

```bash
# ===== Existing Variables =====
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# ===== NEW: Stripe Configuration (REQUIRED) =====
STRIPE_SECRET_KEY="sk_test_..."  # Your Stripe secret key from dashboard
STRIPE_WEBHOOK_SECRET="whsec_..."  # Webhook signing secret from Stripe

# ===== Email Configuration (Already configured) =====
RESEND_API_KEY="re_..."  # Your Resend API key
EMAIL_FROM="invoices@yourdomain.com"  # Sender email address

# ===== NEW: Cron Job Security (REQUIRED) =====
CRON_SECRET="your-secure-random-string"  # Generate with: openssl rand -base64 32
```

## Setup Steps

### 1. Stripe Setup

1. **Create/Login to Stripe Account**

   - Go to https://dashboard.stripe.com
   - Use test mode for development

2. **Get API Keys**

   - Navigate to: Developers → API keys
   - Copy "Secret key" (starts with `sk_test_...`)
   - Add to `.env` as `STRIPE_SECRET_KEY`

3. **Setup Webhook Endpoint**
   - Navigate to: Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/webhooks/stripe` (or use ngrok for local dev)
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Copy "Signing secret"
   - Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 2. Email Configuration

- Already configured via Resend
- Verify `RESEND_API_KEY` is set
- Update `EMAIL_FROM` to your domain email

### 3. Cron Secret

Generate a secure random string:

```bash
openssl rand -base64 32
```

Add to `.env` as `CRON_SECRET`

### 4. Regenerate Prisma Client

```bash
npx prisma generate
```

### 5. Restart Development Server

```bash
npm run dev
```

## Testing

### Test Invoice PDF Generation

1. Navigate to http://localhost:3000/dashboard/invoices
2. Click on any invoice
3. Click "Download PDF" button
4. Verify PDF downloads and contains correct data

### Test Email Delivery

1. On invoice detail page, click "Send Email"
2. Check Resend dashboard for delivery status
3. Verify email received with PDF attachment

### Test Stripe Payment

**Coming soon** - Requires additional UI implementation for payment button

### Test Cron Job

```bash
# Set CRON_SECRET in terminal
export CRON_SECRET="your-secret-from-env"

# Manually trigger cron
curl -X POST http://localhost:3000/api/cron/daily-billing \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Run Automated Test Suite

```bash
# Make test executable (already done)
chmod +x tests/invoice-features-test.sh

# Run test
./tests/invoice-features-test.sh
```

## Production Deployment

### Vercel Cron Setup

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-billing",
      "schedule": "0 1 * *  *"
    }
  ]
}
```

### Environment Variables in Vercel

Add all environment variables to Vercel project settings:

- `STRIPE_SECRET_KEY` (use live key for production)
- `STRIPE_WEBHOOK_SECRET` (from production webhook)
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`

### Stripe Production Webhook

- Create new webhook in Stripe production dashboard
- Point to: `https://yourdomain.com/api/webhooks/stripe`
- Update `STRIPE_WEBHOOK_SECRET` with production value
