import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
    const { register, formatApiError } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ name: "", surname: "", phone: "", email: "", password: "" });
    const [err, setErr] = useState("");

    const submit = async (e) => {
        e.preventDefault(); setErr("");
        try {
            await register(form);
            nav("/");
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-6" data-testid="register-page">
            <form onSubmit={submit} className="w-full max-w-md space-y-5 bg-white rounded-2xl border border-line p-8" data-testid="register-form">
                <div>
                    <h1 className="font-serif text-4xl text-noir">Ro'yxatdan o'tish</h1>
                    <p className="text-stone text-sm mt-2">Mijoz hisobini yarating.</p>
                </div>
                {err && <div className="text-sm text-rose bg-rose/10 rounded-md p-3" data-testid="register-error">{err}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <div><Label>Ism</Label><Input data-testid="r-name" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required/></div>
                    <div><Label>Familiya</Label><Input data-testid="r-surname" value={form.surname} onChange={(e)=>setForm({...form, surname:e.target.value})} required/></div>
                </div>
                <div><Label>Telefon</Label><Input data-testid="r-phone" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} required/></div>
                <div><Label>Email</Label><Input data-testid="r-email" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required/></div>
                <div><Label>Parol</Label><Input data-testid="r-password" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} required minLength={6}/></div>
                <Button type="submit" className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11" data-testid="r-submit">Ro'yxatdan o'tish</Button>
                <p className="text-sm text-stone">
                    Hisobingiz bormi? <Link to="/login" className="text-noir underline hover:text-rose">Kirish</Link>
                </p>
            </form>
        </div>
    );
}
