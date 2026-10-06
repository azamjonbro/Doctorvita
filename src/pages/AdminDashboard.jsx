import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError, safeImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Check,
  ScanLine,
  Camera,
  X,
  Percent,
  Tag,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  QrCode,
  Upload,
  Image as ImageIcon,
  Keyboard,
  FileSpreadsheet,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import FollowUpRulesForm from "@/components/FollowUpRulesForm";
import { DatePicker } from "@/components/ui/date-picker";
import { expiryStatus } from "@/lib/posLogic";
import ExpiryProductsPanel from "@/components/ExpiryProductsPanel";
import SalesScreen from "@/pages/pos/SalesScreen";

const empty = {
  name: "",
  description: "",
  price: 0,
  cost_price: 0,
  discount_percent: 0,
  image_url: "",
  category: "skincare",
  stock: 100,
  barcode: "",
  expiry_date: "",
  sku: "",
  units_per_package: 0,
  branch_id: "",
  all_branches: false,
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [news, setNews] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [scanOrigin, setScanOrigin] = useState(null); // saqlangan asl mahsulot (scanner orqali kelganda)
  const [addQty, setAddQty] = useState(1);
  const [form, setForm] = useState(empty);
  const [openNews, setOpenNews] = useState(false);
  const [nForm, setNForm] = useState({ title: "", content: "", image_url: "" });
  const [search, setSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(40);
  const [branchFilter, setBranchFilter] = useState("all");
  const [branchError, setBranchError] = useState("");
  // Excel orqali filial qoldig'ini (astatka) to'g'rilash
  const [openStock, setOpenStock] = useState(false);
  // "stock" — qoldiqni to'g'rilash (faqat tahrir), "receive" — tovar qabul qilish
  const [stockMode, setStockMode] = useState("stock");
  const [stockBranch, setStockBranch] = useState("");
  const [stockFile, setStockFile] = useState(null);
  const [stockPreview, setStockPreview] = useState(null);
  const [stockBusy, setStockBusy] = useState(false);
  const [stockError, setStockError] = useState("");
  // Fonda ishlayotgan Excel yuklashlar — ekran burchagida ko'rinadi, ishga xalaqit bermaydi
  const [stockJobs, setStockJobs] = useState([]);
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalProductPages, setTotalProductPages] = useState(1);

  // Filialsiz admin barcha filiallarni boshqaradi, filial admini faqat o'zinikini
  // (backend ham xuddi shuni tekshiradi).
  const canManageAllBranches = !user?.branch_id;
  const productBranchLabel = (p) => {
    if (p.all_branches) return "Barcha filiallar";
    if (!p.branch_id) return "Filialsiz";
    return (
      branches.find((branch) => branch.id === p.branch_id)?.name ||
      "Noma'lum filial"
    );
  };
  const canEditProduct = (p) =>
    canManageAllBranches ||
    (!p.all_branches && p.branch_id === user?.branch_id);

  // QR dialog state
  const [openQR, setOpenQR] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [qrProducts, setQrProducts] = useState([]); // array — bir QR kodga bir nechta mahsulot
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSearched, setQrSearched] = useState(false);
  const [qrMode, setQrMode] = useState("scanner"); // "scanner" | "manual"

  // Hardware scanner uchun
  const scanBuffer = useRef("");
  const scanTimer = useRef(null);
  const hiddenInputRef = useRef(null);

  const load = useCallback(async () => {
    const params = {
      search,
      page: productPage,
      limit: productPageSize,
      stock_status: stockFilter,
      ...(canManageAllBranches && branchFilter !== "all"
        ? { branch_id: branchFilter }
        : {}),
      ...(priceMin !== "" ? { price_min: Number(priceMin) } : {}),
      ...(priceMax !== "" ? { price_max: Number(priceMax) } : {}),
    };

    const [p, q, n, d, b] = await Promise.all([
      api.get("/products", { params }),
      api.get("/questions"),
      api.get("/news"),
      api.get("/products/deleted").catch(() => ({ data: [] })),
      api.get("/branches").catch(() => ({ data: [] })),
    ]);

    const payload = p.data;
    const items = Array.isArray(payload) ? payload : payload?.items || [];
    setProducts(items);
    setTotalProducts(
      Array.isArray(payload) ? items.length : payload?.total || items.length,
    );
    setTotalProductPages(
      Array.isArray(payload) ? 1 : payload?.total_pages || 1,
    );
    setQuestions(q.data);
    setNews(n.data);
    setDeletedProducts(d.data);
    setBranches(b.data || []);
  }, [
    search,
    productPage,
    productPageSize,
    branchFilter,
    stockFilter,
    priceMin,
    priceMax,
    canManageAllBranches,
  ]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setScanOrigin(null);
    setBranchError("");
    setForm({ ...empty, branch_id: user?.branch_id || "" });
    setOpen(true);
  };
  const startEdit = (p) => {
    setEditing(p);
    setScanOrigin(null);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: p.price || 0,
      cost_price: p.cost_price || 0,
      discount_percent: p.discount_percent || 0,
      image_url: p.image_url || "",
      category: p.category || "skincare",
      stock: p.stock || 0,
      barcode: p.barcode || "",
      expiry_date: p.expiry_date || "",
      sku: p.sku || "",
      units_per_package: Number(p.units_per_package) || 0,
      branch_id: p.branch_id || user?.branch_id || "",
      all_branches: Boolean(p.all_branches),
    });
    setBranchError("");
    setOpen(true);
  };

  // Scanner orqali kelganda — "Mahsulot qo'shish" rejimi.
  // Hech narsa o'zgarmasa: mavjud mahsulotga stock qo'shadi.
  // Biror maydon o'zgarsa: yangi mahsulot card yaratadi.
  const startAddViaScanner = (p) => {
    const snapshot = {
      name: p.name || "",
      description: p.description || "",
      price: Number(p.price) || 0,
      cost_price: Number(p.cost_price) || 0,
      discount_percent: Number(p.discount_percent) || 0,
      image_url: p.image_url || "",
      category: p.category || "skincare",
      stock: Number(p.stock) || 0,
      barcode: p.barcode || "",
      expiry_date: p.expiry_date || "",
      sku: p.sku || "",
      units_per_package: Number(p.units_per_package) || 0,
      branch_id: user?.branch_id || p.branch_id || "",
      all_branches: false,
    };
    setBranchError("");
    setEditing(null);
    setScanOrigin({ ...p, _snapshot: snapshot });
    setAddQty(1);
    setForm(snapshot);
    setOpen(true);
  };

  const restoreProduct = async (id) => {
    try {
      await api.post(`/products/${id}/restore`);
      toast.success("Qaytarildi");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const isFormChangedFromSnapshot = () => {
    if (!scanOrigin?._snapshot) return true;
    const s = scanOrigin._snapshot;
    const fields = [
      "name",
      "description",
      "price",
      "cost_price",
      "discount_percent",
      "image_url",
      "category",
      "barcode",
      "expiry_date",
      "branch_id",
    ];
    for (const k of fields) {
      const a = String(s[k] ?? "");
      const b = String(form[k] ?? "");
      if (a !== b) return true;
    }
    return false;
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        cost_price: Number(form.cost_price),
        discount_percent: Number(form.discount_percent),
        stock: Number(form.stock),
        units_per_package: Number(form.units_per_package) || 0,
        branch_id: form.branch_id || "",
        all_branches: user?.role === "director" && form.all_branches,
      };
      // Faqat qoldiq qo'shishda (skaner, o'zgarishsiz) filial talab qilinmaydi
      if (!payload.branch_id && !(scanOrigin && !isFormChangedFromSnapshot())) {
        setBranchError("Filialni tanlang");
        return toast.error("Filialni tanlang");
      }
      if (payload.discount_percent < 0 || payload.discount_percent > 100)
        return toast.error("Chegirma 0 dan 100 gacha bo'lishi kerak");
      if (payload.price < payload.cost_price)
        if (
          !window.confirm("Sotuv narxi xarid narxidan kichik! Davom etilsinmi?")
        )
          return;

      // Scanner orqali "Mahsulot qo'shish" rejimi
      if (scanOrigin) {
        if (!isFormChangedFromSnapshot()) {
          // Hech narsa o'zgarmagan — eski mahsulotga stock qo'shamiz
          const add = Math.max(1, Number(addQty) || 1);
          await api.post(`/products/${scanOrigin.id}/stock-add`, { add });
          toast.success(`Eski "${scanOrigin.name}" ga ${add} ta qo'shildi`);
        } else if (payload.branch_id !== (scanOrigin.branch_id || "")) {
          // Boshqa filial tanlangan — o'sha filialga shu shtrix-kod bilan alohida tovar
          payload.stock = Math.max(1, Number(addQty) || 1);
          await api.post(`/products`, payload);
          toast.success(
            `"${payload.name}" ${productBranchLabel(payload)} filialiga qo'shildi`,
          );
        } else {
          // Maydonlar ozgargan — yangi variant sifatida qoshiladi.
          // parent_barcode = eski barkod => QR skanerlanganda ikkalasi ham chiqadi
          payload.parent_barcode = scanOrigin.barcode || "";
          if (payload.barcode === scanOrigin.barcode) payload.barcode = "";
          await api.post(`/products`, payload);
          toast.success(
            "Yangi variant qoshildi (QR kod orqali ikkalasi korinadi)",
          );
        }
      } else if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Yangilandi");
      } else {
        await api.post(`/products`, payload);
        toast.success("Mahsulot qo'shildi");
      }
      setOpen(false);
      setScanOrigin(null);
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const openStockDialog = (mode) => {
    setStockMode(mode);
    setStockBranch(user?.branch_id || "");
    setStockFile(null);
    setStockPreview(null);
    setStockError("");
    setOpenStock(true);
  };

  const stockFormData = (apply) => {
    const fd = new FormData();
    fd.append("file", stockFile);
    fd.append("branch_id", stockBranch);
    fd.append("apply", apply ? "true" : "false");
    fd.append("mode", stockMode);
    return fd;
  };

  // Oldindan ko'rish — oyna ichida, natija kutiladi
  const previewStock = async () => {
    if (!stockBranch) return setStockError("Filialni tanlang");
    if (!stockFile) return setStockError("Excel faylni tanlang");
    setStockBusy(true);
    setStockError("");
    try {
      const { data } = await api.post(
        "/products/import-stock",
        stockFormData(false),
      );
      setStockPreview(data);
    } catch (e) {
      setStockError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setStockBusy(false);
    }
  };

  const updateJob = (id, patch) =>
    setStockJobs((jobs) =>
      jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    );

  const notifyDone = (title, body) => {
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        new Notification(title, { body });
      }
    } catch {
      /* brauzer bildirishnomasi ixtiyoriy */
    }
  };

  // Qo'llash — oyna yopiladi, yuklash fonda davom etadi
  const applyStock = () => {
    if (!stockBranch) return setStockError("Filialni tanlang");
    if (!stockFile) return setStockError("Excel faylni tanlang");
    const id = `job-${Date.now()}`;
    const branchName =
      branches.find((b) => b.id === stockBranch)?.name ||
      user?.branch_name ||
      "Filial";
    const job = {
      id,
      mode: stockMode,
      branchName,
      fileName: stockFile.name,
      status: "running",
      progress: 0,
    };
    const fd = stockFormData(true);
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      /* ignore */
    }
    setStockJobs((jobs) => [...jobs, job]);
    setOpenStock(false);

    api
      .post("/products/import-stock", fd, {
        onUploadProgress: (e) => {
          if (e.total)
            updateJob(id, {
              progress: Math.round((e.loaded / e.total) * 100),
            });
        },
      })
      .then(({ data }) => {
        const parts =
          data.mode === "receive"
            ? [
                [data.increased, "ta tovar soni oshirildi"],
                [data.created, "ta yangi tovar qo'shildi"],
              ]
            : [
                [data.updated, "ta tahrirlandi"],
                [data.zeroed, "ta qoldig'i 0 bo'ldi"],
                [data.not_found, "ta filialda topilmadi"],
              ];
        const summary =
          parts
            .filter(([n]) => n > 0)
            .map(([n, label]) => `${n} ${label}`)
            .join(", ") || "o'zgarish yo'q";
        updateJob(id, { status: "done", progress: 100, summary });
        toast.success(`${data.branch_name}: tayyor — ${summary}`, {
          duration: 8000,
        });
        notifyDone(`${data.branch_name}: Excel yuklandi`, summary);
        loadRef.current?.();
      })
      .catch((e) => {
        const message = formatApiError(e.response?.data?.detail) || e.message;
        updateJob(id, { status: "error", error: message });
        toast.error(`${branchName}: yuklashda xato — ${message}`, {
          duration: 10000,
        });
        notifyDone(`${branchName}: yuklashda xato`, message);
      });
  };

  const hasRunningJobs = stockJobs.some((j) => j.status === "running");
  useEffect(() => {
    if (!hasRunningJobs) return undefined;
    // Yuklash tugamasdan sahifa yopilsa — ogohlantirish
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasRunningJobs]);

  const deleteProduct = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("O'chirildi");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const markAnswered = async (qid) => {
    try {
      await api.post(`/questions/${qid}/answered`);
      await load();
    } catch (e) {}
  };

  const submitNews = async (e) => {
    e.preventDefault();
    try {
      await api.post("/news", nForm);
      toast.success("Yangilik qo'shildi");
      setOpenNews(false);
      setNForm({ title: "", content: "", image_url: "" });
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const deleteNews = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await api.delete(`/news/${id}`);
      await load();
    } catch {}
  };

  // ---- QR / Barcode qidirish ----
  const searchByBarcode = useCallback(
    async (val) => {
      const trimmed = (val || qrCode).trim();
      if (!trimmed) return;
      setQrLoading(true);
      setQrSearched(false);
      setQrProducts([]);
      try {
        const { data } = await api.get(
          `/products/by-barcode/${encodeURIComponent(trimmed)}`,
        );
        // Backend endi array qaytaradi
        const arr = Array.isArray(data) ? data : [data];
        setQrProducts(arr);
        setQrCode(trimmed);
        const names = arr.map((p) => p.name).join(", ");
        toast.success(`Topildi (${arr.length} ta): ${names}`);
        setQrSearched(true);
      } catch {
        setQrProducts([]);
        setQrCode(trimmed);
        setQrSearched(true);
        // Mahsulot topilmasa — avtomatik qo'shish formasini ochamiz
        setTimeout(() => {
          closeQRDialog();
          setEditing(null);
          setScanOrigin(null);
          setBranchError("");
          setForm({
            ...empty,
            barcode: trimmed,
            branch_id: user?.branch_id || "",
          });
          setOpen(true);
        }, 900);
      } finally {
        setQrLoading(false);
      }
    },
    [qrCode, user?.branch_id],
  );

  // ---- Hardware scanner: global keydown listener ----
  // Skaner klaviatura kabi ishlaydi: belgilarni tez yozib Enter bosadi (50-80ms ichida)
  useEffect(() => {
    if (!openQR || qrMode !== "scanner") return;

    const onKey = (e) => {
      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        clearTimeout(scanTimer.current);
      }
      if (e.key === "Enter") {
        clearTimeout(scanTimer.current);
        const scanned = scanBuffer.current.trim();
        scanBuffer.current = "";
        if (scanned) {
          setQrCode(scanned);
          searchByBarcode(scanned);
        }
      }
    };

    setTimeout(() => hiddenInputRef.current?.focus(), 100);
    document.addEventListener("keydown", onKey);

    // ✅ Capture the ref value at effect run time
    const timer = scanTimer.current;

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer); // ← use captured variable, not scanTimer.current
    };
  }, [openQR, qrMode, searchByBarcode]);

  const openQRDialog = () => {
    setQrCode("");
    setQrProducts([]);
    setQrSearched(false);
    setQrMode("scanner");
    scanBuffer.current = "";
    setOpenQR(true);
  };

  const closeQRDialog = () => {
    setOpenQR(false);
    setQrCode("");
    setQrProducts([]);
    setQrSearched(false);
    scanBuffer.current = "";
    clearTimeout(scanTimer.current);
  };

  // proceedFromQR — qaysi mahsulot tanlangani argument sifatida keladi
  const proceedFromQR = (product) => {
    if (product) {
      closeQRDialog();
      startAddViaScanner(product);
    } else {
      closeQRDialog();
      setEditing(null);
      setScanOrigin(null);
      setBranchError("");
      setForm({
        ...empty,
        barcode: qrCode.trim(),
        branch_id: user?.branch_id || "",
      });
      setOpen(true);
    }
  };

  // ====== Always-on hardware scanner listener ======
  // Hech qanday tugma bosmasdan, admin paneliga kelganda skaner doim faol.
  // Barkod skaneri klaviatura kabi ishlaydi: tez bir qator belgilar yozadi, oxirida Enter bosadi.
  const globalScanBuf = useRef("");
  const globalScanTimer = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      // Modal yoki input ichida bo'lsak — skip
      if (openQR || open || openNews) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "Enter") {
        const code = globalScanBuf.current.trim();
        globalScanBuf.current = "";
        clearTimeout(globalScanTimer.current);
        if (code && code.length >= 4) {
          setQrCode(code);
          setOpenQR(true);
          setQrMode("scanner");
          searchByBarcode(code);
        }
      } else if (e.key.length === 1) {
        globalScanBuf.current += e.key;
        clearTimeout(globalScanTimer.current);
        // 200ms ichida Enter kelmasa, buffer tozalanadi (tasodifiy bosishlardan himoya)
        globalScanTimer.current = setTimeout(() => {
          globalScanBuf.current = "";
        }, 250);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openQR, open, openNews, searchByBarcode]);

  const unanswered = questions.filter((q) => !q.answered).length;

  const effectivePrice = (p) => {
    const price = Number(p.price || 0);
    const disc = Number(p.discount_percent || 0);
    return Math.round((price * (100 - disc)) / 100);
  };

  return (
    <div className="bg-ivory min-h-screen" data-testid="admin-dashboard">
      <header className="border-b border-line bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div>
            <div className="font-serif text-xl text-noir leading-none">
              Admin paneli
            </div>
            <div className="text-xs text-stone">Saytni boshqarish</div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={logout} data-testid="adm-logout">
              <LogOut className="w-4 h-4 mr-1" /> Chiqish
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-6">
        <Tabs defaultValue="products">
          <TabsList className="bg-cream">
            <TabsTrigger value="products" data-testid="a-tab-products">
              Mahsulotlar ({products.length})
            </TabsTrigger>
            <TabsTrigger value="pos" data-testid="a-tab-pos">
              Sotuv qo'shish
            </TabsTrigger>
            <TabsTrigger value="expiry" data-testid="a-tab-expiry">
              Yaroqlilik
            </TabsTrigger>
            <TabsTrigger value="deleted" data-testid="a-tab-deleted">
              O'chirilganlar ({deletedProducts.length})
            </TabsTrigger>
            <TabsTrigger value="news" data-testid="a-tab-news">
              Yangiliklar ({news.length})
            </TabsTrigger>
            <TabsTrigger value="questions" data-testid="a-tab-questions">
              Savollar{" "}
              {unanswered > 0 && (
                <span className="ml-2 text-xs bg-rose text-ivory rounded-full px-2 py-0.5">
                  {unanswered}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="a-tab-settings">
              Sozlamalar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <FollowUpRulesForm />
          </TabsContent>

          <TabsContent value="pos" className="mt-6">
            <SalesScreen user={user} onCompleted={load} />
          </TabsContent>

          <TabsContent value="expiry" className="mt-6">
            <ExpiryProductsPanel role={user?.role || "admin"} />
          </TabsContent>

          <TabsContent value="products" className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[220px] relative">
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setProductPage(1);
                  }}
                  placeholder="Mahsulotni qidirish (nom, barkod, kategoriya)..."
                  className="pl-3"
                  data-testid="product-search-input"
                />
              </div>
              <div className="text-xs text-stone bg-cream rounded-full px-3 py-1.5 flex items-center gap-1">
                <ScanLine className="w-3.5 h-3.5 text-rose" /> Skaner doim faol
                — barkodni ko'rsating
              </div>
              <Button
                onClick={() => openStockDialog("stock")}
                variant="outline"
                className="rounded-full"
                data-testid="stock-import-btn"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel qoldiq
              </Button>
              <Button
                onClick={() => openStockDialog("receive")}
                variant="outline"
                className="rounded-full"
                data-testid="receive-import-btn"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel orqali
                qo'shish
              </Button>
              <Button
                onClick={startCreate}
                className="bg-rose text-ivory hover:bg-noir rounded-full"
                data-testid="add-product-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Mahsulot qo'shish
              </Button>
              <Button
                onClick={openQRDialog}
                className="bg-noir text-ivory hover:bg-rose rounded-full"
                data-testid="qr-code-btn"
              >
                <QrCode className="w-4 h-4 mr-1" /> QR / Barkod
              </Button>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
              <div
                className={`grid gap-3 items-end ${canManageAllBranches ? "md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]" : "md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"}`}
              >
                {canManageAllBranches && (
                  <div>
                    <Label className="text-xs text-stone mb-1 block">
                      Filial
                    </Label>
                    <select
                      value={branchFilter}
                      onChange={(e) => {
                        setBranchFilter(e.target.value);
                        setProductPage(1);
                      }}
                      className="w-full border border-line rounded-xl px-3 py-2 bg-ivory text-sm focus:outline-none focus:ring-2 focus:ring-rose/20"
                      data-testid="product-branch-filter"
                    >
                      <option value="all">Barcha filiallar</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                      <option value="none">Filialsiz</option>
                    </select>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-stone mb-1 block">
                    Qoldiq holati
                  </Label>
                  <select
                    value={stockFilter}
                    onChange={(e) => {
                      setStockFilter(e.target.value);
                      setProductPage(1);
                    }}
                    className="w-full border border-line rounded-xl px-3 py-2 bg-ivory text-sm focus:outline-none focus:ring-2 focus:ring-rose/20"
                  >
                    <option value="all">Hammasi</option>
                    <option value="in_stock">Mavjud</option>
                    <option value="out_of_stock">Tugagan</option>
                    <option value="low_stock">Kam qolgan</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-stone mb-1 block">
                    Narx min
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={priceMin}
                    onChange={(e) => {
                      setPriceMin(e.target.value);
                      setProductPage(1);
                    }}
                    placeholder="Min"
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone mb-1 block">
                    Narx max
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={priceMax}
                    onChange={(e) => {
                      setPriceMax(e.target.value);
                      setProductPage(1);
                    }}
                    placeholder="Max"
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone mb-1 block">
                    Sahifa
                  </Label>
                  <select
                    value={productPageSize}
                    onChange={(e) => {
                      setProductPageSize(Number(e.target.value));
                      setProductPage(1);
                    }}
                    className="w-full border border-line rounded-xl px-3 py-2 bg-ivory text-sm focus:outline-none focus:ring-2 focus:ring-rose/20"
                  >
                    <option value={40}>40 / sahifa</option>
                    <option value={50}>50 / sahifa</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setBranchFilter("all");
                    setStockFilter("all");
                    setPriceMin("");
                    setPriceMax("");
                    setProductPage(1);
                  }}
                >
                  Tozalash
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm text-stone">
                <div>
                  Jami:{" "}
                  <span className="font-semibold text-noir">
                    {totalProducts}
                  </span>{" "}
                  mahsulot
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPage <= 1}
                    className="rounded-full"
                  >
                    Oldingi
                  </Button>
                  <span className="min-w-[72px] text-center font-medium text-noir">
                    {productPage}/{totalProductPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPage((p) => p + 1)}
                    disabled={productPage >= totalProductPages}
                    className="rounded-full"
                  >
                    Keyingi
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const finalP = effectivePrice(p);
                const expiry = expiryStatus(p.expiry_date);
                const hasDisc = Number(p.discount_percent || 0) > 0;
                const profit = finalP - Number(p.cost_price || 0);
                const isVariant = !!p.parent_barcode;
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition ${isVariant ? "border-amber-300 ring-1 ring-amber-200" : "border-line"}`}
                    data-testid={`a-product-${p.id}`}
                  >
                    {isVariant && (
                      <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-amber-700">
                          🔄 O'zgartirilgan variant
                        </span>
                        <span className="text-xs text-amber-500 font-mono truncate">
                          ← {p.parent_barcode}
                        </span>
                      </div>
                    )}
                    <div className="relative aspect-[5/4] bg-cream">
                      {hasDisc && (
                        <div className="discount-badge">
                          −{p.discount_percent}%
                        </div>
                      )}
                      <img
                        src={safeImageUrl(p.image_url)}
                        alt={p.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = safeImageUrl(null);
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-[10px] uppercase tracking-widest text-rose">
                        {p.category}
                      </div>
                      <h3 className="font-serif text-lg text-noir line-clamp-1">
                        {p.name}
                      </h3>
                      <div className="text-xs space-y-1 bg-cream rounded-lg p-2">
                        {canManageAllBranches && (
                          <div className="flex justify-between gap-2">
                            <span className="text-stone">Filial:</span>
                            <span className="font-mono text-noir truncate max-w-[140px]">
                              {productBranchLabel(p)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-stone">Xarid:</span>
                          <span className="font-mono text-noir">
                            {Number(p.cost_price || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone">Sotuv (asl):</span>
                          <span className="font-mono text-noir">
                            {Number(p.price || 0).toLocaleString()}
                          </span>
                        </div>
                        {hasDisc && (
                          <div className="flex justify-between">
                            <span className="text-stone">
                              Chegirmadan keyin:
                            </span>
                            <span className="font-mono text-rose font-semibold">
                              {finalP.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-line/60 pt-1 mt-1">
                          <span className="text-stone">Foyda/dona:</span>
                          <span
                            className={`font-mono font-semibold ${profit >= 0 ? "text-green-700" : "text-rose"}`}
                          >
                            {profit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {p.stock} dona
                        </span>
                        {p.barcode && (
                          <span
                            className="font-mono truncate max-w-[100px]"
                            title={p.barcode}
                          >
                            {p.barcode}
                          </span>
                        )}
                      </div>
                      {p.expiry_date && (
                        <div
                          className={`text-xs flex items-center justify-between gap-2 rounded-md px-2 py-1 ${expiry.className}`}
                        >
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {p.expiry_date}
                          </span>
                          <span>{expiry.label}</span>
                        </div>
                      )}
                      {canEditProduct(p) ? (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(p)}
                            className="rounded-full flex-1"
                            data-testid={`edit-product-${p.id}`}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Tahrirlash
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteProduct(p.id)}
                            className="text-rose hover:bg-rose/10 rounded-full"
                            data-testid={`delete-product-${p.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-stone bg-cream rounded-lg px-2 py-1.5 text-center">
                          Umumiy mahsulot — faqat ko'rish
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="deleted" className="mt-6 space-y-4">
            <div className="text-sm text-stone bg-cream rounded-xl p-3">
              O'chirilgan mahsulotlar shu yerda saqlanadi. "Qaytarish" tugmasi
              orqali ularni qaytarib qo'shishingiz mumkin.
            </div>
            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              data-testid="deleted-products-grid"
            >
              {deletedProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-line p-4 flex gap-3 opacity-90"
                >
                  <img
                    src={safeImageUrl(p.image_url)}
                    alt={p.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = safeImageUrl(null);
                    }}
                    className="w-20 h-20 object-cover rounded-md bg-cream"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-base text-noir line-clamp-1">
                      {p.name}
                    </div>
                    <div className="text-xs text-stone">{p.category}</div>
                    <div className="text-xs text-stone mt-1">
                      {Number(p.price || 0).toLocaleString()} so'm · Stock:{" "}
                      {p.stock}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => restoreProduct(p.id)}
                      className="mt-2 bg-noir text-ivory hover:bg-rose rounded-full"
                      data-testid={`restore-${p.id}`}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Qaytarish
                    </Button>
                  </div>
                </div>
              ))}
              {deletedProducts.length === 0 && (
                <div className="col-span-full text-stone bg-cream rounded-xl p-8 text-center">
                  O'chirilgan mahsulot yo'q
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="news" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setOpenNews(true)}
                className="bg-noir text-ivory hover:bg-rose rounded-full"
                data-testid="add-news-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Yangilik qo'shish
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {news.map((n) => (
                <div
                  key={n.id}
                  className="bg-white rounded-2xl border border-line p-4 flex gap-4"
                >
                  {n.image_url && (
                    <img
                      src={safeImageUrl(n.image_url)}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = safeImageUrl(null);
                      }}
                      className="w-24 h-24 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-serif text-lg text-noir">{n.title}</h3>
                    <p className="text-sm text-stone line-clamp-2">
                      {n.content}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteNews(n.id)}
                    className="text-rose"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="mt-6">
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border p-5 ${q.answered ? "border-line opacity-70" : "border-rose/40"}`}
                  data-testid={`question-${q.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-serif text-lg text-noir">
                        {q.name}
                      </div>
                      <div className="text-xs text-stone">
                        {q.email} · {new Date(q.created_at).toLocaleString()}
                      </div>
                      <p className="text-sm text-noir mt-3 leading-relaxed">
                        {q.message}
                      </p>
                    </div>
                    {!q.answered && (
                      <Button
                        size="sm"
                        onClick={() => markAnswered(q.id)}
                        className="bg-noir text-ivory rounded-full"
                        data-testid={`answer-${q.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" /> Javob berildi
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-stone bg-cream rounded-xl p-6 text-center">
                  Hali savollar yo'q
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {stockJobs.length > 0 && (
        <div
          className="fixed bottom-4 left-4 z-[60] w-80 max-w-[calc(100vw-2rem)] space-y-2"
          data-testid="stock-jobs"
        >
          {stockJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-line rounded-2xl shadow-lg p-3 text-sm"
              data-testid={`stock-job-${job.status}`}
            >
              <div className="flex items-start gap-2">
                {job.status === "running" && (
                  <Loader2 className="w-4 h-4 mt-0.5 text-rose animate-spin flex-shrink-0" />
                )}
                {job.status === "done" && (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                )}
                {job.status === "error" && (
                  <XCircle className="w-4 h-4 mt-0.5 text-rose flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-noir truncate">
                    {job.branchName} —{" "}
                    {job.mode === "receive" ? "tovar qo'shish" : "astatka"}
                  </div>
                  <div className="text-xs text-stone truncate">
                    {job.fileName}
                  </div>
                  {job.status === "running" && (
                    <>
                      <div className="mt-2 h-1.5 rounded-full bg-cream overflow-hidden">
                        <div
                          className="h-full bg-rose transition-all"
                          style={{ width: `${Math.max(job.progress, 5)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-stone mt-1">
                        {job.progress < 100
                          ? `Fayl yuklanmoqda... ${job.progress}%`
                          : "Bazaga yozilmoqda..."}
                      </div>
                    </>
                  )}
                  {job.status === "done" && (
                    <div className="text-xs text-green-700 mt-1">
                      Tayyor: {job.summary}
                    </div>
                  )}
                  {job.status === "error" && (
                    <div className="text-xs text-rose mt-1">{job.error}</div>
                  )}
                </div>
                {job.status !== "running" && (
                  <button
                    type="button"
                    onClick={() =>
                      setStockJobs((jobs) =>
                        jobs.filter((j) => j.id !== job.id),
                      )
                    }
                    className="text-stone hover:text-noir"
                    aria-label="Yopish"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ QR / Barcode Dialog ============ */}
      <Dialog open={openStock} onOpenChange={setOpenStock}>
        <DialogContent className="bg-ivory border-line rounded-2xl max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-rose" />
              {stockMode === "receive"
                ? "Excel orqali tovar qo'shish"
                : "Qoldiqni (astatka) yangilash"}
            </DialogTitle>
            <DialogDescription className="text-stone text-sm">
              {stockMode === "receive"
                ? "Kelgan tovarlar faylini yuklang: filialda bor tovarlarning soni oshiriladi, yo'q tovarlar yangi qo'shiladi."
                : "Astatka faylini yuklang: filialdagi mavjud tovarlarning qoldig'i, narxi va muddati fayl bo'yicha tahrirlanadi. Yangi tovar qo'shilmaydi, faylda yo'q tovarlar qoldig'i 0 bo'ladi."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-testid="stock-import-form">
            <div
              className={`rounded-xl px-4 py-3 border ${stockBranch ? "bg-noir text-ivory border-noir" : "bg-amber-50 text-amber-800 border-amber-200"}`}
              data-testid="stock-import-target"
            >
              <div className="text-[11px] uppercase tracking-widest opacity-80">
                {stockMode === "receive"
                  ? "Tovar qo'shilayotgan filial"
                  : "Astatka qilinayotgan filial"}
              </div>
              <div className="font-serif text-xl flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {stockBranch
                  ? branches.find((b) => b.id === stockBranch)?.name ||
                    user?.branch_name ||
                    "Filial"
                  : "Filial tanlanmagan"}
              </div>
            </div>
            {canManageAllBranches && (
              <div className="space-y-1.5">
                <Label className="text-xs text-stone">Filialni tanlang</Label>
                <select
                  value={stockBranch}
                  onChange={(e) => {
                    setStockBranch(e.target.value);
                    setStockPreview(null);
                  }}
                  disabled={stockBusy}
                  className="w-full h-11 border border-line rounded-xl px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose/20"
                  data-testid="stock-import-branch"
                >
                  <option value="">Filialni tanlang</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-stone">Excel fayl (.xlsx)</Label>
              <Input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  setStockFile(e.target.files?.[0] || null);
                  setStockPreview(null);
                  setStockError("");
                }}
                disabled={stockBusy}
                data-testid="stock-import-file"
              />
            </div>
            {stockError && (
              <div className="text-sm text-rose bg-rose/10 rounded-xl px-3 py-2">
                {stockError}
              </div>
            )}
            {stockPreview && !stockPreview.applied && (
              <div
                className="rounded-xl border border-line bg-white p-3 text-sm space-y-2"
                data-testid="stock-import-preview"
              >
                <div className="font-medium text-noir">
                  Faylda {stockPreview.rows} ta tovar, jami{" "}
                  {stockPreview.total_stock} dona
                </div>
                {stockPreview.already_imported_at && (
                  <div className="text-xs bg-amber-50 text-amber-800 rounded-lg px-2 py-1.5">
                    Diqqat: bu fayl ushbu filialga{" "}
                    {new Date(
                      stockPreview.already_imported_at,
                    ).toLocaleString()}{" "}
                    da allaqachon yuklangan.
                    {stockPreview.mode === "receive"
                      ? " Qayta qo'llasangiz, tovarlar soni yana oshadi."
                      : ""}
                  </div>
                )}
                {stockPreview.mode === "receive" ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-cream rounded-lg px-2 py-1.5">
                      Soni oshiriladi: <b>{stockPreview.increased}</b>
                    </div>
                    <div className="bg-cream rounded-lg px-2 py-1.5">
                      Yangi qo'shiladi: <b>{stockPreview.created}</b>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-cream rounded-lg px-2 py-1.5">
                      Tahrirlanadi: <b>{stockPreview.updated}</b>
                    </div>
                    <div className="bg-cream rounded-lg px-2 py-1.5">
                      O'zgarmaydi: <b>{stockPreview.unchanged}</b>
                    </div>
                    <div
                      className={`rounded-lg px-2 py-1.5 ${stockPreview.zeroed ? "bg-amber-50 text-amber-800" : "bg-cream"}`}
                    >
                      Qoldig'i 0 bo'ladi: <b>{stockPreview.zeroed}</b>
                    </div>
                    <div
                      className={`rounded-lg px-2 py-1.5 ${stockPreview.not_found ? "bg-amber-50 text-amber-800" : "bg-cream"}`}
                    >
                      Filialda topilmadi: <b>{stockPreview.not_found}</b>
                    </div>
                  </div>
                )}
                {stockPreview.mode === "stock" && stockPreview.zeroed > 0 && (
                  <div className="text-xs text-amber-800">
                    Faylda yo'q (0 bo'ladi):{" "}
                    {stockPreview.zeroed_sample.join(", ")}
                    {stockPreview.zeroed > stockPreview.zeroed_sample.length
                      ? " ..."
                      : ""}
                  </div>
                )}
                {stockPreview.mode === "stock" &&
                  stockPreview.not_found > 0 && (
                    <div className="text-xs text-amber-800">
                      Filialda yo'q, o'tkazib yuboriladi (ularni "Excel orqali
                      qo'shish" bilan kiriting):{" "}
                      {stockPreview.not_found_sample.join(", ")}
                      {stockPreview.not_found >
                      stockPreview.not_found_sample.length
                        ? " ..."
                        : ""}
                    </div>
                  )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full flex-1"
                onClick={previewStock}
                disabled={stockBusy || !stockFile || !stockBranch}
                data-testid="stock-import-preview-btn"
              >
                {stockBusy && !stockPreview
                  ? "Tekshirilmoqda..."
                  : "Tekshirish"}
              </Button>
              <Button
                type="button"
                className="bg-noir text-ivory hover:bg-rose rounded-full flex-1"
                onClick={applyStock}
                disabled={stockBusy || !stockFile || !stockBranch}
                data-testid="stock-import-apply-btn"
              >
                {`${branches.find((b) => b.id === stockBranch)?.name || "Filial"}ga qo'llash`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openQR}
        onOpenChange={(v) => {
          if (!v) closeQRDialog();
        }}
      >
        <DialogContent className="bg-ivory border-line rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir flex items-center gap-2">
              <QrCode className="w-6 h-6 text-rose" /> Barkod / QR skaner
            </DialogTitle>
            <DialogDescription className="text-stone text-sm">
              Skanerdan o'tkazing yoki qo'lda kiriting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode tanlash */}
            <div className="flex gap-2 bg-cream rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setQrMode("scanner");
                  scanBuffer.current = "";
                  setTimeout(() => hiddenInputRef.current?.focus(), 50);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${qrMode === "scanner" ? "bg-noir text-ivory shadow" : "text-stone hover:text-noir"}`}
              >
                <ScanLine className="w-4 h-4" /> Skaner
              </button>
              <button
                type="button"
                onClick={() => {
                  setQrMode("manual");
                  scanBuffer.current = "";
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${qrMode === "manual" ? "bg-noir text-ivory shadow" : "text-stone hover:text-noir"}`}
              >
                <Keyboard className="w-4 h-4" /> Qo'lda kiritish
              </button>
            </div>

            {/* SKANER REJIMI */}
            {qrMode === "scanner" && (
              <div className="space-y-3">
                {/* Yashirin input — focus ushlab turadi, boshqa narsaga focus ketmasin */}
                <input
                  ref={hiddenInputRef}
                  className="opacity-0 absolute w-0 h-0"
                  readOnly
                  tabIndex={0}
                />
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                    qrLoading
                      ? "border-rose/60 bg-rose/5 animate-pulse"
                      : qrSearched
                        ? "border-green-400/60 bg-green-50"
                        : "border-line hover:border-rose/40"
                  }`}
                  onClick={() => hiddenInputRef.current?.focus()}
                >
                  {qrLoading ? (
                    <>
                      <div className="w-12 h-12 border-4 border-rose border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-stone">
                        Qidirilmoqda...
                      </span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-14 h-14 text-stone/30" />
                      <span className="text-sm text-stone text-center">
                        Barkodni skanerdan o'tkazing
                      </span>
                      <span className="text-xs text-stone/60">
                        Skaner avtomatik taniydi — hech narsa bosmang
                      </span>
                      {qrCode && (
                        <div className="bg-noir/5 rounded-lg px-3 py-1.5 font-mono text-sm text-noir border border-line">
                          {qrCode}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* QOLDA KIRITISH REJIMI */}
            {qrMode === "manual" && (
              <div className="flex gap-2">
                <Input
                  value={qrCode}
                  onChange={(e) => {
                    setQrCode(e.target.value);
                    setQrSearched(false);
                    setQrProducts([]);
                  }}
                  placeholder="Barkod raqamini kiriting..."
                  className="flex-1 font-mono"
                  onKeyDown={(e) =>
                    e.key === "Enter" && searchByBarcode(qrCode)
                  }
                  autoFocus
                />
                <Button
                  onClick={() => searchByBarcode(qrCode)}
                  disabled={qrLoading || !qrCode.trim()}
                  className="bg-noir text-ivory hover:bg-rose rounded-full"
                >
                  {qrLoading ? (
                    <div className="w-4 h-4 border-2 border-ivory border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Qidirish"
                  )}
                </Button>
              </div>
            )}

            {/* NATIJA — bir QR kodda bir nechta mahsulot chiqishi mumkin */}
            {qrSearched && (
              <div
                className={`rounded-xl p-4 border ${qrProducts.length > 0 ? "border-green-200 bg-green-50" : "border-rose/30 bg-rose/5"}`}
              >
                {qrProducts.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                      <Check className="w-4 h-4" /> {qrProducts.length} ta
                      mahsulot topildi
                    </div>
                    {qrProducts.map((qp, idx) => (
                      <div
                        key={qp.id}
                        className={`rounded-xl border p-3 bg-white space-y-2 ${qp.parent_barcode ? "border-amber-300" : "border-line"}`}
                      >
                        {qp.parent_barcode && (
                          <div className="text-xs font-semibold text-amber-700 bg-amber-50 rounded px-2 py-0.5 inline-block mb-1">
                            🔄 O'zgartirilgan variant
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          <img
                            src={safeImageUrl(qp.image_url)}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = safeImageUrl(null);
                            }}
                            className="w-16 h-16 rounded-xl object-cover bg-cream border border-line flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="font-serif text-base text-noir leading-tight">
                              {qp.name}
                            </div>
                            <div className="text-xs text-stone">
                              {qp.category}
                            </div>
                            <div className="text-xs text-stone">
                              Narx:{" "}
                              <span className="font-semibold text-noir">
                                {Number(qp.price || 0).toLocaleString()} so'm
                              </span>
                            </div>
                            {Number(qp.discount_percent || 0) > 0 && (
                              <div className="text-xs text-rose">
                                Chegirma: {qp.discount_percent}%
                              </div>
                            )}
                            <div className="text-xs text-stone">
                              Ombor:{" "}
                              <span
                                className={`font-semibold ${qp.stock <= 0 ? "text-rose" : "text-noir"}`}
                              >
                                {qp.stock} dona
                              </span>
                            </div>
                            {qp.barcode && (
                              <div className="text-xs font-mono text-stone">
                                {qp.barcode}
                              </div>
                            )}
                            {qp.expiry_date && (
                              <div className="text-xs text-stone">
                                Muddat: {qp.expiry_date}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => proceedFromQR(qp)}
                          className="w-full bg-noir text-ivory hover:bg-rose rounded-full text-sm"
                          data-testid={`qr-add-btn-${idx}`}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Mahsulot qo'shish /
                          zaxira oshirish
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-rose font-medium text-sm flex items-center gap-2">
                      <X className="w-4 h-4" /> Bu kodda mahsulot yo'q
                    </div>
                    <p className="text-xs text-stone font-mono bg-white/60 rounded px-2 py-1 inline-block">
                      {qrCode}
                    </p>
                    <p className="text-xs text-stone">
                      Avtomatik yangi mahsulot qo'shish oynasi ochilmoqda...
                    </p>
                  </div>
                )}
              </div>
            )}

            {!qrSearched && !qrLoading && !qrCode && (
              <div className="text-center py-4 text-stone text-xs opacity-60">
                {qrMode === "scanner"
                  ? "Skaner tayyor — barkodni ko'rsating"
                  : "Barkod raqamini yozing va Enter bosing"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Product Form Dialog ============ */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setScanOrigin(null);
        }}
      >
        <DialogContent className="bg-ivory border-line rounded-2xl max-w-2xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir">
              {scanOrigin
                ? "Mahsulot qo'shish (skaner)"
                : editing
                  ? "Mahsulotni tahrirlash"
                  : "Yangi mahsulot"}
            </DialogTitle>
            <DialogDescription className="text-stone text-sm">
              {scanOrigin
                ? "Eski mahsulot ma'lumotlari to'ldirib qo'yilgan. Hech narsa o'zgartirmasangiz — mavjud zaxiraga miqdor qo'shiladi. Birorta maydonni o'zgartirsangiz — yangi alohida card sifatida saqlanadi."
                : "Xarid narxi faqat admin va direktorga ko'rinadi."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={submitProduct}
            className="space-y-5"
            data-testid="product-form"
          >
            {scanOrigin && (
              <div
                className="bg-noir/5 border border-noir/20 rounded-xl p-3 flex items-center gap-3"
                data-testid="scanner-add-banner"
              >
                <Package className="w-5 h-5 text-noir" />
                <div className="flex-1 text-xs">
                  <div className="text-stone uppercase tracking-widest">
                    Hozirgi zaxira
                  </div>
                  <div className="font-serif text-base text-noir">
                    {scanOrigin.name} — {scanOrigin.stock} dona
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">
                    Qo'shiladigan
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-20 h-9"
                    data-testid="scanner-add-qty"
                  />
                </div>
              </div>
            )}
            {/* ---- Asosiy ---- */}
            <FormSection
              title="Asosiy ma'lumotlar"
              icon={<Package className="w-3.5 h-3.5" />}
            >
              <Field label="Mahsulot nomi" full>
                <Input
                  data-testid="p-name"
                  className={FIELD_INPUT}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Tavsif" full>
                <Textarea
                  data-testid="p-desc"
                  rows={3}
                  className="bg-white rounded-xl resize-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Kategoriya">
                <Input
                  data-testid="p-cat"
                  className={FIELD_INPUT}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
              <Field label="Ombordagi qoldiq (dona)">
                <Input
                  data-testid="p-stock"
                  type="number"
                  min={0}
                  className={FIELD_INPUT}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </Field>
              <Field
                label="Filial"
                hint={
                  canManageAllBranches
                    ? undefined
                    : "Mahsulot sizning filialingizga biriktiriladi"
                }
              >
                <select
                  data-testid="p-branch"
                  value={form.branch_id}
                  onChange={(e) => {
                    setForm({ ...form, branch_id: e.target.value });
                    setBranchError("");
                  }}
                  disabled={!canManageAllBranches}
                  className={`${FIELD_INPUT} w-full border text-sm focus:outline-none focus:ring-2 focus:ring-rose/20 disabled:opacity-70 ${branchError ? "border-rose" : "border-line"}`}
                >
                  <option value="">
                    {branches.length ? "Filialni tanlang" : "Filiallar yo'q"}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.active === false ? " (nofaol)" : ""}
                    </option>
                  ))}
                </select>
                {branchError && (
                  <div
                    className="text-xs text-rose"
                    data-testid="p-branch-error"
                  >
                    {branchError}
                  </div>
                )}
              </Field>
            </FormSection>

            {/* ---- Narxlar ---- */}
            <FormSection
              title="Narxlar va chegirma"
              icon={<DollarSign className="w-3.5 h-3.5" />}
              tinted
            >
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                  label={
                    <>
                      Xarid narxi (so'm){" "}
                      <span className="text-rose normal-case tracking-normal">
                        · ichki
                      </span>
                    </>
                  }
                >
                  <Input
                    data-testid="p-cost"
                    type="number"
                    min={0}
                    step="any"
                    className={FIELD_INPUT}
                    value={form.cost_price}
                    onChange={(e) =>
                      setForm({ ...form, cost_price: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Sotuv narxi (so'm)">
                  <Input
                    data-testid="p-price"
                    type="number"
                    min={0}
                    step="any"
                    className={FIELD_INPUT}
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Chegirma (%)">
                  <div className="relative">
                    <Input
                      data-testid="p-discount"
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      className={`${FIELD_INPUT} pr-9`}
                      value={form.discount_percent}
                      onChange={(e) =>
                        setForm({ ...form, discount_percent: e.target.value })
                      }
                    />
                    <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone" />
                  </div>
                </Field>
              </div>
              <div className="md:col-span-2">
                <PricePreview
                  cost={form.cost_price}
                  price={form.price}
                  discount={form.discount_percent}
                />
              </div>
            </FormSection>

            {/* ---- Identifikatsiya ---- */}
            <FormSection
              title="Kod, qadoq va muddat"
              icon={<ScanLine className="w-3.5 h-3.5" />}
            >
              <Field label="Shtrix-kod / QR">
                <Input
                  data-testid="p-barcode"
                  className={FIELD_INPUT}
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value })
                  }
                  placeholder="Ixtiyoriy"
                />
              </Field>
              <Field label="SKU (artikul)">
                <Input
                  data-testid="p-sku"
                  className={FIELD_INPUT}
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="Ixtiyoriy"
                />
              </Field>
              <Field
                label="Qadoqda dona / tabletka"
                hint="0 = nomdan (№120) avtomatik"
              >
                <Input
                  data-testid="p-upp"
                  type="number"
                  min={0}
                  className={FIELD_INPUT}
                  value={form.units_per_package}
                  onChange={(e) =>
                    setForm({ ...form, units_per_package: e.target.value })
                  }
                />
              </Field>
              <Field label="Yaroqlilik muddati">
                <DatePicker
                  testId="p-expiry"
                  className={FIELD_INPUT}
                  value={form.expiry_date}
                  onChange={(val) => setForm({ ...form, expiry_date: val })}
                  placeholder="Yaroqlilik muddati"
                />
              </Field>
              {user?.role === "director" && (
                <label className="md:col-span-2 flex items-center gap-2 text-sm text-noir rounded-lg border border-line bg-cream px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(form.all_branches)}
                    onChange={(e) =>
                      setForm({ ...form, all_branches: e.target.checked })
                    }
                  />
                  Barcha filiallarga ko'rsatish
                </label>
              )}
            </FormSection>

            {/* ---- Rasm ---- */}
            <FormSection
              title="Rasm"
              icon={<ImageIcon className="w-3.5 h-3.5" />}
            >
              <div className="md:col-span-2">
                <ImageUploadField
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                />
              </div>
            </FormSection>

            <Button
              type="submit"
              className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-12 text-base mt-2"
              data-testid="p-submit"
            >
              {scanOrigin
                ? isFormChangedFromSnapshot()
                  ? form.branch_id !== (scanOrigin.branch_id || "")
                    ? `Tanlangan filialga ${Math.max(1, Number(addQty) || 1)} ta qo'shish`
                    : "Yangi card sifatida qo'shish"
                  : `Mahsulotga ${Math.max(1, Number(addQty) || 1)} ta qo'shish`
                : editing
                  ? "Yangilash"
                  : "Qo'shish"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ News Dialog ============ */}
      <Dialog open={openNews} onOpenChange={setOpenNews}>
        <DialogContent className="bg-ivory border-line rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir">
              Yangi yangilik
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={submitNews}
            className="space-y-3"
            data-testid="news-form"
          >
            <div>
              <Label>Sarlavha</Label>
              <Input
                data-testid="n-title"
                value={nForm.title}
                onChange={(e) => setNForm({ ...nForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Matn</Label>
              <Textarea
                data-testid="n-content"
                rows={4}
                value={nForm.content}
                onChange={(e) =>
                  setNForm({ ...nForm, content: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Rasm (fayl)
              </Label>
              <ImageUploadField
                value={nForm.image_url}
                onChange={(url) => setNForm({ ...nForm, image_url: url })}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-noir text-ivory hover:bg-rose rounded-full h-11"
              data-testid="n-submit"
            >
              Saqlash
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============ Image Upload Field ============ */
/* ---- Forma yordamchilari: bir xil label/input o'lchami va bo'shliqlar ---- */
const FIELD_INPUT = "h-11 bg-white rounded-xl px-3.5";

function Field({ label, hint, full = false, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone">
        {label}
      </Label>
      {children}
      {hint && <div className="text-[11px] text-stone/80">{hint}</div>}
    </div>
  );
}

function FormSection({ title, icon, tinted = false, children }) {
  return (
    <section
      className={`rounded-2xl border p-4 md:p-5 ${tinted ? "bg-cream border-line" : "bg-white border-line"}`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-rose font-semibold flex items-center gap-1.5 mb-4">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function ImageUploadField({ value, onChange }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(value || "");
  const [manualUrl, setManualUrl] = useState(value || "");
  const [mode, setMode] = useState("url");

  useEffect(() => {
    setPreview(value || "");
    setManualUrl(value || "");
  }, [value]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (v) => {
    setManualUrl(v);
    setPreview(v);
    onChange(v);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3.5 py-1.5 rounded-full border transition-all ${mode === "file" ? "bg-noir text-ivory border-noir" : "border-line text-stone hover:border-noir"}`}
        >
          <Upload className="w-3 h-3 inline mr-1" /> Fayldan tanlash
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`px-3.5 py-1.5 rounded-full border transition-all ${mode === "url" ? "bg-noir text-ivory border-noir" : "border-line text-stone hover:border-noir"}`}
        >
          URL kiritish
        </button>
      </div>

      {mode === "file" ? (
        <div>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleFileChange}
            className="hidden"
            data-testid="p-img-file"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-line rounded-xl p-6 flex flex-col items-center gap-2 hover:border-rose transition-colors text-stone hover:text-rose"
          >
            <Upload className="w-8 h-8" />
            <span className="text-sm">Kompyuter fayllaridan tanlang</span>
            <span className="text-xs opacity-60">JPG, PNG, WEBP</span>
          </button>
        </div>
      ) : (
        <Input
          data-testid="p-img"
          className={FIELD_INPUT}
          value={manualUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://..."
        />
      )}

      {preview && (
        <div className="relative rounded-xl overflow-hidden border border-line bg-cream aspect-video">
          <img
            src={preview}
            alt="Rasm ko'rinishi"
            className="w-full h-full object-contain"
          />
          <button
            type="button"
            onClick={() => {
              setPreview("");
              onChange("");
              setManualUrl("");
            }}
            className="absolute top-2 right-2 bg-rose text-ivory rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-noir"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============ Price Preview ============ */
function PricePreview({ cost, price, discount }) {
  const c = Number(cost || 0);
  const p = Number(price || 0);
  const d = Number(discount || 0);
  const finalP = Math.round((p * (100 - d)) / 100);
  const profit = finalP - c;
  const discountAmount = p - finalP;
  if (!p) return null;
  return (
    <div className="bg-white rounded-lg border border-line p-3 text-xs space-y-1.5">
      <div className="flex justify-between">
        <span className="text-stone">Mijoz to'laydi:</span>
        <span className="font-semibold text-noir">
          {finalP.toLocaleString()} so'm
        </span>
      </div>
      {d > 0 && (
        <div className="flex justify-between">
          <span className="text-stone">Chegirma summasi:</span>
          <span className="font-semibold text-rose">
            −{discountAmount.toLocaleString()} so'm
          </span>
        </div>
      )}
      <div className="flex justify-between border-t border-line/60 pt-1.5">
        <span className="text-stone flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Sof foyda (1 dona):
        </span>
        <span
          className={`font-bold ${profit >= 0 ? "text-green-700" : "text-rose"}`}
        >
          {profit.toLocaleString()} so'm
        </span>
      </div>
      {profit < 0 && (
        <div className="flex items-center gap-1 text-rose">
          <AlertTriangle className="w-3 h-3" /> Diqqat: zarar bilan sotyapsiz!
        </div>
      )}
    </div>
  );
}
