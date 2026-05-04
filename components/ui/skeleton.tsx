'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse', className)}
      style={{ backgroundColor: '#161616', borderRadius: 8, ...style }}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={{
            height: 12,
            width: i === lines - 1 ? '70%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn('border p-4 space-y-3', className)}
      style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }}
    >
      <div className="flex justify-between items-start">
        <Skeleton style={{ height: 10, width: '60%' }} />
        <Skeleton style={{ height: 24, width: 48 }} />
      </div>
      <Skeleton style={{ height: 14, width: '90%' }} />
      <Skeleton style={{ height: 14, width: '75%' }} />
      <div className="flex gap-3 pt-2">
        <Skeleton style={{ height: 10, width: 40 }} />
        <Skeleton style={{ height: 10, width: 40 }} />
        <Skeleton style={{ height: 10, width: 40 }} />
      </div>
    </div>
  );
}

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div
      className={cn('flex items-center gap-3 px-4 py-3 border-b', className)}
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
    >
      <Skeleton style={{ height: 10, width: '40%' }} />
      <Skeleton className="ml-auto" style={{ height: 10, width: 32 }} />
      <Skeleton className="ml-2" style={{ height: 10, width: 32 }} />
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 20, className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      style={{ minHeight: size }}
    >
      <div
        className="border-[2px] rounded-full animate-spin"
        style={{
          width: size,
          height: size,
          borderColor: 'rgba(124,58,237,0.2)',
          borderTopColor: '#7c3aed',
        }}
      />
    </div>
  );
}

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <LoadingSpinner size={24} />
      {label && (
        <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#333' }}>
          {label}
        </p>
      )}
    </div>
  );
}
