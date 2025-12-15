'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building2,
  Coins,
  Home,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

const sidebarItems = [
  { name: 'Dashboard', href: '/bank/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/bank/assets', icon: Building2 },
  { name: 'Investors', href: '/bank/investors', icon: Users },
  { name: 'Analytics', href: '/bank/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/bank/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-muted/30">
      <div className="p-6">
        <Link href="/bank/dashboard" className="flex items-center space-x-2">
          <Coins className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Bank Portal</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </aside>
  );
}
