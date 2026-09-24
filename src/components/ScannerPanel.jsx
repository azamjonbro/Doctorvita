import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, Plus } from "lucide-react";

/* ====== Kamera skaneri paneli (WorkerDashboard'dan ajratilgan) ====== */
export default function ScannerPanel({ onCode, scannedProduct, scannedProducts, onClose, onUseInSale }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const [camActive, setCamActive] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [supported, setSupported] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
        return () => stopCamera();
        // eslint-disable-next-line
    }, []);

    const startCamera = async () => {
        setError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCamActive(true);
            if (supported) detectLoop();
        } catch (e) {
            setError("Kameraga kirib bo'lmadi: " + e.message);
        }
    };

    const stopCamera = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (videoRef.current) videoRef.current.srcObject = null;
        setCamActive(false);
    };

    const detectLoop = async () => {
        try {
            // eslint-disable-next-line no-undef
            const detector = new window.BarcodeDetector({
                formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "codabar", "data_matrix"],
            });
            const tick = async () => {
                if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
                try {
                    const codes = await detector.detect(videoRef.current);
                    if (codes && codes.length > 0) {
                        stopCamera();
                        onCode(codes[0].rawValue);
                        return;
                    }
                } catch {}
                rafRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (e) {
            setError("BarcodeDetector ishlamadi: " + e.message);
        }
    };

    const submitManual = (e) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        onCode(manualCode.trim());
    };

    const allScanned = (scannedProducts && scannedProducts.length > 0) ? scannedProducts : (scannedProduct ? [scannedProduct] : []);

    if (allScanned.length > 0) {
        return (
            <div className="space-y-4 animate-fade-in">
                {allScanned.length > 1 && (
                    <div className="text-sm font-semibold text-noir bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        🔍 Bu kodda {allScanned.length} ta mahsulot topildi — birini tanlang:
                    </div>
                )}
                {allScanned.map((sp) => {
                    const hasDisc = Number(sp.discount_percent || 0) > 0;
                    const finalP = sp.final_price ?? sp.price;
                    const outOfStock = Number(sp.stock ?? 0) <= 0;
                    return (
                        <div key={sp.id} className={`bg-white rounded-2xl overflow-hidden ${sp.parent_barcode ? 'border-2 border-amber-300' : 'border border-line'}`}>
                            {sp.parent_barcode && (
                                <div className="bg-amber-50 border-b border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                                    🔄 O'zgartirilgan variant
                                </div>
                            )}
                            <div className="flex items-center gap-3 p-3">
                                <img src={sp.image_url} alt={sp.name} className="w-16 h-16 object-cover rounded-xl bg-cream flex-shrink-0"/>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <h3 className="font-serif text-base text-noir line-clamp-1">{sp.name}</h3>
                                    <div className="text-xs text-stone">{sp.category}</div>
                                    <div className="text-xs text-noir font-semibold">
                                        {hasDisc ? (
                                            <span>{Number(finalP).toLocaleString()} <span className="text-rose">−{sp.discount_percent}%</span></span>
                                        ) : (
                                            <span>{Number(sp.price).toLocaleString()} so'm</span>
                                        )}
                                    </div>
                                    <div className={`text-xs font-semibold ${outOfStock ? 'text-red-600' : 'text-stone'}`}>
                                        {outOfStock ? '❌ Tugagan (0 ta)' : `📦 ${sp.stock} dona`}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => onUseInSale(sp)}
                                    disabled={outOfStock}
                                    className={`rounded-full text-xs px-3 ${outOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-noir text-ivory hover:bg-rose'}`}
                                >
                                    <Plus className="w-3 h-3 mr-1"/> Qo'shish
                                </Button>
                            </div>
                        </div>
                    );
                })}
                <Button onClick={onClose} variant="outline" className="w-full rounded-full">Yopish</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="scanner-frame relative aspect-[4/3] bg-noir/95 overflow-hidden rounded-xl">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                {camActive && <div className="scanner-line animate-scanner-line"/>}
                {!camActive && (
                    <div className="absolute inset-0 flex items-center justify-center text-ivory/70 text-sm flex-col gap-2">
                        <Camera className="w-12 h-12"/>
                        <span>Kamera o'chirilgan</span>
                    </div>
                )}
            </div>
            {error && <div className="text-sm text-rose bg-rose/10 rounded-md p-3">{error}</div>}
            {!supported && (
                <div className="text-xs text-stone bg-cream rounded-md p-3">
                    Brauzeringiz avtomatik skaner (BarcodeDetector) ni qo'llab-quvvatlamaydi. Kodni qo'lda kiriting.
                </div>
            )}
            <div className="flex gap-2">
                {!camActive ? (
                    <Button onClick={startCamera} className="bg-rose text-ivory hover:bg-noir rounded-full flex-1">
                        <Camera className="w-4 h-4 mr-2"/> Kamerani yoqish
                    </Button>
                ) : (
                    <Button onClick={stopCamera} variant="outline" className="rounded-full flex-1">
                        <X className="w-4 h-4 mr-2"/> To'xtatish
                    </Button>
                )}
            </div>
            <div className="text-center text-xs text-stone">— yoki —</div>
            <form onSubmit={submitManual} className="flex gap-2">
                <Input value={manualCode} onChange={(e)=>setManualCode(e.target.value)} placeholder="Kodni qo'lda kiriting…" />
                <Button type="submit" className="bg-noir text-ivory hover:bg-rose rounded-full">Qidirish</Button>
            </form>
        </div>
    );
}
