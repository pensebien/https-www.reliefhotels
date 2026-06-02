"use client";

import { demoReviews } from "@/content/demo-data";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

export function ReviewsSection() {
  const t = useTranslations("reviews");

  return (
    <section className="border-t border-border bg-card/50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-16">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
            {t("title")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {demoReviews.map((review) => (
            <blockquote
              key={review.id}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <div className="flex gap-0.5 text-teal">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                &ldquo;{review.text}&rdquo;
              </p>
              <footer className="mt-4 text-sm">
                <p className="font-medium">{review.author}</p>
                <p className="text-muted">
                  {review.location} · {review.date}
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
