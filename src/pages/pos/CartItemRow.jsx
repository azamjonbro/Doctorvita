import React from "react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Minus,
  Trash2,
  Pill,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/posLogic";

const NumField = ({
  label,
  value,
  onChange,
  min = 0,
  className = "",
  testId,
}) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] text-stone">{label}</span>
    <Input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 bg-white mt-0.5"
      data-testid={testId}
    />
  </label>
);

const CourseDatePicker = ({ value, onChange }) => {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between bg-white text-left font-normal"
        >
          <span className={value ? "text-noir" : "text-stone"}>
            {value
              ? format(selected, "dd MMM yyyy", { locale: uz })
              : "Kurs boshlanishi"}
          </span>
          <CalendarDays className="w-4 h-4 text-stone" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={uz}
          weekStartsOn={1}
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

/**
 * Savatdagi bitta qator: narx/miqdor/jami + dori uchun qabul tartibi bloki.
 * `calc` — SalesScreen hisoblab bergan {totals, regimen} natijasi.
 */
export default function CartItemRow({ index, item, calc, onChange, onRemove }) {
  const { product, quantity, isMedicine, regimen, discountOverride } = item;
  const stock = Number(product.stock ?? 0);
  const { totals, reg } = calc;

  const setQty = (q) => {
    const n = Math.max(1, Math.floor(Number(q) || 1));
    if (n > stock) {
      onChange({ quantity: stock, stockWarning: true });
      return;
    }
    onChange({ quantity: n, stockWarning: false });
  };
  const setReg = (patch) =>
    onChange({ regimen: { ...regimen, ...patch }, followUpsEdited: null });

  return (
    <div
      className="bg-white border border-line rounded-2xl overflow-hidden"
      data-testid={`pos-cart-item-${index}`}
    >
      {/* Yuqori qator: nom, narx, miqdor, jami */}
      <div className="flex items-start gap-3 p-3">
        <div className="w-7 h-7 rounded-full bg-cream text-noir text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-noir text-sm leading-snug">
            {product.name}
          </div>
          <div className="text-[11px] text-stone flex gap-2 flex-wrap mt-0.5">
            {product.sku && <span>SKU: {product.sku}</span>}
            {product.barcode && <span>Kod: {product.barcode}</span>}
            <span>Qoldiq: {stock}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            {totals.discount_percent > 0 && (
              <span className="line-through text-stone">
                {fmtMoney(totals.original_price)}
              </span>
            )}
            <span className="font-semibold text-noir">
              {fmtMoney(totals.unit_price)}
            </span>
            {totals.discount_percent > 0 && (
              <span className="bg-rose/10 text-rose rounded px-1">
                −{totals.discount_percent}%
              </span>
            )}
            <span className="text-stone">/ dona</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center rounded-lg border border-line bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setQty(quantity - 1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-rose hover:text-ivory text-stone transition-colors"
              data-testid={`pos-qty-minus-${index}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={stock}
              value={quantity}
              onChange={(e) => setQty(e.target.value)}
              className="w-12 text-center text-sm font-semibold border-0 bg-transparent focus:outline-none text-noir"
              data-testid={`pos-qty-${index}`}
            />
            <button
              type="button"
              onClick={() => setQty(quantity + 1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-rose hover:text-ivory text-stone transition-colors"
              data-testid={`pos-qty-plus-${index}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            className="font-semibold text-noir text-sm"
            data-testid={`pos-line-total-${index}`}
          >
            {fmtMoney(totals.line_total)}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-stone hover:text-rose p-1 -mr-1 mt-0.5"
          title="Savatdan o'chirish"
          data-testid={`pos-remove-${index}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {item.stockWarning && (
        <div className="mx-3 mb-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Omborda atigi {stock} ta bor —
          miqdor shunga tushirildi
        </div>
      )}

      {/* Pastki qator: qo'shimcha chegirma + dori rejimi */}
      <div className="border-t border-line/60 bg-cream/40 px-3 py-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-noir cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isMedicine}
              onChange={(e) => onChange({ isMedicine: e.target.checked })}
              className="accent-[#2E7D63] w-4 h-4"
              data-testid={`pos-medicine-${index}`}
            />
            <Pill className="w-3.5 h-3.5 text-rose" /> Dori — qabul tartibini
            kiritish
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-stone">
            Qo'sh. chegirma %
            <input
              type="number"
              min={0}
              max={100}
              value={discountOverride}
              onChange={(e) =>
                onChange({
                  discountOverride: Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className="w-14 h-7 rounded-md border border-line bg-white px-1.5 text-center text-xs text-noir"
              data-testid={`pos-disc-${index}`}
            />
          </label>
        </div>

        {isMedicine && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <NumField
                label="Kuniga (mahal)"
                value={regimen.timesPerDay}
                min={0}
                onChange={(v) => setReg({ timesPerDay: v })}
                testId={`pos-times-${index}`}
              />
              <NumField
                label="Iste'mol miqdori"
                value={regimen.unitsPerIntake}
                min={0}
                onChange={(v) => setReg({ unitsPerIntake: v })}
                testId={`pos-per-intake-${index}`}
              />
              <NumField
                label="Qadoqda (dona)"
                value={regimen.unitsPerPackage}
                min={1}
                onChange={(v) => setReg({ unitsPerPackage: v })}
                testId={`pos-upp-${index}`}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block col-span-2">
                <span className="text-[11px] text-stone">Tavsiya / izoh</span>
                <Input
                  value={regimen.recommendation}
                  onChange={(e) => setReg({ recommendation: e.target.value })}
                  placeholder="masalan: ovqatdan keyin"
                  className="h-9 bg-white mt-0.5"
                  data-testid={`pos-rec-${index}`}
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-stone">Kurs boshlanishi</span>
                <div className="mt-0.5" data-testid={`pos-start-${index}`}>
                  <CourseDatePicker
                    value={regimen.courseStart}
                    onChange={(value) => setReg({ courseStart: value })}
                  />
                </div>
              </label>
            </div>

            <div
              className={`rounded-xl px-3 py-2 text-xs flex items-center gap-3 flex-wrap ${reg.estimated_days > 0 ? "bg-white border border-line" : "bg-amber-50 border border-amber-200 text-amber-800"}`}
              data-testid={`pos-regimen-summary-${index}`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-rose" />
              <span>
                Jami: <b>{reg.total_units}</b> dona
              </span>
              <span>
                · Kunlik sarf: <b>{reg.daily_usage}</b>
              </span>
              {reg.estimated_days > 0 ? (
                <>
                  <span>
                    · Yetadi: <b>{reg.estimated_days} kun</b>
                  </span>
                  <span>
                    · Tugaydi: <b>{fmtDate(reg.estimated_end_date)}</b>
                  </span>
                </>
              ) : (
                <span>
                  · Kuniga necha mahal va har mahal nechtadan — kiriting
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
