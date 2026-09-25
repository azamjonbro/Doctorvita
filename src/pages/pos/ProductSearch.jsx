import React, { useEffect, useRef, useState } from "react";
import api, { safeImageUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Camera, Loader2, Package, Plus } from "lucide-react";
import { fmtMoney } from "@/lib/posLogic";

/**
 * Bitta qidiruv maydoni: nom / SKU / shtrix-kod.
 * Yozish davomida natijalar taklif qilinadi; Enter yoki klik — savatga qo'shadi.
 */
export default function ProductSearch({ onPick, onOpenCamera, inputRef }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const timer = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    clearTimeout(timer.current);
    if (!term) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const my = ++seq.current;
      setLoading(true);
      try {
        const { data } = await api.get("/pos/products/search", {
          params: { q: term, limit: 12 },
        });
        if (my !== seq.current) return;
        setResults(data);
        setActive(0);
        setOpen(true);
      } catch {
        if (my === seq.current) setResults([]);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer.current);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (p) => {
    if (!p) return;
    onPick(p);
    setQ("");
    setResults([]);
    setOpen(false);
    inputRef?.current?.focus();
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const term = q.trim();
      // Skaner Enter bilan tugatadi: aniq kod mosligi bo'lsa darhol qo'shamiz
      const exact = results.find(
        (r) => r.barcode === term || (r.sku && r.sku === term),
      );
      pick(exact || results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative" data-testid="pos-product-search">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={onKey}
            placeholder="Mahsulot nomi, SKU yoki shtrix-kod…"
            className="pl-9 h-11 text-base bg-white"
            autoComplete="off"
            data-testid="pos-search-input"
          />
          {loading && (
            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone animate-spin" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenCamera}
          className="h-11 border-rose text-rose hover:bg-rose hover:text-ivory rounded-xl px-3"
          title="Kamera skaneri"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      {open && (
        <div
          className="absolute z-40 mt-1 w-full bg-white border border-line rounded-xl shadow-lg overflow-hidden max-h-[380px] overflow-y-auto"
          data-testid="pos-search-results"
        >
          {results.length === 0 && !loading && (
            <div className="p-4 text-sm text-stone text-center">
              Mahsulot topilmadi
            </div>
          )}
          {results.map((p, i) => {
            const stock = Number(p.stock ?? 0);
            const out = stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => !out && pick(p)}
                disabled={out}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-line/60 last:border-0 transition-colors
                                    ${i === active ? "bg-rose/5" : ""} ${out ? "opacity-50 cursor-not-allowed" : "hover:bg-rose/5"}`}
                data-testid={`pos-result-${p.id}`}
              >
                {p.image_url ? (
                  <img
                    src={safeImageUrl(p.image_url)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = safeImageUrl(null);
                    }}
                    className="w-10 h-10 rounded-lg object-cover bg-cream flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center">
                    <Package className="w-4 h-4 text-stone" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-noir font-medium line-clamp-1">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-stone flex gap-2 flex-wrap">
                    {p.sku && <span>SKU: {p.sku}</span>}
                    {p.barcode && <span>Kod: {p.barcode}</span>}
                    {p.units_per_package > 1 && (
                      <span>· {p.units_per_package} dona/qadoq</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-noir">
                    {fmtMoney(p.final_price ?? p.price)}
                  </div>
                  <div
                    className={`text-[11px] ${out ? "text-red-600 font-semibold" : stock <= 5 ? "text-amber-700" : "text-stone"}`}
                  >
                    {out ? "Tugagan" : `Qoldiq: ${stock}`}
                  </div>
                </div>
                {!out && <Plus className="w-4 h-4 text-rose flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
