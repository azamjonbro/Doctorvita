import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function Login() {
    const { login, formatApiError } = useAuth();
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr(""); setLoading(true);
        try {
            const u = await login(email, password);
            if (u.role === "director") nav("/director");
            else if (u.role === "admin") nav("/admin");
            else if (u.role === "worker") nav("/worker");
            else nav("/");
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] grid lg:grid-cols-2" data-testid="login-page">
            <div className="hidden lg:block bg-cream relative overflow-hidden">
                <img src="https://static.prod-images.emergentagent.com/jobs/42a44add-5feb-4f26-bbbe-91660dd15858/images/39d70f5718f5c8be7fe3951eb48908e47d734b618f8948a5093f15ef753f34ac.png" alt="" className="w-full h-full object-cover opacity-90" />
                <div className="absolute bottom-10 left-10 right-10 text-noir">
                    <div className="text-xs uppercase tracking-[0.3em] text-rose">Maison · Glow</div>
                    <h2 className="font-serif text-5xl mt-2">Xush kelibsiz.</h2>
                    <p className="text-stone mt-2 max-w-sm">Hisobingizga kiring va o'zingiz uchun mukammal parvarishni davom ettiring.</p>
                </div>
            </div>
            <div className="flex items-center justify-center p-8">
                <form onSubmit={submit} className="w-full max-w-sm space-y-5" data-testid="login-form">
                    <div>
                        <h1 className="font-serif text-4xl text-noir">Kirish</h1>
                        <p className="text-stone text-sm mt-2">Hisobingizdan foydalanish uchun.</p>
                    </div>
                    {err && <div className="text-sm text-rose bg-rose/10 rounded-md p-3" data-testid="login-error">{err}</div>}
                    <div>
                        <Label>Email</Label>
                        <Input data-testid="login-email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <Label>Parol</Label>
                        <Input data-testid="login-password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11" data-testid="login-submit">
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Kirish
                    </Button>
                    <p className="text-sm text-stone">
                        Mijozmisiz? <Link to="/register" className="text-noir underline hover:text-rose">Ro'yxatdan o'tish</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
