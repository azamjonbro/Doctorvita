import React, { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bell } from "lucide-react";

/**
 * Polls /api/notifications/poll every 12s for director/admin and plays a chime.
 */
export default function AudioNotifier() {
    const { user } = useAuth();
    const lastIdsRef = useRef(new Set());
    const [count, setCount] = useState(0);
    const audioCtxRef = useRef(null);

    const playChime = () => {
        try {
            if (!audioCtxRef.current) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                audioCtxRef.current = new Ctx();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === "suspended") ctx.resume();
            const now = ctx.currentTime;
            const tones = [880, 1320, 1760];
            tones.forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = "sine";
                o.frequency.setValueAtTime(freq, now + i * 0.18);
                g.gain.setValueAtTime(0.0001, now + i * 0.18);
                g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.32);
                o.connect(g).connect(ctx.destination);
                o.start(now + i * 0.18);
                o.stop(now + i * 0.18 + 0.35);
            });
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        if (!user || !["director", "admin"].includes(user.role)) return;

        let active = true;
        let initialized = false;

        const tick = async () => {
            try {
                const { data } = await api.get("/notifications/poll");
                if (!active) return;
                setCount(data.items.length);
                if (!initialized) {
                    // First cycle: register existing items silently
                    data.items.forEach((n) => lastIdsRef.current.add(n.id));
                    initialized = true;
                    return;
                }
                let newSoundItem = false;
                data.items.forEach((n) => {
                    if (!lastIdsRef.current.has(n.id)) {
                        lastIdsRef.current.add(n.id);
                        if (n.sound) newSoundItem = true;
                        toast(n.title, { description: n.message });
                    }
                });
                if (newSoundItem) playChime();
            } catch (e) {
                /* ignore */
            }
        };

        tick(); // initial silent population
        const id = setInterval(tick, 12000);
        return () => { active = false; clearInterval(id); };
    }, [user]);

    if (!user || !["director", "admin"].includes(user.role)) return null;

    return (
        <button
            onClick={async () => {
                await api.post("/notifications/seen").catch(() => {});
                setCount(0);
                lastIdsRef.current = new Set();
                playChime();
            }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-noir text-ivory px-4 py-3 rounded-full shadow-lg btn-magnetic hover:bg-rose"
            data-testid="audio-notifier-btn"
            title="Yangi bildirishnomalar"
        >
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">{count}</span>
        </button>
    );
}
