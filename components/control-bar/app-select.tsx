"use client";

import { useState, useEffect, type FC } from "react";
import { Icon } from "@iconify/react";
import { useControl, cn } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type AppSelectProps = {
  className?: string;
  placeholder?: string;
};

export const AppSelect: FC<AppSelectProps> = ({
  className,
  placeholder = "Select App",
}) => {
  const {
    state,
    getAuthorizedApps,
    getCurrentThreadApp,
    onAppSelect,
    isProcessing,
  } = useControl();
  const [open, setOpen] = useState(false);

  const DEFAULT_APP_ID = process.env.NEXT_PUBLIC_AOMI_APP_ID ?? null;

  // Fetch authorized apps on mount, then auto-select default app if configured
  useEffect(() => {
    void getAuthorizedApps().then(() => {
      if (DEFAULT_APP_ID && !getCurrentThreadApp()) {
        onAppSelect(DEFAULT_APP_ID);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAuthorizedApps]);

  const selectedApp = getCurrentThreadApp();
  const apps = state.authorizedApps;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isProcessing}
          className={cn(
            "h-7 w-auto min-w-[80px] justify-between px-2.5 text-xs",
            "border border-white/10 bg-transparent text-[#a0a0a0] hover:bg-[#161616] hover:text-[#f0f0f0] hover:border-white/20",
            isProcessing && "cursor-not-allowed opacity-50",
            className,
          )}
          style={{ borderRadius: 8, fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace" }}
        >
          <span className="truncate">
            {selectedApp
              ? selectedApp === "khalani"
                ? "Khalani Swaps"
                : selectedApp
              : placeholder}
          </span>
          <Icon icon="solar:alt-arrow-down-linear" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {apps.length > 0 && (
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[180px] max-h-[360px] overflow-y-auto p-1 shadow-xl border z-[9999]"
          style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12 }}
        >
          <div className="flex flex-col gap-0.5">
            {apps.map((app: string) => (
              <button
                key={app}
                disabled={isProcessing}
                onClick={() => {
                  if (isProcessing) return;
                  onAppSelect(app);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-xs outline-none",
                  "hover:bg-[#161616] hover:text-[#f0f0f0]",
                  "focus:bg-[#161616] focus:text-[#f0f0f0]",
                  selectedApp === app ? "bg-[#161616] text-[#f0f0f0]" : "text-[#a0a0a0]",
                  isProcessing && "cursor-not-allowed opacity-50",
                )}
                style={{ borderRadius: 8 }}
              >
                <span>{app === "khalani" ? "Khalani Swaps" : app}</span>
                {selectedApp === app && <Icon icon="solar:check-circle-linear" className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};
