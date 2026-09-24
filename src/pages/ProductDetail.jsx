import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Loader2, Percent, ShieldCheck, Truck, Sparkles, Star } from "lucide-react";

export default function ProductDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user, register } = useAuth();
    const [product, setProduct] = useState(null);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState("auth");
    const [form, setForm] = useState({ name: "", surname: "", phone: "", email: "", password: "" });
    const [loc, setLoc] = useState(null);
    const [loadingLoc, setLoadingLoc] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        api.get(`/products/${id}`).then(({ data }) => setProduct(data)).catch(() => {});
    }, [id]);

    const pricing = useMemo(() => {
        if (!product) return null;
        const price = Number(product.price || 0);
        const discount = Number(product.discount_percent || 0);
        const final = product.final_price != null ? Number(product.final_price) : Math.round(price * (100 - discount) / 100);
        const amount = Math.max(0, Math.round(price - final));
        return { price, discount, final, amount, hasDiscount: discount > 0 && amount > 0 };
    }, [product]);

    const startOrder = () => {
        setErr("");
        if (user && user.role === "customer") setStep("location");
        else if (user) { toast.error("Buyurtma berish uchun mijoz akkauntingiz bo'lishi kerak."); return; }
        else setStep("auth");
        setOpen(true);
    };

    const handleRegister = async (e) => {
        e.preventDefault(); setErr("");
        try { await register(form); setStep("location"); }
        catch (e) { setErr(formatApiError(e.response?.data?.detail) || e.message); }
    };

    const captureLocation = () => {
        if (!navigator.geolocation) return setErr("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
        setLoadingLoc(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLoadingLoc(false); setStep("confirm");
            },
            (e) => { setLoadingLoc(false); setErr("Joylashuvni olib bo'lmadi: " + e.message); },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const submitOrder = async () => {
        setSubmitting(true); setErr("");
        try {
            await api.post("/orders", { product_id: product.id, quantity: 1, location: loc, note: "" });
            toast.success("Buyurtmangiz qabul qilindi!");
            setOpen(false); setStep("auth"); setLoc(null);
        } catch (e) { setErr(formatApiError(e.response?.data?.detail) || e.message); }
        finally { setSubmitting(false); }
    };

    if (!product) return <div className="min-h-[60vh] flex items-center justify-center text-stone">Yuklanmoqda…</div>;

    return (
        <div className="bg-ivory min-h-screen" data-testid="product-detail">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-10">
                <button onClick={() => nav(-1)} className="text-sm uppercase tracking-widest text-stone hover:text-noir flex items-center gap-2 transition-colors" data-testid="back-btn">
                    <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>

                <div className="grid lg:grid-cols-2 gap-12 mt-8 items-start">
                    {/* Rasm */}
                    <div className="relative rounded-3xl overflow-hidden border border-line bg-cream group">
                        {pricing.hasDiscount && (
                            <div className="discount-badge discount-badge-large">
                                −{pricing.discount}% chegirma
                            </div>
                        )}
                        <img src={product.image_url} alt={product.name} className="w-full h-[560px] object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full border-2 border-dashed border-rose/40 animate-glow-rotate" />
                    </div>

                    {/* Ma'lumot */}
                    <div className="stagger">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-[0.3em] text-rose bg-rose/10 px-3 py-1.5 rounded-full">{product.category}</span>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-rose text-rose"/>)}
                                <span className="text-xs text-stone ml-1">4.9</span>
                            </div>
                        </div>

                        <h1 className="font-serif text-4xl md:text-5xl text-noir mt-3">{product.name}</h1>

                        {/* Narx blok */}
                        <div className="mt-6 bg-white border border-line rounded-2xl p-5">
                            {pricing.hasDiscount ? (
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-3 flex-wrap">
                                        <span className="font-serif text-4xl price-final">{pricing.final.toLocaleString()} so'm</span>
                                        <span className="text-xl original-price text-stone">{pricing.price.toLocaleString()} so'm</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 bg-rose text-ivory text-sm px-3 py-1 rounded-full font-semibold">
                                            <Percent className="w-3.5 h-3.5"/> {pricing.discount}% chegirma
                                        </span>
                                        <span className="text-sm text-rose font-medium">
                                            Tejaysiz: {pricing.amount.toLocaleString()} so'm
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="font-serif text-4xl text-noir">{pricing.price.toLocaleString()} so'm</div>
                            )}
                        </div>

                        <p className="text-stone leading-relaxed mt-6 max-w-lg">{product.description}</p>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Button onClick={startOrder} className="bg-noir text-ivory hover:bg-rose rounded-full h-12 px-8 btn-magnetic btn-shine" data-testid="order-btn">
                                <Sparkles className="w-4 h-4 mr-2"/> Buyurtma berish
                            </Button>
                            <Button variant="outline" className="border-noir text-noir rounded-full h-12 px-8 hover:bg-noir hover:text-ivory" onClick={() => nav("/contact")} data-testid="ask-btn">
                                Savolingiz bormi?
                            </Button>
                        </div>

                        {/* Trust badges */}
                        <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
                            <div className="flex items-center gap-2 text-sm text-stone bg-cream rounded-xl p-3">
                                <ShieldCheck className="w-4 h-4 text-rose"/> 100% original
                            </div>
                            <div className="flex items-center gap-2 text-sm text-stone bg-cream rounded-xl p-3">
                                <Truck className="w-4 h-4 text-rose"/> Tez yetkazib berish
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 max-w-md text-sm">
                            <div><div className="text-xs uppercase tracking-widest text-stone">Holat</div><div className="text-noir mt-1">Mavjud · {product.stock} dona</div></div>
                            <div><div className="text-xs uppercase tracking-widest text-stone">Yetkazib berish</div><div className="text-noir mt-1">Toshkent bo'ylab</div></div>
                            {product.expiry_date && (
                                <div className="col-span-2">
                                    <div className="text-xs uppercase tracking-widest text-stone">Yaroqlilik muddati</div>
                                    <div className="text-noir mt-1">{product.expiry_date}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Buyurtma dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-ivory border-line max-w-md rounded-2xl" data-testid="order-modal">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl text-noir">
                            {step === "auth" && "Avval ro'yxatdan o'ting"}
                            {step === "location" && "Joylashuvingizni baham ko'ring"}
                            {step === "confirm" && "Buyurtmani tasdiqlang"}
                        </DialogTitle>
                        <DialogDescription className="text-stone text-sm">
                            {step === "auth" && "Buyurtma berish uchun email orqali tezkor ro'yxatdan o'tish."}
                            {step === "location" && "Yetkazib berish uchun aniq lokatsiyangizni belgilaymiz."}
                            {step === "confirm" && "Mahsulot va manzilingizni tekshiring."}
                        </DialogDescription>
                    </DialogHeader>

                    {err && <div className="text-sm text-rose bg-rose/10 rounded-md p-3" data-testid="order-error">{err}</div>}

                    {step === "auth" && (
                        <form onSubmit={handleRegister} className="space-y-3" data-testid="order-register-form">
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label>Ism</Label><Input data-testid="reg-name" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required /></div>
                                <div><Label>Familiya</Label><Input data-testid="reg-surname" value={form.surname} onChange={(e)=>setForm({...form, surname:e.target.value})} required /></div>
                            </div>
                            <div><Label>Telefon</Label><Input data-testid="reg-phone" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} placeholder="+998 90 000 00 00" required /></div>
                            <div><Label>Email</Label><Input data-testid="reg-email" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required /></div>
                            <div><Label>Parol</Label><Input data-testid="reg-password" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} required minLength={6} /></div>
                            <Button type="submit" className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11 mt-2" data-testid="reg-submit">Davom etish</Button>
                        </form>
                    )}

                    {step === "location" && (
                        <div className="space-y-4">
                            <Button onClick={captureLocation} disabled={loadingLoc} className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11" data-testid="loc-btn">
                                {loadingLoc ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <MapPin className="w-4 h-4 mr-2" />}
                                Joylashuvni olish
                            </Button>
                            <p className="text-xs text-stone">Joylashuvingiz faqat buyurtmani yetkazib berish uchun ishlatiladi.</p>
                        </div>
                    )}

                    {step === "confirm" && (
                        <div className="space-y-4" data-testid="order-confirm">
                            <div className="rounded-xl bg-cream border border-line p-4 text-sm">
                                <div className="text-stone uppercase tracking-widest text-[11px]">Mahsulot</div>
                                <div className="text-noir font-serif text-lg">{product.name}</div>
                                {pricing.hasDiscount ? (
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-noir font-semibold">{pricing.final.toLocaleString()} so'm</span>
                                        <span className="original-price text-xs">{pricing.price.toLocaleString()}</span>
                                        <span className="text-xs bg-rose text-ivory rounded-full px-2 py-0.5">−{pricing.discount}%</span>
                                    </div>
                                ) : (
                                    <div className="text-noir mt-1">{pricing.price.toLocaleString()} so'm</div>
                                )}
                            </div>
                            <div className="rounded-xl bg-cream border border-line p-4 text-sm">
                                <div className="text-stone uppercase tracking-widest text-[11px]">Lokatsiya</div>
                                <div className="text-noir font-mono">{loc?.lat.toFixed(5)}, {loc?.lng.toFixed(5)}</div>
                            </div>
                            <Button onClick={submitOrder} disabled={submitting} className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11" data-testid="confirm-order-btn">
                                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Buyurtmani jo'natish
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
