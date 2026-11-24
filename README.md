# Alika Cars – Booking Page & Admin

React + Tailwind (Vite), hosted on Vercel.

- **Customers:** https://alika-cars.vercel.app/
- **Admin dashboard:** https://alika-cars.vercel.app/admin

## How bookings flow

1. A customer fills in the booking form.
2. The booking is **saved to the database** (Upstash Redis) so it shows in the admin dashboard, and **emailed** to alikacars.baguio@gmail.com through Web3Forms.
3. In `/admin`, the owner sees every booking on a calendar and in a list, can **Call** or **Text** the customer, change the status (New → Confirmed → Done, or Cancelled), add private notes, and delete bookings.

## One-time setup in Vercel

1. **Database:** Vercel > your project > **Storage** > **Create Database** > choose **Upstash for Redis** (free plan) > connect it to this project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
2. **Environment variables** (Settings > Environment Variables, tick Production):
   - `ADMIN_PASSWORD` = the password for /admin
   - `VITE_WEB3FORMS_KEY` = the Web3Forms access key
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` = notification keys. Generate them once on your computer with `npx web-push generate-vapid-keys` and paste both in. Keep the private one secret.
3. **Redeploy** (Deployments > ⋯ > Redeploy).
4. Check https://alika-cars.vercel.app/api/status: everything should say `true`.

## Add to iPhone home screen

1. Open the page in **Safari** (the booking page, or `/admin` for the dashboard).
2. Tap **Share** → **Add to Home Screen** → **Add**.

The booking page installs as **Alika Cars**; the dashboard installs as **Alika Admin** with its own icon. They open full screen like apps.

### Notifications for new bookings (iPhone, iOS 16.4 or newer)

1. Add **/admin** to the home screen (above) and open **Alika Admin** from the home screen. Notifications only work from the home-screen app, not inside Safari.
2. Sign in, tap **Turn on** in the Notifications card, and tap **Allow**.
3. Tap **Send test** to check. Every new booking now pops up on the phone; tapping it opens the dashboard.

## Run locally

```bash
npm install
npm run dev        # the pages only (admin at /admin.html); API calls won't work
npx vercel dev     # pages + API (needs `vercel link` and a .env, see .env.example)
```

## QR codes

`qr-codes/` has QR codes that open the booking page: a printable card with the logo, plain red and black versions, and an SVG for print shops.

Contact details live in `src/config.js`.
