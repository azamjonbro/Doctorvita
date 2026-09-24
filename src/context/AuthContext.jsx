import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    const refresh = useCallback(async () => {
        const tok = sessionStorage.getItem("auth_token");
        if (!tok) { setUser(null); return; }
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            sessionStorage.removeItem("auth_token");
            setUser(null);
        }
    }, []);

    useEffect(() => {
        (async () => {
            await refresh();
            setReady(true);
        })();
    }, [refresh]);

    const login = async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        if (data.token) sessionStorage.setItem("auth_token", data.token);
        setUser(data.user);
        return data.user;
    };

    const register = async (form) => {
        const { data } = await api.post("/auth/register", form);
        if (data.token) sessionStorage.setItem("auth_token", data.token);
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        try { await api.post("/auth/logout"); } catch { /* ignore */ }
        sessionStorage.removeItem("auth_token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, ready, login, register, logout, refresh, formatApiError }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
