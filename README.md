# primekits
# Payment callbacks

The project now has these public callback routes. Replace `https://your-domain.example` with the HTTPS domain after deployment:

- bKash callback: `https://your-domain.example/api/payments/bkash/callback`
- Nagad callback: `https://your-domain.example/api/payments/nagad/callback`

Set `NEXT_PUBLIC_APP_URL` and the bKash merchant credentials in the hosting provider's environment variables, then run `npm run db:push` once to add `orders.payment_reference`. bKash checkout automatically starts after an order is created and only marks it paid after the server executes and verifies the bKash payment.

Nagad's payment initiation is not enabled until its merchant-specific signed PGW credentials/API specification are provided; its callback route is ready, but it deliberately never marks an order paid from browser query parameters alone.
