import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Sparkles, 
  Shield, 
  Globe, 
  Users, 
  Target, 
  Zap,
  Building2,
  TrendingUp,
  Lock
} from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Security First',
    description: 'We prioritize the security of your assets and data with enterprise-grade infrastructure and smart contract audits.'
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Breaking down barriers to make real-world asset investment accessible to investors worldwide.'
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Built with feedback from our community of investors, banks, and asset managers.'
  },
  {
    icon: Zap,
    title: 'Innovation',
    description: 'Leveraging cutting-edge blockchain technology to revolutionize asset ownership.'
  }
];

const stats = [
  { label: 'Assets Tokenized', value: '$50M+' },
  { label: 'Active Investors', value: '10,000+' },
  { label: 'Partner Banks', value: '25+' },
  { label: 'Countries', value: '40+' }
];

const team = [
  { name: 'Sarah Chen', role: 'CEO & Co-Founder', image: null },
  { name: 'Michael Rodriguez', role: 'CTO & Co-Founder', image: null },
  { name: 'Emily Thompson', role: 'Head of Compliance', image: null },
  { name: 'David Kim', role: 'Head of Engineering', image: null }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">About Solana RWA</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Democratizing Real-World Asset Investment
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              We're building the future of asset ownership on Solana, making it possible for anyone 
              to invest in premium real-world assets that were once only accessible to institutions.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4" variant="outline">Our Mission</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Bridging Traditional Finance and Blockchain
              </h2>
              <p className="text-muted-foreground mb-6">
                Solana RWA was founded with a simple yet ambitious goal: to tokenize real-world assets 
                and make investment opportunities accessible to everyone, regardless of their location 
                or net worth.
              </p>
              <p className="text-muted-foreground mb-6">
                By leveraging Solana's high-speed, low-cost blockchain infrastructure, we enable 
                fractional ownership of premium assets including real estate, commodities, and 
                financial instruments.
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/marketplace">Explore Assets</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <Building2 className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">For Banks</h3>
                <p className="text-sm text-muted-foreground">
                  Tokenize and distribute assets to a global investor base
                </p>
              </Card>
              <Card className="p-6">
                <TrendingUp className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">For Investors</h3>
                <p className="text-sm text-muted-foreground">
                  Access institutional-grade investments with any amount
                </p>
              </Card>
              <Card className="p-6">
                <Lock className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Compliant</h3>
                <p className="text-sm text-muted-foreground">
                  Full regulatory compliance with KYC/AML requirements
                </p>
              </Card>
              <Card className="p-6">
                <Sparkles className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Transparent</h3>
                <p className="text-sm text-muted-foreground">
                  All transactions recorded on-chain for full transparency
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Our Values</Badge>
            <h2 className="text-3xl font-bold mb-4">What Drives Us</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our core values guide every decision we make and shape the platform we're building.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Our Team</Badge>
            <h2 className="text-3xl font-bold mb-4">Leadership</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A team of experts from finance, blockchain, and technology working together 
              to revolutionize asset ownership.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <Card key={member.name} className="text-center p-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-transparent to-primary/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of investors already using Solana RWA to build their portfolios.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/marketplace">Start Investing</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Talk to Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
