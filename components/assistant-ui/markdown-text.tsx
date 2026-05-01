"use client";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { type FC, memo, useState } from "react";
import { Icon } from "@iconify/react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const MarkdownTextImpl = () => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className="aui-md"
    components={defaultComponents}
  />
);

export const MarkdownText = memo(MarkdownTextImpl);

const useCopyToClipboard = ({ copiedDuration = 3000 } = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };
  return { isCopied, copyToClipboard };
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 border-b"
      style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#ff4500' }}>
        {language ?? 'code'}
      </span>
      <TooltipIconButton tooltip="Copy" onClick={() => code && copyToClipboard(code)}>
        {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      </TooltipIconButton>
    </div>
  );
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mt-4 mb-2 first:mt-0 font-terminal font-bold text-base tracking-tight", className)}
      style={{ color: '#f0f0f0', borderBottom: '1px solid rgba(255,69,0,0.3)', paddingBottom: '4px' }}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn("mt-4 mb-1.5 first:mt-0 font-terminal font-bold text-sm tracking-tight", className)}
      style={{ color: '#f0f0f0' }}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn("mt-3 mb-1 first:mt-0 font-terminal font-semibold text-sm", className)}
      style={{ color: '#ff4500' }}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn("mt-2 mb-1 first:mt-0 font-terminal text-xs tracking-widest uppercase", className)}
      style={{ color: '#a0a0a0' }}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn("mt-2 mb-1 first:mt-0 font-terminal text-xs tracking-widest uppercase", className)}
      style={{ color: '#555' }}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn("mt-2 mb-1 first:mt-0 font-terminal text-xs", className)}
      style={{ color: '#555' }}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("my-2 leading-relaxed first:mt-0 last:mb-0 text-sm", className)}
      style={{ color: '#e0e0e0' }}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("underline underline-offset-2 hover:opacity-80 transition-opacity", className)}
      style={{ color: '#ff4500' }}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn("my-2 border-l-2 pl-3 italic text-sm", className)}
      style={{
        borderColor: 'rgba(255,69,0,0.5)',
        color: '#a0a0a0',
        backgroundColor: 'rgba(255,69,0,0.04)',
        padding: '8px 12px',
      }}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn("my-2 space-y-1 text-sm", className)}
      style={{ color: '#e0e0e0', listStyle: 'none', paddingLeft: 0 }}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-2 ml-4 space-y-1 text-sm list-decimal", className)}
      style={{ color: '#e0e0e0' }}
      {...props}
    />
  ),
  li: ({ className, children, ...props }) => (
    <li
      className={cn("leading-relaxed flex gap-2 items-start text-sm", className)}
      style={{ color: '#e0e0e0' }}
      {...props}
    >
      <span style={{ color: '#ff4500', flexShrink: 0, marginTop: '2px', fontFamily: 'monospace' }}>›</span>
      <span>{children}</span>
    </li>
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("my-3", className)}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      {...props}
    />
  ),
  // Table — dark terminal style matching the screenshot
  table: ({ className, ...props }) => (
    <div
      className="my-3 overflow-x-auto border"
      style={{ borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}
    >
      <table
        className={cn("w-full text-xs border-collapse", className)}
        style={{ backgroundColor: '#0d0d0d' }}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead
      className={className}
      style={{ backgroundColor: '#161616' }}
      {...props}
    />
  ),
  tbody: ({ className, ...props }) => (
    <tbody className={className} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn("border-b", className)}
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn("px-3 py-2 text-left font-terminal text-[10px] tracking-widest uppercase whitespace-nowrap", className)}
      style={{ color: '#555', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn("px-3 py-2 text-left text-xs", className)}
      style={{ color: '#a0a0a0' }}
      {...props}
    />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("font-bold", className)}
      style={{ color: '#f0f0f0' }}
      {...props}
    />
  ),
  em: ({ className, ...props }) => (
    <em
      className={cn("italic", className)}
      style={{ color: '#a0a0a0' }}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn("overflow-x-auto border my-2 text-xs leading-relaxed", className)}
      style={{
        backgroundColor: '#0d0d0d',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 0,
        color: '#a0a0a0',
        fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
        padding: 0,
      }}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return isCodeBlock ? (
      <code
        className={cn("block p-3", className)}
        style={{
          fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
          color: '#a0a0a0',
          fontSize: '11px',
        }}
        {...props}
      />
    ) : (
      <code
        className={cn("px-1.5 py-0.5 text-[0.85em]", className)}
        style={{
          backgroundColor: '#161616',
          color: '#ff4500',
          borderRadius: 0,
          border: '1px solid rgba(255,255,255,0.08)',
          fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
        }}
        {...props}
      />
    );
  },
  CodeHeader,
});
