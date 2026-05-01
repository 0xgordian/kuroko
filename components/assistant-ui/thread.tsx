"use client";

import { Icon } from "@iconify/react";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

import type { FC } from "react";
import { useEffect, useState, useRef } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import * as m from "motion/react-m";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

import { cn, useNotification, useThreadContext, useAomiRuntime } from "@aomi-labs/react";
import { useComposerControl } from "@/components/aomi-frame";
import { ModelSelect } from "@/components/control-bar/model-select";
import { AppSelect } from "@/components/control-bar/app-select";
import { ApiKeyInput } from "@/components/control-bar/api-key-input";
import { NetworkSelect } from "@/components/control-bar/network-select";
import { ConnectButton } from "@/components/control-bar/connect-button";
import { useAssistantApi, useMessage } from "@assistant-ui/react";
import { TradeCard, parseTradeCard } from "./trade-card";
import { PositionCard, parsePositionRequest } from "./position-card";
import { useAppStore } from "@/lib/stores/appStore";

const seenSystemMessages = new Set<string>();

// ─── Slash command palette ────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: '/trade',     label: 'Find best trade',          prompt: 'Find the best trade opportunity right now and show me a simulation.' },
  { cmd: '/edge',      label: 'Score all markets',        prompt: 'Score all live markets by edge. Rank the top 3 opportunities.' },
  { cmd: '/movers',    label: 'Biggest 24h movers',       prompt: 'What are the biggest 24h probability movers on Polymarket right now?' },
  { cmd: '/analyze',   label: 'Deep dive top market',     prompt: 'Give me a deep analysis of the top market by volume right now.' },
  { cmd: '/positions', label: 'Review my positions',      prompt: 'Review my open positions and P&L. What should I exit or add to?' },
  { cmd: '/alert',     label: 'Create a price alert',     prompt: 'Suggest a price alert for the most interesting market right now.' },
  { cmd: '/guard',     label: 'Set stop-loss / take-profit', prompt: 'Suggest a stop-loss or take-profit guard for my largest position.' },
  { cmd: '/simulate',  label: 'Simulate a trade',         prompt: 'Find a trade and open a simulation pre-filled with the best opportunity.' },
  { cmd: '/execute',   label: 'Go to order terminal',     prompt: 'Navigate me to the order execution terminal.' },
  { cmd: '/portfolio', label: 'Go to portfolio',          prompt: 'Navigate me to the portfolio page.' },
] as const;

type SlashCommand = typeof SLASH_COMMANDS[number];

const SlashCommandPalette: FC<{
  filter: string;
  selectedIndex: number;
  onSelect: (cmd: SlashCommand) => void;
}> = ({ filter, selectedIndex, onSelect }) => {
  const filtered = SLASH_COMMANDS.filter(
    (c) => !filter || c.cmd.includes(filter.toLowerCase()) || c.label.toLowerCase().includes(filter.toLowerCase())
  );

  if (!filtered.length) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 border overflow-hidden"
      style={{ backgroundColor: '#111', borderColor: 'rgba(255,69,0,0.4)', borderRadius: 0, zIndex: 50 }}
      role="listbox"
      aria-label="Slash commands"
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.cmd}
          role="option"
          aria-selected={i === selectedIndex}
          onMouseDown={(e) => { e.preventDefault(); onSelect(cmd); }}
          className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
          style={{
            backgroundColor: i === selectedIndex ? 'rgba(255,69,0,0.12)' : 'transparent',
            borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}
        >
          <span className="font-terminal text-[11px] tracking-wider shrink-0" style={{ color: '#ff4500', minWidth: 80 }}>
            {cmd.cmd}
          </span>
          <span className="text-xs" style={{ color: '#a0a0a0' }}>{cmd.label}</span>
        </button>
      ))}
    </div>
  );
};

export const Thread: FC = () => {
  const api = useAssistantApi();
  const { threadViewKey } = useThreadContext();

  useEffect(() => {
    try {
      const composer = api.composer();
      composer.setText("");
    } catch (error) {
      console.error("Failed to reset composer input:", error);
    }
  }, [api, threadViewKey]);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <ThreadPrimitive.Root
          className="aui-root aui-thread-root @container flex h-full flex-col"
          style={{
            ["--thread-max-width" as string]: "52rem",
            backgroundColor: '#0d0d0d',
          }}
        >
          <ThreadPrimitive.Viewport className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll" style={{ backgroundColor: '#0d0d0d' }}>
            <ThreadPrimitive.If empty>
              <ThreadWelcome />
            </ThreadPrimitive.If>

            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                EditComposer,
                AssistantMessage,
                SystemMessage,
              }}
            />

            <TypingIndicator />

            <ThreadPrimitive.If empty={false}>
              <div className="aui-thread-viewport-spacer min-h-8 grow" />
            </ThreadPrimitive.If>

            <Composer />
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </MotionConfig>
    </LazyMotion>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.If empty={false}>
      <ThreadPrimitive.ScrollToBottom asChild>
        <TooltipIconButton
          tooltip="Scroll to bottom"
          variant="outline"
          className="aui-thread-scroll-to-bottom absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-none p-2 shadow-md disabled:invisible border"
          style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0' }}
        >
          <Icon icon="solar:arrow-down-linear" className="size-4" />
        </TooltipIconButton>
      </ThreadPrimitive.ScrollToBottom>
    </ThreadPrimitive.If>
  );
};

const ThreadWelcome: FC = () => {
  const markets = useAppStore((s) => s.markets);
  const topMover = [...markets]
    .filter((m) => m.probabilityChange24h !== null && m.probabilityChange24h !== undefined)
    .sort((a, b) => Math.abs(b.probabilityChange24h!) - Math.abs(a.probabilityChange24h!))[0];

  return (
    <div className="aui-thread-welcome-root mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col pt-12 pb-4">
      <div className="aui-thread-welcome-center flex w-full flex-col px-4 pb-8">
        {/* Brand label */}
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <span className="font-terminal text-[10px] tracking-[0.2em] uppercase" style={{ color: '#ff4500' }}>
            Kuroko
          </span>
        </m.div>

        {/* Heading */}
        <m.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-terminal text-2xl font-bold tracking-tight mb-2"
          style={{ color: '#f0f0f0' }}
        >
          AI Market Intelligence
        </m.h1>

        {/* Live status line */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-2 mb-3"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ff4500', boxShadow: '0 0 4px rgba(255,69,0,0.6)' }} />
          <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#ff4500' }}>
            {markets.length > 0 ? `${markets.length} live markets` : 'Connecting...'}
          </span>
          {topMover && (
            <>
              <span className="font-terminal text-[10px]" style={{ color: '#2a2a2a' }}>|</span>
              <span className="font-terminal text-[10px] tracking-widest uppercase"
                style={{ color: topMover.probabilityChange24h! > 0 ? '#4ade80' : '#f87171' }}>
                Top mover: {topMover.probabilityChange24h! > 0 ? '+' : ''}{topMover.probabilityChange24h!.toFixed(1)}pp
              </span>
            </>
          )}
        </m.div>

        {/* Subheading */}
        <m.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm leading-relaxed max-w-md"
          style={{ color: '#666' }}
        >
          Ask about any market, simulate a trade, analyze your positions, or find edge opportunities.
        </m.p>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  const { sendMessage } = useAomiRuntime();
  const markets = useAppStore((s) => s.markets);

  // Build dynamic suggestions from live market data
  const suggestions = (() => {
    if (!markets.length) {
      return [
        {
          category: 'Discover',
          title: 'Best value bets',
          label: 'on election markets right now',
          action: 'Find me the best value bet on election markets right now',
        },
        {
          category: 'Analysis',
          title: 'Biggest movers',
          label: 'in the last 24 hours',
          action: 'What Polymarket markets have moved the most in the last 24 hours?',
        },
        {
          category: 'Edge',
          title: 'Near 50% markets',
          label: 'high uncertainty, high edge',
          action: 'Show me Polymarket opportunities near 50% probability with high edge',
        },
        {
          category: 'Portfolio',
          title: 'My positions',
          label: 'analyze and suggest exits',
          action: 'Analyze my open Polymarket positions and suggest which ones to exit',
        },
      ];
    }

    const result = [];

    // Biggest 24h mover
    const top24h = [...markets]
      .filter((m) => m.probabilityChange24h !== null && m.probabilityChange24h !== undefined)
      .sort((a, b) => Math.abs(b.probabilityChange24h!) - Math.abs(a.probabilityChange24h!))[0];
    if (top24h) {
      const dir = top24h.probabilityChange24h! > 0 ? 'surging' : 'dropping';
      const changeStr = `${top24h.probabilityChange24h! > 0 ? '+' : ''}${top24h.probabilityChange24h!.toFixed(1)}pp today`;
      result.push({
        category: 'Top Mover',
        title: top24h.question.length > 42 ? `${top24h.question.slice(0, 42)}...` : top24h.question,
        label: `${dir} ${changeStr}`,
        action: `Analyze this market: "${top24h.question}" — it moved ${top24h.probabilityChange24h!.toFixed(1)}pp in 24h. Should I trade it?`,
      });
    }

    // Highest volume market
    const topVol = [...markets].sort((a, b) => b.volume - a.volume)[0];
    if (topVol) {
      const volStr = topVol.volume >= 1_000_000
        ? `$${(topVol.volume / 1_000_000).toFixed(1)}M volume`
        : `$${(topVol.volume / 1_000).toFixed(0)}K volume`;
      result.push({
        category: 'High Volume',
        title: topVol.question.length > 42 ? `${topVol.question.slice(0, 42)}...` : topVol.question,
        label: `${volStr} · ${topVol.currentProbability}% YES`,
        action: `What's the best trade on "${topVol.question}"? It has the highest volume right now at ${topVol.currentProbability}%.`,
      });
    }

    // Near 50% with high volume
    const near50 = [...markets]
      .filter((m) => Math.abs(m.currentProbability - 50) < 10 && m.volume > 50_000)
      .sort((a, b) => b.volume - a.volume)[0];
    if (near50) {
      result.push({
        category: 'Near 50%',
        title: near50.question.length > 42 ? `${near50.question.slice(0, 42)}...` : near50.question,
        label: `${near50.currentProbability}% YES · max uncertainty`,
        action: `Analyze "${near50.question}" at ${near50.currentProbability}%. Is this mispriced? What's the edge?`,
      });
    }

    // Always add positions analysis
    result.push({
      category: 'Portfolio',
      title: 'Analyze my positions',
      label: 'suggest exits and sizing',
      action: 'Analyze my open Polymarket positions and suggest which ones to exit or add to',
    });

    return result.slice(0, 4);
  })();

  const handleSuggestionClick = (text: string) => {
    void sendMessage(text).catch((error) => {
      console.error("[ThreadSuggestions] sendMessage failed:", error);
    });
  };

  return (
    <div className="aui-thread-welcome-suggestions w-full px-4">
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((s, index) => (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + 0.05 * index }}
            key={`suggestion-${index}`}
          >
            <button
              onClick={() => handleSuggestionClick(s.action)}
              className="panel-bracket w-full text-left border p-3 transition-all"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,69,0,0.35)';
                e.currentTarget.style.backgroundColor = '#161616';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.backgroundColor = '#111';
              }}
              aria-label={s.action}
            >
              {/* Category label */}
              <span className="block font-terminal text-[9px] tracking-[0.15em] uppercase mb-1" style={{ color: '#ff4500' }}>
                {s.category}
              </span>
              {/* Title */}
              <span className="block text-xs font-semibold mb-0.5 line-clamp-2 leading-snug" style={{ color: '#f0f0f0' }}>
                {s.title}
              </span>
              {/* Live data label */}
              <span className="block text-[11px] line-clamp-1" style={{ color: '#555' }}>
                {s.label}
              </span>
            </button>
          </m.div>
        ))}
      </div>
    </div>
  );
};

const Composer: FC = () => {
  const composerControl = useComposerControl();
  const { sendMessage } = useAomiRuntime();
  const [isListening, setIsListening] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleSelectCommand = (cmd: typeof SLASH_COMMANDS[number]) => {
    setShowPalette(false);
    setPaletteFilter('');
    // Fill the input — user reviews before sending
    if (inputRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(inputRef.current, cmd.prompt);
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.startsWith('/')) {
      setShowPalette(true);
      setPaletteFilter(val.slice(1));
      setPaletteIndex(0);
    } else {
      setShowPalette(false);
      setPaletteFilter('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showPalette) return;
    const filtered = SLASH_COMMANDS.filter(
      (c) => !paletteFilter || c.cmd.includes(paletteFilter.toLowerCase()) || c.label.toLowerCase().includes(paletteFilter.toLowerCase())
    );
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[paletteIndex]) {
      e.preventDefault();
      handleSelectCommand(filtered[paletteIndex]);
    } else if (e.key === 'Escape') {
      setShowPalette(false);
      setPaletteFilter('');
    }
  };

  const startVoiceInput = () => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[Voice] Speech API not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;

      if (inputRef.current) {
        // Use native setter so React controlled input picks up the change
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(inputRef.current, transcript);
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        inputRef.current.focus();
      }

      if (result.isFinal) {
        setIsListening(false);
        recognitionRef.current = null;
        // Auto-send on final transcript
        void sendMessage(transcript).catch(console.error);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div
      className="aui-composer-wrapper sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-4 pb-20 sm:pb-4 pt-2"
      style={{ backgroundColor: '#0d0d0d' }}
    >
      <ThreadScrollToBottom />
      <ComposerPrimitive.Root
        className="aui-composer-root relative flex w-full flex-col gap-2 border px-3 py-2.5 transition-colors focus-within:border-[rgba(255,69,0,0.5)]"
        style={{
          backgroundColor: '#111',
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 0,
        }}
      >
        {/* Slash command palette */}
        {showPalette && (
          <SlashCommandPalette
            filter={paletteFilter}
            selectedIndex={paletteIndex}
            onSelect={handleSelectCommand}
          />
        )}

        {/* Quick action buttons row */}
        <div className="flex items-center gap-2">
          <QuickActionButton
            icon={<Icon icon="solar:bell-linear" className="size-3.5" />}
            label="Set Alert"
            onClick={() => {
              sendMessage("I want to set a price alert. Show me how to create one.").catch(console.error);
            }}
          />
          <QuickActionButton
            icon={<Icon icon="solar:link-linear" className="size-3.5" />}
            label="Copy Link"
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          />
          <QuickActionButton
            icon={<Icon icon="solar:refresh-linear" className="size-3.5" />}
            label="Refresh"
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('polymarket_markets_cache');
                window.dispatchEvent(new CustomEvent('polymarket:refresh-markets'));
              }
            }}
          />
        </div>

        <div className="flex flex-row items-end gap-2">
          <ComposerPrimitive.Input
            placeholder="Ask anything or type / for commands..."
            className="aui-composer-input flex-1 max-h-40 min-h-[24px] resize-none bg-transparent py-1 text-sm outline-none leading-relaxed"
            style={{ color: '#f0f0f0' }}
            rows={1}
            autoFocus
            aria-label="Message input"
            aria-autocomplete="list"
            aria-expanded={showPalette}
            ref={inputRef}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className="flex items-center justify-center size-8 shrink-0 transition-colors"
            style={{
              backgroundColor: isListening ? '#ef4444' : 'rgba(255,255,255,0.08)',
              border: '1px solid',
              borderColor: isListening ? '#ef4444' : 'rgba(255,255,255,0.12)',
              borderRadius: 0,
            }}
            aria-label={isListening ? "Stop recording" : "Voice input"}
          >
            <Icon 
              icon="solar:microphone-bold"
              className="size-4" 
              style={{ color: isListening ? '#fff' : '#a0a0a0' }} 
            />
          </button>
          
          <div className="flex items-center gap-1.5 shrink-0 self-end pb-0.5">
            {composerControl.enabled && <ComposerControls />}
            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send asChild>
                <TooltipIconButton
                  tooltip="Send"
                  side="top"
                  type="submit"
                  size="icon"
                  className="aui-composer-send size-8 shrink-0"
                  style={{ 
                    backgroundColor: '#ff4500', 
                    color: '#000', 
                    borderRadius: 0,
                  }}
                  aria-label="Send message"
                >
                  <Icon icon="solar:arrow-up-bold" className="size-4" />
                </TooltipIconButton>
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>
            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel asChild>
                <Button
                  type="button"
                  size="icon"
                  className="aui-composer-cancel size-8 border shrink-0"
                  style={{ borderRadius: 0, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: '#f0f0f0' }}
                  aria-label="Stop generating"
                >
                  <Icon icon="solar:stop-linear" className="size-3" />
                </Button>
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const QuickActionButton: FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-1.5 px-2 py-1 text-xs font-terminal tracking-wider uppercase transition-colors"
      style={{
        backgroundColor: isHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: '1px solid',
        borderColor: isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
        borderRadius: 0,
        color: '#888',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const ComposerControls: FC = () => {
  const composerControl = useComposerControl();
  const controlBarProps = composerControl.controlBarProps ?? {};
  const hideModel = controlBarProps.hideModel ?? false;
  const hideApp = controlBarProps.hideApp ?? false;
  const hideApiKey = controlBarProps.hideApiKey ?? false;
  const hideWallet = controlBarProps.hideWallet ?? true;
  const hideNetwork = controlBarProps.hideNetwork ?? false;

  return (
    <div className="flex items-center gap-1">
      {!hideNetwork && <NetworkSelect />}
      {!hideModel && <ModelSelect />}
      {!hideApp && <AppSelect />}
      {!hideWallet && <ConnectButton />}
      {!hideApiKey && <ApiKeyInput />}
    </div>
  );
};

const TypingIndicator: FC = () => {
  return (
    <ThreadPrimitive.If running>
      <div className="aui-typing-indicator mx-auto flex w-full max-w-[var(--thread-max-width)] items-center gap-2 px-4 py-2">
        <div className="flex items-center gap-1">
          <span className="size-1.5 animate-bounce rounded-full [animation-delay:0ms]" style={{ backgroundColor: '#ff4500' }} />
          <span className="size-1.5 animate-bounce rounded-full [animation-delay:150ms]" style={{ backgroundColor: '#ff4500' }} />
          <span className="size-1.5 animate-bounce rounded-full [animation-delay:300ms]" style={{ backgroundColor: '#ff4500' }} />
        </div>
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>Thinking</span>
      </div>
    </ThreadPrimitive.If>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 border p-3 text-sm"
        style={{ borderColor: 'rgba(255,0,0,0.3)', backgroundColor: 'rgba(255,0,0,0.05)', color: '#f87171', borderRadius: 0 }}>
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  const content = useMessage((state) => state.content) as Array<{ type: string; text?: string }>;
  const text = content.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('');
  const tradeCard = parseTradeCard(text);
  const showPositions = parsePositionRequest(text);

  return (
    <MessagePrimitive.Root asChild>
      <div
        className="aui-assistant-message-root animate-in fade-in slide-in-from-bottom-1 mx-auto w-full max-w-[var(--thread-max-width)] px-4 py-2 duration-150 ease-out"
        data-role="assistant"
      >
        <div
          className="panel-bracket border"
          style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}
        >
          {/* Header label */}
          <div
            className="flex items-center gap-2 px-4 py-2 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <span className="w-1.5 h-1.5" style={{ backgroundColor: '#ff4500', boxShadow: '0 0 4px rgba(255,69,0,0.6)', flexShrink: 0 }} />
            <span className="font-terminal text-[9px] tracking-[0.2em] uppercase" style={{ color: '#ff4500' }}>
              kuroko AI
            </span>
          </div>

          {/* Message content */}
          <div
            className="aui-assistant-message-content px-4 py-3 break-words text-sm leading-relaxed"
            style={{ color: '#e0e0e0' }}
          >
            <MessagePrimitive.Parts
              components={{
                Text: MarkdownText,
                tools: { Fallback: ToolFallback },
              }}
            />
            {tradeCard && <TradeCard data={tradeCard} />}
            {showPositions && <PositionCard />}
            <MessageError />
          </div>

          {/* Footer actions */}
          <div
            className="aui-assistant-message-footer flex items-center gap-1 px-3 py-1.5 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <BranchPicker />
            <AssistantActionBar />
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root flex gap-1 ml-auto"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton
          tooltip="Copy"
          className="size-6"
          style={{ color: '#555' }}
        >
          <MessagePrimitive.If copied>
            <Icon icon="solar:check-circle-linear" className="size-3" />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <Icon icon="solar:copy-linear" className="size-3" />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton
          tooltip="Regenerate"
          className="size-6"
          style={{ color: '#555' }}
        >
          <Icon icon="solar:refresh-linear" className="size-3" />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const SYSTEM_CONTEXT_PREFIX = '[Session init]';

const UserMessage: FC = () => {
  const content = useMessage((state) => state.content) as Array<{ type: string; text?: string }>;
  const text = content.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('');

  // Hide the injected system context message from the UI
  if (text.startsWith(SYSTEM_CONTEXT_PREFIX)) return null;

  return (
    <MessagePrimitive.Root asChild>
      <div
        className="aui-user-message-root animate-in fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-4 py-3 duration-150 ease-out first:mt-3 last:mb-3 [&:where(>*)]:col-start-2"
        data-role="user"
      >
        <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
          <div
            className="aui-user-message-content break-words px-4 py-2.5 text-sm border"
            style={{
              backgroundColor: '#161616',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 0,
              color: '#f0f0f0',
            }}
          >
            <MessagePrimitive.Parts />
          </div>
          <div className="aui-user-action-bar-wrapper absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-2">
            <UserActionBar />
          </div>
        </div>

        <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      </div>
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <Icon icon="solar:pen-linear" />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <div className="aui-edit-composer-wrapper mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 px-4 first:mt-4">
      <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[80%] flex-col border"
        style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 0 }}>
        <ComposerPrimitive.Input
          className="aui-edit-composer-input flex min-h-[60px] w-full resize-none bg-transparent p-4 text-sm outline-none"
          style={{ color: '#f0f0f0' }}
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center justify-end gap-2">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm" aria-label="Cancel edit" style={{ borderRadius: 0 }}>
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" aria-label="Update message"
              style={{ backgroundColor: '#ff4500', color: '#000', borderRadius: 0 }}>
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ml-2 mr-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <Icon icon="solar:alt-arrow-left-linear" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <Icon icon="solar:alt-arrow-right-linear" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

// SystemMessage — renders as notification toast
const SystemMessage: FC = () => {
  const { showNotification } = useNotification();
  const messageId = useMessage((state) => state.id);
  const content = useMessage((state) => state.content) as Array<{ type: string; text?: string }>;
  const custom = useMessage((state) => state.metadata?.custom) as { kind?: string; title?: string } | undefined;

  useEffect(() => {
    const text = content.filter((p) => p.type === "text").map((p) => p.text ?? "").join("").trim();
    if (!text) return;
    const key = messageId ?? text;
    if (seenSystemMessages.has(key)) return;
    seenSystemMessages.add(key);

    const inferredKind = custom?.kind ?? (text.startsWith("Wallet transaction request:") ? "wallet_tx_request" : "system_notice");
    const type = inferredKind === "system_error" ? "error" : inferredKind === "system_success" ? "success" : "notice";
    const title = custom?.title ?? (inferredKind === "wallet_tx_request" ? "Wallet transaction request" : inferredKind === "system_error" ? "Error" : "System notice");

    showNotification({ type: type as Parameters<typeof showNotification>[0]["type"], title, message: text });
  }, [content, custom, showNotification, messageId]);

  return null;
};
