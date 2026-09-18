/**
 * Mock data layer (no backend yet).
 * Everything is persisted in localStorage so the demo behaves like a real app.
 */

export type BookingStatus =
  | "AWAITING_PAYMENT"
  | "PAYMENT_PENDING_VERIFICATION"
  | "PAID"
  | "CANCELLED";

export type PaymentMethod = "CARD" | "BANK_TRANSFER" | "USDT";

export type TransferClaim = {
  senderName: string;
  reference: string;
  amountSent: string;
  transferDate: string;
  proofFileName?: string;
  submittedAt: string;
  method: PaymentMethod;
};

export type Booking = {
  reference: string;
  customerName: string;
  description: string;
  amount: number;
  currency: string;
  deadline?: string;
  status: BookingStatus;
  method?: PaymentMethod;
  paidAt?: string;
  receiptId?: string;
  claim?: TransferClaim;
};

export type BankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
};

export type UsdtDetails = {
  network: string;
  walletAddress: string;
  expiryMinutes: number;
};

export type Settings = {
  bank: BankDetails;
  usdt: UsdtDetails;
  passcode: string;
};

const BOOKINGS_KEY = "ab_bookings_v1";
const SETTINGS_KEY = "ab_settings_v1";

export const defaultBookings: Booking[] = [
  {
    reference: "AB-2471",
    customerName: "Layla Hassan",
    description: "5 nights — Palm Jumeirah suite, desert safari & airport transfers",
    amount: 4850,
    currency: "AED",
    deadline: "2026-10-02",
    status: "AWAITING_PAYMENT",
  },
  {
    reference: "AB-2489",
    customerName: "Daniel Okoro",
    description: "3 nights — Downtown Dubai, Burj Khalifa access & yacht brunch",
    amount: 1980,
    currency: "USD",
    deadline: "2026-09-28",
    status: "AWAITING_PAYMENT",
  },
  {
    reference: "AB-2502",
    customerName: "Grace Wanjiru",
    description: "7 nights — Marina residence, private city tour & spa package",
    amount: 3200,
    currency: "USD",
    status: "PAID",
    method: "CARD",
    paidAt: "2026-09-12T10:22:00.000Z",
    receiptId: "RCPT-2502-8841",
  },
];

export const defaultSettings: Settings = {
  bank: {
    bankName: "Emirates NBD",
    accountName: "Aaaliyah Booking FZ-LLC",
    accountNumber: "1015482773901",
    iban: "AE070331234567890123456",
    swift: "EBILAEAD",
  },
  usdt: {
    network: "TRC20 (Tron)",
    walletAddress: "TQ5NMqJjW8s4gk2PbR3vYc7HdFxLm9AeUu",
    expiryMinutes: 45,
  },
  passcode: "aaliyah2026",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("ab-store-change"));
}

export function getBookings(): Booking[] {
  return read(BOOKINGS_KEY, defaultBookings);
}

export function saveBookings(bookings: Booking[]) {
  write(BOOKINGS_KEY, bookings);
}

export function findBooking(reference: string): Booking | undefined {
  const needle = reference.trim().toLowerCase();
  return getBookings().find((b) => b.reference.toLowerCase() === needle);
}

export function updateBooking(reference: string, patch: Partial<Booking>): Booking | undefined {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => b.reference === reference);
  if (idx === -1) return undefined;
  const next = { ...bookings[idx], ...patch } as Booking;
  bookings[idx] = next;
  saveBookings(bookings);
  return next;
}

export function getSettings(): Settings {
  return { ...defaultSettings, ...read(SETTINGS_KEY, defaultSettings) };
}

export function saveSettings(settings: Settings) {
  write(SETTINGS_KEY, settings);
}

export function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function statusLabel(status: BookingStatus) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Awaiting payment";
    case "PAYMENT_PENDING_VERIFICATION":
      return "Payment pending verification";
    case "PAID":
      return "Paid";
    case "CANCELLED":
      return "Cancelled";
  }
}

export function makeReceiptId(reference: string) {
  return `RCPT-${reference.replace(/[^0-9A-Za-z]/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
}
