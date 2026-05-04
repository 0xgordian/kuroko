"use client";

import {
  type CSSProperties,
  type ReactNode,
  type FC,
  createContext,
  useContext,
  useState,
  Component,
} from "react";
import { AomiRuntimeProvider, cn, useAomiRuntime } from "@aomi-labs/react";

// Error boundary that swallows aomi backend 404s (postState, etc.)
// These happen when no API key is configured and are non-fatal
class AomiErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Only catch 404 errors from aomi backend — let everything else propagate
    if (error?.message?.includes('404') || error?.message?.includes('postState')) {
      return { hasError: false, error: null }; // swallow silently
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Swallow 404/postState errors silently
    if (error?.message?.includes('404') || error?.message?.includes('postState')) {
      return;
    }
    console.error('[AomiFrame] Unhandled error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm" style={{ color: '#555' }}>AI assistant unavailable — reload to retry</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { NotificationToaster } from "@/components/ui/notification";
import { RuntimeTxHandler } from "@/components/runtime-tx-handler";
import { RuntimeAgentBridge } from "./RuntimeAgentBridge";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { ControlBar, type ControlBarProps } from "@/components/control-bar";

// Mobile settings drawer — shows model/app/network on mobile
const MobileSettingsDrawer: FC<{ controlBarProps?: Omit<ControlBarProps, "children"> }> = ({ controlBarProps }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center h-7 w-7 border transition-colors hover:border-white/20"
        style={{ borderColor: 'rgba(255,255,255,0.12)', borderRadius: 8, backgroundColor: 'transparent', color: '#a0a0a0' }}
        aria-label="Settings"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="border-t p-4 space-y-3"
            style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
                Settings
              </span>
              <button onClick={() => setOpen(false)} style={{ color: '#555' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <ControlBar
                {...controlBarProps}
                hideWallet={true}
                className="flex-col items-stretch gap-2"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// =============================================================================
// Composer Control Context - signals Thread to show inline controls
// =============================================================================

type ComposerControlContextValue = {
  enabled: boolean;
  controlBarProps?: Omit<ControlBarProps, "children">;
};

const ComposerControlContext = createContext<ComposerControlContextValue>({
  enabled: false,
});

export const useComposerControl = () => useContext(ComposerControlContext);
// =============================================================================
// Types
// =============================================================================

type RootProps = {
  children?: ReactNode;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Position of the wallet button in the sidebar */
  walletPosition?: "header" | "footer" | null;
  /** Whether to show the thread list sidebar (default: true) */
  showSidebar?: boolean;
  /** Backend URL for the Aomi runtime */
  backendUrl?: string;
};

type HeaderProps = {
  children?: ReactNode;
  withControl?: boolean;
  controlBarProps?: Omit<ControlBarProps, "children">;
  showSidebarTrigger?: boolean;
  showTitle?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

type ComposerProps = {
  children?: ReactNode;
  /** Show inline controls in the composer input area */
  withControl?: boolean;
  /** Props to pass to the ControlBar when withControl is true */
  controlBarProps?: Omit<ControlBarProps, "children">;
  className?: string;
};

type FrameControlBarProps = ControlBarProps;

// =============================================================================
// Compound Components
// =============================================================================

/**
 * Root component - provides all context and layout container
 */
const Root: FC<RootProps> = ({
  children,
  width = "100%",
  height = "80vh",
  className,
  style,
  walletPosition = "footer",
  showSidebar = true,
  backendUrl,
}) => {
const resolvedBackendUrl =
    backendUrl ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_AOMI_PROXY_BASE_URL ??
    "/api/aomi";
  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <AomiErrorBoundary>
      <AomiRuntimeProvider backendUrl={resolvedBackendUrl}>
      <RuntimeAgentBridge />
      <SidebarProvider defaultOpen={false} className="!min-h-0 h-auto" style={{ height: frameStyle.height, width: frameStyle.width }}>
        {/* Outer container — clips the overlay sidebar, scoped to chat area only */}
        <div
          className={cn("relative flex h-full w-full overflow-hidden", className)}
          style={{ height: frameStyle.height, width: frameStyle.width, backgroundColor: '#09090b', ...style }}
        >
          {/* Sidebar — scoped to this container, never bleeds into TopNav */}
          {showSidebar && (
            <ThreadListSidebar walletPosition={walletPosition} />
          )}
          {/* Main content */}
          <div className="flex h-full w-full flex-col min-w-0" style={{ backgroundColor: '#09090b' }}>
            {children}
          </div>
          <NotificationToaster />
          <RuntimeTxHandler />
        </div>
      </SidebarProvider>
    </AomiRuntimeProvider>
    </AomiErrorBoundary>
  );
};

/**
 * Header component - renders the header with optional control bar
 */
const Header: FC<HeaderProps> = ({
  children,
  withControl,
  controlBarProps,
  showSidebarTrigger = true,
  showTitle = true,
  className,
  style,
}) => {
  const { currentThreadId, getThreadMetadata } = useAomiRuntime();
  const currentTitle = getThreadMetadata(currentThreadId)?.title ?? "New Chat";

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 px-3 border-b",
        className,
      )}
      style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#09090b', ...style }}
    >
      {showSidebarTrigger && (
        <>
          <SidebarTrigger className="shrink-0" />
          <Separator orientation="vertical" className="mr-1 h-4 hidden sm:block" />
        </>
      )}
      {showTitle && (
        <Breadcrumb className="min-w-0 flex-1 hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <span className="truncate text-xs max-w-[100px] block font-terminal tracking-widest uppercase"
                style={{ color: '#555', fontFamily: "var(--font-geist-mono), monospace" }}>
                {currentTitle}
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className={cn(
        "flex items-center gap-1 shrink-0 ml-auto",
        !showTitle && "w-full justify-end"
      )}>
        {withControl && (
          <>
            {/* Desktop: show all controls */}
            <div className="hidden sm:flex items-center gap-1">
              <ControlBar {...controlBarProps} />
            </div>
            {/* Mobile: settings drawer */}
            <div className="flex sm:hidden items-center gap-1">
              <ControlBar
                {...controlBarProps}
                hideModel={true}
                hideApp={true}
                hideNetwork={true}
                hideApiKey={true}
              />
              <MobileSettingsDrawer controlBarProps={controlBarProps} />
            </div>
          </>
        )}
        {children}
      </div>
    </header>
  );
};

/**
 * Composer component - renders the thread with optional inline controls
 * When withControl={true}, controls appear inline in the composer input area
 */
const Composer: FC<ComposerProps> = ({
  children,
  withControl = false,
  controlBarProps,
  className,
}) => {
  const { currentThreadId, threadViewKey } = useAomiRuntime();

  return (
    <ComposerControlContext.Provider
      value={{ enabled: withControl, controlBarProps }}
    >
      <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
        <Thread key={`${currentThreadId}-${threadViewKey}`} />
        {children}
      </div>
    </ComposerControlContext.Provider>
  );
};

/**
 * ControlBar component - wrapper for the control bar with frame styling
 */
const FrameControlBar: FC<FrameControlBarProps> = (props) => {
  return <ControlBar {...props} />;
};

// =============================================================================
// Default Layout Component (Simple API)
// =============================================================================

type DefaultLayoutProps = Omit<RootProps, "children">;

/**
 * Default layout - controls are inline in the composer input area
 * Usage: <AomiFrame /> or <AomiFrame walletPosition="header" />
 */
const DefaultLayout: FC<DefaultLayoutProps> = ({
  walletPosition = "footer",
  showSidebar = true,
  ...props
}) => {
  // Hide wallet in ControlBar when it's shown in sidebar
  const hideWalletInControlBar = walletPosition !== null;

  return (
    <Root walletPosition={walletPosition} showSidebar={showSidebar} {...props}>
      <Header
        withControl
        showSidebarTrigger={showSidebar}
        controlBarProps={{ hideWallet: hideWalletInControlBar, hideNetwork: false }}
      />
      <Composer />
    </Root>
  );
};

// =============================================================================
// Export Compound Component
// =============================================================================

export const AomiFrame = Object.assign(DefaultLayout, {
  Root,
  Header,
  Composer,
  ControlBar: FrameControlBar,
});

// Re-export types for consumers
export type {
  RootProps as AomiFrameRootProps,
  HeaderProps as AomiFrameHeaderProps,
  ComposerProps as AomiFrameComposerProps,
  FrameControlBarProps as AomiFrameControlBarProps,
};
