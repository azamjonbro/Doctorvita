import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  LogOut,
  MapPin,
  LogIn,
  AlertCircle,
  Users,
  Printer,
  BellRing,
} from "lucide-react";
import SalesScreen from "@/pages/pos/SalesScreen";
import FollowUpsPanel from "@/pages/pos/FollowUpsPanel";
import { printPosReceipt } from "@/pages/pos/ReceiptDialog";
import { fmtMoney, fmtDate, formatCalendarDate } from "@/lib/posLogic";
import ExpiryProductsPanel from "@/components/ExpiryProductsPanel";

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const [sales, setSales] = useState([]); // eski `sales` kolleksiyasi (tarix / mijozlarim)
  const [todaySales, setTodaySales] = useState([]); // bugungi POS savdolari
  const [attendance, setAttendance] = useState([]);
  const [fuSummary, setFuSummary] = useState({ today: 0, overdue: 0 });
  const [customersFilter, setCustomersFilter] = useState("today"); // today | month | all
  const [tab, setTab] = useState("pos");
  const notifiedRef = useRef(false);

  const load = useCallback(async () => {
    const [s, a, t, f] = await Promise.all([
      api.get("/sales/mine").catch(() => ({ data: [] })),
      api.get("/attendance/mine").catch(() => ({ data: [] })),
      api.get("/pos/sales").catch(() => ({ data: [] })),
      api
        .get("/followups/summary")
        .catch(() => ({ data: { today: 0, overdue: 0 } })),
    ]);
    setSales(s.data);
    setAttendance(a.data);
    setTodaySales(t.data);
    setFuSummary(f.data);
    // Dastur ichidagi bildirishnoma: bugungi / kechikkan vazifalar
    if (!notifiedRef.current && (f.data.today > 0 || f.data.overdue > 0)) {
      notifiedRef.current = true;
      const parts = [];
      if (f.data.today) parts.push(`bugun ${f.data.today} ta`);
      if (f.data.overdue) parts.push(`kechikkan ${f.data.overdue} ta`);
      toast(`Qayta aloqa vazifalari: ${parts.join(", ")}`, {
        icon: <BellRing className="w-4 h-4 text-rose" />,
        action: { label: "Ko'rish", onClick: () => setTab("followups") },
        duration: 8000,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const punch = (type) => {
    if (!navigator.geolocation)
      return toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.post("/attendance", {
            type,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          if (data.is_late)
            toast.warning("Kech keldingiz! Direktorga xabar yuborildi.");
          else if (data.is_early) toast.success("Erta keldingiz - yashang!");
          else
            toast.success(
              type === "checkin" ? "Ishga keldingiz" : "Ishni tugatdingiz",
            );
          await load();
        } catch (e) {
          toast.error(formatApiError(e.response?.data?.detail) || e.message);
        }
      },
      () => toast.error("Joylashuvni olib bo'lmadi"),
    );
  };

  const reprint = async (saleId) => {
    try {
      const { data } = await api.get(`/pos/sales/${saleId}`);
      printPosReceipt(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  // Customers list (grouped by phone)
  const customersGrouped = (() => {
    const filtered = sales.filter((s) => {
      const d = new Date(s.created_at);
      const now = new Date();
      if (customersFilter === "today")
        return d.toDateString() === now.toDateString();
      if (customersFilter === "month")
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      return true;
    });
    const map = new Map();
    for (const s of filtered) {
      const key =
        s.customer_phone || `${s.customer_name}_${s.customer_surname}`;
      if (!map.has(key)) {
        map.set(key, {
          name: s.customer_name,
          surname: s.customer_surname,
          phone: s.customer_phone,
          count: 0,
          total: 0,
          last: s.created_at,
        });
      }
      const c = map.get(key);
      c.count += 1;
      c.total += Number(s.total || 0);
      if (s.created_at > c.last) c.last = s.created_at;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  const todayTotal = todaySales.reduce((s, x) => s + Number(x.total || 0), 0);
  const fuBadge = fuSummary.today + fuSummary.overdue;

  return (
    <div className="bg-ivory min-h-screen" data-testid="worker-dashboard">
      <header className="border-b border-line bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 min-h-16 py-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-noir text-ivory flex items-center justify-center font-serif">
              {user.name?.[0] || "I"}
            </div>
            <div>
              <div className="font-serif text-lg text-noir leading-none">
                Salom, {user.name} {user.surname || ""}
              </div>
              <div className="text-xs text-stone">
                Sotuvchi paneli · DR.VITA
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="hidden md:block text-xs text-stone bg-cream rounded-full px-3 py-1.5">
              Bugun: <b className="text-noir">{todaySales.length}</b> savdo ·{" "}
              <b className="text-noir">{fmtMoney(todayTotal)}</b>
            </div>
            <Button
              onClick={() => punch("checkin")}
              className="bg-noir text-ivory hover:bg-rose rounded-full"
              data-testid="checkin-btn"
            >
              <LogIn className="w-4 h-4 mr-1" /> Ishga keldim
            </Button>
            <Button variant="ghost" onClick={logout} data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-cream flex-wrap h-auto">
            <TabsTrigger value="pos" data-testid="tab-register">
              Sotuv
            </TabsTrigger>
            <TabsTrigger value="followups" data-testid="tab-follow">
              Qayta aloqa
              {fuBadge > 0 && (
                <span
                  className={`ml-2 text-xs rounded-full px-2 py-0.5 ${fuSummary.overdue ? "bg-rose text-ivory" : "bg-noir text-ivory"}`}
                >
                  {fuBadge}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="expiry" data-testid="tab-expiry">
              Yaroqlilik
            </TabsTrigger>
            <TabsTrigger value="today" data-testid="tab-today">
              Bugungi savdolar ({todaySales.length})
            </TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">
              Mijozlarim
            </TabsTrigger>
            <TabsTrigger value="mine" data-testid="tab-mine">
              Sotuvlar tarixi
            </TabsTrigger>
            <TabsTrigger value="att" data-testid="tab-att">
              Davomat
            </TabsTrigger>
          </TabsList>

          {/* ============ SOTUV (POS) ============ */}
          <TabsContent value="pos" className="mt-5">
            <SalesScreen user={user} onCompleted={load} />
          </TabsContent>

          <TabsContent value="expiry" className="mt-5">
            <ExpiryProductsPanel role="worker" />
          </TabsContent>

          {/* ============ QAYTA ALOQA ============ */}
          <TabsContent value="followups" className="mt-5">
            <FollowUpsPanel onSummary={setFuSummary} />
          </TabsContent>

          {/* ============ BUGUNGI SAVDOLAR ============ */}
          <TabsContent value="today" className="mt-5">
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Vaqt</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Mahsulotlar</TableHead>
                    <TableHead>Jami</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySales.map((s) => (
                    <TableRow key={s.id} data-testid={`today-sale-${s.id}`}>
                      <TableCell className="font-serif text-lg">
                        №{s.daily_number}
                        <div className="text-[10px] text-stone font-mono">
                          {s.sale_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(s.sale_date_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {s.customer_name}
                        <div className="text-xs text-stone">
                          {s.customer_phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-stone max-w-xs">
                        {(s.items || [])
                          .map((i) => `${i.product_name} ×${i.quantity}`)
                          .join(", ")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {fmtMoney(s.total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reprint(s.id)}
                          className="rounded-full"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Chek
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {todaySales.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-stone text-center py-10"
                      >
                        Bugun hali savdo yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ MIJOZLARIM ============ */}
          <TabsContent value="customers" className="mt-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose" />
                <h3 className="font-serif text-xl text-noir">Mijozlarim</h3>
              </div>
              <div className="flex gap-1 bg-cream rounded-full p-1">
                {[
                  { v: "today", l: "Bugun" },
                  { v: "month", l: "Shu oy" },
                  { v: "all", l: "Hammasi" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setCustomersFilter(o.v)}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${customersFilter === o.v ? "bg-noir text-ivory" : "text-stone hover:text-noir"}`}
                    data-testid={`customers-filter-${o.v}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ism familiya</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Sotuvlar soni</TableHead>
                    <TableHead>Jami</TableHead>
                    <TableHead>Oxirgi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersGrouped.map((c, i) => (
                    <TableRow key={i} data-testid={`customer-row-${i}`}>
                      <TableCell className="font-serif text-base">
                        {c.name} {c.surname}
                      </TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>{c.count}</TableCell>
                      <TableCell className="font-semibold">
                        {c.total.toLocaleString()} so'm
                      </TableCell>
                      <TableCell className="text-xs text-stone">
                        {formatCalendarDate(c.last)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {customersGrouped.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-stone text-center py-10"
                      >
                        Bu davrda mijozlar yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ SOTUVLAR TARIXI ============ */}
          <TabsContent value="mine" className="mt-5">
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>№</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Soni</TableHead>
                    <TableHead>Chegirma</TableHead>
                    <TableHead>Jami</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id} data-testid={`sale-row-${s.id}`}>
                      <TableCell className="text-sm">
                        {fmtDate(s.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.daily_number ? (
                          `№${s.daily_number}`
                        ) : (
                          <span className="text-stone">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.customer_name} {s.customer_surname}
                      </TableCell>
                      <TableCell>{s.customer_phone}</TableCell>
                      <TableCell>{s.product_name}</TableCell>
                      <TableCell>{s.quantity}</TableCell>
                      <TableCell>
                        {Number(s.discount_total || 0) > 0 ? (
                          <span className="text-rose text-sm">
                            −{Number(s.discount_total).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-stone text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {Number(s.total).toLocaleString()} so'm
                      </TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-stone text-center py-10"
                      >
                        Hali sotuvlar yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ============ DAVOMAT ============ */}
          <TabsContent value="att" className="mt-5">
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Vaqt</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Lokatsiya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatCalendarDate(a.timestamp)}</TableCell>
                      <TableCell>{a.local_time}</TableCell>
                      <TableCell>
                        {a.type === "checkin" ? "Kelish" : "Ketish"}
                      </TableCell>
                      <TableCell>
                        {a.is_late ? (
                          <span className="text-rose flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Kech
                          </span>
                        ) : a.is_early ? (
                          <span className="text-noir">Erta</span>
                        ) : (
                          <span className="text-stone">O'z vaqtida</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {attendance.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-stone text-center py-10"
                      >
                        Davomat yozuvlari yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
