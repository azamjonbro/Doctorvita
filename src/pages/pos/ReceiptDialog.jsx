import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Receipt, Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/posLogic";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function printPosReceipt(bundle) {
    const { sale, items, follow_ups: fus = [] } = bundle;
    const win = window.open("", "_blank", "width=380,height=760");
    if (!win) { toast.error("Pop-up bloklangan"); return; }
    const rows = items.map(it => `
        <div class="row"><span>${esc(it.product_name)} × ${it.quantity}</span><span>${Math.round(it.line_total).toLocaleString()}</span></div>
        ${it.discount_percent > 0 ? `<div class="row small"><span>&nbsp;&nbsp;chegirma ${it.discount_percent}%</span><span></span></div>` : ""}
        ${it.is_medicine && it.daily_usage ? `<div class="row small"><span>&nbsp;&nbsp;kuniga ${it.times_per_day}×${it.units_per_intake}${it.recommendation ? ", " + esc(it.recommendation) : ""} · ${it.estimated_days} kun (${fmtDate(it.estimated_end_date)})</span></div>` : ""}
    `).join("");
    const fuRows = fus.map(f => `<div class="row small"><span>${fmtDate(f.scheduled_at)} — ${esc(f.product_name)}</span><span>${esc(f.stage_label)}</span></div>`).join("");
    win.document.write(`
    <html><head><title>Chek ${esc(sale.sale_code)}</title>
    <style>
        body { font-family: monospace; font-size: 13px; padding: 20px; max-width: 320px; margin: 0 auto; color:#1a1a1a; }
        h2 { text-align: center; font-size: 20px; margin-bottom: 2px; }
        .sub { text-align: center; color: #888; font-size: 11px; margin-bottom: 14px; }
        hr { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
        .small { font-size: 11px; color: #777; }
        .total { font-size: 17px; font-weight: bold; }
        .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 16px; }
        .worker { background: #f7f3ee; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; text-align: center; font-size: 11px; }
        .num { text-align:center; font-size: 22px; font-weight: bold; }
    </style></head>
    <body>
    <h2>DR.VITA</h2>
    <div class="sub">Sotuv cheki</div>
    <div class="num">№${sale.daily_number}</div>
    <div class="sub">${esc(sale.sale_code)}</div>
    <div class="worker"><div style="font-size:9px; letter-spacing:1px; color:#888;">SOTUVCHI</div><div style="font-weight:bold; font-size:13px;">${esc(sale.employee_name || "—")}</div></div>
    <hr/>
    <div class="row"><span>Sana:</span><span>${new Date(sale.sale_date_time).toLocaleString()}</span></div>
    <div class="row"><span>Mijoz:</span><span>${esc(sale.customer_name)}</span></div>
    ${sale.customer_phone ? `<div class="row"><span>Telefon:</span><span>${esc(sale.customer_phone)}</span></div>` : ""}
    <hr/>
    ${rows}
    <hr/>
    <div class="row"><span>Oraliq summa:</span><span>${Math.round(sale.subtotal).toLocaleString()}</span></div>
    ${sale.item_discount > 0 ? `<div class="row small"><span>Mahsulot chegirmalari:</span><span>−${Math.round(sale.item_discount).toLocaleString()}</span></div>` : ""}
    ${sale.discount > 0 ? `<div class="row small"><span>Chegirma:</span><span>−${Math.round(sale.discount).toLocaleString()}</span></div>` : ""}
    <div class="row total"><span>JAMI:</span><span>${Math.round(sale.total).toLocaleString()} so'm</span></div>
    ${fuRows ? `<hr/><div class="small" style="margin-bottom:4px">Qayta aloqa:</div>${fuRows}` : ""}
    <hr/>
    <div class="footer">Xaridingiz uchun rahmat! Sog' bo'ling 🌿</div>
    </body></html>`);
    win.document.close();
    win.print();
}

export default function ReceiptDialog({ bundle, onClose }) {
    if (!bundle) return null;
    const { sale, items, follow_ups: fus = [], duplicate } = bundle;
    return (
        <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="bg-ivory border-line rounded-2xl max-w-md" data-testid="pos-receipt">
                <DialogHeader>
                    <DialogTitle className="font-serif text-2xl text-noir flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-rose"/> Savdo №{sale.daily_number} yakunlandi
                    </DialogTitle>
                    <DialogDescription className="text-stone text-sm">
                        {sale.sale_code} · {new Date(sale.sale_date_time).toLocaleString()}
                        {duplicate && <span className="ml-2 text-amber-700">(bu sotuv avval saqlangan edi)</span>}
                    </DialogDescription>
                </DialogHeader>
                <div className="font-mono text-xs space-y-1 bg-white border border-dashed border-line rounded-xl p-3 max-h-[50vh] overflow-y-auto">
                    <div className="flex justify-between"><span>Sotuvchi:</span><span>{sale.employee_name}</span></div>
                    <div className="flex justify-between"><span>Mijoz:</span><span>{sale.customer_name} · {sale.customer_phone}</span></div>
                    {(sale.customer_age || sale.customer_height_cm || sale.customer_weight_kg) && (
                        <div className="flex justify-between text-stone text-[11px]">
                            <span>Ma'lumot:</span>
                            <span>{[sale.customer_age && `${sale.customer_age} yosh`, sale.customer_height_cm && `${sale.customer_height_cm} sm`, sale.customer_weight_kg && `${sale.customer_weight_kg} kg`].filter(Boolean).join(" · ")}</span>
                        </div>
                    )}
                    <div className="border-t border-dashed border-line my-1"/>
                    {items.map(it => (
                        <div key={it.id}>
                            <div className="flex justify-between gap-2"><span>{it.product_name} × {it.quantity}</span><span>{fmtMoney(it.line_total)}</span></div>
                            {it.is_medicine && it.daily_usage > 0 && (
                                <div className="text-stone text-[10px] pl-2">
                                    kuniga {it.times_per_day}×{it.units_per_intake}{it.recommendation ? `, ${it.recommendation}` : ""} · {it.estimated_days} kun · tugaydi {fmtDate(it.estimated_end_date)}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="border-t border-dashed border-line my-1"/>
                    <div className="flex justify-between"><span>Oraliq summa:</span><span>{fmtMoney(sale.subtotal)}</span></div>
                    {sale.item_discount > 0 && <div className="flex justify-between text-rose"><span>Mahsulot chegirmalari:</span><span>−{fmtMoney(sale.item_discount)}</span></div>}
                    {sale.discount > 0 && <div className="flex justify-between text-rose"><span>Chegirma:</span><span>−{fmtMoney(sale.discount)}</span></div>}
                    <div className="flex justify-between font-bold text-sm"><span>JAMI:</span><span>{fmtMoney(sale.total)}</span></div>
                    {fus.length > 0 && (
                        <>
                            <div className="border-t border-dashed border-line my-1"/>
                            <div className="text-stone">Qayta aloqa vazifalari ({fus.length}):</div>
                            {fus.map(f => (
                                <div key={f.id} className="flex justify-between gap-2 text-[11px]">
                                    <span>{fmtDate(f.scheduled_at)} — {f.product_name}</span><span className="text-stone">{f.stage_label}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => printPosReceipt(bundle)} variant="outline" className="flex-1 rounded-full border-noir text-noir" data-testid="pos-print">
                        <Printer className="w-4 h-4 mr-1"/> Chop etish
                    </Button>
                    <Button onClick={onClose} className="flex-1 bg-noir text-ivory hover:bg-rose rounded-full" data-testid="pos-new-sale">
                        <Plus className="w-4 h-4 mr-1"/> Yangi sotuv
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
