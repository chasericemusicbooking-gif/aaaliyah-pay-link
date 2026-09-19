# Aaaliyah Pay Link

Build a professional, mobile-first payment checkout page for Aaaliyah Booking — Dubai.

The goal is to create a single shareable payment link that allows a customer to securely pay for their Dubai booking using Card, Bank Transfer, or USDT.

PAYMENT PAGE

Create a clean luxury travel-style checkout page with:

Aaaliyah Booking
Dubai Booking Payment

Display:

Booking reference

Customer name

Booking/service description

Amount due

Currency

Payment deadline, if applicable

Secure payment indicator

Primary CTA:
Pay Now

Do not require the customer to create an account.

PAYMENT METHODS

When the customer clicks Pay Now, display three payment options:

1. CARD

Allow payment using:

Visa

Mastercard

American Express where supported

Apple Pay / Google Pay where supported by the payment provider

Use a PCI-compliant hosted checkout/payment provider. Never store raw card numbers, CVV, or sensitive card information in the application database.

After successful payment:

Verify the payment server-side through the provider webhook/API.

Mark the booking as PAID.

Generate a payment receipt.

Display a confirmation page.

2. BANK TRANSFER

Display Aaaliyah Booking’s bank-transfer instructions dynamically from the admin dashboard.

Show:

Bank name

Account name

Account number

IBAN

SWIFT/BIC

Reference number

Amount to transfer

Provide:

Copy Bank Details

and

I’ve Made the Transfer

When the customer selects “I’ve Made the Transfer”, allow them to submit:

Sender name

Transfer/reference number

Amount sent

Date of transfer

Optional proof-of-payment upload

Set the booking status to:

Payment Pending Verification

Do NOT automatically mark a bank transfer as paid merely because the customer submits a receipt. An administrator must verify the payment or use a verified bank-payment integration.

3. USDT

Create a dedicated USDT payment option.

Allow the administrator to configure:

USDT network

Wallet address

Required USDT amount

Payment expiration time

Clearly display:

USDT Payment

Network: [configured network]

Wallet Address: [configured wallet address]

Amount: [USDT amount]

Add a Copy Address button and QR code.

Display a prominent warning:

Send USDT only on the selected network. Sending funds through another network may result in permanent loss of funds.

WITH admin page to manage bookings and edit payment details

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d23359ed-03a6-4422-89a9-dda02ca38c84).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
