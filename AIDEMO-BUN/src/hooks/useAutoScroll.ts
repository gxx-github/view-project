"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useAutoScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  deps: unknown[]
) {
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 100;
      isNearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
