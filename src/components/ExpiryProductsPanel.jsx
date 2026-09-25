import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Calendar, Loader2 } from "lucide-react";
import { expiryStatus } from "@/lib/posLogic";

const ORDER = ["red", "light-red", "yellow", "green", "unknown"];

export default function ExpiryProductsPanel({ role }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/products", { params: { limit: 500 } })
      .then(({ data }) =>
        setProducts(Array.isArray(data) ? data : data?.items || []),
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      products
        .filter(
          (product) =>
            role !== "worker" ||
            expiryStatus(product.expiry_date).key === "red",
        )
        .map((product) => ({
          product,
          status: expiryStatus(product.expiry_date),
        }))
        .sort(
          (a, b) => ORDER.indexOf(a.status.key) - ORDER.indexOf(b.status.key),
        ),
    [products, role],
  );

  if (loading)
    return (
      <div className="py-12 flex justify-center text-stone">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4" data-testid="expiry-products-panel">
      <div>
        <h2 className="font-serif text-2xl text-noir">Yaroqlilik muddati</h2>
        <p className="text-sm text-stone">
          {role === "worker"
            ? "Faqat 3 oydan kam qolgan mahsulotlar"
            : "Ombordagi mahsulotlarning yaroqlilik holati"}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(({ product, status }) => (
          <div
            key={product.id}
            className={`rounded-xl border border-line p-4 ${status.className}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm line-clamp-2">
                {product.name}
              </div>
              <span className="text-[10px] uppercase font-semibold whitespace-nowrap">
                {status.label}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />{" "}
                {product.expiry_date || "Kiritilmagan"}
              </span>
              <span>{product.stock || 0} dona</span>
            </div>
          </div>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="rounded-xl bg-cream p-8 text-center text-stone">
          {role === "worker"
            ? "Qip-qizil mahsulotlar yo'q"
            : "Mahsulotlar topilmadi"}
        </div>
      )}
    </div>
  );
}
