# Alika Cars – Booking Page

React + Tailwind (Vite), hosted on Vercel: https://alika-cars.vercel.app/

## Run locally

```bash
npm install
npm run dev
```

Note: `npm run dev` does not run the `/api/sms` function. To test texts locally use `npx vercel dev`, or just test on the live site.

## How bookings are delivered

Each booking goes out two ways at the same time:

1. **Email** via [Web3Forms](https://web3forms.com) to alikacars.baguio@gmail.com
2. **Text message** via [Semaphore](https://semaphore.co) to 0929 180 5772, sent by `api/sms.js` (a Vercel function, so the key stays secret)

If both fail, the customer gets one-tap buttons to text or WhatsApp the booking instead.

## Setup (one time)

1. **Web3Forms:** go to web3forms.com, enter alikacars.baguio@gmail.com, and copy the access key they email you.
2. **Semaphore:** sign up at semaphore.co, buy credits, and copy your API key from Account > API.
3. In **Vercel > Project > Settings > Environment Variables**, add:
   - `VITE_WEB3FORMS_KEY` = the Web3Forms access key
   - `SEMAPHORE_API_KEY` = the Semaphore API key
   - optional `SEMAPHORE_SENDER_NAME` = an approved sender name (e.g. ALIKA)
   - optional `ALIKA_SMS_TO` = the phone that receives texts (default 09291805772)
4. **Redeploy** (Deployments > ... > Redeploy) so the new variables take effect.

For local testing, copy `.env.example` to `.env` and fill in the same values.

## QR codes

`qr-codes/` has QR codes that open the booking page: a printable card with the logo, plain red and black versions, and an SVG for print shops.

Contact details live in `src/config.js`.
