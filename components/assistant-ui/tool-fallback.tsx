"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div
      className="aui-tool-fallback-root mb-3 flex w-full flex-col border"
      style={{
        backgroundColor: '#0d0d0d',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        borderLeft: '3px solid rgba(124,58,237,0.4)',
      }}
    >
      {/* Header */}
      <div className="aui-tool-fallback-header flex items-center gap-2 px-3 py-2">
        <Icon icon="solar:check-circle-linear"
          className="aui-tool-fallback-icon size-3 shrink-0"
          style={{ color: '#4ade80' }}
        />
        <p
          className="aui-tool-fallback-title flex-grow font-terminal text-[10px] tracking-widest uppercase"
          style={{ color: '#555' }}
        >
          Used tool:{' '}
          <span style={{ color: '#a0a0a0' }}>{toolName}</span>
        </p>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-5 h-5 transition-colors"
          style={{ color: '#444', backgroundColor: 'transparent', border: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#a0a0a0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed
            ? <Icon icon="solar:alt-arrow-down-linear" className="size-3" />
            : <Icon icon="solar:alt-arrow-up-linear" className="size-3" />}
        </button>
      </div>

      {/* Expanded content */}
      {!isCollapsed && (
        <div
          className="aui-tool-fallback-content flex flex-col gap-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Args */}
          {argsText && (
            <div className="aui-tool-fallback-args-root px-3 pt-2">
              <p
                className="font-terminal text-[9px] tracking-widest uppercase mb-1"
                style={{ color: '#444' }}
              >
                Input
              </p>
              <pre
                className="aui-tool-fallback-args-value whitespace-pre-wrap text-[11px] leading-relaxed"
                style={{
                  color: '#666',
                  fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
                }}
              >
                {argsText}
              </pre>
            </div>
          )}

          {/* Result */}
          {result !== undefined && (
            <div
              className="aui-tool-fallback-result-root border-t px-3 pt-2 pb-2"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <p
                className="font-terminal text-[9px] tracking-widest uppercase mb-1"
                style={{ color: '#444' }}
              >
                Result
              </p>
              <pre
                className="aui-tool-fallback-result-content whitespace-pre-wrap text-[11px] leading-relaxed"
                style={{
                  color: '#a0a0a0',
                  fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
                }}
              >
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
