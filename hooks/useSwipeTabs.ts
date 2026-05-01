'use client';

import { useRef, useCallback } from 'react';

interface UseSwipeTabsOptions {
  tabs: string[];
  currentTab: string;
  onChange: (tab: string) => void;
  threshold?: number;
}

export function useSwipeTabs({ tabs, currentTab, onChange, threshold = 60 }: UseSwipeTabsOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - startX.current;
    const deltaY = e.changedTouches[0].clientY - startY.current;

    // Only trigger if horizontal swipe dominates vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      const currentIndex = tabs.indexOf(currentTab);
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        // Swipe left → next tab
        onChange(tabs[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right → prev tab
        onChange(tabs[currentIndex - 1]);
      }
    }

    startX.current = null;
    startY.current = null;
  }, [tabs, currentTab, onChange, threshold]);

  return { onTouchStart, onTouchEnd };
}