interface ExecutionBadgeProps {
  mode: 'PAPER_TRADE' | 'SIGNING_REQUIRED' | 'EXECUTED';
}

export default function ExecutionBadge({ mode }: ExecutionBadgeProps) {
  const palette =
    mode === 'EXECUTED'
      ? {
          borderColor: 'rgba(124,58,237,0.4)',
          color: '#a78bfa',
          dot: '#7c3aed',
          label: 'Executed',
        }
      : mode === 'SIGNING_REQUIRED'
        ? {
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#f0f0f0',
            dot: '#f0f0f0',
            label: 'Ready to Sign',
          }
        : {
            borderColor: 'rgba(255,255,255,0.12)',
            color: '#555',
            dot: '#333',
            label: 'Paper',
          };
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-terminal text-[10px] font-bold tracking-widest uppercase border"
      style={{
        borderColor: palette.borderColor,
        color: palette.color,
        borderRadius: 8,
      }}>
      <span className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: palette.dot }} />
      {palette.label}
    </span>
  );
}
