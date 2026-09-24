import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    // Per-tab auth: token kept in sessionStorage and sent as Bearer header.
    // No cookies — bu har bir browser tab alohida account bilan ishlashga imkon beradi.
    withCredentials: false,
});

api.interceptors.request.use((cfg) => {
    const tok = sessionStorage.getItem("auth_token");
    if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
    return cfg;
});

export function formatApiError(detail) {
    if (detail == null) return "Xatolik yuz berdi. Qayta urinib ko'ring.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail
            .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
            .filter(Boolean)
            .join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export default api;
