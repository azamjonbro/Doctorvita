import React, { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  UserPlus,
  Phone,
  History,
  BellRing,
  X,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  fmtDate,
  fmtMoney,
  normalizePhone,
  STATUS_LABELS,
  bmiOf,
  bmiLabel,
} from "@/lib/posLogic";

const EMPTY = {
  id: null,
  first_name: "",
  last_name: "",
  phone: "",
  age: "",
  gender: "",
  source: "",
  height_cm: "",
  weight_kg: "",
  allergies: "",
  conditions: "",
  complaint: "",
  note: "",
};
export const emptyCustomer = () => ({ ...EMPTY });

/**
 * Mijoz bloki: ism/familiya/telefon yozilganda bazadan variantlar chiqadi,
 * tanlansa karta yuklanadi; topilmasa "Yangi mijoz" sifatida saqlanadi.
 */
export default function CustomerPanel({
  customer,
  onChange,
  detail,
  onDetailLoaded,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [dupWarning, setDupWarning] = useState(null); // shu telefon bilan boshqa mijoz
  const [showHistory, setShowHistory] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const boxRef = useRef(null);
  const timer = useRef(null);
  const closeTimer = useRef(null);
  const seq = useRef(0);

  const set = (patch) => onChange({ ...customer, ...patch });

  // Ism / familiya / telefon yozilganda — typeahead (faqat mijoz hali tanlanmagan bo'lsa)
  const search = (term) => {
    clearTimeout(timer.current);
    clearTimeout(closeTimer.current);
    if (!term || term.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const my = ++seq.current;
      try {
        const { data } = await api.get("/customers/search", {
          params: { q: term.trim(), limit: 8 },
        });
        if (my !== seq.current) return;
        setSuggestions(data);
        setOpen(true);
        if (!data.length) {
          closeTimer.current = setTimeout(() => setOpen(false), 1500);
        }
      } catch {
        /* ignore */
      }
    }, 200);
  };

  const onField = (field, value) => {
    set({ [field]: value });
    if (!customer.id && (field === "first_name" || field === "phone")) {
      search(value);
    } else if (field !== "first_name" && field !== "phone") {
      clearTimeout(closeTimer.current);
      setOpen(false);
    }
  };

  const handleFocusCapture = (event) => {
    const target = event.target;
    if (!target.matches('[data-customer-search="true"]')) {
      clearTimeout(closeTimer.current);
      setOpen(false);
    }
  };

  // Telefon o'zgarganda — bazada shu raqamli boshqa mijoz bor-yo'qligini tekshirish
  useEffect(() => {
    const digits = normalizePhone(customer.phone);
    if (digits.length < 9) {
      setDupWarning(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/customers/search", {
          params: { q: digits, limit: 3 },
        });
        const other = data.find(
          (c) => c.phone_normalized === digits && c.id !== customer.id,
        );
        setDupWarning(other || null);
      } catch {
        setDupWarning(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customer.phone, customer.id]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = async (c) => {
    setOpen(false);
    setSuggestions([]);
    onChange({
      id: c.id,
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      phone: c.phone || "",
      age: c.age ?? "",
      gender: c.gender || "",
      source: c.source || "",
      height_cm: c.height_cm ?? "",
      weight_kg: c.weight_kg ?? "",
      allergies: c.allergies || "",
      conditions: c.conditions || "",
      complaint: c.complaint || "",
      note: c.note || "",
    });
    setShowVitals(
      Boolean(c.height_cm || c.weight_kg || c.allergies || c.conditions),
    );
    try {
      const { data } = await api.get(`/customers/${c.id}`);
      onDetailLoaded?.(data);
    } catch {
      onDetailLoaded?.(null);
    }
  };

  const clear = () => {
    onChange(emptyCustomer());
    onDetailLoaded?.(null);
    setShowHistory(false);
    setShowVitals(false);
  };

  const typedSomething =
    customer.first_name.trim() ||
    customer.last_name.trim() ||
    customer.phone.trim();
  const bmi = bmiOf(customer.height_cm, customer.weight_kg);
  const vitalsSummary = [
    customer.height_cm ? `${customer.height_cm} sm` : null,
    customer.weight_kg ? `${customer.weight_kg} kg` : null,
    customer.allergies ? "allergiya bor" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const activeTasks = detail?.active_follow_ups || [];
  const purchases = detail?.purchases || [];

  return (
    <div
      ref={boxRef}
      onFocusCapture={handleFocusCapture}
      className="bg-white border border-line rounded-2xl p-4 space-y-3 relative"
      data-testid="pos-customer"
    >
      <div className="flex items-center justify-between">
        <div className="font-serif text-lg text-noir flex items-center gap-2">
          <User className="w-5 h-5 text-rose" /> Mijoz
        </div>
        {customer.id ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Bazadan tanlangan
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-stone hover:text-rose"
              title="Boshqa mijoz"
              data-testid="pos-customer-clear"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : typedSomething ? (
          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1">
            <UserPlus className="w-3 h-3" /> Yangi mijoz yaratiladi
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Ismi *"
          value={customer.first_name}
          onChange={(e) => onField("first_name", e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          data-customer-search="true"
          className="h-10 bg-white"
          data-testid="pos-c-first"
        />
        <Input
          placeholder="Familiyasi"
          value={customer.last_name}
          onChange={(e) => onField("last_name", e.target.value)}
          className="h-10 bg-white"
          data-testid="pos-c-last"
        />
        <div className="relative col-span-2 sm:col-span-1">
          <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <Input
            placeholder="Telefon *"
            value={customer.phone}
            onChange={(e) => onField("phone", e.target.value)}
            onFocus={() => suggestions.length && setOpen(true)}
            data-customer-search="true"
            className="h-10 pl-8 bg-white"
            inputMode="tel"
            data-testid="pos-c-phone"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
          <Input
            placeholder="Yoshi"
            type="number"
            min={0}
            max={120}
            value={customer.age}
            onChange={(e) => set({ age: e.target.value })}
            className="h-10 bg-white"
            data-testid="pos-c-age"
          />
          <select
            value={customer.gender}
            onChange={(e) => set({ gender: e.target.value })}
            className="h-10 rounded-md border border-line bg-white px-2 text-sm text-noir focus:outline-none focus:ring-2 focus:ring-rose/30"
            data-testid="pos-c-gender"
          >
            <option value="">Jinsi</option>
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>
        <select
          value={customer.source}
          onChange={(e) => set({ source: e.target.value })}
          className="h-10 rounded-md border border-line bg-white px-2 text-sm text-noir focus:outline-none focus:ring-2 focus:ring-rose/30 col-span-2"
          data-testid="pos-c-source"
        >
          <option value="">Mijoz manbasi</option>
          <option value="instagram">Instagram</option>
          <option value="telegram">Telegram</option>
          <option value="referral">Tavsiyanoma</option>
          <option value="walk_in">Ko'cha / kelib tashrif</option>
          <option value="from_region">Viloyatdan kelganlar</option>
          <option value="other">Boshqa</option>
        </select>
      </div>
      <Input
        placeholder="Shikoyati / murojaat sababi"
        value={customer.complaint}
        onChange={(e) => set({ complaint: e.target.value })}
        className="h-10 bg-white"
        data-testid="pos-c-complaint"
      />

      {/* Sog'liq ma'lumotlari — dozani to'g'ri belgilash uchun */}
      <div className="border border-line rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVitals((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-noir bg-cream/60 hover:bg-cream transition-colors"
          data-testid="pos-vitals-toggle"
        >
          <HeartPulse className="w-3.5 h-3.5 text-rose" />
          <span className="font-medium whitespace-nowrap">
            Bo'y, vazn, sog'liq
          </span>
          {vitalsSummary && (
            <span className="text-stone truncate">· {vitalsSummary}</span>
          )}
          <span className="ml-auto text-stone">
            {showVitals ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
        {showVitals && (
          <div className="p-3 space-y-2 bg-white">
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[11px] text-stone">Bo'y (sm)</span>
                <Input
                  type="number"
                  min={30}
                  max={260}
                  value={customer.height_cm}
                  onChange={(e) => set({ height_cm: e.target.value })}
                  className="h-9 bg-white mt-0.5"
                  data-testid="pos-c-height"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-stone">Vazn (kg)</span>
                <Input
                  type="number"
                  min={2}
                  max={400}
                  step="0.1"
                  value={customer.weight_kg}
                  onChange={(e) => set({ weight_kg: e.target.value })}
                  className="h-9 bg-white mt-0.5"
                  data-testid="pos-c-weight"
                />
              </label>
              <div className="block">
                <span className="text-[11px] text-stone">TMI (BMI)</span>
                <div
                  className="h-9 mt-0.5 rounded-md border border-line bg-cream/60 px-2 flex flex-col justify-center leading-none overflow-hidden"
                  data-testid="pos-c-bmi"
                  title={bmi ? `${bmi} — ${bmiLabel(bmi)}` : ""}
                >
                  {bmi ? (
                    <>
                      <span className="text-sm text-noir font-medium">
                        {bmi}
                      </span>
                      <span className="text-[10px] text-stone truncate">
                        {bmiLabel(bmi)}
                      </span>
                    </>
                  ) : (
                    <span className="text-stone text-xs">—</span>
                  )}
                </div>
              </div>
            </div>
            <label className='text-[11px] text-stone'>Allergiya</label>
            <Input
              placeholder="Allergiyalar (masalan: penitsillin, asal)"
              value={customer.allergies}
              onChange={(e) => set({ allergies: e.target.value })}
              className="h-9 bg-white"
              data-testid="pos-c-allergies"
            />
            <label className='text-[11px] text-stone'>Surunkali kasallik</label>
            <Input
              placeholder="Surunkali kasallik / doimiy ichadigan dorilar"
              value={customer.conditions}
              onChange={(e) => set({ conditions: e.target.value })}
              className="h-9 bg-white"
              data-testid="pos-c-conditions"
            />
          </div>
        )}
      </div>

      <Textarea
        placeholder="Qo'shimcha izoh"
        rows={2}
        value={customer.note}
        onChange={(e) => set({ note: e.target.value })}
        className="bg-white"
        data-testid="pos-c-note"
      />

      {/* Takroriy telefon ogohlantirishi */}
      {dupWarning && (
        <div
          className="text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2"
          data-testid="pos-dup-phone"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            Bu raqam bilan mijoz mavjud: <b>{dupWarning.full_name}</b> (···
            {dupWarning.phone_tail}). Ikkinchi profil yaratilmasligi uchun uni
            tanlashingiz mumkin.
          </div>
          <button
            type="button"
            onClick={() => pick(dupWarning)}
            className="text-rose font-semibold whitespace-nowrap"
          >
            Tanlash
          </button>
        </div>
      )}

      {/* Typeahead */}
      {open && !customer.id && (
        <div
          className="absolute left-4 right-4 top-[104px] z-40 bg-white border border-line rounded-xl shadow-lg overflow-hidden"
          data-testid="pos-customer-suggestions"
        >
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-rose/5 border-b border-line/60 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-cream text-noir font-serif flex items-center justify-center text-sm">
                {(c.first_name || "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-noir font-medium">
                  {c.full_name || "—"}
                </div>
                <div className="text-[11px] text-stone">
                  {c.purchases_count
                    ? `${c.purchases_count} xarid`
                    : "xarid yo'q"}
                  {c.last_purchase_at
                    ? ` · oxirgi ${fmtDate(c.last_purchase_at)}`
                    : ""}
                </div>
              </div>
              <div className="text-sm font-mono text-stone">
                ···{c.phone_tail || "????"}
              </div>
            </button>
          ))}
          {suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-stone flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> Mos mijoz topilmadi — yangi
              mijoz yaratiladi
            </div>
          )}
        </div>
      )}

      {/* Tanlangan mijoz kartasi: tarix + faol vazifalar */}
      {customer.id && detail && (
        <div className="border-t border-line pt-3 space-y-2">
          {(detail.allergies || detail.conditions) && (
            <div
              className="text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-0.5"
              data-testid="pos-customer-health-warning"
            >
              {detail.allergies && (
                <div className="flex items-start gap-1.5 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <b>Allergiya:</b> {detail.allergies}
                  </span>
                </div>
              )}
              {detail.conditions && (
                <div className="flex items-start gap-1.5 text-amber-800">
                  <HeartPulse className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <b>Kasallik / dorilar:</b> {detail.conditions}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="flex items-center gap-1 bg-cream rounded-full px-3 py-1 text-noir hover:bg-rose hover:text-ivory transition-colors"
              data-testid="pos-customer-history-toggle"
            >
              <History className="w-3.5 h-3.5" /> Oldingi xaridlar:{" "}
              {purchases.length}
            </button>
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1 ${activeTasks.length ? "bg-rose/10 text-rose" : "bg-cream text-stone"}`}
            >
              <BellRing className="w-3.5 h-3.5" /> Faol qayta aloqa:{" "}
              {activeTasks.length}
            </span>
          </div>
          {showHistory && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
              {purchases.length === 0 && (
                <div className="text-stone">Xaridlar yo'q</div>
              )}
              {purchases.map((s) => (
                <div
                  key={s.id}
                  className="border border-line rounded-lg px-2.5 py-1.5"
                >
                  <div className="flex justify-between text-noir font-medium">
                    <span>
                      №{s.daily_number} · {fmtDate(s.sale_date)}
                    </span>
                    <span>{fmtMoney(s.total)}</span>
                  </div>
                  <div className="text-stone">
                    {(s.items || [])
                      .map((i) => `${i.product_name} ×${i.quantity}`)
                      .join(", ")}
                  </div>
                </div>
              ))}
              {activeTasks.length > 0 && (
                <div className="pt-1">
                  <div className="text-stone mb-1">Faol vazifalar:</div>
                  {activeTasks.map((f) => (
                    <div
                      key={f.id}
                      className="flex justify-between border border-line rounded-lg px-2.5 py-1.5 mb-1"
                    >
                      <span className="text-noir">
                        {fmtDate(f.scheduled_at)} · {f.product_name}
                      </span>
                      <span className="text-stone">
                        {STATUS_LABELS[f.status] || f.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
