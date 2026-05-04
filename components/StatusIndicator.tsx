interface StatusIndicatorProps {
  isFallback?: boolean;
  message?: string;
}

export default function StatusIndicator({ isFallback = false, message = '' }: StatusIndicatorProps) {
  const isLive = !isFallback;
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 font-terminal text-[10px] font-bold tracking-widest uppercase"
        style={{ color: isFallback ? '#f59e0b' : '#7c3aed' }}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${isLive ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: isFallback ? '#f59e0b' : '#7c3aed' }}
        />
        {isFallback ? 'Fallback' : 'Live'}
      </span>
      <span className="text-xs" style={{ color: '#555' }}>{message}</span>
    </div>
  );
}
