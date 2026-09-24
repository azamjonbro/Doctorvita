import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart,
  ScanLine,
  Hash,
  Clock,
  UserCircle2,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import ScannerPanel from "@/components/ScannerPanel";
import ProductSearch from "./ProductSearch";
import CartItemRow from "./CartItemRow";
import CustomerPanel, { emptyCustomer } from "./CustomerPanel";
import FollowUpPreview from "./FollowUpPreview";
import ReceiptDialog from "./ReceiptDialog";
import {
  DEFAULT_RULES,
  computeFollowUpSchedule,
  computeRegimen,
  fmtMoney,
  formatCalendarDate,
  lineTotals,
  newRequestId,
  normalizePhone,
  todayISO,
  unitsFromProduct,
} from "@/lib/posLogic";

const numOrNull = (v) =>
  v === "" || v === null || v === undefined ? null : Number(v);

let uidSeq = 0;
const makeItem = (product) => ({
  uid: `it${++uidSeq}`,
  product,
  quantity: 1,
  discountOverride: 0,
  isMedicine:
    (product.category || "vitamins") !== "skincare" &&
    (product.category || "") !== "bodycare",
  regimen: {
    timesPerDay: "",
    unitsPerIntake: "",
    unitsPerPackage: unitsFromProduct(product),
    recommendation: "",
    courseStart: todayISO(),
  },
  followUpsEdited: null,
  stockWarning: false,
});

/**
 * Asosiy sotuv oynasi — Billz uslubida bitta ekran:
 * savdo raqami · mahsulot qidiruvi · savat + qabul tartibi · mijoz · qayta aloqa · jami · yakunlash.
 */
export default function SalesScreen({ user, onCompleted }) {
  const [meta, setMeta] = useState(null); // {daily_number, sale_code, date}
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(emptyCustomer());
  const [customerDetail, setCustomerDetail] = useState(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [dupPrompt, setDupPrompt] = useState(null); // 409 duplicate_phone javobi
  const [openScanner, setOpenScanner] = useState(false);
  const [scanned, setScanned] = useState([]);
  const [clock, setClock] = useState(new Date());
  const requestId = useRef(newRequestId());
  const submitting = useRef(false);
  const searchRef = useRef(null);

  const loadMeta = useCallback(async () => {
    try {
      const { data } = await api.get("/pos/next-number");
      setMeta(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadMeta();
    api
      .get("/pos/settings")
      .then(({ data }) =>
        setRules({
          stages: data.stages,
          min_course_days: data.min_course_days,
        }),
      )
      .catch(() => {});
    const t = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(t);
  }, [loadMeta]);

  // ===== Savat =====
  const addToCart = useCallback((product, qty = 1) => {
    const stock = Number(product.stock ?? 0);
    if (stock <= 0) {
      toast.error(`"${product.name}" tugagan — sotib bo'lmaydi`);
      return;
    }
    setCart((prev) => {
      const ex = prev.find((c) => c.product.id === product.id);
      if (ex) {
        const nq = ex.quantity + qty;
        if (nq > stock) {
          toast.warning(`Omborda atigi ${stock} ta bor`);
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id
            ? { ...c, quantity: nq, followUpsEdited: null }
            : c,
        );
      }
      return [...prev, makeItem(product)];
    });
  }, []);

  const patchItem = (uid, patch) =>
    setCart((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, ...patch } : c)),
    );
  const removeItem = (uid) =>
    setCart((prev) => prev.filter((c) => c.uid !== uid));

  // ===== Doim faol hardware skaner =====
  const scanBuf = useRef("");
  const scanT = useRef(null);
  const handleScannedCode = useCallback(
    async (code) => {
      try {
        const { data } = await api.get(
          `/products/by-barcode/${encodeURIComponent(code)}`,
        );
        const arr = Array.isArray(data) ? data : [data];
        if (arr.length === 1 && !openScanner) {
          addToCart(arr[0], 1);
          toast.success(`"${arr[0].name}" savatga qo'shildi`);
        } else {
          setScanned(arr);
          setOpenScanner(true);
        }
      } catch (e) {
        toast.error(
          formatApiError(e.response?.data?.detail) || "Mahsulot topilmadi",
        );
      }
    },
    [addToCart, openScanner],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (openScanner || receipt) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "Enter") {
        const code = scanBuf.current.trim();
        scanBuf.current = "";
        clearTimeout(scanT.current);
        if (code.length >= 4) handleScannedCode(code);
      } else if (e.key.length === 1) {
        scanBuf.current += e.key;
        clearTimeout(scanT.current);
        scanT.current = setTimeout(() => {
          scanBuf.current = "";
        }, 250);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openScanner, receipt, handleScannedCode]);

  // ===== Hisob-kitoblar (real vaqtda) =====
  const calc = useMemo(() => {
    const map = {};
    for (const c of cart) {
      const totals = lineTotals(c.product, c.quantity, c.discountOverride);
      const reg = computeRegimen({
        quantity: c.quantity,
        unitsPerPackage: c.regimen.unitsPerPackage,
        timesPerDay: c.regimen.timesPerDay,
        unitsPerIntake: c.regimen.unitsPerIntake,
        courseStart: c.regimen.courseStart || todayISO(),
      });
      const schedule =
        c.followUpsEdited ??
        computeFollowUpSchedule(
          reg.estimated_days,
          reg.course_start_date,
          rules,
        );
      map[c.uid] = { totals, reg, schedule };
    }
    return map;
  }, [cart, rules]);

  const subtotal = cart.reduce((s, c) => s + calc[c.uid].totals.line_total, 0);
  const itemDiscount = cart.reduce(
    (s, c) => s + calc[c.uid].totals.discount_total,
    0,
  );
  const extraDiscount = Math.min(
    Math.max(Number(discountAmount) || 0, 0),
    subtotal,
  );
  const total = Math.max(subtotal - extraDiscount, 0);

  const followUpEntries = cart
    .filter((c) => c.isMedicine && calc[c.uid].reg.estimated_days > 0)
    .map((c) => ({
      uid: c.uid,
      product: c.product,
      reg: calc[c.uid].reg,
      schedule: calc[c.uid].schedule,
      edited: c.followUpsEdited !== null,
    }));

  const editFollowUp = (uid, idx, patch) => {
    const cur = [...(calc[uid]?.schedule || [])];
    if (patch === null) cur.splice(idx, 1);
    else if (idx >= cur.length) cur.push(patch);
    else cur[idx] = { ...cur[idx], ...patch };
    cur.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    patchItem(uid, {
      followUpsEdited: cur.map((f, i) => ({ ...f, follow_up_number: i + 1 })),
    });
  };

  // ===== Tekshiruv =====
  const problems = [];
  if (cart.length === 0) problems.push("Kamida bitta mahsulot tanlang");
  if (!customer.first_name.trim()) problems.push("Mijoz ismini kiriting");
  if (normalizePhone(customer.phone).length < 9)
    problems.push("Mijoz telefon raqamini kiriting");
  for (const c of cart) {
    if (c.isMedicine && calc[c.uid].reg.daily_usage <= 0)
      problems.push(
        `${c.product.name}: kuniga necha mahal va har mahal nechtadan`,
      );
    else if (c.isMedicine && calc[c.uid].reg.total_units <= 0)
      problems.push(`${c.product.name}: qadoqdagi dona soni`);
  }
  const canSubmit = problems.length === 0 && !busy;

  // ===== Yakunlash =====
  const buildPayload = (extra = {}) => ({
    client_request_id: requestId.current,
    customer: {
      id: customer.id || null,
      first_name: customer.first_name.trim(),
      last_name: customer.last_name.trim(),
      phone: customer.phone.trim(),
      age: numOrNull(customer.age),
      gender: customer.gender || "",
      height_cm: numOrNull(customer.height_cm),
      weight_kg: numOrNull(customer.weight_kg),
      allergies: customer.allergies.trim(),
      conditions: customer.conditions.trim(),
      complaint: customer.complaint.trim(),
      note: customer.note.trim(),
      ...extra,
    },
    discount_amount: extraDiscount,
    note: note.trim(),
    items: cart.map((c) => ({
      product_id: c.product.id,
      quantity: Number(c.quantity),
      discount_override: Number(c.discountOverride) || 0,
      is_medicine: c.isMedicine,
      regimen: c.isMedicine
        ? {
            units_per_package: Number(c.regimen.unitsPerPackage) || 1,
            times_per_day: Number(c.regimen.timesPerDay) || 0,
            units_per_intake: Number(c.regimen.unitsPerIntake) || 0,
            recommendation: c.regimen.recommendation.trim(),
            course_start_date: c.regimen.courseStart || todayISO(),
          }
        : null,
      follow_ups:
        c.isMedicine && c.followUpsEdited !== null
          ? c.followUpsEdited.map((f) => ({
              stage_key: f.stage_key,
              stage_label: f.stage_label,
              purpose: f.purpose || "",
              scheduled_date: f.scheduled_date,
            }))
          : null,
    })),
  });

  const submit = async (extra = {}) => {
    if (submitting.current) return; // ikki marta bosishdan himoya
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const { data } = await api.post("/pos/sales", buildPayload(extra));
      setReceipt(data);
      setCart([]);
      setCustomer(emptyCustomer());
      setCustomerDetail(null);
      setDiscountAmount("");
      setNote("");
      setDupPrompt(null);
      requestId.current = newRequestId();
      toast.success(
        `Savdo №${data.sale.daily_number} saqlandi · ${data.follow_ups.length} ta qayta aloqa vazifasi yaratildi`,
      );
      loadMeta();
      onCompleted?.(data);
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (e.response?.status === 409 && detail?.code === "duplicate_phone") {
        setDupPrompt(detail);
      } else {
        toast.error(formatApiError(detail) || e.message);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const useExistingFromDup = async () => {
    const c = dupPrompt.customer;
    setDupPrompt(null);
    setCustomer((prev) => ({
      ...prev,
      id: c.id,
      first_name: c.first_name || prev.first_name,
      last_name: c.last_name || prev.last_name,
      phone: c.phone || prev.phone,
      age: c.age ?? prev.age,
      gender: c.gender || prev.gender,
      height_cm: c.height_cm ?? prev.height_cm,
      weight_kg: c.weight_kg ?? prev.weight_kg,
      allergies: c.allergies || prev.allergies,
      conditions: c.conditions || prev.conditions,
    }));
    try {
      const { data } = await api.get(`/customers/${c.id}`);
      setCustomerDetail(data);
    } catch {
      /* ignore */
    }
    toast.info('Mavjud mijoz tanlandi — "Sotuvni yakunlash"ni qayta bosing');
  };

  const closeReceipt = () => {
    setReceipt(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0" data-testid="pos-screen">
      {/* ===== Sarlavha: savdo raqami ===== */}
      <div className="bg-noir text-ivory rounded-2xl px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-rose" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ivory/60">
                Bugungi savdo
              </div>
              <div
                className="font-serif text-2xl leading-none"
                data-testid="pos-daily-number"
              >
                №{meta?.daily_number ?? "…"}
              </div>
            </div>
          </div>
          <div
            className="hidden sm:block text-xs text-ivory/70 font-mono"
            data-testid="pos-sale-code"
          >
            {meta?.sale_code || ""}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-ivory/80">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {formatCalendarDate(clock)}{" "}
            {clock.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="flex items-center gap-1">
            <UserCircle2 className="w-3.5 h-3.5" /> {user.name}{" "}
            {user.surname || ""}
          </span>
          <span className="hidden md:flex items-center gap-1 bg-ivory/10 rounded-full px-2 py-0.5">
            <ScanLine className="w-3.5 h-3.5 text-rose" /> Skaner faol
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* ===== Chap: qidiruv + savat ===== */}
        <div className="lg:col-span-7 space-y-3">
          <ProductSearch
            inputRef={searchRef}
            onPick={(p) => {
              addToCart(p, 1);
            }}
            onOpenCamera={() => {
              setScanned([]);
              setOpenScanner(true);
            }}
          />

          <div className="flex items-center justify-between px-1">
            <div className="font-serif text-lg text-noir flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-rose" /> Tanlangan
              mahsulotlar ({cart.length})
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-stone hover:text-rose"
              >
                Savatni tozalash
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div
              className="text-stone text-sm text-center py-12 border-2 border-dashed border-line rounded-2xl bg-white/60"
              data-testid="pos-cart-empty"
            >
              Savat bo'sh — mahsulotni qidiring yoki shtrix-kodni skanerda
              o'qing
            </div>
          ) : (
            <div className="space-y-2" data-testid="pos-cart">
              {cart.map((c, i) => (
                <CartItemRow
                  key={c.uid}
                  index={i}
                  item={c}
                  calc={calc[c.uid]}
                  onChange={(patch) => patchItem(c.uid, patch)}
                  onRemove={() => removeItem(c.uid)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ===== O'ng: mijoz, qayta aloqa, jami ===== */}
        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20">
          <CustomerPanel
            customer={customer}
            onChange={(c) => {
              setCustomer(c);
              if (!c.id) setCustomerDetail(null);
            }}
            detail={customerDetail}
            onDetailLoaded={setCustomerDetail}
          />

          <FollowUpPreview
            entries={followUpEntries}
            onEdit={editFollowUp}
            onReset={(uid) => patchItem(uid, { followUpsEdited: null })}
          />

          <div
            className="bg-white border border-line rounded-2xl p-4 space-y-2"
            data-testid="pos-totals"
          >
            <div className="flex justify-between text-sm text-stone">
              <span>Oraliq summa</span>
              <span data-testid="pos-subtotal">{fmtMoney(subtotal)}</span>
            </div>
            {itemDiscount > 0 && (
              <div className="flex justify-between text-sm text-rose">
                <span>Mahsulot chegirmalari</span>
                <span>−{fmtMoney(itemDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm text-stone gap-3">
              <span>Chegirma (so'm)</span>
              <input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
                className="w-32 h-8 rounded-md border border-line bg-white px-2 text-right text-sm text-noir"
                data-testid="pos-discount"
              />
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Sotuvga izoh (ixtiyoriy)"
              className="w-full h-8 rounded-md border border-line bg-white px-2 text-xs text-noir"
            />
            <div className="border-t border-line pt-2 flex justify-between items-end">
              <span className="font-serif text-lg text-noir">
                Yakuniy to'lov
              </span>
              <span
                className="font-serif text-3xl text-noir"
                data-testid="pos-total"
              >
                {fmtMoney(total)}
              </span>
            </div>

            {problems.length > 0 && cart.length > 0 && (
              <ul
                className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5"
                data-testid="pos-problems"
              >
                {problems.slice(0, 3).map((p, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {p}
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              onClick={() => submit()}
              disabled={!canSubmit}
              className="w-full h-12 bg-rose text-ivory hover:bg-noir rounded-full text-base"
              data-testid="pos-submit"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saqlanmoqda…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Sotuvni yakunlash
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobil: pastki yopishqoq jami + tugma */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-line px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-stone">
            Jami
          </div>
          <div className="font-serif text-xl text-noir">{fmtMoney(total)}</div>
        </div>
        <Button
          type="button"
          onClick={() => submit()}
          disabled={!canSubmit}
          className="bg-rose text-ivory hover:bg-noir rounded-full h-11 px-5"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yakunlash"}
        </Button>
      </div>

      {/* Takroriy telefon — tanlov */}
      <Dialog
        open={!!dupPrompt}
        onOpenChange={(v) => {
          if (!v) setDupPrompt(null);
        }}
      >
        <DialogContent
          className="bg-ivory border-line rounded-2xl max-w-md"
          data-testid="pos-dup-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-noir">
              Bu telefon raqami bazada bor
            </DialogTitle>
            <DialogDescription className="text-stone text-sm">
              {dupPrompt?.msg}. Mavjud mijozni tanlaysizmi yoki baribir yangi
              profil yaratasizmi?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              onClick={useExistingFromDup}
              className="bg-noir text-ivory hover:bg-rose rounded-full"
              data-testid="pos-dup-use-existing"
            >
              Mavjud mijozni tanlash
            </Button>
            <Button
              variant="outline"
              onClick={() => submit({ allow_duplicate_phone: true })}
              className="rounded-full"
              data-testid="pos-dup-create-anyway"
            >
              Baribir yangi mijoz yaratish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kamera skaneri */}
      <Dialog
        open={openScanner}
        onOpenChange={(v) => {
          setOpenScanner(v);
          if (!v) setScanned([]);
        }}
      >
        <DialogContent className="bg-ivory border-line rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir flex items-center gap-2">
              <ScanLine className="w-6 h-6 text-rose" /> Kamera skaneri
            </DialogTitle>
            <DialogDescription className="text-stone text-sm">
              Kamerani yoqing yoki kodni qo'lda kiriting. Hardware skaner ham
              doim faol.
            </DialogDescription>
          </DialogHeader>
          <ScannerPanel
            onCode={handleScannedCode}
            scannedProduct={scanned[0] || null}
            scannedProducts={scanned}
            onClose={() => {
              setOpenScanner(false);
              setScanned([]);
            }}
            onUseInSale={(p) => {
              addToCart(p, 1);
              setOpenScanner(false);
              setScanned([]);
            }}
          />
        </DialogContent>
      </Dialog>

      <ReceiptDialog bundle={receipt} onClose={closeReceipt} />
    </div>
  );
}
