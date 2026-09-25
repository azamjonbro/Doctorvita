import React, { useEffect, useState } from "react";
import api, { safeImageUrl } from "@/lib/api";
import { BookOpen, Calendar, Sparkles } from "lucide-react";
import { formatCalendarDate } from "@/lib/posLogic";

export default function News() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/news")
      .then(({ data }) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <div className="bg-ivory min-h-screen" data-testid="news-page">
      <div className="bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-rose">
            <Sparkles className="w-3 h-3" /> Jurnal
          </span>
          <h1 className="font-serif text-5xl text-noir mt-2">Yangiliklar</h1>
          <p className="text-stone mt-2">
            Maison Glow dunyosidagi so'nggi voqealar va maslahatlar
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-cream animate-pulse h-64"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-stone bg-cream rounded-2xl">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-xl text-noir">
              Hozircha yangiliklar yo'q
            </p>
            <p className="text-sm mt-2">Tez orada yangi maqolalar chiqadi</p>
          </div>
        ) : (
          <div className="stagger">
            {featured && (
              <article
                className="group rounded-[2rem] overflow-hidden border border-line bg-white hover:shadow-2xl transition-all duration-500 mb-8"
                data-testid={`news-item-${featured.id}`}
              >
                <div className="grid md:grid-cols-2">
                  {featured.image_url && (
                    <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-cream">
                      <img
                        src={safeImageUrl(featured.image_url)}
                        alt={featured.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = safeImageUrl(null);
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-rose bg-rose/10 px-3 py-1 rounded-full w-fit">
                      <Sparkles className="w-3 h-3" /> So'nggi
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl text-noir mt-4 group-hover:text-rose transition-colors leading-tight">
                      {featured.title}
                    </h2>
                    <p className="text-stone mt-4 leading-relaxed line-clamp-4">
                      {featured.content}
                    </p>
                    <div className="flex items-center gap-2 mt-6 text-xs text-stone uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {formatCalendarDate(featured.created_at)}
                    </div>
                  </div>
                </div>
              </article>
            )}
            {rest.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((n) => (
                  <article
                    key={n.id}
                    className="group rounded-2xl overflow-hidden border border-line bg-white hover:-translate-y-2 hover:shadow-xl transition-all duration-500"
                    data-testid={`news-item-${n.id}`}
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
                      <h2 className="font-serif text-xl text-noir group-hover:text-rose transition-colors leading-snug">
                        {n.title}
                      </h2>
                      <p className="text-sm text-stone mt-3 leading-relaxed line-clamp-3">
                        {n.content}
                      </p>
                      <div className="flex items-center gap-2 mt-5 text-xs text-stone uppercase tracking-wider border-t border-line pt-4">
                        <Calendar className="w-3 h-3" />
                        {formatCalendarDate(n.created_at)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
