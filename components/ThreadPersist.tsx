'use client';

import { useEffect, useRef } from 'react';
import { useAomiRuntime } from '@aomi-labs/react';

const STORAGE_KEY = 'kuroko_thread_id';

/**
 * Persists the current thread ID to localStorage and restores it on mount.
 * Mount this inside AomiFrame.Root so it has access to the aomi runtime.
 */
export function ThreadPersist() {
  const { currentThreadId, selectThread, getThreadMetadata } = useAomiRuntime();
  const restoredRef = useRef(false);

  // Restore saved thread on first mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== currentThreadId) {
        // Attempt to restore — if the thread is expired/invalid the runtime
        // will reject it; we catch that and clear the stale ID so next load
        // starts fresh.
        try {
          // First check if thread still exists by getting metadata
          const meta = getThreadMetadata(saved);
          if (meta) {
            console.log('[ThreadPersist] Restoring thread:', saved);
            selectThread(saved);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (err) {
          console.warn('[ThreadPersist] Failed to restore thread:', err);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, [currentThreadId, selectThread, getThreadMetadata]);

  // Save current thread ID whenever it changes
  useEffect(() => {
    if (!currentThreadId) return;
    try {
      localStorage.setItem(STORAGE_KEY, currentThreadId);
    } catch {
      // ignore
    }
  }, [currentThreadId]);

  return null;
}
