// Open https://alika-cars.vercel.app/api/status to check the setup. Shows only yes/no, never the secrets.
import { redisReady } from './_redis.js'
import { pushReady } from './_push.js'

export default function handler(req, res) {
  res.status(200).json({
    databaseConnected: redisReady,
    adminPasswordSet: Boolean(process.env.ADMIN_PASSWORD),
    web3formsKeySet: Boolean(process.env.VITE_WEB3FORMS_KEY),
    notificationsSetUp: pushReady,
    note: 'Anything false: fix it in Vercel (Storage or Settings > Environment Variables), then Redeploy.',
  })
}
