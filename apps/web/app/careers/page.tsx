import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  MapPin, 
  Clock, 
  Users, 
  Heart, 
  Laptop, 
  GraduationCap,
  Coffee,
  Plane,
  DollarSign,
  ArrowRight,
  Building2,
  Code,
  Megaphone,
  Shield
} from 'lucide-react';

const benefits = [
  { icon: DollarSign, title: 'Competitive Salary', description: 'Top-tier compensation with equity options' },
  { icon: Heart, title: 'Health Insurance', description: 'Comprehensive medical, dental, and vision' },
  { icon: Laptop, title: 'Remote First', description: 'Work from anywhere in the world' },
  { icon: Plane, title: 'Unlimited PTO', description: 'Take the time you need to recharge' },
  { icon: GraduationCap, title: 'Learning Budget', description: '$2,000 annual learning stipend' },
  { icon: Coffee, title: 'Home Office', description: '$1,000 home office setup allowance' }
];

const openPositions = [
  {
    title: 'Senior Blockchain Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    icon: Code,
    description: 'Build and optimize smart contracts on Solana for real-world asset tokenization.'
  },
  {
    title: 'Full Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    icon: Code,
    description: 'Develop our web platform using Next.js, React, and TypeScript.'
  },
  {
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote',
    type: 'Full-time',
    icon: Building2,
    description: 'Lead product development for our investor and banking platforms.'
  },
  {
    title: 'Compliance Officer',
    department: 'Legal & Compliance',
    location: 'New York / Remote',
    type: 'Full-time',
    icon: Shield,
    description: 'Ensure regulatory compliance across all jurisdictions we operate in.'
  },
  {
    title: 'Growth Marketing Manager',
    department: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    icon: Megaphone,
    description: 'Drive user acquisition and engagement through data-driven marketing strategies.'
  },
  {
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    icon: Code,
    description: 'Build and maintain our cloud infrastructure and CI/CD pipelines.'
  }
];

const values = [
  { title: 'Move Fast', description: 'We ship quickly and iterate based on feedback.' },
  { title: 'Think Long-term', description: 'We build for sustainability and lasting impact.' },
  { title: 'Be Transparent', description: 'We communicate openly and honestly.' },
  { title: 'Stay Curious', description: 'We never stop learning and improving.' }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              We're Hiring!
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join the Future of Finance
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Help us build the infrastructure that will democratize access to real-world asset investment.
              We're a remote-first team passionate about blockchain and financial innovation.
            </p>
            <Button size="lg" asChild>
              <a href="#positions">
                View Open Positions
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Our Culture</Badge>
            <h2 className="text-3xl font-bold mb-4">What We Value</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center p-6">
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Benefits</Badge>
            <h2 className="text-3xl font-bold mb-4">Why Work With Us</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer competitive compensation and benefits to support your wellbeing and growth.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section id="positions" className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Open Positions</Badge>
            <h2 className="text-3xl font-bold mb-4">Join Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're looking for talented individuals who are passionate about blockchain and finance.
            </p>
          </div>
          <div className="space-y-4 max-w-4xl mx-auto">
            {openPositions.map((position, index) => (
              <Card key={index} className="group cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <position.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {position.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">{position.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              <Building2 className="h-3 w-3 mr-1" />
                              {position.department}
                            </Badge>
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {position.location}
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {position.type}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" className="shrink-0">
                          Apply
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Don't See the Right Role?</h2>
            <p className="text-muted-foreground mb-6">
              We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <Button size="lg" asChild>
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
