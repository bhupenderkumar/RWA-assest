import Link from 'next/link';
import { Sparkles, Github, Twitter, Linkedin, Mail, ArrowUpRight } from 'lucide-react';

const footerLinks = {
  platform: [
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'KYC Verification', href: '/kyc' },
    { name: 'Bank Portal', href: '/bank/dashboard' },
  ],
  resources: [
    { name: 'Documentation', href: '#', external: true },
    { name: 'API Reference', href: '#', external: true },
    { name: 'SDK', href: '#', external: true },
    { name: 'Whitepaper', href: '#', external: true },
  ],
  company: [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#', badge: 'Hiring' },
    { name: 'Blog', href: '#' },
    { name: 'Contact', href: '#' },
  ],
  legal: [
    { name: 'Terms of Service', href: '#' },
    { name: 'Privacy Policy', href: '#' },
    { name: 'Risk Disclosure', href: '#' },
    { name: 'Cookie Policy', href: '#' },
  ],
};

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { name: 'GitHub', href: 'https://github.com', icon: Github },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
  { name: 'Email', href: 'mailto:hello@solanarwa.com', icon: Mail },
];

export function Footer() {
  return (
    <footer className="relative border-t bg-muted/30 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-grid opacity-30" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-solana-purple/5 rounded-full blur-[100px]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-solana-green/5 rounded-full blur-[100px]" />
      
      <div className="container relative z-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2 group mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center group-hover:shadow-glow-sm transition-all duration-300">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl gradient-text">Solana RWA</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Tokenizing real-world assets on Solana. Built for banks, designed for investors. 
              The future of asset ownership is here.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group"
                  >
                    {link.name}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group"
                  >
                    {link.name}
                    {link.external && (
                      <ArrowUpRight className="h-3 w-3 ml-1 opacity-50" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                  >
                    {link.name}
                    {link.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {link.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Solana RWA Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
