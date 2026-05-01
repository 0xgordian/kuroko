"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useModal, useAccount, useWalletState, useClient } from "@getpara/react-sdk-lite";
import type { AomiAuthIdentity } from "./auth-identity";

// ─── Para singleton ───────────────────────────────────────────────────────────
// Instantiating ParaWebModule is expensive (~50ms) and creates a new SDK
// context each time. We cache the module + instance so signTypedData and
// sendTransaction reuse the same object across calls.
let cachedParaInstance: InstanceType<typeof import("@getpara/react-sdk-lite").default> | null = null;

async function getParaSingleton() {
  if (cachedParaInstance) return cachedParaInstance;
  const ParaWebModule = (await import("@getpara/react-sdk-lite")).default;
  const { Environment } = await import("@getpara/web-sdk");
  cachedParaInstance = new ParaWebModule(
    Environment.BETA,
    process.env.NEXT_PUBLIC_PARA_API_KEY!,
  );
  return cachedParaInstance;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAomiAuthAdapter() {
  const { openModal } = useModal();
  const account = useAccount();
  const { selectedWallet } = useWalletState();
  const paraClient = useClient();

  const [isFullyLoggedIn, setIsFullyLoggedIn] = useState(false);
  const [paraAddress, setParaAddress] = useState<string | undefined>(undefined);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  // Ref so the check function is stable and doesn't re-create the interval
  const checkRef = useRef<() => Promise<void>>();

  checkRef.current = async () => {
    if (!paraClient) return;
    try {
      const loggedIn = await paraClient.isFullyLoggedIn();
      setIsFullyLoggedIn(loggedIn);
      if (loggedIn) {
        const wallets = paraClient.getWallets?.() ?? {};
        const first = Object.values(wallets)[0] as { address?: string } | undefined;
        setParaAddress(first?.address);
      } else {
        setParaAddress(undefined);
      }
    } catch {
      // Silent fail — Para SDK can throw during SSR hydration
    }
  };

  useEffect(() => {
    if (!paraClient) return;

    // Run once immediately
    void checkRef.current?.();

    // Para SDK doesn't expose a public event emitter, so we need a lightweight
    // poll — but only while the modal might be open (i.e. after the user has
    // interacted). We use a 3s interval (down from 2s) and stop it after the
    // user is confirmed connected to avoid unnecessary battery drain.
    //
    // The interval is cleared as soon as `isFullyLoggedIn` becomes true and
    // the address is resolved, so in the steady-state (connected) case there
    // is zero polling overhead.
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => { void checkRef.current?.(); }, 3_000);
    };

    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    // Start polling when the Para modal opens (user is actively connecting)
    const handleModalOpen = () => startPolling();
    // Stop polling 5s after the modal closes — enough time to catch the state change
    const handleModalClose = () => setTimeout(stopPolling, 5_000);

    // Para SDK fires these on the window when the modal opens/closes
    window.addEventListener('para:modal:open', handleModalOpen);
    window.addEventListener('para:modal:close', handleModalClose);

    // Also poll briefly on mount in case the user is already connected
    // (e.g. returning to the page with an active session)
    startPolling();
    const initialStop = setTimeout(stopPolling, 8_000);

    return () => {
      stopPolling();
      clearTimeout(initialStop);
      window.removeEventListener('para:modal:open', handleModalOpen);
      window.removeEventListener('para:modal:close', handleModalClose);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paraClient]);

  // Re-check immediately whenever the account object changes (covers the case
  // where Para SDK updates account state without firing window events)
  useEffect(() => {
    void checkRef.current?.();
  }, [account]);

  const isConnected = isFullyLoggedIn || (account?.isConnected ?? false);

  const embeddedWallets = account?.embedded?.wallets;
  const firstEmbeddedWallet =
    Array.isArray(embeddedWallets) && embeddedWallets.length > 0
      ? (embeddedWallets[0] as { address?: string })
      : null;
  const address =
    paraAddress ??
    selectedWallet?.address ??
    firstEmbeddedWallet?.address ??
    undefined;

  const isLoading = account?.isLoading ?? false;

  const currentChainId = account?.chainId ?? 137;

  const identity: AomiAuthIdentity & {
    isConnected: boolean;
    address?: string;
    chainId?: number;
    isMagic: boolean;
    isAomi: boolean;
    canConnect?: boolean;
    status?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
    isLoading?: boolean;
  } = {
    status: isLoading ? "booting" : isConnected ? "connected" : "disconnected",
    isConnected,
    address,
    chainId: isConnected ? currentChainId : undefined,
    isMagic: false,
    isAomi: true,
    canConnect: true,
    primaryLabel: isConnected
      ? address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Connected"
      : "Connect Wallet",
    secondaryLabel: isConnected ? "MATIC" : undefined,
    isLoading,
  };

  const connect = useCallback(async () => { openModal(); }, [openModal]);
  const disconnect = useCallback(async () => { openModal(); }, [openModal]);
  const manageAccount = useCallback(async () => { openModal(); }, [openModal]);

  const signTypedData = useCallback(async (data: unknown): Promise<string> => {
    try {
      const payload = data as {
        typed_data?: {
          domain?: Record<string, unknown>;
          types?: Record<string, unknown>;
          message?: Record<string, unknown>;
        };
      };

      const typedData = payload?.typed_data;
      if (!typedData) throw new Error("No typed_data in payload");

      const { createParaEthersSigner } = await import("@getpara/ethers-v6-integration");
      // Reuse the singleton — no fresh SDK init on every sign
      const para = await getParaSingleton();
      const signer = createParaEthersSigner({ para });

      const domain = typedData.domain as Parameters<typeof signer.signTypedData>[0];
      const types = typedData.types as Record<string, Array<{ name: string; type: string }>>;
      const value = typedData.message as Record<string, unknown>;
      const { EIP712Domain: _, ...filteredTypes } = types ?? {};

      return await signer.signTypedData(domain, filteredTypes, value);
    } catch (err) {
      throw new Error(`signTypedData failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const sendTransaction = useCallback(async (tx: unknown): Promise<string> => {
    try {
      const { createParaEthersSigner } = await import("@getpara/ethers-v6-integration");
      const { ethers } = await import("ethers");
      // Reuse the singleton
      const para = await getParaSingleton();
      const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
      const signer = createParaEthersSigner({ para, provider });

      const txRequest = tx as Parameters<typeof signer.sendTransaction>[0];
      const response = await signer.sendTransaction(txRequest);
      return response.hash;
    } catch (err) {
      throw new Error(`sendTransaction failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const switchChain = useCallback(async (_newChainId: number): Promise<void> => {
    // Chain switching via externalWallets requires the useExternalWallets hook
    // which is only available inside ExternalWalletProvider
    // For now, this is a no-op - users can switch chains via Para modal
  }, []);

  return {
    identity,
    isReady: !isLoading,
    isSwitchingChain,
    canConnect: true,
    canManageAccount: isConnected,
    connect,
    disconnect,
    manageAccount,
    signTypedData,
    sendTransaction,
    switchChain,
  };
}
