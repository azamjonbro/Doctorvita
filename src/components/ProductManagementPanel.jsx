import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError, safeImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit3, Package, Plus, Trash2 } from "lucide-react";

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
  parent_barcode: "",
  branch_id: "",
  all_branches: false,
};

export default function ProductManagementPanel() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Umumiy ("barcha filiallar") mahsulotlar xodim uchun faqat o'qish rejimida
  const canEdit = (product) =>
    !product.all_branches && product.branch_id === user?.branch_id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products", {
        params: { search, limit: 50 },
      });
      const items = Array.isArray(data) ? data : data.items || [];
      setProducts(items);
    } catch (error) {
      toast.error(
        formatApiError(error.response?.data?.detail) || error.message,
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...empty, branch_id: user?.branch_id || "" });
    setOpen(true);
  };

  const startEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: Number(product.price || 0),
      cost_price: Number(product.cost_price || 0),
      discount_percent: Number(product.discount_percent || 0),
      image_url: product.image_url || "",
      category: product.category || "skincare",
      stock: Number(product.stock || 0),
      barcode: product.barcode || "",
      expiry_date: product.expiry_date || "",
      sku: product.sku || "",
      units_per_package: Number(product.units_per_package || 0),
      parent_barcode: product.parent_barcode || "",
      branch_id: product.branch_id || user?.branch_id || "",
      all_branches: false,
    });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        cost_price: Number(form.cost_price),
        discount_percent: Number(form.discount_percent),
        stock: Number(form.stock),
        units_per_package: Number(form.units_per_package || 0),
        branch_id: user?.branch_id || "",
        all_branches: false,
      };
      if (!payload.branch_id) {
        return toast.error("Sizga filial biriktirilmagan");
      }
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Mahsulot yangilandi");
      } else {
        await api.post("/products", payload);
        toast.success("Mahsulot qo'shildi");
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(
        formatApiError(error.response?.data?.detail) || error.message,
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`“${product.name}” mahsulot o'chirilsinmi?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success("Mahsulot o'chirildi");
      await load();
    } catch (error) {
      toast.error(
        formatApiError(error.response?.data?.detail) || error.message,
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Mahsulotni qidirish..."
          className="max-w-md"
        />
        <Button
          onClick={startCreate}
          className="bg-noir text-ivory hover:bg-rose rounded-full"
        >
          <Plus className="w-4 h-4 mr-1" /> Qo'shish
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-line p-4 space-y-3"
          >
            <div className="flex gap-3">
              <img
                src={safeImageUrl(product.image_url)}
                alt=""
                className="w-24 h-24 rounded-xl object-cover bg-cream"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-rose">
                  {product.category}
                </div>
                <h3 className="font-serif text-lg text-noir line-clamp-1">
                  {product.name}
                </h3>
                <div className="text-sm font-semibold text-noir">
                  {Number(product.price || 0).toLocaleString()} so'm
                </div>
                <div className="text-xs text-stone">
                  Ombor: {product.stock} dona
                </div>
              </div>
            </div>
            {canEdit(product) ? (
              <div className="flex gap-2 border-t border-line pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(product)}
                  className="flex-1"
                >
                  <Edit3 className="w-3 h-3 mr-1" /> Tahrirlash
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(product)}
                  className="text-rose"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="border-t border-line pt-3 text-xs text-stone text-center">
                Umumiy mahsulot — faqat ko'rish
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && products.length === 0 && (
        <div className="rounded-2xl bg-cream p-10 text-center text-stone">
          Yuklanmoqda...
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="rounded-2xl bg-cream p-10 text-center text-stone">
          Mahsulot topilmadi. Yangi mahsulot qo'shing.
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-ivory p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-noir">
              {editing ? "Mahsulotni yangilash" : "Yangi mahsulot"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Label className="block text-sm text-noir">
              Nomi
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="mt-1"
                required
              />
            </Label>
            <Label className="block text-sm text-noir">
              Tavsif
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-1"
                rows={3}
                required
              />
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label className="block text-sm text-noir">
                Sotuv narxi
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  className="mt-1"
                  required
                />
              </Label>
              <Label className="block text-sm text-noir">
                Xarid narxi
                <Input
                  type="number"
                  min="0"
                  value={form.cost_price}
                  onChange={(event) =>
                    setForm({ ...form, cost_price: event.target.value })
                  }
                  className="mt-1"
                  required
                />
              </Label>
              <Label className="block text-sm text-noir">
                Ombordagi qoldiq
                <Input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) =>
                    setForm({ ...form, stock: event.target.value })
                  }
                  className="mt-1"
                  required
                />
              </Label>
              <Label className="block text-sm text-noir">
                Kategoriya
                <Input
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  className="mt-1"
                />
              </Label>
            </div>
            <Label className="block text-sm text-noir">
              Filial
              <div className="mt-1 rounded-lg bg-cream px-3 py-2 text-sm text-stone">
                {user?.branch_id
                  ? user?.branch_name || "O'z filialingiz"
                  : "Filial biriktirilmagan"}
              </div>
            </Label>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-noir text-ivory hover:bg-rose rounded-full"
            >
              {saving ? "Saqlanmoqda..." : editing ? "Yangilash" : "Qo'shish"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
