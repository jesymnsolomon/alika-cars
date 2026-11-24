// Where booking requests go. Change these if the contact details change.
export const BUSINESS = {
  name: 'Alika Car Rentals & Baguio Tours',
  email: 'alikacars.baguio@gmail.com',
  phone: '+639291805772',
  phoneDisplay: '0929 180 5772',
}

// Web3Forms access key (safe to be public; it only lets people send to your inbox).
// Set VITE_WEB3FORMS_KEY in Vercel > Settings > Environment Variables, or in a local .env file.
export const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || ''
