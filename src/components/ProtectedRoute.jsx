import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ roles, children }) {
    const { user, ready } = useAuth();
    if (!ready) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-ivory">
                <div className="text-stone font-sans" data-testid="auth-loading">Yuklanmoqda…</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
}
