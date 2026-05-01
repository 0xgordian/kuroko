'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

const MOBILE_NAV = [
  { href: '/trade', label: 'Trade', icon: 'solar:chart-linear' },
  { href: '/markets', label: 'Markets', icon: 'solar:widget-linear' },
  { href: '/', label: 'AI', icon: 'solar:cpu-bolt-linear' },
  { href: '/portfolio', label: 'Portfolio', icon: 'solar:wallet-linear' },
  { href: '/execute', label: 'Execute', icon: 'solar:bolt-linear' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t py-2 px-4 lg:hidden"
      style={{
        backgroundColor: '#0d0d0d',
        borderColor: 'rgba(255,255,255,0.08)',
        zIndex: 50,
      }}
    >
      {MOBILE_NAV.map(({ href, label, icon }) => {
        const isActive = pathname === href || (href === '/' && pathname === '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
            style={{ color: isActive ? '#ff4500' : '#555' }}
          >
            <Icon icon={icon} className="size-5" />
            <span className="text-[10px] font-terminal uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}