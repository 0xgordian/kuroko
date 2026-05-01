"use client";

import { useState, type FC } from "react";
import { Icon } from "@iconify/react";
import { cn, SUPPORTED_CHAINS, getChainInfo } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";

export type NetworkSelectProps = {
  className?: string;
  /** Override the default chain list from the lib */
  chains?: typeof SUPPORTED_CHAINS;
};

export const NetworkSelect: FC<NetworkSelectProps> = ({
  className,
  chains = SUPPORTED_CHAINS,
}) => {
  const adapter = useAomiAuthAdapter();
  const { chainId, isConnected } = adapter.identity;
  const switchChain = adapter.switchChain;
  const isPending = adapter.isSwitchingChain;
  const [open, setOpen] = useState(false);

  // Show only when wallet is connected.
  if (!isConnected) return null;

  const currentChain = getChainInfo(chainId);
  const displayName = currentChain?.ticker ?? "Network";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isPending || !switchChain}
          className={cn(
            "h-7 w-auto min-w-[80px] justify-between px-2.5 text-xs",
            "border border-white/10 bg-transparent text-[#a0a0a0] hover:bg-[#161616] hover:text-[#f0f0f0] hover:border-white/20",
            (isPending || !switchChain) && "cursor-not-allowed opacity-60",
            className,
          )}
          style={{ borderRadius: 0, fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace" }}
        >
          <span className="truncate">{displayName}</span>
          <Icon icon="solar:alt-arrow-down-linear" className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[180px] max-h-[360px] overflow-y-auto p-1 shadow-xl border z-[9999]"
        style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 0 }}
      >
        <div className="flex flex-col gap-0.5">
          {chains.map((chain) => (
            <button
              key={chain.id}
              disabled={isPending || !switchChain}
              onClick={() => {
                if (isPending || chain.id === chainId || !switchChain) return;
                void switchChain(chain.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-xs outline-none",
                "hover:bg-[#161616] hover:text-[#f0f0f0]",
                chainId === chain.id ? "bg-[#161616] text-[#f0f0f0]" : "text-[#a0a0a0]",
                (isPending || !switchChain) && "cursor-not-allowed opacity-50",
              )}
              style={{ borderRadius: 0, fontFamily: "var(--font-geist-mono), monospace" }}
            >
              <span>{chain.name}</span>
              {chainId === chain.id && <Icon icon="solar:check-circle-linear" className="h-3.5 w-3.5" style={{ color: '#ff4500' }} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
