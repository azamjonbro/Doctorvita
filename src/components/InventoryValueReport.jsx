import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  Building2,
  FileSpreadsheet,
  Loader2,
  Package,
  Wallet,
  Banknote,
  TrendingUp,
  Percent,
  Info,
} from "lucide-react";
import { todayISO, fmtDate } from "@/lib/posLogic";

const PAGE_SIZE = 50;
const money = (n) => `${Math.round(Number(n) || 0).toLocaleString("ru-RU")}`;
const pct = (n) =>
  n === null || n === undefined ? "—" : `${Number(n).toFixed(1)}%`;

/**
 * Ombordagi tovarlar qiymati: tannarx, retail, potensial yalpi foyda, ustama va marja.
 * Filialga biriktirilmagan admin / direktor bir yoki bir nechta filialni tanlaydi,
 * filial admini faqat o'z filialini ko'radi (backend ham shuni tekshiradi).
 */
export default function InventoryValueReport({ user }) {
  const canPickBranches = user?.role === "director" || !user?.branch_id;
  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState([]); // bo'sh — barcha filiallar
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [detailBranch, setDetailBranch] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!canPickBranches) return;
    api
      .get("/branches")
      .then(({ data: list }) => setBranches(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [canPickBranches]);

  const params = useMemo(
    () => ({
      ...(selected.length ? { branch_ids: selected.join(",") } : {}),
      ...(date && date !== todayISO() ? { date } : {}),
    }),
    [selected, date],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: report } = await api.get("/reports/inventory-value", {
        params,
      });
      setData(report);
      setDetailBranch("all");
      setPage(1);
    } catch (e) {
      setData(null);
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBranch = (id) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get("/reports/inventory-value.xlsx", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ombor-qiymati-${data?.date || date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Excel yuklab bo'lmadi");
    } finally {
      setExporting(false);
    }
  };

  const items = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    let list = data.items.filter(
      (i) =>
        (detailBranch === "all" || i.branch_id === detailBranch) &&
        (!term ||
          i.name.toLowerCase().includes(term) ||
          (i.sku || "").toLowerCase().includes(term) ||
          (i.barcode || "").includes(term)),
    );
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      profit: (a, b) => b.profit - a.profit,
      retail: (a, b) => b.retail_total - a.retail_total,
      qty: (a, b) => b.qty - a.qty,
      margin: (a, b) => (b.margin_pct ?? -1e9) - (a.margin_pct ?? -1e9),
    }[sort];
    return [...list].sort(by);
  }, [data, detailBranch, search, sort]);

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const t = data?.total;

  return (
    <div className="space-y-4" data-testid="inventory-report">
      <div className="bg-white rounded-2xl border border-line p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl text-noir">
              Ombordagi tovarlar qiymati
            </h3>
            <p className="text-sm text-stone">
              Tannarx, retail qiymat va potensial yalpi foyda — filiallar
              kesimida
            </p>
          </div>
          <Button
            onClick={exportExcel}
            disabled={exporting || !data}
            variant="outline"
            className="rounded-full"
            data-testid="inventory-export"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-1" />
            )}
            Excel'ga yuklash
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-stone">Sana (shu kundagi qoldiq)</div>
            <DatePicker
              value={date}
              onChange={(v) => setDate(v || todayISO())}
              placeholder="Sana"
              className="h-10 w-60 bg-white rounded-xl"
              testId="inventory-date"
            />
          </div>
          {canPickBranches ? (
            <div className="space-y-1.5 flex-1 min-w-[260px]">
              <div className="text-xs text-stone">Filiallar</div>
              <div
                className="flex flex-wrap gap-2"
                data-testid="inventory-branches"
              >
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className={`h-9 px-3 rounded-full border text-sm ${selected.length === 0 ? "bg-noir text-ivory border-noir" : "bg-white text-noir border-line hover:bg-cream"}`}
                >
                  Barcha filiallar
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBranch(b.id)}
                    className={`h-9 px-3 rounded-full border text-sm ${selected.includes(b.id) ? "bg-noir text-ivory border-noir" : "bg-white text-noir border-line hover:bg-cream"}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-stone flex items-center gap-1 pb-2">
              <Building2 className="w-4 h-4" />
              {user?.branch_name || "O'z filialingiz"}
            </div>
          )}
        </div>

        <div className="text-xs text-stone bg-cream rounded-xl px-3 py-2 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Potensial yalpi foyda — barcha qoldiq amaldagi retail narxda,
            chegirmasiz sotilganda olinadigan summa. Bu sof foyda emas: arenda,
            oylik, reklama, soliq, logistika va boshqa xarajatlar ayirilmagan.
            {data?.source === "snapshot" &&
              ` O'tgan sana uchun o'sha kunning oxirgi qoldig'i olingan.`}
            {data?.history_from &&
              ` Qoldiq tarixi ${fmtDate(data.history_from)} dan saqlanadi.`}
          </span>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-line p-10 text-center text-stone flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Hisoblanmoqda...
        </div>
      )}
      {!loading && error && (
        <div className="bg-rose/10 text-rose rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && data && t && (
        <>
          <div
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
            data-testid="inventory-kpis"
          >
            <Kpi
              icon={<Package className="w-4 h-4" />}
              label="Mahsulotlar"
              value={`${t.total_qty.toLocaleString("ru-RU")} dona`}
              hint={`${t.sku_count} xil mahsulot`}
            />
            <Kpi
              icon={<Wallet className="w-4 h-4" />}
              label="Jami tannarx"
              value={money(t.cost_total)}
              hint="so'm"
            />
            <Kpi
              icon={<Banknote className="w-4 h-4" />}
              label="Jami retail qiymati"
              value={money(t.retail_total)}
              hint="so'm"
            />
            <Kpi
              icon={<TrendingUp className="w-4 h-4" />}
              label="Potensial yalpi foyda"
              value={money(t.profit)}
              hint="so'm"
              accent
            />
            <Kpi
              icon={<Percent className="w-4 h-4" />}
              label="Ustama (tannarxga)"
              value={pct(t.markup_pct)}
            />
            <Kpi
              icon={<Percent className="w-4 h-4" />}
              label="Marja (retailga)"
              value={pct(t.margin_pct)}
            />
          </div>

          <div className="bg-white rounded-2xl border border-line overflow-x-auto">
            <table
              className="w-full text-sm"
              data-testid="inventory-branch-table"
            >
              <thead>
                <tr className="text-left text-xs text-stone border-b border-line">
                  <th className="px-4 py-3 font-medium">Filial</th>
                  <th className="px-4 py-3 font-medium text-right">Qoldiq</th>
                  <th className="px-4 py-3 font-medium text-right">Tannarx</th>
                  <th className="px-4 py-3 font-medium text-right">Retail</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Potensial foyda
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Ustama</th>
                  <th className="px-4 py-3 font-medium text-right">Marja</th>
                </tr>
              </thead>
              <tbody>
                {data.branches.map((b) => (
                  <tr
                    key={b.branch_id}
                    onClick={() => {
                      setDetailBranch(
                        detailBranch === b.branch_id ? "all" : b.branch_id,
                      );
                      setPage(1);
                    }}
                    className={`border-b border-line/60 cursor-pointer hover:bg-cream ${detailBranch === b.branch_id ? "bg-cream" : ""}`}
                    title="Mahsulotlarini ko'rish"
                  >
                    <td className="px-4 py-2.5 text-noir">
                      {b.branch_name}
                      {data.snapshot_dates?.[b.branch_id] &&
                        data.snapshot_dates[b.branch_id] !== data.date && (
                          <span className="ml-2 text-[11px] text-stone">
                            ({fmtDate(data.snapshot_dates[b.branch_id])} holati)
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {b.total_qty.toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {money(b.cost_total)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {money(b.retail_total)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-green-700">
                      {money(b.profit)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {pct(b.markup_pct)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {pct(b.margin_pct)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-cream/60">
                  <td className="px-4 py-3 text-noir">Umumiy</td>
                  <td className="px-4 py-3 text-right">
                    {t.total_qty.toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {money(t.cost_total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {money(t.retail_total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">
                    {money(t.profit)}
                  </td>
                  <td className="px-4 py-3 text-right">{pct(t.markup_pct)}</td>
                  <td className="px-4 py-3 text-right">{pct(t.margin_pct)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-line">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
              <div className="font-medium text-noir">
                Mahsulotlar kesimida
                {detailBranch !== "all" && (
                  <span className="text-stone font-normal">
                    {" "}
                    —{" "}
                    {
                      data.branches.find((b) => b.branch_id === detailBranch)
                        ?.branch_name
                    }{" "}
                    <button
                      type="button"
                      className="underline text-xs"
                      onClick={() => setDetailBranch("all")}
                    >
                      barchasi
                    </button>
                  </span>
                )}
              </div>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nom, SKU yoki shtrix-kod..."
                className="h-9 max-w-xs ml-auto"
                data-testid="inventory-search"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 rounded-md border border-line bg-white px-2 text-sm"
              >
                <option value="name">Nomi bo'yicha</option>
                <option value="profit">Potensial foyda ↓</option>
                <option value="retail">Retail qiymati ↓</option>
                <option value="qty">Qoldiq ↓</option>
                <option value="margin">Marja ↓</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="inventory-items">
                <thead>
                  <tr className="text-left text-xs text-stone border-b border-line">
                    <th className="px-4 py-2.5 font-medium">Mahsulot</th>
                    <th className="px-4 py-2.5 font-medium">SKU</th>
                    <th className="px-4 py-2.5 font-medium">Filial</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Qoldiq
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Dona tannarx
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Dona retail
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Jami tannarx
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Jami retail
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Potensial foyda
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Marja
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((i) => (
                    <tr
                      key={`${i.branch_id}:${i.product_id}`}
                      className="border-b border-line/50"
                    >
                      <td
                        className="px-4 py-2 text-noir max-w-[280px] truncate"
                        title={i.name}
                      >
                        {i.name}
                      </td>
                      <td className="px-4 py-2 text-stone">{i.sku || "—"}</td>
                      <td className="px-4 py-2 text-stone">{i.branch_name}</td>
                      <td className="px-4 py-2 text-right">{i.qty}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {money(i.unit_cost)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {money(i.unit_price)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {money(i.cost_total)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {money(i.retail_total)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono ${i.profit >= 0 ? "text-green-700" : "text-rose"}`}
                      >
                        {money(i.profit)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {pct(i.margin_pct)}
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-8 text-center text-stone"
                      >
                        Omborda mahsulot topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2 p-3 text-sm text-stone">
                <span>{items.length} ta mahsulot</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Oldingi
                </Button>
                <span className="text-noir">
                  {page}/{pages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Keyingi
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, hint, accent = false }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-4">
      <div className="text-[11px] uppercase tracking-widest text-stone flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div
        className={`font-serif text-2xl mt-1 ${accent ? "text-green-700" : "text-noir"}`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-stone">{hint}</div>}
    </div>
  );
}
