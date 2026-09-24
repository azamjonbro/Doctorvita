import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const linkBase = "text-sm tracking-wide uppercase transition-colors duration-200";

export default function Navbar() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    const dashboardPath = user?.role === "director" ? "/director"
        : user?.role === "admin" ? "/admin"
        : user?.role === "worker" ? "/worker"
        : null;

    return (
        <header className="sticky top-0 z-40 bg-ivory/80 backdrop-blur-md border-b border-line">
            <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
                    <span className="font-serif text-2xl tracking-tight text-noir">Doctor<span className="text-rose">·</span>VITA</span>
                </Link>
                <nav className="hidden md:flex items-center gap-8">
                    <NavLink to="/" end className={({isActive}) => `${linkBase} ${isActive ? 'text-noir' : 'text-stone hover:text-noir'}`} data-testid="nav-home">Bosh sahifa</NavLink>
                    <NavLink to="/products" className={({isActive}) => `${linkBase} ${isActive ? 'text-noir' : 'text-stone hover:text-noir'}`} data-testid="nav-products">Mahsulotlar</NavLink>
                    <NavLink to="/news" className={({isActive}) => `${linkBase} ${isActive ? 'text-noir' : 'text-stone hover:text-noir'}`} data-testid="nav-news">Yangiliklar</NavLink>
                    <NavLink to="/contact" className={({isActive}) => `${linkBase} ${isActive ? 'text-noir' : 'text-stone hover:text-noir'}`} data-testid="nav-contact">Aloqa</NavLink>
                </nav>
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            {dashboardPath && (
                                <Button variant="outline" className="rounded-full border-noir text-noir hover:bg-noir hover:text-ivory btn-magnetic" onClick={() => nav(dashboardPath)} data-testid="nav-dashboard-btn">
                                    <User className="w-4 h-4 mr-1" /> Panel
                                </Button>
                            )}
                            <Button variant="ghost" onClick={logout} data-testid="nav-logout-btn" className="text-stone hover:text-noir">
                                <LogOut className="w-4 h-4 mr-1" /> Chiqish
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login"><Button variant="ghost" className="text-stone hover:text-noir" data-testid="nav-login-btn">Kirish</Button></Link>
                            <Link to="/register"><Button className="bg-noir text-ivory hover:bg-rose rounded-full px-5 btn-magnetic" data-testid="nav-register-btn">Ro'yxatdan o'tish</Button></Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
