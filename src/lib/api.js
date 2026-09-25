import axios from "axios";

const LOCAL_BACKEND_URL = "http://127.0.0.1:8000";
const PROD_BACKEND_URL = "https://doctor.sds-max.uz";
const isLocalDev = typeof window !== "undefined" && ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);

const configuredBackend = (import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

const BACKEND_URL = (() => {
    if (isLocalDev) {
        return configuredBackend && configuredBackend.includes("localhost") ? configuredBackend : LOCAL_BACKEND_URL;
    }
    if (configuredBackend && !configuredBackend.includes("localhost") && !configuredBackend.includes("127.0.0.1")) {
        return configuredBackend;
    }
    return PROD_BACKEND_URL;
})();

export const API_BASE = `${BACKEND_URL}/api`;
export const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80";

export function safeImageUrl(url, fallback = DEFAULT_PRODUCT_IMAGE) {
    if (typeof url !== "string") return fallback;
    const cleaned = url.trim();
    if (!cleaned) return fallback;
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("data:") || cleaned.startsWith("/")) {
        return cleaned;
    }
    return fallback;
}

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
