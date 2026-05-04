"use client";

import type { FC } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreadContext, useAomiRuntime } from "@aomi-labs/react";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex list-none flex-col items-stretch gap-1 pl-2">
      <ThreadListNew />
      <ThreadListItems />
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        className="aui-thread-list-new flex items-center justify-start gap-2 px-4 py-2 text-start w-full transition-colors"
        variant="ghost"
        style={{ borderRadius: 12, color: '#a78bfa', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}
      >
        <Icon icon="solar:add-circle-linear" className="size-3.5" />
        New Chat
      </Button>
    </ThreadListPrimitive.New>
  );
};

const ThreadListItems: FC = () => {
  const isLoading = useAssistantState(({ threads }) => threads.isLoading);

  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
};

const ThreadListSkeleton: FC = () => {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          aria-live="polite"
          className="aui-thread-list-skeleton-wrapper flex items-center gap-2 rounded-md px-3 py-2"
        >
          <Skeleton className="aui-thread-list-skeleton h-[22px] flex-grow" />
        </div>
      ))}
    </>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="aui-thread-list-item data-active:bg-[#161616] flex items-center gap-2 pl-4 transition-all focus-visible:outline-none border-b" style={{ borderRadius: 8, borderColor: 'rgba(255,255,255,0.04)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#161616'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
    >
      <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex-grow py-2.5 text-start">
        <ThreadListItemTitle />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemDelete />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitle: FC = () => {
  return (
    <span className="aui-thread-list-item-title text-xs" style={{ color: '#a0a0a0' }}>
      <ThreadListItemPrimitive.Title fallback="New Chat" />
    </span>
  );
};

const ThreadListItemDelete: FC = () => {
  const { archiveThread } = useAomiRuntime();
  const threadContext = useThreadContext();
  const activeThreadId = threadContext?.currentThreadId;

  const handleDelete = async () => {
    if (!activeThreadId) return;
    const confirmed = window.confirm("Delete this chat? This action cannot be undone.");
    if (!confirmed) return;
    try {
      await archiveThread(activeThreadId);
    } catch (err) {
      console.error("Failed to delete thread:", err);
    }
  };

  return (
    <ThreadListItemPrimitive.Delete asChild>
      <TooltipIconButton
        className="aui-thread-list-item-delete text-foreground hover:text-primary ml-auto mr-3 size-4 p-0"
        variant="ghost"
        tooltip="Delete thread"
        onClick={handleDelete}
      >
        <Icon icon="solar:trash-bin-trash-linear" />
      </TooltipIconButton>
    </ThreadListItemPrimitive.Delete>
  );
};
