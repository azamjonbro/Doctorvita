import React from "react";

export default function Footer() {
    return (
        <footer className="border-t border-line bg-cream mt-24" data-testid="footer">
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid md:grid-cols-3 gap-10">
                <div>
                    <div className="font-serif text-2xl text-noir">Doctor<span className="text-rose">·</span>VITA</div>
                    <p className="mt-3 text-sm text-stone leading-relaxed max-w-xs">
                        Premium kosmetika do'koni. Tabiiy tarkib, klinik tasdiqlangan natija. Sizning go'zalligingiz - bizning hunarimiz.
                    </p>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-widest text-stone mb-3">Manzil</div>
                    <p className="text-sm text-noir">Toshkent shahri, Amir Temur ko'chasi 12</p>
                    <p className="text-sm text-noir">+998 71 200 00 00</p>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-widest text-stone mb-3">Ish vaqti</div>
                    <p className="text-sm text-noir">Dushanba - Yakshanba</p>
                    <p className="text-sm text-noir">08:00 - 20:00</p>
                </div>
            </div>
            <div className="border-t border-line py-4 text-center text-xs text-stone">
                © {new Date().getFullYear()} Maison Glow. Barcha huquqlar himoyalangan.
            </div>
        </footer>
    );
}
