import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PhoneCall, Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { DEFAULT_RULES, computeFollowUpSchedule, todayISO, fmtDate } from "@/lib/posLogic";

const TYPE_LABELS = {
    offset: "Sotuvdan N kun keyin",
    percent: "Kurs muddatining N % qismida",
    before_end: "Tugashidan N kun oldin",
};

/** Administrator sozlamalari: qayta aloqa bosqichlari va qisqa kurs chegarasi. */
export default function FollowUpRulesForm() {
    const [rules, setRules] = useState(DEFAULT_RULES);
    const [busy, setBusy] = useState(false);
    const [previewDays, setPreviewDays] = useState(30);

    useEffect(() => {
        api.get("/pos/settings")
            .then(({ data }) => setRules({ stages: data.stages, min_course_days: data.min_course_days }))
            .catch(() => {});
    }, []);

    const setStage = (i, patch) => setRules(r => ({ ...r, stages: r.stages.map((s, j) => j === i ? { ...s, ...patch } : s) }));
    const addStage = () => setRules(r => ({ ...r, stages: [...r.stages, { key: `stage${r.stages.length + 1}`, label: `${r.stages.length + 1}-aloqa`, type: "offset", value: 7, purpose: "" }] }));
    const removeStage = (i) => setRules(r => ({ ...r, stages: r.stages.filter((_, j) => j !== i) }));

    const save = async () => {
        setBusy(true);
        try {
            const { data } = await api.put("/pos/settings", rules);
            setRules(data);
            toast.success("Qayta aloqa qoidalari saqlandi");
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || e.message);
        } finally { setBusy(false); }
    };

    const preview = computeFollowUpSchedule(Number(previewDays) || 0, todayISO(), rules);

    return (
        <div className="bg-white rounded-2xl border border-line p-5 space-y-4" data-testid="followup-rules-form">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="font-serif text-xl text-noir flex items-center gap-2"><PhoneCall className="w-5 h-5 text-rose"/> Qayta aloqa qoidalari</h3>
                    <p className="text-sm text-stone">Sotuvda har bir dori uchun avtomatik yaratiladigan qo'ng'iroq bosqichlari. Sanalar doim kurs ichida (1-kun … tugashdan bir kun oldin) bo'ladi.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setRules(DEFAULT_RULES)} className="rounded-full"><RotateCcw className="w-3.5 h-3.5 mr-1"/> Standart</Button>
            </div>

            <div className="space-y-2">
                {rules.stages.map((s, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end border border-line rounded-xl p-3" data-testid={`rule-stage-${i}`}>
                        <label className="col-span-12 md:col-span-3 text-xs text-stone">Nomi
                            <Input value={s.label} onChange={(e) => setStage(i, { label: e.target.value })} className="mt-1 bg-white"/>
                        </label>
                        <label className="col-span-8 md:col-span-4 text-xs text-stone">Qoida
                            <select value={s.type} onChange={(e) => setStage(i, { type: e.target.value })}
                                    className="mt-1 w-full h-9 rounded-md border border-line bg-white px-2 text-sm">
                                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                        </label>
                        <label className="col-span-4 md:col-span-1 text-xs text-stone">N
                            <Input type="number" min={0} value={s.value} onChange={(e) => setStage(i, { value: Number(e.target.value) })} className="mt-1 bg-white"/>
                        </label>
                        <label className="col-span-11 md:col-span-3 text-xs text-stone">Maqsad
                            <Input value={s.purpose || ""} onChange={(e) => setStage(i, { purpose: e.target.value })} className="mt-1 bg-white" placeholder="Qo'ng'iroqda nima so'raladi"/>
                        </label>
                        <button type="button" onClick={() => removeStage(i)} className="col-span-1 h-9 flex items-center justify-center text-stone hover:text-rose" title="O'chirish">
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={addStage} className="rounded-full"><Plus className="w-3.5 h-3.5 mr-1"/> Bosqich qo'shish</Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-start">
                <label className="text-xs text-stone block">Qisqa kurs chegarasi (kun) — shundan qisqa kurslarda sanalar siqiladi va sotuvchiga tekshirish taklif etiladi
                    <Input type="number" min={2} max={365} value={rules.min_course_days}
                           onChange={(e) => setRules(r => ({ ...r, min_course_days: Number(e.target.value) }))} className="mt-1 bg-white w-32"/>
                </label>
                <div className="bg-cream rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-2 mb-2 text-stone">
                        Namuna: kurs
                        <Input type="number" min={1} value={previewDays} onChange={(e) => setPreviewDays(e.target.value)} className="h-7 w-20 bg-white"/>
                        kun bo'lsa →
                    </div>
                    {preview.length === 0 ? <div className="text-stone">Vazifa yaratilmaydi</div> : (
                        <ul className="space-y-0.5">
                            {preview.map(p => <li key={p.follow_up_number} className="text-noir">{p.follow_up_number}. {p.day_offset}-kun ({fmtDate(p.scheduled_date)}) — {p.stage_label}{p.manual_review && <span className="text-amber-700"> · siqilgan</span>}</li>)}
                        </ul>
                    )}
                </div>
            </div>

            <Button onClick={save} disabled={busy} className="bg-noir text-ivory hover:bg-rose rounded-full" data-testid="rules-save">
                <Save className="w-4 h-4 mr-1"/> Saqlash
            </Button>
        </div>
    );
}
