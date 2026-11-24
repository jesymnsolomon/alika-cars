# Alika Cars – Booking Page

React + Tailwind (Vite). Opens straight to the booking form.

## Run it

```bash
npm install
npm run dev
```

Open the link it prints. Because of `--host`, it also prints a Network link you can open on your phone (same Wi-Fi) to test on mobile.

Build for hosting: `npm run build` → upload the `dist` folder (Netlify, Vercel, Hostinger, etc.).

## How requests are delivered

1. **Email** (automatic): sent to alikacars.baguio@gmail.com through FormSubmit (free, no account).
   - The FIRST time someone submits, FormSubmit sends an **activation email** to that inbox. Click "Activate Form" once; after that every booking arrives by email.
2. **Phone** (one tap): after submitting, the customer sees buttons that open their Messages app or WhatsApp with the booking already typed and addressed to +63 929 180 5772. They just press Send.

Contact details live in `src/config.js`.
