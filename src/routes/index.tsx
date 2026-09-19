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
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

type Step = "lookup" | "summary" | "methods" | "card" | "bank" | "usdt" | "done";

type CardFieldErrors = Partial<
  Record<"cardType" | "cardholder" | "cardNumber" | "expiryMonth" | "expiryYear" | "cvv", string>
>;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 pb-16 pt-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="eyebrow">Dubai · United Arab Emirates</p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground">Aaaliyah Booking</h1>
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
          verificationMinutes={settings.cardVerificationMinutes}
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
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full justify-start gap-4 rounded-lg border-border bg-card p-4 text-left hover:border-gold/50 hover:bg-secondary"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Button>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onBack}
      className="mb-4 -ml-3 text-xs text-muted-foreground hover:text-gold"
    >
      <ArrowLeft className="size-3.5" /> Back
    </Button>
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
  verificationMinutes,
  onBack,
  onPaid,
}: {
  booking: Booking;
  verificationMinutes: number;
  onBack: () => void;
  onPaid: (b: Booking) => void;
}) {
  const [phase, setPhase] = useState<"details" | "otp" | "processing">("details");
  const [cardType, setCardType] = useState("");
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CardFieldErrors>({});
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(verificationMinutes * 60);

  const currentYear = new Date().getFullYear();
  const expiryYears = Array.from({ length: 12 }, (_, index) => String(currentYear + index));

  function clearFieldError(field: keyof CardFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  useEffect(() => {
    if (phase !== "otp") return;
    const id = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const timer = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  // All card details are read back out of the <form> element on submit,
  // so each verification step receives the full mock payload as form data.
  function collectErrors(data: FormData): CardFieldErrors {
    const type = String(data.get("cardType") ?? "");
    const holder = String(data.get("cardholder") ?? "");
    const number = String(data.get("cardNumber") ?? "");
    const month = String(data.get("expiryMonth") ?? "");
    const year = String(data.get("expiryYear") ?? "");
    const code = String(data.get("cvv") ?? "");
    const digits = number.replace(/\D/g, "");

    const errors: CardFieldErrors = {};
    if (!type) errors.cardType = "Select your card type.";
    if (holder.trim().length < 2) errors.cardholder = "Enter the name shown on the card.";
    if (digits.length < 15 || digits.length > 16)
      errors.cardNumber = "Enter a valid 15 or 16-digit card number.";
    if (!month) errors.expiryMonth = "Select a month.";
    if (!year) errors.expiryYear = "Select a year.";
    if (month && year) {
      const expiryDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      if (expiryDate < new Date()) errors.expiryMonth = "This card has expired.";
    }
    const expectedCvvLength = type === "amex" ? 4 : 3;
    if (code.length !== expectedCvvLength) {
      errors.cvv = `${type === "amex" ? "American Express" : "This card"} requires a ${expectedCvvLength}-digit security code.`;
    }
    return errors;
  }

  function submitCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = collectErrors(new FormData(e.currentTarget));
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted card details");
      return;
    }
    setFieldErrors({});
    setSecondsLeft(verificationMinutes * 60);
    setPhase("otp");
  }

  function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = String(data.get("otp") ?? "").replace(/\D/g, "");
    if (secondsLeft === 0) {
      toast.error("The code expired — change the card details to try again.");
      return;
    }
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    // Re-read every card detail from the form for the verification payload.
    const errors = collectErrors(data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setPhase("details");
      toast.error("Card details need attention — please review them");
      return;
    }
    setFieldErrors({});
    setPhase("processing");
    // Demo only: in production this redirects to the PCI-compliant hosted
    // checkout and the booking is marked paid from the provider webhook.
    setTimeout(() => {
      const updated = updateBooking(booking.reference, {
        status: "PAID",
        method: "CARD",
        paidAt: new Date().toISOString(),
        receiptId: makeReceiptId(booking.reference),
      });
      if (updated) onPaid(updated);
    }, 1800);
  }

  return (
    <div className="luxe-card p-6">
      <BackLink onBack={onBack} />
      <h2 className="text-2xl">Card payment</h2>
      <p className="mt-1 text-sm text-muted-foreground">Secure card verification</p>

      <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4 text-center">
        <p className="eyebrow">Total charge</p>
        <p className="gold-text mt-1 text-3xl font-semibold">
          {formatAmount(booking.amount, booking.currency)}
        </p>
      </div>

      <form
        onSubmit={phase === "details" ? submitCard : verifyOtp}
        className="mt-5 space-y-4"
        noValidate
      >
        {/* Hidden inputs carry the select and OTP values inside the form payload */}
        <input type="hidden" name="cardType" value={cardType} />
        <input type="hidden" name="expiryMonth" value={expiryMonth} />
        <input type="hidden" name="expiryYear" value={expiryYear} />
        <input type="hidden" name="otp" value={otp} />

        {phase === "details" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="card-type">Card type</Label>
              <Select
                value={cardType}
                onValueChange={(value) => {
                  setCardType(value);
                  clearFieldError("cardType");
                  clearFieldError("cvv");
                }}
              >
                <SelectTrigger
                  id="card-type"
                  aria-invalid={Boolean(fieldErrors.cardType)}
                  className="h-11 data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20"
                >
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="amex">American Express</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.cardType && (
                <p className="text-xs text-destructive">{fieldErrors.cardType}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardholder">Name on card</Label>
              <Input
                id="cardholder"
                name="cardholder"
                autoComplete="cc-name"
                aria-invalid={Boolean(fieldErrors.cardholder)}
                value={cardholder}
                onChange={(e) => {
                  setCardholder(e.target.value);
                  clearFieldError("cardholder");
                }}
              />
              {fieldErrors.cardholder && (
                <p className="text-xs text-destructive">{fieldErrors.cardholder}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-number">Card number</Label>
              <Input
                id="card-number"
                name="cardNumber"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                aria-invalid={Boolean(fieldErrors.cardNumber)}
                value={cardNumber}
                onChange={(e) => {
                  setCardNumber(e.target.value.replace(/[^\d ]/g, ""));
                  clearFieldError("cardNumber");
                }}
              />
              {fieldErrors.cardNumber && (
                <p className="text-xs text-destructive">{fieldErrors.cardNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select
                    value={expiryMonth}
                    onValueChange={(value) => {
                      setExpiryMonth(value);
                      clearFieldError("expiryMonth");
                    }}
                  >
                    <SelectTrigger
                      aria-label="Expiry month"
                      aria-invalid={Boolean(fieldErrors.expiryMonth)}
                      className="h-11 data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20"
                    >
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, index) => {
                        const month = String(index + 1).padStart(2, "0");
                        return (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {fieldErrors.expiryMonth && (
                    <p className="mt-2 text-xs text-destructive">{fieldErrors.expiryMonth}</p>
                  )}
                </div>
                <div>
                  <Select
                    value={expiryYear}
                    onValueChange={(value) => {
                      setExpiryYear(value);
                      clearFieldError("expiryYear");
                      clearFieldError("expiryMonth");
                    }}
                  >
                    <SelectTrigger
                      aria-label="Expiry year"
                      aria-invalid={Boolean(fieldErrors.expiryYear)}
                      className="h-11 data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/20"
                    >
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {expiryYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.expiryYear && (
                    <p className="mt-2 text-xs text-destructive">{fieldErrors.expiryYear}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">Security code (CVV)</Label>
              <Input
                id="cvv"
                name="cvv"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={cardType === "amex" ? "4 digits" : "3 digits"}
                maxLength={4}
                aria-invalid={Boolean(fieldErrors.cvv)}
                value={cvv}
                onChange={(e) => {
                  setCvv(e.target.value.replace(/\D/g, ""));
                  clearFieldError("cvv");
                }}
              />
              {fieldErrors.cvv && <p className="text-xs text-destructive">{fieldErrors.cvv}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full">
              <Lock className="size-4" /> Pay securely
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Demo only. Details stay in this form and are never saved. Live payments will use the
              provider's secure form.
            </p>
          </>
        )}

        {phase === "otp" && (
          <div className="space-y-5 border-t border-border pt-5">
            <div className="text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-gold">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-3 text-xl">Verify your payment</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the 6-digit code sent by your card provider.
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} className="h-11 w-10" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Timer className="size-4 text-gold" /> Code expires in{" "}
              <span className="font-semibold text-foreground">{timer}</span>
            </p>
            {secondsLeft === 0 && (
              <p className="text-center text-xs text-destructive">
                This code has expired. Change the card details and try again.
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={secondsLeft === 0}>
              Verify &amp; pay
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setOtp("");
                setPhase("details");
              }}
            >
              Change card details
            </Button>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-gold" /> Verifying payment…
          </div>
        )}
      </form>
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
