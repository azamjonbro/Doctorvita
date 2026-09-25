import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  PhoneOff,
  CalendarClock,
  CalendarDays,
  Ban,
  ChevronDown,
  ChevronUp,
  Pill,
} from "lucide-react";
import { fmtDate, todayISO, addDays, STATUS_LABELS } from "@/lib/posLogic";

const SCOPES = [
  { v: "today", l: "Bugun" },
  { v: "overdue", l: "Kechikkan" },
  { v: "upcoming", l: "Kelgusi" },
  { v: "done", l: "Bajarilgan" },
];

const STATUS_STYLE = {
  planned: "bg-cream text-noir",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no_answer: "bg-amber-50 text-amber-700 border-amber-200",
  postponed: "bg-sky-50 text-sky-700 border-sky-200",
  cancelled: "bg-gray-100 text-gray-500",
};

import { DatePicker } from "@/components/ui/date-picker";

function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Sana tanlang",
  min,
  testId,
}) {
  return (
    <div className="text-xs text-stone">
      <span>{label}</span>
      <div className="mt-1">
        <DatePicker
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          min={min}
          testId={testId}
          className="h-9 min-w-[150px] text-xs font-normal"
        />
      </div>
    </div>
  );
}

/**
 * Qayta aloqa vazifalari: bir kunga bir mijoz bo'yicha bir nechta vazifa tushsa —
 * bitta qo'ng'iroq kartasiga guruhlanadi, lekin har bir mahsulot holati alohida belgilanadi.
 */
export default function FollowUpsPanel({ onSummary }) {
  const [scope, setScope] = useState("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    today: 0,
    overdue: 0,
    upcoming_7d: 0,
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // {task, status}
  const [expanded, setExpanded] = useState({});

  const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        api.get("/followups", {
          params: {
            scope,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        }),
        api.get("/followups/summary"),
      ]);
      setItems(l.data);
      setSummary(s.data);
      onSummary?.(s.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, scope, onSummary]);

  useEffect(() => {
    load();
  }, [load]);

  // Guruhlash: sana + mijoz → bitta qo'ng'iroq
  const groups = useMemo(() => {
    const map = new Map();
    for (const f of items) {
      const key = `${f.scheduled_at}|${f.customer_id}`;
      if (!map.has(key))
        map.set(key, {
          key,
          date: f.scheduled_at,
          customer_id: f.customer_id,
          customer_name: f.customer_name,
          customer_phone: f.customer_phone,
          employee: f.assigned_employee_name,
          tasks: [],
        });
      map.get(key).tasks.push(f);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.customer_name.localeCompare(b.customer_name),
    );
  }, [items]);

  const today = todayISO();

  const save = async (task, status, extra = {}) => {
    try {
      await api.patch(`/followups/${task.id}`, { status, ...extra });
      toast.success(`${task.product_name}: ${STATUS_LABELS[status]}`);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-4" data-testid="followups-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-serif text-xl text-noir flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-rose" /> Qayta aloqa vazifalari
          </h3>
          <p className="text-stone text-sm">
            Dori muddatidan kelib chiqib avtomatik yaratilgan qo'ng'iroqlar
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span
            className="bg-noir text-ivory rounded-full px-3 py-1.5"
            data-testid="fu-summary-today"
          >
            Bugun: {summary.today}
          </span>
          <span
            className={`rounded-full px-3 py-1.5 flex items-center gap-1 ${summary.overdue ? "bg-rose text-ivory" : "bg-cream text-stone"}`}
            data-testid="fu-summary-overdue"
          >
            {summary.overdue > 0 && <AlertTriangle className="w-3 h-3" />}{" "}
            Kechikkan: {summary.overdue}
          </span>
          <span className="bg-cream text-stone rounded-full px-3 py-1.5">
            7 kun ichida: {summary.upcoming_7d}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-cream rounded-full p-1 w-fit">
          {SCOPES.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setScope(o.v)}
              className={`px-3 py-1.5 text-sm rounded-full transition ${scope === o.v ? "bg-noir text-ivory" : "text-stone hover:text-noir"}`}
              data-testid={`fu-scope-${o.v}`}
            >
              {o.l}
              {o.v === "overdue" && summary.overdue > 0 && (
                <span className="ml-1 text-rose">●</span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-end justify-end gap-2 rounded-2xl bg-cream p-3">
          <DatePickerField
            label="Dan"
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Boshlanish"
            testId="fu-filter-from"
          />
          <DatePickerField
            label="Gacha"
            value={dateTo}
            onChange={setDateTo}
            placeholder="Tugash"
            testId="fu-filter-to"
          />
          {(dateFrom || dateTo) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-full text-xs"
            >
              Filterni tozalash
            </Button>
          )}
        </div>

        {invalidRange && (
          <div className="text-xs text-rose bg-rose/10 border border-rose/20 rounded-lg px-3 py-2">
            Sana oralig'i noto'g'ri: boshlang'ich sana tugatish sanasidan keyin
            bo'lishi kerak.
          </div>
        )}
      </div>

      {loading && items.length === 0 && (
        <div className="text-stone text-sm">Yuklanmoqda…</div>
      )}
      {!loading && groups.length === 0 && (
        <div className="text-stone bg-cream rounded-xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Bu bo'limda vazifalar yo'q.
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => {
          const overdue =
            g.date < today &&
            g.tasks.some((t) => ["planned", "postponed"].includes(t.status));
          const isOpen = expanded[g.key] ?? true;
          return (
            <div
              key={g.key}
              className={`bg-white rounded-2xl border p-4 ${overdue ? "border-rose/60" : "border-line"}`}
              data-testid={`fu-group-${g.key}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-serif text-lg text-noir">
                      {g.customer_name}
                    </div>
                    {overdue && (
                      <span className="text-[10px] bg-rose text-ivory rounded-full px-2 py-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Kechikkan
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-stone flex flex-wrap gap-x-3">
                    <a
                      href={`tel:${g.customer_phone}`}
                      className="text-noir font-mono hover:text-rose"
                    >
                      {g.customer_phone}
                    </a>
                    <span>· {fmtDate(g.date)}</span>
                    <span>· {g.tasks.length} ta mahsulot</span>
                    {g.employee && <span>· {g.employee}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((e) => ({ ...e, [g.key]: !isOpen }))
                  }
                  className="text-stone hover:text-noir"
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  {g.tasks.map((t) => {
                    const active = ["planned", "postponed"].includes(t.status);
                    return (
                      <div
                        key={t.id}
                        className="border border-line rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3"
                        data-testid={`fu-task-${t.id}`}
                      >
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Pill className="w-3.5 h-3.5 text-rose" />
                            <span className="font-medium text-noir">
                              {t.product_name}
                            </span>
                            <span className="text-[10px] bg-cream rounded-full px-2 py-0.5 text-stone">
                              {t.follow_up_number}-aloqa · {t.stage_label}
                            </span>
                            <span
                              className={`text-[10px] border rounded-full px-2 py-0.5 ${STATUS_STYLE[t.status] || ""}`}
                            >
                              {STATUS_LABELS[t.status] || t.status}
                            </span>
                          </div>
                          <div className="text-xs text-stone mt-1 space-x-2">
                            {t.recommendation && (
                              <span>{t.recommendation}</span>
                            )}
                            <span>
                              · Sotuv: {fmtDate(t.sale_date)} (№{t.daily_number}
                              )
                            </span>
                            {t.estimated_end_date && (
                              <span>
                                · Tugaydi: {fmtDate(t.estimated_end_date)}
                              </span>
                            )}
                          </div>
                          {t.purpose && (
                            <div className="text-xs text-stone/80 mt-0.5 italic">
                              {t.purpose}
                            </div>
                          )}
                          {t.result_note && (
                            <div className="text-xs text-noir mt-1 bg-cream rounded-md px-2 py-1">
                              Natija: {t.result_note}
                            </div>
                          )}
                          {t.next_follow_up_at && t.status !== "postponed" && (
                            <div className="text-xs text-stone mt-0.5">
                              Keyingi aloqa: {fmtDate(t.next_follow_up_at)}
                            </div>
                          )}
                        </div>
                        {active && (
                          <div className="flex gap-1.5 flex-wrap md:flex-nowrap">
                            <Button
                              size="sm"
                              onClick={() =>
                                setEditing({ task: t, status: "done" })
                              }
                              className="bg-noir text-ivory hover:bg-emerald-600 rounded-full text-xs"
                              data-testid={`fu-done-${t.id}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{" "}
                              Bajarildi
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditing({ task: t, status: "no_answer" })
                              }
                              className="rounded-full text-xs"
                              title="Javob bermadi"
                            >
                              <PhoneOff className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditing({ task: t, status: "postponed" })
                              }
                              className="rounded-full text-xs"
                              title="Keyinga qoldirish"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setEditing({ task: t, status: "cancelled" })
                              }
                              className="rounded-full text-xs text-stone"
                              title="Bekor qilish"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <ResultDialog
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ResultDialog({ editing, onClose, onSave }) {
  const { task, status } = editing;
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(
    status === "postponed" ? addDays(todayISO(), 2) : "",
  );
  const needsDate = status === "postponed";
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="bg-ivory border-line rounded-2xl max-w-md"
        data-testid="fu-result-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-noir">
            {STATUS_LABELS[status]}
          </DialogTitle>
          <DialogDescription className="text-stone text-sm">
            {task.customer_name} · {task.product_name} · {task.stage_label}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs text-stone">
            Suhbat natijasi va izoh
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-white mt-1"
              placeholder="Mijoz nima dedi, qanday holat…"
              data-testid="fu-result-note"
            />
          </label>
          <div className="block text-xs text-stone">
            {needsDate
              ? "Yangi aloqa sanasi *"
              : "Keyingi aloqa sanasi (ixtiyoriy)"}
            <DatePickerField
              value={nextDate}
              onChange={setNextDate}
              placeholder="Sanani tanlang"
              min={todayISO()}
              testId="fu-next-date"
            />
          </div>
          <Button
            onClick={() =>
              onSave(task, status, {
                result_note: note,
                next_follow_up_at: nextDate || null,
              })
            }
            disabled={needsDate && !nextDate}
            className="w-full bg-noir text-ivory hover:bg-rose rounded-full"
            data-testid="fu-result-save"
          >
            Saqlash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
