/**
 * POS hisob-kitoblari — backend/pos_logic.py ning ko'zgusi.
 * Ekranda darhol ko'rsatish uchun; yakuniy natijani backend qayta hisoblaydi.
 */

export const DEFAULT_RULES = {
    stages: [
        { key: "start", label: "Boshlanish holati", type: "offset", value: 3, purpose: "Qabul qilishni boshlagani va holatini bilish" },
        { key: "mid", label: "Oraliq natija", type: "percent", value: 50, purpose: "Oraliq natija va foydalanishni tekshirish" },
        { key: "end", label: "Qayta buyurtma", type: "before_end", value: 5, purpose: "Tugashidan oldin qayta buyurtma taklifi" },
    ],
    min_course_days: 10,
};

export const STATUS_LABELS = {
    planned: "Rejalashtirilgan",
    done: "Bajarildi",
    no_answer: "Javob bermadi",
    postponed: "Keyinga qoldirildi",
    cancelled: "Bekor qilindi",
};

export const todayISO = () => {
    // O'zbekiston vaqti (UTC+5) bo'yicha bugungi sana
    const d = new Date(Date.now() + 5 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
};

export const addDays = (iso, days) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
};

export const daysBetween = (fromISO, toISO) =>
    Math.round((new Date(`${toISO}T00:00:00Z`) - new Date(`${fromISO}T00:00:00Z`)) / 86400000);

export const fmtMoney = (n) => `${Math.round(Number(n) || 0).toLocaleString("ru-RU")} so'm`;

export const MONTH_SHORT_UZ = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

export const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
};

export const formatCalendarDate = (value) => {
    if (!value) return "—";
    const raw = typeof value === "string" ? value : value instanceof Date ? value.toISOString() : String(value);
    const iso = String(raw).slice(0, 10);
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d || Number.isNaN(Number(y)) || Number.isNaN(Number(m)) || Number.isNaN(Number(d))) {
        return "—";
    }
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.getUTCDate()} ${MONTH_SHORT_UZ[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const addCalendarMonths = (date, months) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
};

export const expiryStatus = (value, now = new Date()) => {
    if (!value) return { key: "unknown", label: "Muddat kiritilmagan", className: "bg-slate-100 text-slate-600" };
    const expiry = new Date(`${String(value).slice(0, 10)}T23:59:59`);
    if (Number.isNaN(expiry.getTime())) return { key: "unknown", label: "Muddat noto'g'ri", className: "bg-slate-100 text-slate-600" };
    if (expiry <= now || expiry <= addCalendarMonths(now, 3)) {
        return { key: "red", label: "3 oydan kam", className: "bg-red-600 text-white" };
    }
    if (expiry <= addCalendarMonths(now, 6)) {
        return { key: "light-red", label: "3-6 oy", className: "bg-red-200 text-red-900" };
    }
    if (expiry <= addCalendarMonths(now, 12)) {
        return { key: "yellow", label: "6-12 oy", className: "bg-yellow-200 text-yellow-900" };
    }
    return { key: "green", label: "1 yildan ko'p", className: "bg-green-200 text-green-900" };
};

export const phoneTail = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits.slice(-4);
};

/** Tana massa indeksi va uning izohi (bo'y sm, vazn kg). */
export const bmiOf = (heightCm, weightKg) => {
    const h = (Number(heightCm) || 0) / 100;
    const w = Number(weightKg) || 0;
    if (h <= 0 || w <= 0) return null;
    return Math.round((w / (h * h)) * 10) / 10;
};

export const bmiLabel = (bmi) => {
    if (!bmi) return "";
    if (bmi < 18.5) return "vazn kam";
    if (bmi < 25) return "normal";
    if (bmi < 30) return "ortiqcha vazn";
    return "semizlik";
};

export const normalizePhone = (phone) => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 9) digits = "998" + digits;
    return digits;
};

/** Nom yoki tavsifdan qadoqdagi dona sonini topadi ("№120", "O'rashda: 120 dona"). */
export const unitsFromProduct = (p) => {
    if (Number(p?.units_per_package) > 0) return Number(p.units_per_package);
    for (const text of [p?.description || "", p?.name || ""]) {
        let m = text.match(/O['ʼ’]rashda:\s*(\d+)\s*dona/i);
        if (m) return Number(m[1]);
        m = text.match(/№\s*(\d+)/);
        if (m) return Number(m[1]);
    }
    return 1;
};

export const computeRegimen = ({ quantity, unitsPerPackage, timesPerDay, unitsPerIntake, courseStart }) => {
    const totalUnits = Math.max(Number(quantity) || 0, 0) * Math.max(Number(unitsPerPackage) || 0, 0);
    const daily = Math.max(Number(timesPerDay) || 0, 0) * Math.max(Number(unitsPerIntake) || 0, 0);
    const days = daily > 0 && totalUnits > 0 ? Math.floor(totalUnits / daily) : 0;
    const start = courseStart || todayISO();
    return {
        total_units: totalUnits,
        daily_usage: daily,
        estimated_days: days,
        course_start_date: start,
        estimated_end_date: days > 0 ? addDays(start, days) : null,
    };
};

const stageDay = (stage, days) => {
    const v = Number(stage.value);
    if (Number.isNaN(v)) return null;
    if (stage.type === "offset") return Math.round(v);
    if (stage.type === "percent") return Math.round((days * v) / 100);
    if (stage.type === "before_end") return days - Math.round(v);
    return null;
};

export const computeFollowUpSchedule = (estimatedDays, courseStart, rules = DEFAULT_RULES) => {
    const days = Number(estimatedDays) || 0;
    if (days <= 1) return [];
    const minDays = Number(rules?.min_course_days ?? DEFAULT_RULES.min_course_days);
    const shortCourse = days < minDays;
    const seen = new Set();
    const out = [];
    (rules?.stages || []).forEach((stage, idx) => {
        const raw = stageDay(stage, days);
        if (raw === null) return;
        const day = Math.max(1, Math.min(raw, days - 1));
        if (seen.has(day)) return;
        seen.add(day);
        out.push({
            stage_key: stage.key || `stage${idx + 1}`,
            stage_label: stage.label || `${idx + 1}-aloqa`,
            purpose: stage.purpose || "",
            day_offset: day,
            scheduled_date: addDays(courseStart, day),
            manual_review: shortCourse || raw !== day,
        });
    });
    out.sort((a, b) => a.day_offset - b.day_offset);
    return out.map((o, i) => ({ ...o, follow_up_number: i + 1 }));
};

export const lineTotals = (product, quantity, extraDiscount = 0) => {
    const original = Number(product.price || 0);
    const totalDisc = Math.min(Math.max(Number(product.discount_percent || 0), 0) + Math.max(Number(extraDiscount) || 0, 0), 100);
    const unit = totalDisc > 0 ? Math.round((original * (100 - totalDisc)) / 100 * 100) / 100 : original;
    const qty = Number(quantity) || 0;
    return {
        discount_percent: totalDisc,
        unit_price: unit,
        original_price: original,
        line_total: Math.round(unit * qty * 100) / 100,
        discount_total: Math.round((original - unit) * qty * 100) / 100,
    };
};

export const newRequestId = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
