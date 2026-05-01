'use client';

import { useEffect } from 'react';
import { useModal } from '@getpara/react-sdk-lite';

const BACKDROP_ID = 'para-backdrop-overlay';

function addBackdrop() {
  if (document.getElementById(BACKDROP_ID)) return;
  const el = document.createElement('div');
  el.id = BACKDROP_ID;
  el.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 9998;
    pointer-events: none;
  `;
  document.body.appendChild(el);
}

function removeBackdrop() {
  document.getElementById(BACKDROP_ID)?.remove();
}

function injectShadowStyles() {
  const modal = document.querySelector('cpsl-auth-modal') as HTMLElement | null;
  if (!modal || !modal.shadowRoot) return;

  // Remove and re-inject the style tag every time to prevent Para caching stale version
  const STYLE_ID = 'para-shadow-override';
  const existing = modal.shadowRoot.getElementById(STYLE_ID);
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
      :host {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        bottom: auto !important;
        max-width: min(480px, calc(100vw - 32px)) !important;
        width: 100% !important;
        z-index: 9999 !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      * { bottom: auto !important; }
      .modal, .modal-container, [class*="modal"], [class*="container"] {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        transform: none !important;
        bottom: auto !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      hr,
      [class*="divider"], [class*="separator"],
      [class*="Divider"], [class*="Separator"] {
        display: none !important;
      }
      /* Force tile button icons white — Para renders them with dark currentColor */
      button svg,
      [class*="tile"] svg,
      [class*="action"] svg,
      [class*="icon"] svg {
        color: #f0f0f0 !important;
        fill: currentColor !important;
        stroke: currentColor !important;
      }
      button svg path,
      button svg circle,
      button svg rect,
      button svg line,
      [class*="tile"] svg path,
      [class*="tile"] svg circle,
      [class*="action"] svg path,
      [class*="action"] svg circle {
        stroke: #f0f0f0 !important;
        fill: none !important;
      }
      /* For filled icons */
      button svg[fill]:not([fill="none"]),
      [class*="tile"] svg[fill]:not([fill="none"]) {
        fill: #f0f0f0 !important;
      }
    `;
  modal.shadowRoot.appendChild(style);

  // Force SVG icon colours on every call — runs on initial inject AND on every MutationObserver tick
  // This catches tile button icons (Add Funds, Send, Withdraw, Profile) whenever Para re-renders them

  // Step 1: Force color on all button/tile containers so currentColor resolves to white
  modal.shadowRoot.querySelectorAll('button, [class*="tile"], [class*="action"], [class*="icon"]').forEach((el) => {
    (el as HTMLElement).style.setProperty('color', '#f0f0f0', 'important');
  });

  // Step 2: Force stroke/fill on every SVG element
  modal.shadowRoot.querySelectorAll('svg').forEach((svg) => {
    (svg as SVGElement).style.setProperty('color', '#f0f0f0', 'important');

    svg.querySelectorAll('path, circle, rect, line, polyline, polygon').forEach((el) => {
      const svgEl = el as SVGElement;
      const fill = svgEl.getAttribute('fill');
      // Outline icons (fill="none" or no fill) → white stroke
      if (!fill || fill === 'none') {
        svgEl.style.setProperty('stroke', '#f0f0f0', 'important');
        svgEl.style.removeProperty('fill');
      } else if (fill === 'currentColor') {
        svgEl.style.setProperty('fill', '#f0f0f0', 'important');
        svgEl.style.setProperty('stroke', 'none', 'important');
      } else {
        // Explicit dark fill → override to white
        svgEl.style.setProperty('fill', '#f0f0f0', 'important');
        svgEl.style.setProperty('stroke', 'none', 'important');
      }
    });
  });
}

function cleanupStaleOverlays() {
  // Remove any stale fixed overlays Para may have left behind
  document.querySelectorAll('body > div[style*="position: fixed"]').forEach((el) => {
    const div = el as HTMLElement;
    // Only remove if it looks like a Para backdrop (semi-transparent, no content)
    if (div.id !== BACKDROP_ID && !div.children.length && div.style.background) {
      div.remove();
    }
  });
  // Remove backdrop-no-scroll class if modal is gone
  if (!document.querySelector('cpsl-auth-modal')) {
    document.body.classList.remove('backdrop-no-scroll');
  }
}

function BackdropInner() {
  const { isOpen } = useModal();

  useEffect(() => {
    if (isOpen) {
      addBackdrop();

      // Inject a global style that targets the Para modal host element
      // This works even before the shadow DOM is attached
      const GLOBAL_STYLE_ID = 'para-global-icon-fix';
      if (!document.getElementById(GLOBAL_STYLE_ID)) {
        const globalStyle = document.createElement('style');
        globalStyle.id = GLOBAL_STYLE_ID;
        globalStyle.textContent = `
          cpsl-auth-modal {
            color: #f0f0f0 !important;
          }
        `;
        document.head.appendChild(globalStyle);
      }

      // Inject styles immediately and at intervals for async renders
      const t1 = setTimeout(injectShadowStyles, 50);
      const t2 = setTimeout(injectShadowStyles, 200);
      const t3 = setTimeout(injectShadowStyles, 500);
      const t4 = setTimeout(injectShadowStyles, 1000);
      const t5 = setTimeout(injectShadowStyles, 2000);

      // MutationObserver — re-inject whenever Para updates the DOM
      let observer: MutationObserver | null = null;
      const startObserver = () => {
        const modal = document.querySelector('cpsl-auth-modal') as HTMLElement | null;
        if (!modal || !modal.shadowRoot) return;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        observer = new MutationObserver(() => {
          // Debounce — only run 300ms after DOM settles to prevent infinite loops
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            injectShadowStyles();
          }, 300);
        });
        observer.observe(modal.shadowRoot, { childList: true, subtree: true });
      };
      const t6 = setTimeout(startObserver, 100);

      return () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);
        observer?.disconnect();
      };
    } else {
      removeBackdrop();
      const t = setTimeout(cleanupStaleOverlays, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  return null;
}

export default function ParaBackdrop() {
  try {
    return <BackdropInner />;
  } catch {
    return null;
  }
}
