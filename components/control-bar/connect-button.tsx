"use client";

import { useEffect, type FC } from "react";
import { cn, getChainInfo, useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ConnectButtonProps = {
  className?: string;
  connectLabel?: string;
  onConnectionChange?: (connected: boolean) => void;
};

export const ConnectButton: FC<ConnectButtonProps> = ({
  className,
  connectLabel = "Connect Account",
  onConnectionChange,
}) => {
  const adapter = useAomiAuthAdapter();
  const { setUser } = useUser();
  const identity = adapter.identity;
  const hasParaConfig = Boolean(process.env.NEXT_PUBLIC_PARA_API_KEY);

  useEffect(() => {
    setUser({
      address: identity.address ?? undefined,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
    });
    onConnectionChange?.(identity.isConnected);
  }, [
    identity.address,
    identity.chainId,
    identity.isConnected,
    setUser,
    onConnectionChange,
  ]);

  const handleClick = () => {
    if (identity.isConnected) {
      void adapter.manageAccount?.();
      return;
    }
    void adapter.connect();
  };

  const ticker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;
  const secondaryLabel = identity.isConnected
    ? (identity.secondaryLabel ?? ticker)
    : undefined;
  const isUnavailable = !identity.isConnected && (!hasParaConfig || !adapter.canConnect);
  const unavailableReason = !identity.isConnected
    ? (!hasParaConfig
        ? "Wallet connect is unavailable until NEXT_PUBLIC_PARA_API_KEY is configured."
        : !adapter.canConnect
          ? "Wallet connect is still initializing."
          : undefined)
    : undefined;
  const primaryLabel =
    identity.status === "disconnected"
      ? (isUnavailable ? "Wallet Unavailable" : connectLabel)
      : identity.isConnected
        ? (identity.address
            ? `${identity.address.slice(0, 6)}...${identity.address.slice(-4)}`
            : "Connected")
        : identity.primaryLabel;
  const ariaLabel = identity.isConnected ? "Manage account" : "Connect account";

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={isUnavailable}
      title={unavailableReason}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-terminal tracking-wide",
        "h-7 px-2.5 text-xs transition-colors border",
        "focus-visible:outline-none",
        isUnavailable && "cursor-not-allowed opacity-60",
        identity.isConnected
          ? "bg-transparent border-[#4ade80]/40 text-[#4ade80] hover:border-[#4ade80]/70 hover:bg-[#4ade80]/5"
          : "bg-transparent border-[#7c3aed]/60 text-[#7c3aed] hover:border-[#7c3aed] hover:bg-[#7c3aed]/5",
        className,
      )}
      style={{ borderRadius: 8, fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace" }}
      aria-label={ariaLabel}
    >
      <span className="max-w-[140px] truncate">{primaryLabel}</span>
      {identity.isConnected && secondaryLabel && !secondaryLabel.includes('login') && (
        <span className="opacity-60">{secondaryLabel}</span>
      )}
    </button>
  );

  if (!unavailableReason) {
    return button;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-center">
          {unavailableReason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
