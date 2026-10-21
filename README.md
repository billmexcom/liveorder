# Billmex demo ordering app

Angular frontend for the Billmex/Bhoj ordering flow. The supplied Billmex folder contained only a compiled frontend bundle, so this project uses a deterministic in-memory mock API. It does not contact Billmex servers, send OTPs or push notifications, or charge a payment method.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Try the demo

1. The login screen displays the demo OTP `4829`; enter it and confirm. Guest checkout is also available.
2. Browse and search the mock menu, change quantities, and open checkout.
3. Select UPI or cash on delivery and place a demo order. The mock API calculates the bill, simulates the UPI transaction status when selected, and records an order.
4. Use the Orders tab for order status/history and Profile for demo notifications.

No real SMS, WhatsApp message, push notification, backend order, or payment is sent.

## Mock API contract

`src/app/billmex-api.ts` contains the route names found in the compiled frontend and `BillmexMockApi`, an in-memory implementation used by the UI and unit tests. Route paths are documentation only; there is no live HTTP adapter because backend documentation and an authorized test environment were not provided. Verify request/response schemas and use HTTPS before connecting a real backend.

| Flow | Discovered route |
| --- | --- |
| POS details | `GET /bhojmain/app/pos/posData/{posId}` |
| Customer registration / OTP | `POST /bhojmain/app/customer/simreg/` |
| OTP verification | `POST /bhojmain/app/customer/votp` |
| Resend OTP | `GET /bhojmain/app/customer/resendOtp/{phone}` |
| Customer details | `GET /bhojmain/app/customer/getCustomerInfoById/{customerId}` |
| Notification token registration | `GET /bhojmain/app/pos/{posId}?customerId={customerId}` |
| Menu and item likes | `GET /bhoj/itemMaster/{lookup}`, `POST /bhoj/itemMaster/like` |
| Bill and order | `POST /bhoj/order/previewBill`, `POST /bhoj/order/placeOrder`, `GET /bhoj/order/{orderId}` |
| Payment transaction | `POST /bhojmain/order/v2/initiateOrderTransaction`, `POST /bhojmain/order/v2/updateTransactionStatus` |
| Order history / notifications | `GET /bhojmain/app/order/orderHistory`, `GET /bhojmain/custnotification` |

The existing frontend/API bundle referenced an HTTP API host and payment provider callbacks. Do not reuse those for production without verifying server ownership, HTTPS support, authorization, and server-side payment verification.

## Build and tests

```bash
npm run build
npm test -- --watch=false
```
