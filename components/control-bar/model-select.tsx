"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { Icon } from "@iconify/react";
import { useAomiRuntime, useControl, cn } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ModelSelectProps = {
  className?: string;
  placeholder?: string;
};

export const ModelSelect: FC<ModelSelectProps> = ({
  className,
  placeholder = "Select model",
}) => {
  const { currentThreadId } = useAomiRuntime();
  const {
    state,
    getAvailableModels,
    getAuthorizedApps,
    getCurrentThreadControl,
    onModelSelect,
    isProcessing,
  } = useControl();
  const [open, setOpen] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const maxAttempts = 30;

    const clearRetryTimer = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    const tryFetch = async (attempt = 0): Promise<void> => {
      if (cancelled) return;

      // Skip manual session bootstrap — the aomi runtime handles this internally.
      // Just fetch models directly; the runtime will retry if the session isn't ready.
      const apps = await getAuthorizedApps().catch(() => []);
      const models = await getAvailableModels().catch(() => []);

      if (cancelled) return;

      if ((!models || models.length === 0) && attempt < maxAttempts - 1) {
        const delayMs = Math.min(8_000, 500 * 2 ** attempt);
        clearRetryTimer();
        retryTimeoutRef.current = setTimeout(() => {
          void tryFetch(attempt + 1);
        }, delayMs);
      }
    };

    void tryFetch();
    return () => {
      cancelled = true;
      clearRetryTimer();
    };
  }, [currentThreadId, getAvailableModels, getAuthorizedApps]);

  const threadControl = getCurrentThreadControl();
  const selectedModel =
    threadControl.model ?? state.defaultModel ?? state.availableModels[0];

  const models = state.availableModels;
  const isLoading = models.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isProcessing || isLoading}
          className={cn(
            "h-7 w-auto min-w-[140px] justify-between px-2.5 text-xs",
            "border border-white/10 bg-transparent text-[#a0a0a0] hover:bg-[#161616] hover:text-[#f0f0f0] hover:border-white/20",
            (isProcessing || isLoading) && "opacity-60",
            className,
          )}
          style={{ borderRadius: 8, fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace" }}
        >
          <span className="truncate">
            {isLoading ? "Loading..." : (selectedModel || placeholder)}
          </span>
          <Icon icon="solar:alt-arrow-down-linear" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {!isLoading && (
          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-[220px] max-h-[360px] overflow-y-auto p-1 shadow-xl border z-[9999]"
            style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12 }}
          >
            <div className="flex flex-col gap-0.5">
              {models.map((model) => (
              <button
                key={model}
                disabled={isProcessing}
                onClick={() => {
                  if (isProcessing) return;
                  setOpen(false);
                  void onModelSelect(model).catch((err) => {
                    console.error("[ModelSelect] onModelSelect failed:", err);
                  });
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-xs outline-none",
                  "hover:bg-[#161616] hover:text-[#f0f0f0]",
                  "focus:bg-[#161616] focus:text-[#f0f0f0]",
                  selectedModel === model ? "bg-[#161616] text-[#f0f0f0]" : "text-[#a0a0a0]",
                  isProcessing && "cursor-not-allowed opacity-50",
                )}
                style={{ borderRadius: 8 }}
              >
                <span>{model}</span>
                {selectedModel === model && <Icon icon="solar:check-circle-linear" className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};
