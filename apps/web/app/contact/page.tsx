'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, 
  MessageSquare, 
  Building2, 
  HelpCircle,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';

const contactOptions = [
  {
    icon: HelpCircle,
    title: 'General Inquiries',
    description: 'Questions about our platform or services',
    email: 'hello@solanarwa.com'
  },
  {
    icon: Building2,
    title: 'Bank Partnerships',
    description: 'Interested in tokenizing assets with us',
    email: 'partnerships@solanarwa.com'
  },
  {
    icon: MessageSquare,
    title: 'Investor Support',
    description: 'Help with your investments or account',
    email: 'support@solanarwa.com'
  },
  {
    icon: Mail,
    title: 'Press & Media',
    description: 'Media inquiries and press requests',
    email: 'press@solanarwa.com'
  }
];

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { name: 'GitHub', href: 'https://github.com', icon: Github },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin }
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">Contact Us</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions about Solana RWA? We're here to help. 
              Reach out and our team will get back to you within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactOptions.map((option) => (
              <Card key={option.title} className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <option.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{option.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                <a 
                  href={`mailto:${option.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {option.email}
                </a>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-6">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="How can we help?" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us more about your inquiry..." 
                        rows={5}
                        required 
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Info Section */}
            <div className="space-y-8">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Our Location
                </h3>
                <p className="text-muted-foreground">
                  We're a remote-first company with team members across the globe. 
                  Our headquarters is registered in:
                </p>
                <p className="mt-2">
                  123 Blockchain Avenue<br />
                  San Francisco, CA 94105<br />
                  United States
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Response Time
                </h3>
                <p className="text-muted-foreground">
                  Our support team is available Monday through Friday, 9am - 6pm PST. 
                  We typically respond to all inquiries within 24 hours during business days.
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Connect With Us</h3>
                <p className="text-muted-foreground mb-4">
                  Follow us on social media for the latest updates and announcements.
                </p>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      aria-label={social.name}
                    >
                      <social.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <Card className="max-w-2xl mx-auto text-center p-8">
            <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Looking for Quick Answers?</h2>
            <p className="text-muted-foreground mb-6">
              Check out our documentation for detailed guides and frequently asked questions.
            </p>
            <Button variant="outline" asChild>
              <a href="/docs/architecture/ARCHITECTURE">View Documentation</a>
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
