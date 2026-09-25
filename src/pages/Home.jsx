import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { safeImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Leaf,
  Award,
  Tag,
  Percent,
  Star,
  Truck,
  ShieldCheck,
  Gift,
  Flame,
  ChevronRight,
} from "lucide-react";

const HERO_IMG =
  "https://static.prod-images.emergentagent.com/jobs/42a44add-5feb-4f26-bbbe-91660dd15858/images/aa48808a25485595044e7614f5b488a594dc860670861a89550e982934344ab5.png";

/* Helper: chegirma bo'yicha yakuniy narxni hisoblash (backend final_price ni o'zi yuboradi, lekin fallback) */
function calcPricing(p) {
  const price = Number(p.price || 0);
  const discount = Number(p.discount_percent || 0);
  const final =
    p.final_price != null
      ? Number(p.final_price)
      : Math.round((price * (100 - discount)) / 100);
  const discountAmount = Math.max(0, Math.round(price - final));
  return {
    price,
    discount,
    final,
    discountAmount,
    hasDiscount: discount > 0 && discountAmount > 0,
  };
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [news, setNews] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => setProducts(data))
      .catch(() => {});
    api
      .get("/news")
      .then(({ data }) => setNews(data.slice(0, 3)))
      .catch(() => {});
    api
      .get("/products/best-sellers")
      .then(({ data }) => setBestSellers(data))
      .catch(() => {});
  }, []);

  // Parallax mouse effect
  useEffect(() => {
    const handler = (e) => {
      if (!heroRef.current) return;
      const r = heroRef.current.getBoundingClientRect();
      setMouse({
        x: (e.clientX - r.left - r.width / 2) / r.width,
        y: (e.clientY - r.top - r.height / 2) / r.height,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const discountedProducts = useMemo(
    () => products.filter((p) => Number(p.discount_percent || 0) > 0),
    [products],
  );

  // Faqat 8 ta mahsulot (home uchun)
  const previewProducts = useMemo(() => products.slice(0, 8), [products]);

  return (
    <div className="bg-ivory overflow-hidden" data-testid="home-page">
      {/* ===== TOP MARQUEE BAR ===== */}
      <div className="rose-gradient text-ivory py-2.5 overflow-hidden">
        <div className="marquee">
          <div className="marquee-track text-sm font-medium tracking-wider uppercase">
            {Array.from({ length: 2 }).map((_, j) => (
              <span key={j} className="flex items-center gap-12">
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Mavsumiy chegirmalar 25% gacha
                </span>
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Toshkent bo'ylab bepul yetkazib
                  berish
                </span>
                <span className="flex items-center gap-2">
                  <Gift className="w-4 h-4" /> 500 ming so'mdan ortiq xaridlarga
                  sovg'a
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Yangi mavsum · 2026
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section ref={heroRef} className="relative hero-gradient">
        {/* Animatsiyali blob fonlar */}
        <div className="blob blob-rose w-[420px] h-[420px] -top-32 -left-24 animate-float-slow" />
        <div className="blob blob-cream w-[360px] h-[360px] top-1/3 -right-32 animate-float-fast" />
        <div className="blob blob-noir w-[280px] h-[280px] bottom-0 left-1/3 opacity-20 animate-float-slow" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-24 pt-14 lg:pt-24 pb-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 stagger relative z-10">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-rose bg-rose/10 px-4 py-2 rounded-full animate-bounce-in">
              <Sparkles className="w-3 h-3" /> Yangi mavsum · 2026
            </span>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-noir leading-[1.02] mt-5">
              Go'zallik{" "}
              <em className="text-rose font-medium relative inline-block">
                san'atdir
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="10"
                  viewBox="0 0 200 10"
                  fill="none"
                >
                  <path
                    d="M2 7 Q 50 1, 100 5 T 198 4"
                    stroke="#2E7D63"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </em>
              ,<br />
              siz esa <span className="price-final">shoh asar</span>.
            </h1>
            <p className="text-stone text-base md:text-lg max-w-lg mt-7 leading-relaxed">
              Maison Glow — premium kosmetika kolleksiyasi. Tabiiy tarkib,
              mukammal sifat va sizga atalgan parvarish. Yangi mavsumda{" "}
              <span className="text-rose font-semibold">
                25% gacha chegirma
              </span>
              .
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#products">
                <Button
                  className="bg-noir text-ivory hover:bg-rose rounded-full px-8 h-12 btn-magnetic btn-shine font-medium"
                  data-testid="hero-shop-btn"
                >
                  Katalogni ko'rish <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a
                href="#sales"
                className="text-sm uppercase tracking-widest text-noir hover:text-rose transition-colors flex items-center gap-1"
              >
                <Percent className="w-4 h-4" /> Chegirmalar
              </a>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[
                { num: "12+", label: "yillik tajriba" },
                { num: "5K+", label: "mamnun mijoz" },
                { num: "100%", label: "tabiiy" },
              ].map((s, i) => (
                <div key={i} className="group cursor-default">
                  <div className="font-serif text-3xl text-noir group-hover:text-rose transition-colors">
                    {s.num}
                  </div>
                  <div className="text-xs text-stone uppercase tracking-wider mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HERO IMAGE — parallax */}
          <div className="lg:col-span-6 relative animate-fade-in z-10">
            <div
              className="relative rounded-[2rem] overflow-hidden border border-line bg-cream"
              style={{
                transform: `perspective(1200px) rotateY(${mouse.x * 4}deg) rotateX(${-mouse.y * 4}deg)`,
                transition: "transform 200ms ease-out",
              }}
            >
              <img
                src={HERO_IMG}
                alt="Glow editorial"
                className="w-full h-[460px] md:h-[600px] object-cover"
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-tr from-noir/40 via-transparent to-transparent" />

              {/* Floating product badge */}
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-ivory">
                <div className="bg-noir/85 backdrop-blur-md rounded-2xl px-5 py-3 animate-fade-in">
                  <div className="text-xs uppercase tracking-widest opacity-80">
                    Yangi kelgan
                  </div>
                  <div className="font-serif text-lg">Velvet Night Cream</div>
                </div>
                <div className="flex items-center gap-1 bg-ivory/90 text-noir rounded-full px-3 py-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-rose text-rose" />
                  ))}
                  <span className="text-xs font-semibold ml-1">4.9</span>
                </div>
              </div>

              {/* Decorative rotating ring */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full border-2 border-dashed border-rose/40 animate-glow-rotate" />
            </div>

            {/* Floating discount card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl border border-line p-4 shadow-xl animate-float-slow hidden md:flex items-center gap-3">
              <div className="w-12 h-12 rose-gradient rounded-full flex items-center justify-center text-ivory">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone">
                  Aksiya
                </div>
                <div className="font-serif text-lg text-noir leading-tight">
                  25% gacha
                  <br />
                  chegirma
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-24 grid md:grid-cols-4 gap-6 stagger">
        {[
          {
            icon: <Leaf className="w-5 h-5" />,
            title: "Tabiiy tarkib",
            desc: "Sertifikatlangan tabiiy ingredientlar",
          },
          {
            icon: <Award className="w-5 h-5" />,
            title: "Klinik tasdiq",
            desc: "Dermatolog nazoratidan o'tgan",
          },
          {
            icon: <ShieldCheck className="w-5 h-5" />,
            title: "Asl mahsulot",
            desc: "100% original kafolat",
          },
          {
            icon: <Truck className="w-5 h-5" />,
            title: "Tezkor yetkazib berish",
            desc: "Toshkent bo'ylab 24 soatda",
          },
        ].map((v, i) => (
          <div
            key={i}
            className="group rounded-2xl border border-line bg-white/60 backdrop-blur p-6 hover:bg-white hover:border-rose hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full noir-gradient text-ivory flex items-center justify-center group-hover:scale-110 transition-transform">
              {v.icon}
            </div>
            <h3 className="font-serif text-xl text-noir mt-4">{v.title}</h3>
            <p className="text-sm text-stone mt-2">{v.desc}</p>
          </div>
        ))}
      </section>

      {/* ===== BEST SELLERS / TOP-RATED BANNER ===== */}
      {bestSellers.length > 0 && (
        <section
          id="best-sellers"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-28 relative"
          data-testid="best-sellers-section"
        >
          <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-noir via-noir to-rose/40 p-8 md:p-14">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-rose rounded-full blur-3xl opacity-30 animate-pulse-soft" />
            <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-ivory rounded-full blur-3xl opacity-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] border border-rose/10 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] border border-rose/15 rounded-full" />

            <div className="relative">
              <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-rose bg-rose/20 backdrop-blur px-4 py-2 rounded-full border border-rose/30">
                    <Flame className="w-3 h-3" /> Eng talabgir
                  </span>
                  <h2 className="font-serif text-4xl md:text-6xl text-ivory mt-4 leading-tight">
                    Eng ko'p sotilayotgan
                    <br />
                    <span className="text-rose">mahsulotlar</span>
                  </h2>
                  <p className="text-ivory/70 mt-3 max-w-md">
                    Bizning mijozlarimiz tomonidan eng ko'p tanlangan va sevib
                    qolingan mahsulotlar to'plami
                  </p>
                </div>
                <div className="text-ivory/80 text-sm bg-ivory/10 backdrop-blur rounded-full px-4 py-2 border border-ivory/20">
                  <Star className="w-4 h-4 inline mr-1 text-rose fill-rose" />{" "}
                  Top {bestSellers.length}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {bestSellers.slice(0, 6).map((p, idx) => {
                  const pr = calcPricing(p);
                  return (
                    <Link
                      to={`/products/${p.id}`}
                      key={p.id}
                      className="group relative bg-ivory/95 backdrop-blur rounded-2xl overflow-hidden hover:scale-[1.03] hover:-translate-y-1 transition-all duration-500 shadow-lg hover:shadow-2xl"
                      data-testid={`best-seller-${p.id}`}
                    >
                      <div className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-noir text-ivory flex items-center justify-center font-serif text-lg shadow-lg">
                        #{idx + 1}
                      </div>
                      <div className="absolute top-3 right-3 z-10 bg-rose text-ivory text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Flame className="w-3 h-3" /> {p.sold_qty} sotilgan
                      </div>
                      <div className="aspect-[4/3] bg-cream relative overflow-hidden">
                        <img
                          src={safeImageUrl(p.image_url)}
                          alt={p.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = safeImageUrl(null);
                          }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      <div className="p-4">
                        <div className="text-[10px] uppercase tracking-widest text-rose">
                          {p.category}
                        </div>
                        <h3 className="font-serif text-lg text-noir mt-1 line-clamp-1">
                          {p.name}
                        </h3>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            {pr.hasDiscount && (
                              <div className="text-xs text-stone line-through">
                                {pr.price.toLocaleString()} so'm
                              </div>
                            )}
                            <div className="font-semibold text-noir">
                              {pr.final.toLocaleString()} so'm
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-stone group-hover:text-rose group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== SALES / DISCOUNTS SECTION ===== */}
      {discountedProducts.length > 0 && (
        <section
          id="sales"
          className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-28 relative"
        >
          <div className="relative noir-gradient rounded-[2rem] overflow-hidden p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 rose-gradient rounded-full blur-3xl opacity-30 -translate-y-1/4 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose rounded-full blur-3xl opacity-20" />

            <div className="relative flex items-end justify-between mb-10 flex-wrap gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-rose bg-rose/15 px-4 py-2 rounded-full">
                  <Flame className="w-3 h-3 text-rose" /> Issiq aksiya
                </span>
                <h2 className="font-serif text-4xl md:text-5xl text-ivory mt-3">
                  Chegirmadagi mahsulotlar
                </h2>
                <p className="text-ivory/70 mt-2">
                  Faqat cheklangan vaqt davomida — buyurtmangizni shoshilib
                  bering
                </p>
              </div>
              <div className="text-ivory/80 text-sm">
                {discountedProducts.length} ta aksiyali mahsulot
              </div>
            </div>

            <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
              {discountedProducts.map((p) => (
                <ProductCard key={p.id} product={p} dark />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== ALL PRODUCTS (faqat 8 ta) ===== */}
      <section
        id="products"
        className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-28"
      >
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-rose">
              Katalog
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-noir mt-2">
              Tanlangan mahsulotlar
            </h2>
            <p className="text-stone mt-2">
              Sizning go'zalligingiz uchun maxsus tanlov
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone bg-cream px-4 py-2 rounded-full">
            <Tag className="w-4 h-4" /> {products.length} ta mahsulot
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
          {previewProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20 text-stone bg-cream rounded-2xl">
            Hozircha mahsulotlar yo'q. Tez orada qaytib keling!
          </div>
        )}

        {/* Barchasini ko'rish tugmasi */}
        {products.length > 8 && (
          <div className="mt-12 text-center">
            <Button
              onClick={() => navigate("/products")}
              className="bg-noir text-ivory hover:bg-rose rounded-full px-10 h-12 btn-magnetic btn-shine font-medium"
            >
              Barchasini ko'rish <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </section>

      {/* ===== NEWS ===== */}
      {news.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-28">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-rose">
                Jurnal
              </span>
              <h2 className="font-serif text-4xl md:text-5xl text-noir mt-2">
                So'nggi yangiliklar
              </h2>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="text-sm uppercase tracking-widest text-noir hover:text-rose flex items-center gap-1"
            >
              Barchasi <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger">
            {news.map((n) => (
              <article
                key={n.id}
                className="group rounded-2xl overflow-hidden border border-line bg-white hover:-translate-y-2 hover:shadow-2xl transition-all duration-500"
                data-testid={`news-card-${n.id}`}
              >
                {n.image_url && (
                  <div className="aspect-[16/10] overflow-hidden bg-cream">
                    <img
                      src={safeImageUrl(n.image_url)}
                      alt={n.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = safeImageUrl(null);
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-serif text-xl text-noir group-hover:text-rose transition-colors">
                    {n.title}
                  </h3>
                  <p className="text-sm text-stone mt-2 line-clamp-3">
                    {n.content}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA BANNER ===== */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-28 mb-20">
        <div className="relative rose-gradient rounded-[2rem] overflow-hidden p-12 md:p-16 text-center">
          <div className="absolute inset-0 editorial-grain opacity-30" />
          <div className="relative">
            <Sparkles className="w-10 h-10 text-ivory mx-auto mb-4 animate-float-slow" />
            <h2 className="font-serif text-4xl md:text-5xl text-ivory">
              Bugun o'zingizga g'amxo'rlik qiling
            </h2>
            <p className="text-ivory/85 mt-3 max-w-2xl mx-auto">
              Kosmetolog konsultatsiyasi va shaxsiy parvarish dasturi — bizning
              mutaxassislardan
            </p>
            <Link to="/contact">
              <Button className="mt-7 bg-ivory text-noir hover:bg-noir hover:text-ivory rounded-full h-12 px-8 btn-magnetic btn-shine">
                Bog'lanish <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="h-12" />
    </div>
  );
}

/* ============== ProductCard component ============== */
function ProductCard({ product, dark = false }) {
  const { price, discount, final, discountAmount, hasDiscount } =
    calcPricing(product);

  return (
    <Link
      to={`/products/${product.id}`}
      className={`product-card group block rounded-2xl overflow-hidden border ${dark ? "border-rose/30 bg-noir/20 backdrop-blur" : "border-line bg-white"}`}
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {hasDiscount && <div className="discount-badge">−{discount}%</div>}
        <img
          src={safeImageUrl(product.image_url)}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = safeImageUrl(null);
          }}
          className="product-image w-full h-full object-cover"
        />
        {/* hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-noir/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-6">
          <span className="bg-ivory text-noir text-xs uppercase tracking-widest px-4 py-2 rounded-full font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            Batafsil ko'rish
          </span>
        </div>
      </div>
      <div className="p-5">
        <div
          className={`text-[10px] uppercase tracking-[0.25em] ${dark ? "text-rose" : "text-rose"}`}
        >
          {product.category}
        </div>
        <h3
          className={`font-serif text-xl mt-1 line-clamp-1 ${dark ? "text-ivory" : "text-noir"}`}
        >
          {product.name}
        </h3>

        {/* Narx blok */}
        <div className="mt-3">
          {hasDiscount ? (
            <div className="flex items-end justify-between gap-2">
              <div className="flex flex-col">
                <span
                  className={`text-xs original-price ${dark ? "!text-ivory/50" : ""}`}
                >
                  {price.toLocaleString()} so'm
                </span>
                <span
                  className={`font-bold text-lg ${dark ? "text-ivory" : "price-final"}`}
                >
                  {final.toLocaleString()} so'm
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-rose uppercase tracking-wider">
                  Tejaysiz
                </div>
                <div
                  className={`text-sm font-semibold ${dark ? "text-rose" : "text-rose"}`}
                >
                  −{discountAmount.toLocaleString()} so'm
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span
                className={`font-medium ${dark ? "text-ivory" : "text-noir"}`}
              >
                {price.toLocaleString()} so'm
              </span>
              <span
                className={`text-xs uppercase tracking-wider ${dark ? "text-ivory/60 group-hover:text-rose" : "text-stone group-hover:text-rose"} transition-colors`}
              >
                Ko'rish →
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
