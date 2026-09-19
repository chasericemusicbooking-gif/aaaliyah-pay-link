import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type Booking,
  type BookingStatus,
  type Settings,
  formatAmount,
  getBookings,
  getSettings,
  makeReceiptId,
  saveBookings,
  saveSettings,
  statusLabel,
} from "@/lib/booking-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Aaaliyah Booking Payments" },
      {
        name: "description",
        content: "Manage Dubai bookings, verify transfers and edit payment details.",
      },
      { property: "og:title", content: "Admin — Aaaliyah Booking Payments" },
      {
        property: "og:description",
        content: "Manage Dubai bookings, verify transfers and edit payment details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const UNLOCK_KEY = "ab_admin_unlocked";

function AdminPage() {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    setSettings(getSettings());
    setBookings(getBookings());
    setUnlocked(sessionStorage.getItem(UNLOCK_KEY) === "1");
    setReady(true);
  }, []);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (settings && code === settings.passcode) {
      sessionStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
    } else {
      toast.error("Incorrect passcode");
    }
  }

  function persistBookings(next: Booking[]) {
    setBookings(next);
    saveBookings(next);
  }

  function persistSettings(next: Settings) {
    setSettings(next);
    saveSettings(next);
    toast.success("Payment details saved");
  }

  if (!ready || !settings) return null;

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={unlock} className="luxe-card w-full max-w-sm space-y-5 p-6">
          <div className="text-center">
            <Lock className="mx-auto size-6 text-gold" />
            <h1 className="mt-3 text-2xl">Staff access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the shared passcode to manage bookings.
            </p>
          </div>
          <Input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Passcode"
            autoFocus
          />
          <Button type="submit" className="w-full" size="lg">
            Unlock
          </Button>
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-gold">
            Back to payment page
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Aaaliyah Booking</p>
            <h1 className="gold-text text-3xl font-semibold">Admin dashboard</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem(UNLOCK_KEY);
              setUnlocked(false);
            }}
          >
            Lock
          </Button>
        </header>

        <BookingsPanel bookings={bookings} onChange={persistBookings} />
        <PaymentDetailsPanel settings={settings} onSave={persistSettings} />

        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold">
          <ArrowLeft className="size-3.5" /> Back to payment page
        </Link>
      </div>
    </div>
  );
}

function BookingsPanel({
  bookings,
  onChange,
}: {
  bookings: Booking[];
  onChange: (b: Booking[]) => void;
}) {
  const [draft, setDraft] = useState({
    reference: "",
    customerName: "",
    description: "",
    amount: "",
    currency: "USD",
    deadline: "",
  });

  function addBooking(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.reference.trim() || !draft.customerName.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Reference, guest name and a valid amount are required");
      return;
    }
    if (bookings.some((b) => b.reference.toLowerCase() === draft.reference.trim().toLowerCase())) {
      toast.error("That reference already exists");
      return;
    }
    onChange([
      {
        reference: draft.reference.trim().slice(0, 24),
        customerName: draft.customerName.trim().slice(0, 100),
        description: draft.description.trim().slice(0, 300),
        amount,
        currency: draft.currency.trim().toUpperCase().slice(0, 5) || "USD",
        deadline: draft.deadline || undefined,
        status: "AWAITING_PAYMENT",
      },
      ...bookings,
    ]);
    setDraft({ reference: "", customerName: "", description: "", amount: "", currency: "USD", deadline: "" });
    toast.success("Booking created");
  }

  function setStatus(reference: string, status: BookingStatus) {
    onChange(
      bookings.map((b) =>
        b.reference === reference
          ? {
              ...b,
              status,
              paidAt: status === "PAID" ? new Date().toISOString() : b.paidAt,
              receiptId: status === "PAID" ? (b.receiptId ?? makeReceiptId(b.reference)) : b.receiptId,
            }
          : b,
      ),
    );
    toast.success(`Marked as ${statusLabel(status).toLowerCase()}`);
  }

  return (
    <section className="luxe-card p-6">
      <h2 className="text-xl">Bookings</h2>
      <div className="mt-4 space-y-3">
        {bookings.length === 0 && (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        )}
        {bookings.map((b) => (
          <div key={b.reference} className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {b.reference} · {b.customerName}
                </p>
                <p className="text-xs text-muted-foreground">{b.description || "—"}</p>
              </div>
              <p className="text-sm font-semibold text-gold">{formatAmount(b.amount, b.currency)}</p>
            </div>

            <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {statusLabel(b.status)}
              {b.method ? ` · ${b.method.replace("_", " ").toLowerCase()}` : ""}
              {b.receiptId ? ` · ${b.receiptId}` : ""}
            </p>

            {b.claim && (
              <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed">
                <p className="font-semibold text-warning">Customer-submitted payment claim</p>
                <p>Sender: {b.claim.senderName}</p>
                <p className="break-all">Reference: {b.claim.reference}</p>
                <p>Amount: {b.claim.amountSent}</p>
                <p>Date: {b.claim.transferDate}</p>
                {b.claim.proofFileName && <p>Proof: {b.claim.proofFileName}</p>}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setStatus(b.reference, "PAID")}>
                Verify & mark paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(b.reference, "AWAITING_PAYMENT")}
              >
                Reset to unpaid
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange(bookings.filter((x) => x.reference !== b.reference))}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addBooking} className="mt-6 space-y-3 border-t border-border pt-5">
        <h3 className="text-base font-semibold">New booking</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nref">Reference</Label>
            <Input
              id="nref"
              value={draft.reference}
              onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nname">Guest name</Label>
            <Input
              id="nname"
              value={draft.customerName}
              onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="namount">Amount</Label>
            <Input
              id="namount"
              inputMode="decimal"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ncur">Currency</Label>
            <Input
              id="ncur"
              value={draft.currency}
              maxLength={5}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ndead">Payment deadline</Label>
            <Input
              id="ndead"
              type="date"
              value={draft.deadline}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ndesc">Booking description</Label>
          <Textarea
            id="ndesc"
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <Button type="submit">
          <Plus className="size-4" /> Create booking
        </Button>
      </form>
    </section>
  );
}

function PaymentDetailsPanel({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
}) {
  const [form, setForm] = useState(settings);

  return (
    <section className="luxe-card p-6">
      <h2 className="text-xl">Payment details</h2>

      <h3 className="mt-4 text-sm font-semibold text-gold">Bank transfer</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["bankName", "Bank name"],
            ["accountName", "Account name"],
            ["accountNumber", "Account number"],
            ["iban", "IBAN"],
            ["swift", "SWIFT / BIC"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              value={form.bank[key]}
              onChange={(e) => setForm({ ...form, bank: { ...form.bank, [key]: e.target.value } })}
            />
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold text-gold">USDT</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="network">Network</Label>
          <Input
            id="network"
            value={form.usdt.network}
            onChange={(e) => setForm({ ...form, usdt: { ...form.usdt, network: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry">Payment window (minutes)</Label>
          <Input
            id="expiry"
            inputMode="numeric"
            value={String(form.usdt.expiryMinutes)}
            onChange={(e) =>
              setForm({
                ...form,
                usdt: { ...form.usdt, expiryMinutes: Math.max(1, Number(e.target.value) || 1) },
              })
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="wallet">Wallet address</Label>
          <Input
            id="wallet"
            value={form.usdt.walletAddress}
            onChange={(e) =>
              setForm({ ...form, usdt: { ...form.usdt, walletAddress: e.target.value } })
            }
          />
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-gold">Access</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="verification-time">Card OTP window (minutes)</Label>
          <Input
            id="verification-time"
            inputMode="numeric"
            value={String(form.cardVerificationMinutes)}
            onChange={(e) =>
              setForm({ ...form, cardVerificationMinutes: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passcode">Staff passcode</Label>
          <Input
            id="passcode"
            value={form.passcode}
            onChange={(e) => setForm({ ...form, passcode: e.target.value })}
          />
        </div>
      </div>

      <Button className="mt-5" onClick={() => onSave(form)}>
        Save payment details
      </Button>
    </section>
  );
}
