'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LineChartIcon,
  SearchIcon,
  WalletIcon,
  LayoutGridIcon,
  ZapIcon,
} from 'lucide-react';

const MOBILE_NAV = [
  { href: '/trade', label: 'Trade', icon: SearchIcon },
  { href: '/markets', label: 'Markets', icon: LayoutGridIcon },
  { href: '/', label: 'AI', icon: LineChartIcon },
  { href: '/portfolio', label: 'Portfolio', icon: WalletIcon },
  { href: '/execute', label: 'Execute', icon: ZapIcon },
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
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href === '/' && pathname === '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
            style={{ color: isActive ? '#ff4500' : '#555' }}
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-terminal uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}