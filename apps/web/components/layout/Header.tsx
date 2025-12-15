'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Building2, Coins, Menu, X, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'KYC', href: '/kyc' },
];

const bankNavigation = [
  { name: 'Dashboard', href: '/bank/dashboard' },
  { name: 'Assets', href: '/bank/assets' },
  { name: 'Investors', href: '/bank/investors' },
  { name: 'Analytics', href: '/bank/analytics' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isBankPortal = pathname.startsWith('/bank');

  const navItems = isBankPortal ? bankNavigation : navigation;

  // Prevent hydration mismatch by only rendering icons after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled 
          ? 'bg-background/80 backdrop-blur-xl border-b shadow-sm' 
          : 'bg-transparent'
      )}
    >
      <nav className="container flex h-16 lg:h-20 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center group-hover:shadow-glow-sm transition-all duration-300">
              {mounted && <Sparkles className="h-5 w-5 text-white" />}
            </div>
          </div>
          <span className="font-bold text-xl hidden sm:inline-block gradient-text">
            Solana RWA
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300',
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {item.name}
              {pathname === item.href && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {!isBankPortal && (
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="hidden lg:flex hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/bank/dashboard">
                {mounted && <Building2 className="mr-2 h-4 w-4" />}
                Bank Portal
              </Link>
            </Button>
          )}
          {isBankPortal && (
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="hidden lg:flex hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/marketplace">
                {mounted && <Coins className="mr-2 h-4 w-4" />}
                Investor Portal
              </Link>
            </Button>
          )}
          <WalletButton />

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mounted && (mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div 
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="container py-4 space-y-1 bg-background/95 backdrop-blur-xl border-t">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'block py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300',
                pathname === item.href
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t">
            {!isBankPortal ? (
              <Link
                href="/bank/dashboard"
                className="flex items-center py-3 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                {mounted && <Building2 className="mr-2 h-4 w-4" />}
                Bank Portal
              </Link>
            ) : (
              <Link
                href="/marketplace"
                className="flex items-center py-3 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                {mounted && <Coins className="mr-2 h-4 w-4" />}
                Investor Portal
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
