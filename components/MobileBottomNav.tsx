'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

const MOBILE_NAV = [
  { href: '/trade', label: 'Trade', icon: 'solar:chart-2-linear' },
  { href: '/markets', label: 'Markets', icon: 'solar:graph-linear' },
  { href: '/', label: 'Agent', icon: 'solar:dialog-2-linear' },
  { href: '/portfolio', label: 'Portfolio', icon: 'solar:wallet-linear' },
  { href: '/execute', label: 'Execute', icon: 'solar:arrow-right-up-linear' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t py-3 px-2 lg:hidden z-50"
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
            className="flex flex-col items-center gap-1 px-3 py-2.5 transition-colors min-w-[56px]"
            style={{ color: isActive ? '#ff4500' : '#555' }}
          >
            <Icon icon={icon} className="size-5" />
            <span className="text-[11px] font-terminal uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}