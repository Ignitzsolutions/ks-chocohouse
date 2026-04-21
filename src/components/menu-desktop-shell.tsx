"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function isContainerScrollable(container: HTMLDivElement | null) {
  if (!container) return false;
  return container.scrollHeight > container.clientHeight + 1;
}

function getSectionTop(section: HTMLElement, container: HTMLDivElement | null) {
  if (container && isContainerScrollable(container)) {
    const containerRect = container.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    return sectionRect.top - containerRect.top + container.scrollTop;
  }

  return section.getBoundingClientRect().top + window.scrollY;
}

export type MenuDesktopShellApi<TCategory extends string> = {
  categories: readonly TCategory[];
  activeCategory: TCategory;
  catalogContainerRef: React.RefObject<HTMLDivElement | null>;
  setSectionRef: (category: TCategory) => (node: HTMLElement | null) => void;
  scrollToCategory: (category: TCategory, behavior?: ScrollBehavior) => void;
  selectCategory: (category: TCategory) => void;
};

export type MenuDesktopShellProps<TCategory extends string> = {
  categories: readonly TCategory[];
  activeCategory: TCategory;
  onActiveCategoryChange?: (category: TCategory) => void;
  onCategorySelect?: (category: TCategory) => void;
  sectionTopOffset?: number;
  desktopFrameHeightClassName?: string;
  className?: string;
  railColumnClassName?: string;
  railViewportClassName?: string;
  catalogViewportClassName?: string;
  rail: (api: MenuDesktopShellApi<TCategory>) => ReactNode;
  catalog: (api: MenuDesktopShellApi<TCategory>) => ReactNode;
};

export function MenuDesktopShell<TCategory extends string>({
  categories,
  activeCategory,
  onActiveCategoryChange,
  onCategorySelect,
  sectionTopOffset = 8,
  desktopFrameHeightClassName = "md:h-[75vh]",
  className,
  railColumnClassName,
  railViewportClassName,
  catalogViewportClassName,
  rail,
  catalog,
}: MenuDesktopShellProps<TCategory>) {
  const catalogContainerRef = useRef<HTMLDivElement>(null);
  const sectionElementsRef = useRef(new Map<TCategory, HTMLElement>());
  const sectionCallbacksRef = useRef(
    new Map<TCategory, (node: HTMLElement | null) => void>()
  );
  const [localActiveCategory, setLocalActiveCategory] =
    useState<TCategory>(activeCategory);

  const resolvedActiveCategory = onActiveCategoryChange
    ? activeCategory
    : localActiveCategory;

  useEffect(() => {
    setLocalActiveCategory(activeCategory);
  }, [activeCategory]);

  function notifyActiveCategory(nextCategory: TCategory) {
    if (onActiveCategoryChange) {
      onActiveCategoryChange(nextCategory);
      return;
    }

    setLocalActiveCategory(nextCategory);
  }

  function findScrollTopForCategory(category: TCategory) {
    const container = catalogContainerRef.current;
    const section = sectionElementsRef.current.get(category);
    if (!container || !section) return null;

    const absoluteTop = getSectionTop(section, container);
    return Math.max(absoluteTop - sectionTopOffset, 0);
  }

  function scrollToCategory(category: TCategory, behavior: ScrollBehavior = "auto") {
    const container = catalogContainerRef.current;
    const section = sectionElementsRef.current.get(category);
    if (!section) return;

    if (!container || !isContainerScrollable(container)) {
      section.scrollIntoView({ behavior, block: "start" });
      return;
    }

    const top = findScrollTopForCategory(category);
    if (top === null) return;

    container.scrollTo({ top, behavior });
  }

  function selectCategory(category: TCategory) {
    notifyActiveCategory(category);
    onCategorySelect?.(category);
    scrollToCategory(category, "auto");
  }

  function setSectionRef(category: TCategory) {
    const existing = sectionCallbacksRef.current.get(category);
    if (existing) return existing;

    const callback = (node: HTMLElement | null) => {
      if (!node) {
        sectionElementsRef.current.delete(category);
        return;
      }

      sectionElementsRef.current.set(category, node);
    };

    sectionCallbacksRef.current.set(category, callback);
    return callback;
  }

  useEffect(() => {
    const container = catalogContainerRef.current;
    if (categories.length === 0) return;

    let rafId = 0;
    const useContainerScroll = isContainerScrollable(container);

    const updateActiveFromScroll = () => {
      rafId = 0;

      const markerTop = useContainerScroll
        ? container!.scrollTop + sectionTopOffset + 12
        : window.scrollY + sectionTopOffset + 12;
      let nextActive = categories[0];

      for (const category of categories) {
        const section = sectionElementsRef.current.get(category);
        if (!section) continue;

        const top = getSectionTop(section, container);

        if (top <= markerTop) {
          nextActive = category;
          continue;
        }

        break;
      }

      if (nextActive !== resolvedActiveCategory) {
        if (onActiveCategoryChange) {
          onActiveCategoryChange(nextActive);
        } else {
          setLocalActiveCategory(nextActive);
        }
      }
    };

    const requestUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateActiveFromScroll);
    };

    requestUpdate();
    if (useContainerScroll && container) {
      container.addEventListener("scroll", requestUpdate, { passive: true });
    } else {
      window.addEventListener("scroll", requestUpdate, { passive: true });
    }
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      if (useContainerScroll && container) {
        container.removeEventListener("scroll", requestUpdate);
      } else {
        window.removeEventListener("scroll", requestUpdate);
      }
      window.removeEventListener("resize", requestUpdate);
    };
  }, [categories, onActiveCategoryChange, resolvedActiveCategory, sectionTopOffset]);

  const api: MenuDesktopShellApi<TCategory> = {
    categories,
    activeCategory: resolvedActiveCategory,
    catalogContainerRef,
    setSectionRef,
    scrollToCategory,
    selectCategory,
  };

  return (
    <section
      className={joinClassNames(
        "mt-6 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:items-start",
        className
      )}
    >
      <aside className={joinClassNames("hidden self-start md:block", railColumnClassName)}>
        <div
          className={joinClassNames(
            desktopFrameHeightClassName,
            "overflow-hidden",
            railViewportClassName
          )}
        >
          {rail(api)}
        </div>
      </aside>

      <div
        ref={catalogContainerRef}
        className={joinClassNames(
          "space-y-8",
          desktopFrameHeightClassName,
          "md:overflow-y-auto md:pr-2",
          catalogViewportClassName
        )}
      >
        {catalog(api)}
      </div>
    </section>
  );
}
