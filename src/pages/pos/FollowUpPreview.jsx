import React from "react";
import { PhoneCall, RotateCcw, Plus, X, AlertTriangle } from "lucide-react";
import { fmtDate, todayISO, addDays } from "@/lib/posLogic";
import { DatePicker } from "@/components/ui/date-picker";

/**
 * Avtomatik hisoblangan qayta aloqa sanalari — har bir dori uchun alohida.
 * Sotuvchi sanani o'zgartirishi, o'chirishi yoki qo'shishi mumkin; "Qayta hisoblash" — standartga qaytaradi.
 */
export default function FollowUpPreview({ entries, onEdit, onReset }) {
    if (entries.length === 0) {
        return (
            <div className="bg-white border border-line rounded-2xl p-4" data-testid="pos-followups-empty">
                <div className="font-serif text-lg text-noir flex items-center gap-2 mb-1"><PhoneCall className="w-5 h-5 text-rose"/> Qayta aloqa sanalari</div>
                <p className="text-xs text-stone">Dori uchun qabul tartibi kiritilganda sanalar shu yerda avtomatik chiqadi.</p>
            </div>
        );
    }
    const today = todayISO();
    return (
        <div className="bg-white border border-line rounded-2xl p-4 space-y-3" data-testid="pos-followups">
            <div className="font-serif text-lg text-noir flex items-center gap-2"><PhoneCall className="w-5 h-5 text-rose"/> Qayta aloqa sanalari</div>
            {entries.map(({ uid, product, reg, schedule, edited }) => (
                <div key={uid} className="border border-line rounded-xl p-3 space-y-2" data-testid={`pos-followup-item-${uid}`}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-noir line-clamp-1">{product.name}</div>
                            <div className="text-[11px] text-stone">
                                {reg.estimated_days} kun · tugaydi {fmtDate(reg.estimated_end_date)}
                                {edited && <span className="ml-1 text-amber-700">· tahrirlangan</span>}
                            </div>
                        </div>
                        {edited && (
                            <button type="button" onClick={() => onReset(uid)} className="text-[11px] text-stone hover:text-rose flex items-center gap-1 whitespace-nowrap">
                                <RotateCcw className="w-3 h-3"/> Qayta hisoblash
                            </button>
                        )}
                    </div>
                    {schedule.length === 0 && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/> Kurs juda qisqa — kerak bo'lsa sanani qo'lda qo'shing.
                        </div>
                    )}
                    <div className="space-y-1.5">
                        {schedule.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-5 h-5 rounded-full bg-cream text-noir flex items-center justify-center text-[10px] font-semibold flex-shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-noir">{f.stage_label}</div>
                                    <div className="text-[10px] text-stone line-clamp-1">{f.day_offset}-kun{f.purpose ? ` · ${f.purpose}` : ""}</div>
                                </div>
                                <div className="w-[145px] shrink-0">
                                    <DatePicker
                                        value={f.scheduled_date}
                                        min={today}
                                        onChange={(val) => onEdit(uid, i, { scheduled_date: val })}
                                        className={`h-8 px-2 text-xs bg-white ${f.manual_review ? "border-amber-300 ring-1 ring-amber-300/40" : ""}`}
                                        testId={`pos-followup-date-${uid}-${i}`}
                                        clearable={false}
                                        showPresets={false}
                                        formatStr="dd.MM.yyyy"
                                    />
                                </div>
                                <button type="button" onClick={() => onEdit(uid, i, null)} className="text-stone hover:text-rose p-1" title="O'chirish">
                                    <X className="w-3.5 h-3.5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                    {schedule.some(f => f.manual_review) && (
                        <div className="text-[10px] text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Qisqa kurs — sanalar siqildi, tekshirib chiqing.</div>
                    )}
                    <button type="button"
                            onClick={() => onEdit(uid, schedule.length, {
                                stage_key: `custom${schedule.length + 1}`, stage_label: "Qo'shimcha aloqa", purpose: "",
                                scheduled_date: addDays(today, Math.max(1, Math.floor(reg.estimated_days / 2))),
                                day_offset: Math.max(1, Math.floor(reg.estimated_days / 2)), manual_review: false,
                            })}
                            className="text-[11px] text-rose hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3"/> Sana qo'shish
                    </button>
                </div>
            ))}
        </div>
    );
}
