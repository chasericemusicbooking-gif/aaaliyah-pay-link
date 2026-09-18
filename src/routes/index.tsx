import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  Copy,
  CreditCard,
  Lock,
  ShieldCheck,
  Coins,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type Booking,
  type Settings,
  findBooking,
  formatAmount,
  getSettings,
  makeReceiptId,
  statusLabel,
  updateBooking,
} from "@/lib/booking-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pay Your Dubai Booking — Aaaliyah Booking" },
      {
        name: "description",
        content:
          "Securely settle your Aaaliyah Booking Dubai reservation by card, bank transfer or USDT. No account needed.",
      },
      { property: "og:title", content: "Pay Your Dubai Booking — Aaaliyah Booking" },
      {
        property: "og:description",
        content:
          "Securely settle your Aaaliyah Booking Dubai reservation by card, bank transfer or USDT.",
      },
    ],
  }),
  component: CheckoutPage,
});

type Step = "lookup" | "summary" | "methods" | "card" | "bank" | "usdt" | "done";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 pb-16 pt-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="eyebrow">Dubai · United Arab Emirates</p>
          <h1 className="gold-text mt-3 text-4xl font-semibold">Aaaliyah Booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dubai Booking Payment</p>
        </header>
        {children}
        <footer className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3.5 text-gold" /> Secured · encrypted payment session
          </p>
          <Link to="/admin" className="text-[11px] text-muted-foreground/60 hover:text-gold">
            Staff access
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full border-gold/40 text-gold hover:bg-gold/10 hover:text-gold"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Could not copy — please select the text manually");
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}

function CheckoutPage() {
  const [step, setStep] = useState<Step>("lookup");
  const [reference, setReference] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const found = findBooking(reference);
    if (!found) {
      setError("We couldn't find that booking reference. Please check and try again.");
      return;
    }
    setError("");
    setBooking(found);
    setStep(found.status === "AWAITING_PAYMENT" ? "summary" : "done");
  }

  function refresh(next?: Booking) {
    if (next) setBooking(next);
  }

  if (!settings) {
    return (
      <Shell>
        <div className="luxe-card flex items-center justify-center p-10">
          <Loader2 className="size-5 animate-spin text-gold" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {step === "lookup" && (
        <form onSubmit={lookup} className="luxe-card space-y-5 p-6">
          <div>
            <h2 className="text-2xl">Find your booking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the booking reference from your confirmation message. No account required.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Booking reference</Label>
            <Input
              id="ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="AB-2471"
              autoComplete="off"
              maxLength={24}
              required
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" size="lg">
            Continue
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Try <span className="text-gold">AB-2471</span> or{" "}
            <span className="text-gold">AB-2489</span> as a demo reference.
          </p>
        </form>
      )}

      {booking && step === "summary" && (
        <Summary booking={booking} onPay={() => setStep("methods")} />
      )}

      {booking && step === "methods" && (
        <Methods
          booking={booking}
          onBack={() => setStep("summary")}
          onSelect={(m) => setStep(m)}
        />
      )}

      {booking && step === "card" && (
        <CardPayment
          booking={booking}
          onBack={() => setStep("methods")}
          onPaid={(b) => {
            refresh(b);
            setStep("done");
          }}
        />
      )}

      {booking && step === "bank" && (
        <BankTransfer
          booking={booking}
          settings={settings}
          onBack={() => setStep("methods")}
          onSubmitted={(b) => {
            refresh(b);
            setStep("done");
          }}
        />
      )}

      {booking && step === "usdt" && (
        <UsdtPayment
          booking={booking}
          settings={settings}
          onBack={() => setStep("methods")}
          onSubmitted={(b) => {
            refresh(b);
            setStep("done");
          }}
        />
      )}

      {booking && step === "done" && <Confirmation booking={booking} />}
    </Shell>
  );
}

function StatusPill({ booking }: { booking: Booking }) {
  const tone =
    booking.status === "PAID"
      ? "border-success/40 text-success"
      : booking.status === "PAYMENT_PENDING_VERIFICATION"
        ? "border-warning/40 text-warning"
        : "border-gold/40 text-gold";
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider ${tone}`}>
      {statusLabel(booking.status)}
    </span>
  );
}

function Summary({ booking, onPay }: { booking: Booking; onPay: () => void }) {
  return (
    <div className="luxe-card space-y-5 p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Booking summary</p>
        <StatusPill booking={booking} />
      </div>

      <div>
        <Row label="Reference" value={booking.reference} />
        <Row label="Guest" value={booking.customerName} />
        <Row label="Booking" value={<span className="font-normal">{booking.description}</span>} />
        <Row label="Currency" value={booking.currency} />
        {booking.deadline && (
          <Row
            label="Pay before"
            value={new Date(booking.deadline).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        )}
      </div>

      <div className="rounded-2xl border border-gold/25 bg-gold/5 p-5 text-center">
        <p className="eyebrow">Amount due</p>
        <p className="gold-text mt-2 text-4xl font-semibold">
          {formatAmount(booking.amount, booking.currency)}
        </p>
      </div>

      <Button size="lg" className="w-full text-base" onClick={onPay}>
        Pay Now
      </Button>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-success" /> Secure checkout — card details never touch
        our servers
      </p>
    </div>
  );
}

function MethodButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-gold/50 hover:bg-gold/5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"
    >
      <ArrowLeft className="size-3.5" /> Back
    </button>
  );
}

function Methods({
  booking,
  onBack,
  onSelect,
}: {
  booking: Booking;
  onBack: () => void;
  onSelect: (step: "card" | "bank" | "usdt") => void;
}) {
  return (
    <div className="luxe-card p-6">
      <BackLink onBack={onBack} />
      <h2 className="text-2xl">Choose payment method</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Paying {formatAmount(booking.amount, booking.currency)} for {booking.reference}
      </p>
      <div className="mt-5 space-y-3">
        <MethodButton
          icon={<CreditCard className="size-5" />}
          title="Card"
          subtitle="Visa · Mastercard · Amex · Apple Pay / Google Pay"
          onClick={() => onSelect("card")}
        />
        <MethodButton
          icon={<Banknote className="size-5" />}
          title="Bank transfer"
          subtitle="Pay to our UAE account, then confirm"
          onClick={() => onSelect("bank")}
        />
        <MethodButton
          icon={<Coins className="size-5" />}
          title="USDT"
          subtitle="Stablecoin payment on the selected network"
          onClick={() => onSelect("usdt")}
        />
      </div>
    </div>
  );
}

function CardPayment({
  booking,
  onBack,
  onPaid,
}: {
  booking: Booking;
  onBack: () => void;
  onPaid: (b: Booking) => void;
}) {
  const [processing, setProcessing] = useState(false);

  function startCheckout() {
    setProcessing(true);
    // Demo only: in production this redirects to the PCI-compliant hosted
    // checkout and the booking is marked paid from the provider webhook.
    setTimeout(() => {
      const updated = updateBooking(booking.reference, {
        status: "PAID",
        method: "CARD",
        paidAt: new Date().toISOString(),
        receiptId: makeReceiptId(booking.reference),
      });
      setProcessing(false);
      if (updated) onPaid(updated);
    }, 1800);
  }

  return (
    <div className="luxe-card p-6">
      <BackLink onBack={onBack} />
      <h2 className="text-2xl">Card payment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You'll be taken to our payment provider's secure hosted page. Card numbers and CVV are never
        stored by Aaaliyah Booking.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {["VISA", "Mastercard", "AMEX", "Apple Pay", "Google Pay"].map((brand) => (
          <span
            key={brand}
            className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-secondary-foreground"
          >
            {brand}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/5 p-4 text-center">
        <p className="eyebrow">Total charge</p>
        <p className="gold-text mt-1 text-3xl font-semibold">
          {formatAmount(booking.amount, booking.currency)}
        </p>
      </div>

      <Button size="lg" className="mt-5 w-full" onClick={startCheckout} disabled={processing}>
        {processing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {processing ? "Contacting payment provider…" : "Continue to secure checkout"}
      </Button>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Demo mode: no live card processing is connected yet, so this simulates a successful payment.
      </p>
    </div>
  );
}

function BankTransfer({
  booking,
  settings,
  onBack,
  onSubmitted,
}: {
  booking: Booking;
  settings: Settings;
  onBack: () => void;
  onSubmitted: (b: Booking) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [senderName, setSenderName] = useState(booking.customerName);
  const [txRef, setTxRef] = useState("");
  const [amountSent, setAmountSent] = useState(String(booking.amount));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [proof, setProof] = useState<string>("");
  const [notes, setNotes] = useState("");

  const bank = settings.bank;
  const copyBlock = useMemo(
    () =>
      [
        `Bank: ${bank.bankName}`,
        `Account name: ${bank.accountName}`,
        `Account number: ${bank.accountNumber}`,
        `IBAN: ${bank.iban}`,
        `SWIFT/BIC: ${bank.swift}`,
        `Reference: ${booking.reference}`,
        `Amount: ${formatAmount(booking.amount, booking.currency)}`,
      ].join("\n"),
    [bank, booking],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!senderName.trim() || !txRef.trim() || !amountSent.trim()) {
      toast.error("Please complete the required fields");
      return;
    }
    const updated = updateBooking(booking.reference, {
      status: "PAYMENT_PENDING_VERIFICATION",
      method: "BANK_TRANSFER",
      claim: {
        senderName: senderName.trim().slice(0, 100),
        reference: `${txRef.trim().slice(0, 60)}${notes ? ` — ${notes.trim().slice(0, 200)}` : ""}`,
        amountSent: amountSent.trim().slice(0, 30),
        transferDate: date,
        proofFileName: proof || undefined,
        submittedAt: new Date().toISOString(),
        method: "BANK_TRANSFER",
      },
    });
    if (updated) onSubmitted(updated);
  }

  return (
    <div className="luxe-card p-6">
      <BackLink onBack={onBack} />
      <h2 className="text-2xl">Bank transfer</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Transfer the exact amount and include your booking reference.
      </p>

      <div className="mt-4">
        <Row label="Bank name" value={bank.bankName} />
        <Row label="Account name" value={bank.accountName} />
        <Row label="Account number" value={bank.accountNumber} />
        <Row label="IBAN" value={<span className="break-all">{bank.iban}</span>} />
        <Row label="SWIFT / BIC" value={bank.swift} />
        <Row label="Reference" value={<span className="text-gold">{booking.reference}</span>} />
        <Row
          label="Amount to transfer"
          value={<span className="text-gold">{formatAmount(booking.amount, booking.currency)}</span>}
        />
      </div>

      <div className="mt-5 space-y-3">
        <CopyButton value={copyBlock} label="Copy bank details" />
        {!showForm && (
          <Button size="lg" className="w-full" onClick={() => setShowForm(true)}>
            I've made the transfer
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="mt-6 space-y-4 border-t border-border pt-5">
          <div className="space-y-2">
            <Label htmlFor="sender">Sender name *</Label>
            <Input
              id="sender"
              value={senderName}
              maxLength={100}
              onChange={(e) => setSenderName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="txref">Transfer / reference number *</Label>
            <Input
              id="txref"
              value={txRef}
              maxLength={60}
              onChange={(e) => setTxRef(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amt">Amount sent *</Label>
              <Input
                id="amt"
                value={amountSent}
                maxLength={30}
                onChange={(e) => setAmountSent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt">Date of transfer *</Label>
              <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proof">Proof of payment (optional)</Label>
            <Input
              id="proof"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProof(e.target.files?.[0]?.name ?? "")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              maxLength={200}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Submit transfer details
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Your booking is marked pending until our team verifies the funds.
          </p>
        </form>
      )}
    </div>
  );
}

function UsdtPayment({
  booking,
  settings,
  onBack,
  onSubmitted,
}: {
  booking: Booking;
  settings: Settings;
  onBack: () => void;
  onSubmitted: (b: Booking) => void;
}) {
  const { usdt } = settings;
  const [secondsLeft, setSecondsLeft] = useState(usdt.expiryMinutes * 60);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!txHash.trim()) {
      toast.error("Please paste your transaction hash");
      return;
    }
    const updated = updateBooking(booking.reference, {
      status: "PAYMENT_PENDING_VERIFICATION",
      method: "USDT",
      claim: {
        senderName: booking.customerName,
        reference: txHash.trim().slice(0, 120),
        amountSent: `${booking.amount} USDT`,
        transferDate: new Date().toISOString().slice(0, 10),
        submittedAt: new Date().toISOString(),
        method: "USDT",
      },
    });
    if (updated) onSubmitted(updated);
  }

  return (
    <div className="luxe-card p-6">
      <BackLink onBack={onBack} />
      <h2 className="text-2xl">USDT payment</h2>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 py-2 text-sm">
        <Clock className="size-4 text-gold" />
        {secondsLeft > 0 ? (
          <span>
            Expires in <span className="font-semibold text-gold">{mm}:{ss}</span>
          </span>
        ) : (
          <span className="text-destructive">Payment window expired — please restart</span>
        )}
      </div>

      <div className="mt-4">
        <Row label="Network" value={<span className="text-gold">{usdt.network}</span>} />
        <Row label="Amount" value={<span className="text-gold">{booking.amount} USDT</span>} />
        <Row label="Reference" value={booking.reference} />
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl border border-gold/25 bg-gold/5 p-5">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={usdt.walletAddress} size={148} />
        </div>
        <p className="break-all text-center font-mono text-xs text-muted-foreground">
          {usdt.walletAddress}
        </p>
        <CopyButton value={usdt.walletAddress} label="Copy address" />
      </div>

      <p className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
        Send USDT only on the {usdt.network} network. Sending funds through another network may
        result in permanent loss of funds.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <Label htmlFor="hash">Transaction hash</Label>
        <Input
          id="hash"
          value={txHash}
          maxLength={120}
          placeholder="Paste your TX hash"
          onChange={(e) => setTxHash(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" disabled={secondsLeft === 0}>
          I've sent the USDT
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Payment is confirmed once our team verifies the transaction on-chain.
        </p>
      </form>
    </div>
  );
}

function Confirmation({ booking }: { booking: Booking }) {
  const paid = booking.status === "PAID";
  return (
    <div className="luxe-card space-y-5 p-6 text-center">
      <div
        className={`mx-auto flex size-16 items-center justify-center rounded-full ${
          paid ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
        }`}
      >
        {paid ? <BadgeCheck className="size-8" /> : <Clock className="size-8" />}
      </div>
      <div>
        <h2 className="text-2xl">{paid ? "Payment confirmed" : "Thank you — awaiting verification"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid
            ? "Your Dubai booking is fully paid. A receipt has been generated below."
            : "We've received your payment details. Our team will verify and confirm your booking shortly."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-left">
        <Row label="Reference" value={booking.reference} />
        <Row label="Guest" value={booking.customerName} />
        <Row label="Amount" value={formatAmount(booking.amount, booking.currency)} />
        <Row label="Method" value={booking.method?.replace("_", " ") ?? "—"} />
        <Row label="Status" value={statusLabel(booking.status)} />
        {booking.receiptId && <Row label="Receipt no." value={booking.receiptId} />}
        {booking.paidAt && (
          <Row label="Paid on" value={new Date(booking.paidAt).toLocaleString()} />
        )}
      </div>

      {paid && (
        <Button variant="outline" className="w-full" onClick={() => window.print()}>
          Download / print receipt
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Questions? Reply to your booking message and our Dubai team will assist.
      </p>
    </div>
  );
}
