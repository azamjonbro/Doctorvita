import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  Trash2,
  Users,
  ShoppingBag,
  TrendingUp,
  Banknote,
  FileDown,
  FileText,
  Percent,
  Wallet,
  ArrowUpRight,
  ClipboardList,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import MapView from "@/components/MapView";
import { formatCalendarDate } from "@/lib/posLogic";
import ExpiryProductsPanel from "@/components/ExpiryProductsPanel";
import { DatePicker } from "@/components/ui/date-picker";
import "../index.css";

export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [lastPurch, setLastPurch] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [openWorker, setOpenWorker] = useState(false);
  const [salesQuickRange, setSalesQuickRange] = useState("all");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");
  const [salesWorker, setSalesWorker] = useState("all");
  const [salesBranch, setSalesBranch] = useState("all");
  const [salesProduct, setSalesProduct] = useState("all");
  const [statsBranch, setStatsBranch] = useState("all");
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    address: "",
  });
  const [wForm, setWForm] = useState({
    name: "",
    surname: "",
    phone: "",
    email: "",
    password: "",
    branch_id: "",
  });

  const load = useCallback(async () => {
    const [s, u, w, b, o, sa, at, lp, al] = await Promise.all([
      api.get("/stats/overview", {
        params: statsBranch === "all" ? {} : { branch_id: statsBranch },
      }),
      api.get("/users"),
      api.get("/users/workers"),
      api.get("/branches"),
      api.get("/orders"),
      api.get("/sales/all"),
      api.get("/attendance"),
      api.get("/stats/customer-last-purchase"),
      api.get("/products/audit-logs").catch(() => ({ data: [] })),
    ]);
    setStats(s.data);
    setUsers(u.data);
    setWorkers(w.data);
    setBranches(b.data);
    setOrders(o.data);
    setSales(sa.data);
    setAttendance(at.data);
    setLastPurch(lp.data);
    setAuditLogs(al.data);
  }, [statsBranch]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const addWorker = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/workers", {
        ...wForm,
        branch_id: wForm.branch_id || null,
      });
      toast.success("Yangi sotuvchi qo'shildi");
      setOpenWorker(false);
      setWForm({
        name: "",
        surname: "",
        phone: "",
        email: "",
        password: "",
        branch_id: "",
      });
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const addBranch = async (e) => {
    e.preventDefault();
    try {
      await api.post("/branches", branchForm);
      toast.success("Filial qo'shildi");
      setBranchForm({ name: "", code: "", address: "" });
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const toggleBranch = async (branch) => {
    try {
      await api.put(`/branches/${branch.id}`, {
        name: branch.name,
        code: branch.code,
        address: branch.address,
        active: branch.active === false,
      });
      toast.success(
        branch.active === false
          ? "Filial ishga tushirildi"
          : "Filial vaqtincha to'xtatildi",
      );
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const deleteWorker = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await api.delete(`/users/workers/${id}`);
      toast.success("O'chirildi");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const orderMarkers = orders.map((o) => ({
    lat: o.location.lat,
    lng: o.location.lng,
    kind: "order",
    title: `${o.customer_name} ${o.customer_surname}`,
    subtitle: `${o.product_name} · ${o.customer_phone}`,
  }));
  const workerMarkers = attendance.slice(0, 50).map((a) => ({
    lat: a.location.lat,
    lng: a.location.lng,
    kind: "worker",
    title: a.worker_name,
    subtitle: `${a.type === "checkin" ? "Keldi" : "Ketdi"} · ${a.local_time}`,
  }));

  const uniqueWorkers = useMemo(
    () =>
      Array.from(
        new Set(sales.map((s) => s.worker_name).filter(Boolean)),
      ).sort(),
    [sales],
  );

  const uniqueProducts = useMemo(
    () =>
      Array.from(
        new Set(sales.map((s) => s.product_name).filter(Boolean)),
      ).sort(),
    [sales],
  );

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const createdAt = s.created_at ? new Date(s.created_at) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return false;

      let matchesRange = true;
      if (salesQuickRange === "today") {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        matchesRange = createdAt >= todayStart;
      } else if (salesQuickRange === "7d") {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        matchesRange = createdAt >= start;
      } else if (salesQuickRange === "30d") {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        matchesRange = createdAt >= start;
      }

      if (salesDateFrom && createdAt < new Date(`${salesDateFrom}T00:00:00`)) {
        matchesRange = false;
      }
      if (salesDateTo && createdAt > new Date(`${salesDateTo}T23:59:59`)) {
        matchesRange = false;
      }

      const matchesWorker =
        salesWorker === "all" || s.worker_name === salesWorker;
      const matchesBranch =
        salesBranch === "all" || s.branch_id === salesBranch;
      const matchesProduct =
        salesProduct === "all" || s.product_name === salesProduct;

      return matchesRange && matchesWorker && matchesBranch && matchesProduct;
    });
  }, [
    sales,
    salesQuickRange,
    salesDateFrom,
    salesDateTo,
    salesWorker,
    salesBranch,
    salesProduct,
  ]);

  const salesSummary = useMemo(() => {
    const totalCount = filteredSales.length;
    const totalRevenue = filteredSales.reduce(
      (sum, s) => sum + Number(s.total || 0),
      0,
    );
    const totalProfit = filteredSales.reduce(
      (sum, s) => sum + Number(s.profit || 0),
      0,
    );
    const totalQty = filteredSales.reduce(
      (sum, s) => sum + Number(s.quantity || 0),
      0,
    );

    return { totalCount, totalRevenue, totalProfit, totalQty };
  }, [filteredSales]);

  const resetSalesFilters = () => {
    setSalesQuickRange("all");
    setSalesDateFrom("");
    setSalesDateTo("");
    setSalesWorker("all");
    setSalesBranch("all");
    setSalesProduct("all");
  };

  return (
    <div className="bg-ivory min-h-screen" data-testid="director-dashboard">
      <header className="border-b border-line bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div>
            <div className="font-serif text-xl text-noir leading-none">
              Direktor paneli
            </div>
            <div className="text-xs text-stone">Maison Glow CRM</div>
          </div>
          <Button variant="ghost" onClick={logout} data-testid="dir-logout">
            <LogOut className="w-4 h-4 mr-1" /> Chiqish
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {stats && (
          <>
            <div className="flex items-center justify-end gap-3">
              <Label className="text-sm text-stone">Statistika filiali</Label>
              <select
                value={statsBranch}
                onChange={(e) => setStatsBranch(e.target.value)}
                className="h-10 rounded-md border border-line bg-white px-3 text-sm text-noir"
              >
                <option value="all">Barcha filiallar</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <Stat
                icon={<ShoppingBag className="w-4 h-4" />}
                label="Online buyurtmalar"
                value={stats.total_orders}
              />
              <Stat
                icon={<TrendingUp className="w-4 h-4" />}
                label="Sotuvlar (do'kon)"
                value={stats.total_sales}
              />
              <Stat
                icon={<Users className="w-4 h-4" />}
                label="Mijozlar"
                value={stats.total_customers}
              />
              <Stat
                icon={<Banknote className="w-4 h-4" />}
                label="Jami daromad"
                value={`${(stats.total_revenue || 0).toLocaleString()} so'm`}
              />
            </div>

            {/* Foyda va xarid statistikasi */}
            <div className="grid md:grid-cols-4 gap-4">
              <Stat
                icon={<Wallet className="w-4 h-4" />}
                label="Xarid narxi (jami)"
                value={`${(stats.total_cost || 0).toLocaleString()} so'm`}
                color="stone"
              />
              <Stat
                icon={<ArrowUpRight className="w-4 h-4" />}
                label="Sof foyda"
                value={`${(stats.total_profit || 0).toLocaleString()} so'm`}
                color="green"
              />
              <Stat
                icon={<Percent className="w-4 h-4" />}
                label="Chegirmadagi yo'qotish"
                value={`${(stats.total_discount || 0).toLocaleString()} so'm`}
                color="rose"
              />
              <Stat
                icon={<TrendingUp className="w-4 h-4" />}
                label="Foyda marjasi"
                value={
                  stats.total_revenue
                    ? `${((stats.total_profit / stats.total_revenue) * 100).toFixed(1)}%`
                    : "—"
                }
                color="green"
              />
            </div>
          </>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="bg-cream mediA flex-wrap h-auto">
            <TabsTrigger value="overview" data-testid="d-tab-overview">
              Umumiy
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="d-tab-orders">
              Buyurtmalar
            </TabsTrigger>
            <TabsTrigger value="sales" data-testid="d-tab-sales">
              Sotuvlar
            </TabsTrigger>
            <TabsTrigger value="branches" data-testid="d-tab-branches">
              <Building2 className="w-3.5 h-3.5 mr-1" /> Filiallar
            </TabsTrigger>
            <TabsTrigger value="expiry" data-testid="d-tab-expiry">
              Yaroqlilik
            </TabsTrigger>
            <TabsTrigger value="workers" data-testid="d-tab-workers">
              Sotuvchilar
            </TabsTrigger>
            <TabsTrigger value="customers" data-testid="d-tab-customers">
              Mijozlar
            </TabsTrigger>
            <TabsTrigger value="att" data-testid="d-tab-att">
              Davomat
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="d-tab-reports">
              Hisobotlar
            </TabsTrigger>
            <TabsTrigger value="auditlogs" data-testid="d-tab-audit">
              <ClipboardList className="w-3.5 h-3.5 mr-1" /> Tahrirlash loglari
              {auditLogs.length > 0 && (
                <span className="ml-1.5 text-xs bg-rose text-ivory rounded-full px-1.5 py-0.5">
                  {auditLogs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {stats && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-line p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-xl text-noir">
                      Kunlik daromad va foyda (14 kun)
                    </h3>
                  </div>
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <AreaChart data={stats.daily}>
                        <defs>
                          <linearGradient
                            id="revGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#2E7D63"
                              stopOpacity={0.55}
                            />
                            <stop
                              offset="100%"
                              stopColor="#2E7D63"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="profGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10302A"
                              stopOpacity={0.55}
                            />
                            <stop
                              offset="100%"
                              stopColor="#10302A"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D6" />
                        <XAxis dataKey="date" stroke="#5F6B66" fontSize={11} />
                        <YAxis stroke="#5F6B66" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            background: "#F9F8F4",
                            border: "1px solid #E3E0D6",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Daromad"
                          stroke="#2E7D63"
                          fill="url(#revGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          name="Foyda"
                          stroke="#10302A"
                          fill="url(#profGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <h3 className="font-serif text-xl text-noir mb-4">
                    Oylik daromad va foyda
                  </h3>
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D6" />
                        <XAxis dataKey="month" stroke="#5F6B66" fontSize={11} />
                        <YAxis stroke="#5F6B66" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            background: "#F9F8F4",
                            border: "1px solid #E3E0D6",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Daromad"
                          fill="#2E7D63"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="profit"
                          name="Foyda"
                          fill="#10302A"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="discount"
                          name="Chegirma"
                          fill="#4FA383"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <h3 className="font-serif text-xl text-noir mb-4">
                    Sotuvchilar reytingi
                  </h3>
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.per_worker}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D6" />
                        <XAxis
                          dataKey="worker_name"
                          stroke="#5F6B66"
                          fontSize={11}
                        />
                        <YAxis stroke="#5F6B66" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            background: "#F9F8F4",
                            border: "1px solid #E3E0D6",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Daromad" fill="#10302A" />
                        <Bar dataKey="profit" name="Foyda" fill="#2E7D63" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <h3 className="font-serif text-xl text-noir mb-4">
                    Top 5 mahsulot
                  </h3>
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.top_products} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D6" />
                        <XAxis type="number" stroke="#5F6B66" fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#5F6B66"
                          fontSize={11}
                          width={140}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#F9F8F4",
                            border: "1px solid #E3E0D6",
                          }}
                        />
                        <Bar
                          dataKey="qty"
                          name="Sotilgan soni"
                          fill="#2E7D63"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6 space-y-4">
            <div className="bg-white rounded-2xl border border-line p-2">
              <MapView markers={orderMarkers} height={380} />
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Chegirma</TableHead>
                    <TableHead>Foyda</TableHead>
                    <TableHead>Jami</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} data-testid={`order-row-${o.id}`}>
                      <TableCell className="text-xs">
                        {new Date(o.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {o.customer_name} {o.customer_surname}
                      </TableCell>
                      <TableCell>{o.customer_phone}</TableCell>
                      <TableCell>{o.product_name}</TableCell>
                      <TableCell>
                        {Number(o.discount_total || 0) > 0 ? (
                          <span className="text-rose">
                            −{Number(o.discount_total).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-stone text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-green-700 font-semibold">
                        {Number(o.profit || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {Number(o.total).toLocaleString()} so'm
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-stone text-center py-10"
                      >
                        Buyurtmalar yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="mt-6 space-y-4">
            <div className="bg-white rounded-2xl border border-line p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Barchasi" },
                    { value: "today", label: "Bugun" },
                    { value: "7d", label: "7 kun" },
                    { value: "30d", label: "30 kun" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSalesQuickRange(item.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        salesQuickRange === item.value
                          ? "bg-noir text-ivory"
                          : "bg-cream text-stone hover:text-noir"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetSalesFilters}
                  className="rounded-full"
                >
                  Filterni tozalash
                </Button>
              </div>

              <div className="grid md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-stone">Dan</Label>
                  <DatePicker
                    value={salesDateFrom}
                    onChange={(val) => setSalesDateFrom(val)}
                    placeholder="Boshlanish sanasi"
                    clearable={true}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone">Gacha</Label>
                  <DatePicker
                    value={salesDateTo}
                    onChange={(val) => setSalesDateTo(val)}
                    placeholder="Tugash sanasi"
                    min={salesDateFrom}
                    clearable={true}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone">Filial</Label>
                  <select
                    value={salesBranch}
                    onChange={(e) => setSalesBranch(e.target.value)}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-noir"
                  >
                    <option value="all">Barcha filiallar</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone">Xodim</Label>
                  <select
                    value={salesWorker}
                    onChange={(e) => setSalesWorker(e.target.value)}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-noir"
                  >
                    <option value="all">Barchasi</option>
                    {uniqueWorkers.map((worker) => (
                      <option key={worker} value={worker}>
                        {worker}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-stone">Dori / mahsulot</Label>
                  <select
                    value={salesProduct}
                    onChange={(e) => setSalesProduct(e.target.value)}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-noir"
                  >
                    <option value="all">Barchasi</option>
                    {uniqueProducts.map((product) => (
                      <option key={product} value={product}>
                        {product}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <MetricCard
                  label="Tanlangan sotuvlar"
                  value={`${salesSummary.totalCount}`}
                />
                <MetricCard
                  label="Bugun / tanlangan davr"
                  value={`${salesSummary.totalRevenue.toLocaleString()} so'm`}
                />
                <MetricCard
                  label="Umumiy foyda"
                  value={`${salesSummary.totalProfit.toLocaleString()} so'm`}
                  color="green"
                />
                <MetricCard
                  label="Mahsulotlar soni"
                  value={`${salesSummary.totalQty}`}
                  color="stone"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-line overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Sotuvchi</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Soni</TableHead>
                    <TableHead>Chegirma</TableHead>
                    <TableHead>Foyda</TableHead>
                    <TableHead>Jami</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">
                        {new Date(s.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{s.worker_name}</TableCell>
                      <TableCell>
                        {s.customer_name} {s.customer_surname}
                      </TableCell>
                      <TableCell>{s.product_name}</TableCell>
                      <TableCell>{s.quantity}</TableCell>
                      <TableCell>
                        {Number(s.discount_total || 0) > 0 ? (
                          <span className="text-rose">
                            −{Number(s.discount_total).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-stone text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-green-700 font-semibold">
                        {Number(s.profit || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {Number(s.total).toLocaleString()} so'm
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSales.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-stone text-center py-10"
                      >
                        Ushbu filtr bo'yicha sotuvlar yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="branches" className="mt-6 space-y-4">
            <div className="bg-white rounded-2xl border border-line p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-xl text-noir">
                    Filial yaratish
                  </h3>
                  <p className="text-sm text-stone">
                    Hodimlarni keyin filialga biriktirasiz.
                  </p>
                </div>
                <Building2 className="w-5 h-5 text-stone" />
              </div>
              <form
                onSubmit={addBranch}
                className="grid md:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <Label>Nomi</Label>
                  <Input
                    value={branchForm.name}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, name: e.target.value })
                    }
                    placeholder="Masalan: Chilonzor filiali"
                    required
                  />
                </div>
                <div>
                  <Label>Kodi</Label>
                  <Input
                    value={branchForm.code}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, code: e.target.value })
                    }
                    placeholder="CH-01"
                  />
                </div>
                <div>
                  <Label>Manzil</Label>
                  <Input
                    value={branchForm.address}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, address: e.target.value })
                    }
                    placeholder="Toshkent shahri"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-noir text-ivory hover:bg-rose rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" /> Filial qo'shish
                </Button>
              </form>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-white rounded-2xl border border-line p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-serif text-xl text-noir">
                        {branch.name}
                      </div>
                      <div className="text-sm text-stone">
                        Kod: {branch.code || "—"}
                      </div>
                      <div className="text-sm text-stone">
                        {branch.address || "Manzil kiritilmagan"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs rounded-full px-2 py-1 ${branch.active === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                      >
                        {branch.active === false ? "To'xtatilgan" : "Faol"}
                      </span>
                      <span className="text-xs bg-cream text-stone rounded-full px-2 py-1">
                        {
                          workers.filter(
                            (worker) => worker.branch_id === branch.id,
                          ).length
                        }{" "}
                        hodim
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBranch(branch)}
                        className="rounded-full"
                      >
                        {branch.active === false
                          ? "Ishga tushirish"
                          : "To'xtatish"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {branches.length === 0 && (
                <div className="text-stone bg-cream rounded-xl p-6 text-center md:col-span-2">
                  Hali filiallar qo'shilmagan
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="expiry" className="mt-6">
            <ExpiryProductsPanel role="director" />
          </TabsContent>

          <TabsContent value="workers" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setOpenWorker(true)}
                disabled={workers.length >= 5}
                className="bg-noir text-ivory hover:bg-rose rounded-full"
                data-testid="add-worker-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Yangi sotuvchi
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {workers.map((w) => (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl border border-line p-5 flex items-center justify-between"
                  data-testid={`worker-${w.id}`}
                >
                  <div>
                    <div className="font-serif text-xl text-noir">
                      {w.name} {w.surname}
                    </div>
                    <div className="text-sm text-stone">{w.email}</div>
                    <div className="text-sm text-stone">{w.phone}</div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => deleteWorker(w.id)}
                    className="text-rose hover:bg-rose/10"
                    data-testid={`delete-worker-${w.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {workers.length === 0 && (
                <div className="text-stone bg-cream rounded-xl p-6 text-center md:col-span-2">
                  Hali sotuvchilar qo'shilmagan
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Ism</TableHead>
                    <TableHead>Oxirgi mahsulot</TableHead>
                    <TableHead>Sotuvchi</TableHead>
                    <TableHead>Xaridlar</TableHead>
                    <TableHead>Sana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastPurch.map((c) => (
                    <TableRow key={c.customer_phone}>
                      <TableCell>{c.customer_phone}</TableCell>
                      <TableCell>
                        {c.customer_name} {c.customer_surname}
                      </TableCell>
                      <TableCell>{c.last_product}</TableCell>
                      <TableCell>{c.last_worker}</TableCell>
                      <TableCell>
                        {Number(c.purchase_count || 0)} mart
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCalendarDate(c.last_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lastPurch.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-stone text-center py-10"
                      >
                        Mijozlar yo'q
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6">
              <h4 className="font-serif text-lg text-noir mb-3">
                Barcha akkauntlar
              </h4>
              <div className="bg-white rounded-2xl border border-line overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Ism</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Yaratilgan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">{u.email}</TableCell>
                        <TableCell>
                          {u.name} {u.surname}
                        </TableCell>
                        <TableCell>{u.phone}</TableCell>
                        <TableCell>
                          <span className="text-xs uppercase tracking-widest text-rose">
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatCalendarDate(u.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="att" className="mt-6 space-y-4">
            <div className="bg-white rounded-2xl border border-line p-2">
              <MapView markers={workerMarkers} height={360} />
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Vaqt</TableHead>
                    <TableHead>Sotuvchi</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Lokatsiya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">
                        {formatCalendarDate(a.timestamp)}
                      </TableCell>
                      <TableCell>{a.local_time}</TableCell>
                      <TableCell>{a.worker_name}</TableCell>
                      <TableCell>
                        {a.type === "checkin" ? "Kelish" : "Ketish"}
                      </TableCell>
                      <TableCell>
                        {a.is_late ? (
                          <span className="text-rose">Kech</span>
                        ) : a.is_early ? (
                          <span className="text-noir">Erta</span>
                        ) : (
                          <span className="text-stone">O'z vaqtida</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportPanel />
          </TabsContent>

          <TabsContent value="auditlogs" className="mt-6 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-xl text-noir">
                  Admin tahrirlash loglari
                </h3>
                <p className="text-sm text-stone">
                  Admin qaysi mahsulotni, qachon, nimani o'zgartirganini ko'ring
                </p>
              </div>
              <span className="text-xs bg-cream px-3 py-1 rounded-full text-stone">
                {auditLogs.length} ta yozuv
              </span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="text-stone bg-cream rounded-xl p-8 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                Hali hech qanday tahrirlash amalga oshirilmagan
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border border-line p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-serif text-lg text-noir">
                        {log.product_name}
                      </div>
                      <div className="text-xs text-stone mt-0.5">
                        Admin:{" "}
                        <span className="text-noir font-medium">
                          {log.admin_name}
                        </span>
                        {" · "}
                        {new Date(log.edited_at).toLocaleString()}
                      </div>
                    </div>
                    <span className="text-xs bg-rose/10 text-rose px-3 py-1 rounded-full">
                      {log.changes?.length || 0} ta o'zgarish
                    </span>
                  </div>
                  {log.changes && log.changes.length > 0 && (
                    <div className="bg-cream rounded-xl p-3 space-y-2">
                      {log.changes.map((change, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-stone min-w-[120px] text-xs pt-0.5">
                            {change.label}:
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-rose line-through text-xs">
                              {change.old || "—"}
                            </span>
                            <span className="text-stone">→</span>
                            <span className="font-mono text-green-700 text-xs font-medium">
                              {change.new || "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={openWorker} onOpenChange={setOpenWorker}>
        <DialogContent className="bg-ivory border-line rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir">
              Yangi sotuvchi
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addWorker}
            className="space-y-3"
            data-testid="add-worker-form"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ism</Label>
                <Input
                  data-testid="w-name"
                  value={wForm.name}
                  onChange={(e) => setWForm({ ...wForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Familiya</Label>
                <Input
                  data-testid="w-surname"
                  value={wForm.surname}
                  onChange={(e) =>
                    setWForm({ ...wForm, surname: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                data-testid="w-phone"
                value={wForm.phone}
                onChange={(e) => setWForm({ ...wForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Filial</Label>
              <select
                value={wForm.branch_id}
                onChange={(e) =>
                  setWForm({ ...wForm, branch_id: e.target.value })
                }
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-noir"
                required
              >
                <option value="">Filialni tanlang</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                data-testid="w-email"
                type="email"
                value={wForm.email}
                onChange={(e) => setWForm({ ...wForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Parol</Label>
              <Input
                data-testid="w-password"
                type="password"
                value={wForm.password}
                onChange={(e) =>
                  setWForm({ ...wForm, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11"
              data-testid="w-submit"
            >
              Yaratish
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon, label, value, color = "noir" }) {
  const colors = {
    noir: "text-noir",
    rose: "text-rose",
    green: "text-green-700",
    stone: "text-stone",
  };
  return (
    <div className="bg-white rounded-xl border border-line p-5 hover:border-rose transition-colors">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone">
        {icon}
        {label}
      </div>
      <div
        className={`font-serif text-2xl mt-2 break-words ${colors[color] || colors.noir}`}
      >
        {value}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = "noir" }) {
  const colors = {
    noir: "text-noir",
    green: "text-green-700",
    stone: "text-stone",
  };

  return (
    <div className="bg-cream rounded-xl border border-line p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-stone">
        {label}
      </div>
      <div
        className={`mt-2 text-xl font-semibold ${colors[color] || colors.noir}`}
      >
        {value}
      </div>
    </div>
  );
}

function ReportPanel() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [rangeMode, setRangeMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const download = async (format) => {
    setBusy(true);
    try {
      if (rangeMode) {
        // Ko'p oy uchun alohida yuklab olamiz
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(toYear, toMonth - 1, 1);
        if (endDate < startDate) {
          toast.error(
            "Tugash oyi boshlanish oyidan oldin bo'lishi mumkin emas",
          );
          return;
        }
        // Range hisoboti — birinchi oydan oxirgi oygacha
        const res = await api
          .get(`/reports/range`, {
            params: {
              from_year: year,
              from_month: month,
              to_year: toYear,
              to_month: toMonth,
              format,
            },
            responseType: "blob",
          })
          .catch(async () => {
            // Agar range endpoint yo'q bo'lsa, birinchi oyni yuklaymiz
            return await api.get(`/reports/monthly`, {
              params: { year, month, format },
              responseType: "blob",
            });
          });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `hisobot-${year}-${String(month).padStart(2, "0")}_${toYear}-${String(toMonth).padStart(2, "0")}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const res = await api.get(`/reports/monthly`, {
          params: { year, month, format },
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `maison-glow-${year}-${String(month).padStart(2, "0")}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
      toast.success(`${format.toUpperCase()} hisobot yuklandi`);
    } catch (e) {
      toast.error("Hisobot yuklab bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  const months = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ];
  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--)
    years.push(y);

  const monthCount = (() => {
    if (!rangeMode) return 1;
    const s = new Date(year, month - 1, 1);
    const e = new Date(toYear, toMonth - 1, 1);
    if (e < s) return 0;
    return (toYear - year) * 12 + (toMonth - month) + 1;
  })();

  return (
    <div
      className="bg-white rounded-2xl border border-line p-6 max-w-2xl"
      data-testid="report-panel"
    >
      <h3 className="font-serif text-2xl text-noir">Hisobotlar</h3>
      <p className="text-sm text-stone mt-2">
        Tanlangan davr uchun barcha do'kon sotuvlari, onlayn buyurtmalar, foyda
        va chegirmalarni PDF yoki CSV formatida yuklab oling.
      </p>

      {/* Davr tanlash — bir oy yoki oralik */}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setRangeMode(false)}
          className={`px-4 py-2 rounded-full text-sm transition-all border ${!rangeMode ? "bg-noir text-ivory border-noir" : "border-line text-stone hover:border-noir"}`}
        >
          Bir oy
        </button>
        <button
          type="button"
          onClick={() => setRangeMode(true)}
          className={`px-4 py-2 rounded-full text-sm transition-all border ${rangeMode ? "bg-noir text-ivory border-noir" : "border-line text-stone hover:border-noir"}`}
        >
          Bir necha oy (oralik)
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {/* Boshlanish */}
        <div>
          <Label className="text-xs uppercase tracking-widest text-stone">
            {rangeMode ? "Boshlanish" : "Davr"}
          </Label>
          <div className="grid sm:grid-cols-2 gap-3 mt-1">
            <div>
              <Label className="text-xs">Yil</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-line bg-white px-3 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                data-testid="report-year"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Oy</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-line bg-white px-3 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                data-testid="report-month"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tugash (faqat oralik rejimda) */}
        {rangeMode && (
          <div>
            <Label className="text-xs uppercase tracking-widest text-stone">
              Tugash
            </Label>
            <div className="grid sm:grid-cols-2 gap-3 mt-1">
              <div>
                <Label className="text-xs">Yil</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-line bg-white px-3 text-sm"
                  value={toYear}
                  onChange={(e) => setToYear(Number(e.target.value))}
                  data-testid="report-to-year"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Oy</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-line bg-white px-3 text-sm"
                  value={toMonth}
                  onChange={(e) => setToMonth(Number(e.target.value))}
                  data-testid="report-to-month"
                >
                  {months.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {monthCount > 0 && (
              <div className="mt-2 text-xs text-stone bg-cream rounded-lg px-3 py-2">
                Tanlangan davr:{" "}
                <span className="font-semibold text-noir">{monthCount} oy</span>{" "}
                ({months[month - 1]} {year} — {months[toMonth - 1]} {toYear})
              </div>
            )}
            {monthCount <= 0 && (
              <div className="mt-2 text-xs text-rose">
                ⚠ Tugash oyi boshlanish oyidan oldin bo'lishi mumkin emas
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={() => download("pdf")}
          disabled={busy || (rangeMode && monthCount <= 0)}
          className="bg-noir text-ivory hover:bg-rose rounded-full"
          data-testid="report-pdf"
        >
          <FileText className="w-4 h-4 mr-2" /> PDF yuklab olish
        </Button>
        <Button
          onClick={() => download("csv")}
          disabled={busy || (rangeMode && monthCount <= 0)}
          variant="outline"
          className="border-noir text-noir rounded-full"
          data-testid="report-csv"
        >
          <FileDown className="w-4 h-4 mr-2" /> CSV yuklab olish
        </Button>
      </div>
    </div>
  );
}
