import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Tag, Percent, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

function calcPricing(p) {
    const price = Number(p.price || 0);
    const discount = Number(p.discount_percent || 0);
    const final = p.final_price != null ? Number(p.final_price) : Math.round(price * (100 - discount) / 100);
    const discountAmount = Math.max(0, Math.round(price - final));
    return { price, discount, final, discountAmount, hasDiscount: discount > 0 && discountAmount > 0 };
}

function ProductCard({ product }) {
    const { price, discount, final, discountAmount, hasDiscount } = calcPricing(product);
    return (
        <Link
            to={`/products/${product.id}`}
            className="product-card group block rounded-2xl overflow-hidden border border-line bg-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            data-testid={`product-card-${product.id}`}
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                {hasDiscount && <div className="discount-badge">−{discount}%</div>}
                <img src={product.image_url} alt={product.name} className="product-image w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-noir/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-6">
                    <span className="bg-ivory text-noir text-xs uppercase tracking-widest px-4 py-2 rounded-full font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        Batafsil ko'rish
                    </span>
                </div>
            </div>
            <div className="p-5">
                <div className="text-[10px] uppercase tracking-[0.25em] text-rose">{product.category}</div>
                <h3 className="font-serif text-xl mt-1 line-clamp-1 text-noir">{product.name}</h3>
                <div className="mt-3">
                    {hasDiscount ? (
                        <div className="flex items-end justify-between gap-2">
                            <div className="flex flex-col">
                                <span className="text-xs original-price">{price.toLocaleString()} so'm</span>
                                <span className="font-bold text-lg price-final">{final.toLocaleString()} so'm</span>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-rose uppercase tracking-wider">Tejaysiz</div>
                                <div className="text-sm font-semibold text-rose">−{discountAmount.toLocaleString()} so'm</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-noir">{price.toLocaleString()} so'm</span>
                            <span className="text-xs uppercase tracking-wider text-stone group-hover:text-rose transition-colors">Ko'rish →</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

const CATEGORIES = ["Barchasi", "vitamins", "skincare", "parfum", "makeup", "haircare", "bodycare"];

export default function Products() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("Barchasi");
    const [sort, setSort] = useState("default");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/products").then(({ data }) => { setProducts(data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = [...products];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
        }
        if (category !== "Barchasi") list = list.filter(p => p.category === category);
        if (sort === "price-asc") list.sort((a, b) => (a.final_price ?? a.price) - (b.final_price ?? b.price));
        else if (sort === "price-desc") list.sort((a, b) => (b.final_price ?? b.price) - (a.final_price ?? a.price));
        else if (sort === "discount") list.sort((a, b) => Number(b.discount_percent || 0) - Number(a.discount_percent || 0));
        return list;
    }, [products, search, category, sort]);

    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        return ["Barchasi", ...cats];
    }, [products]);

    return (
        <div className="bg-ivory min-h-screen" data-testid="products-page">
            {/* Header */}
            <div className="bg-white border-b border-line">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                    <span className="text-xs uppercase tracking-[0.3em] text-rose">Katalog</span>
                    <h1 className="font-serif text-4xl md:text-5xl text-noir mt-2">Barcha mahsulotlar</h1>
                    <p className="text-stone mt-2">Sizning go'zalligingiz uchun maxsus tanlov — {products.length} ta mahsulot</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-8 items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone"/>
                        <Input
                            placeholder="Mahsulot qidirish..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 rounded-full border-line"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-stone"/>
                        <select
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                            className="text-sm border border-line rounded-full px-3 py-2 bg-white text-noir focus:outline-none focus:ring-1 focus:ring-rose"
                        >
                            <option value="default">Standart</option>
                            <option value="price-asc">Narx: past→yuqori</option>
                            <option value="price-desc">Narx: yuqori→past</option>
                            <option value="discount">Chegirma bo'yicha</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-stone"/>
                        <span className="text-sm text-stone">{filtered.length} ta natija</span>
                    </div>
                </div>

                {/* Category tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                category === cat
                                    ? "bg-noir text-ivory"
                                    : "bg-white border border-line text-stone hover:border-noir hover:text-noir"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({length: 8}).map((_, i) => (
                            <div key={i} className="rounded-2xl bg-cream animate-pulse h-80"/>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-stone bg-cream rounded-2xl">
                        <Percent className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                        <p className="font-serif text-xl text-noir">Mahsulot topilmadi</p>
                        <p className="text-sm mt-2">Qidiruvni o'zgartiring yoki boshqa kategoriya tanlang</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
                        {filtered.map(p => <ProductCard key={p.id} product={p}/>)}
                    </div>
                )}
            </div>
        </div>
    );
}
