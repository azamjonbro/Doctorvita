import React, { useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", message: "" });
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const submit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            await api.post("/questions", form);
            setSent(true); setForm({ name: "", email: "", message: "" });
            toast.success("Savolingiz yuborildi!");
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || e.message);
        } finally { setLoading(false); }
    };
    return (
        <div className="bg-ivory min-h-[70vh]" data-testid="contact-page">
            <div className="max-w-4xl mx-auto px-6 md:px-12 py-12 grid md:grid-cols-2 gap-10">
                <div>
                    <span className="text-xs uppercase tracking-[0.25em] text-rose">Aloqa</span>
                    <h1 className="font-serif text-5xl text-noir mt-2">Savolingiz bormi?</h1>
                    <p className="text-stone mt-4 leading-relaxed">Savollar, takliflar yoki konsultatsiya uchun biz bilan bog'laning. Mutaxassisimiz tez orada javob beradi.</p>
                    <div className="mt-8 space-y-3 text-sm">
                        <div><div className="text-xs uppercase tracking-widest text-stone">Telefon</div><div className="text-noir mt-1">+998 71 200 00 00</div></div>
                        <div><div className="text-xs uppercase tracking-widest text-stone">Email</div><div className="text-noir mt-1">hello@maisonglow.uz</div></div>
                        <div><div className="text-xs uppercase tracking-widest text-stone">Manzil</div><div className="text-noir mt-1">Toshkent, Amir Temur 12</div></div>
                    </div>
                </div>
                <form onSubmit={submit} className="bg-white rounded-2xl border border-line p-6 space-y-4 self-start" data-testid="contact-form">
                    <div><Label>Ismingiz</Label><Input data-testid="c-name" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required /></div>
                    <div><Label>Email</Label><Input data-testid="c-email" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required /></div>
                    <div><Label>Xabar</Label><Textarea data-testid="c-message" rows={5} value={form.message} onChange={(e)=>setForm({...form, message:e.target.value})} required /></div>
                    <Button type="submit" disabled={loading} className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11" data-testid="c-submit">Yuborish</Button>
                    {sent && <div className="text-sm text-noir">Rahmat! Tez orada javob beramiz.</div>}
                </form>
            </div>
        </div>
    );
}
