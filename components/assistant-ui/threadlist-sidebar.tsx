"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ConnectButton } from "@/components/control-bar/connect-button";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  walletPosition?: "header" | "footer" | null;
};

export function ThreadListSidebar({
  walletPosition = "footer",
  ...props
}: ThreadListSidebarProps) {
  return (
    <Sidebar
      collapsible="offcanvas"
      variant="sidebar"
      className="h-full border-r"
      style={{ "--sidebar-width": "220px", backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.08)' } as React.CSSProperties}
      {...props}
    >
      <SidebarHeader style={{ backgroundColor: '#09090b', padding: 0 }}>
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="font-terminal text-[10px] font-bold tracking-widest uppercase" style={{ color: '#555' }}>
            Conversations
          </span>
          <div className="flex items-center gap-2">
            {walletPosition === "header" && <ConnectButton />}
            {/* Close sidebar — X button */}
            <SidebarTrigger
              className="flex items-center justify-center w-5 h-5 transition-colors hover:text-white"
              style={{ color: '#555', backgroundColor: 'transparent', border: 'none', borderRadius: 8, padding: 0 }}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent style={{ backgroundColor: '#09090b' }}>
        <ThreadList />
      </SidebarContent>

      <SidebarRail />

      {walletPosition === "footer" && (
        <SidebarFooter className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#09090b' }}>
          <ConnectButton className="w-full" />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
