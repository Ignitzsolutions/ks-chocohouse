"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Slide = {
  id: string;
  title: string;
  category: string;
  videoSrc: string;
  mobileVideoSrc: string;
};

const slides: Slide[] = [
  {
    id: "hero-video-1",
    title: "Hero Video 1",
    category: "Cakes",
    videoSrc: "/videos/hero/1.mp4",
    mobileVideoSrc: "/videos/hero-mobile/1.mp4",
  },
  {
    id: "hero-video-2",
    title: "Hero Video 2",
    category: "Chocolates",
    videoSrc: "/videos/hero/2.mp4",
    mobileVideoSrc: "/videos/hero-mobile/2.mp4",
  },
  {
    id: "hero-video-3",
    title: "Hero Video 3",
    category: "Bento Cakes",
    videoSrc: "/videos/hero/3.mp4",
    mobileVideoSrc: "/videos/hero-mobile/3.mp4",
  },
  {
    id: "hero-video-4",
    title: "Hero Video 4",
    category: "Cakes",
    videoSrc: "/videos/hero/4.mp4",
    mobileVideoSrc: "/videos/hero-mobile/4.mp4",
  },
  {
    id: "hero-video-5",
    title: "Hero Video 5",
    category: "Chocolates",
    videoSrc: "/videos/hero/5.mp4",
    mobileVideoSrc: "/videos/hero-mobile/5.mp4",
  },
  {
    id: "hero-video-6",
    title: "Hero Video 6",
    category: "Bento Cakes",
    videoSrc: "/videos/hero/6.mp4",
    mobileVideoSrc: "/videos/hero-mobile/6.mp4",
  },
  {
    id: "hero-video-7",
    title: "Hero Video 7",
    category: "Cakes",
    videoSrc: "/videos/hero/7.mp4",
    mobileVideoSrc: "/videos/hero-mobile/7.mp4",
  },
  {
    id: "hero-video-8",
    title: "Hero Video 8",
    category: "Chocolates",
    videoSrc: "/videos/hero/8.mp4",
    mobileVideoSrc: "/videos/hero-mobile/8.mp4",
  },
  {
    id: "hero-video-9",
    title: "Hero Video 9",
    category: "Bento Cakes",
    videoSrc: "/videos/hero/9.mp4",
    mobileVideoSrc: "/videos/hero-mobile/9.mp4",
  },
  {
    id: "hero-video-10",
    title: "Hero Video 10",
    category: "Cakes",
    videoSrc: "/videos/hero/10.mp4",
    mobileVideoSrc: "/videos/hero-mobile/10.mp4",
  },
  {
    id: "hero-video-11",
    title: "Hero Video 11",
    category: "Chocolates",
    videoSrc: "/videos/hero/11.mp4",
    mobileVideoSrc: "/videos/hero-mobile/11.mp4",
  },
];

function nextIndex(current: number, length: number) {
  return (current + 1) % length;
}

function prevIndex(current: number, length: number) {
  return (current - 1 + length) % length;
}

export function HeroFloatingCarousel() {
  const [active, setActive] = useState(0);
  const total = slides.length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => nextIndex(current, total));
    }, 4500);

    return () => window.clearInterval(timer);
  }, [total]);

  const currentSlide = useMemo(() => slides[active], [active]);

  return (
    <div className="relative h-[62vh] min-h-[300px] w-full overflow-hidden rounded-[35px] bg-[color:var(--cream)] sm:h-[70vh] sm:min-h-[380px] lg:h-[78vh] lg:min-h-[540px]">
      <Link
        href={`/menu?category=${encodeURIComponent(currentSlide.category)}`}
        className="absolute inset-0 block"
      >
        <video
          key={`${currentSlide.videoSrc}-${currentSlide.mobileVideoSrc}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        >
          <source
            src={currentSlide.mobileVideoSrc}
            media="(max-width: 768px)"
            type="video/mp4"
          />
          <source src={currentSlide.videoSrc} type="video/mp4" />
        </video>
      </Link>

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
        <button
          type="button"
          onClick={() => setActive((current) => prevIndex(current, total))}
          className="rounded-full border border-white/35 bg-black/28 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
          aria-label="Previous slide"
        >
          ‹
        </button>
        <div className="flex gap-1.5 rounded-full border border-white/25 bg-black/25 px-2 py-2 backdrop-blur">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActive(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === active ? "bg-white" : "bg-white/35"
              }`}
              aria-label={`Go to ${slide.title}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActive((current) => nextIndex(current, total))}
          className="rounded-full border border-white/35 bg-black/28 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
          aria-label="Next slide"
        >
          ›
        </button>
      </div>
    </div>
  );
}
