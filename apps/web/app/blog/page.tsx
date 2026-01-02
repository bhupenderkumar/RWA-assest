import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, User } from 'lucide-react';

const featuredPost = {
  title: 'The Future of Real-World Asset Tokenization on Solana',
  excerpt: 'Explore how blockchain technology is revolutionizing the way we invest in real-world assets, from real estate to commodities.',
  author: 'Sarah Chen',
  date: 'December 28, 2025',
  readTime: '8 min read',
  category: 'Industry Insights',
  image: null
};

const posts = [
  {
    title: 'Understanding KYC/AML in Tokenized Asset Markets',
    excerpt: 'A comprehensive guide to regulatory compliance in the world of tokenized real-world assets.',
    author: 'Emily Thompson',
    date: 'December 20, 2025',
    readTime: '6 min read',
    category: 'Compliance'
  },
  {
    title: 'How Banks Are Adopting Asset Tokenization',
    excerpt: 'Traditional financial institutions are increasingly turning to blockchain for asset management.',
    author: 'Michael Rodriguez',
    date: 'December 15, 2025',
    readTime: '5 min read',
    category: 'Banking'
  },
  {
    title: 'Fractional Ownership: Democratizing Real Estate Investment',
    excerpt: 'Learn how tokenization is making premium real estate accessible to everyday investors.',
    author: 'David Kim',
    date: 'December 10, 2025',
    readTime: '7 min read',
    category: 'Real Estate'
  },
  {
    title: 'Solana vs Other Chains for RWA Tokenization',
    excerpt: 'Why Solana is becoming the preferred blockchain for real-world asset tokenization.',
    author: 'Sarah Chen',
    date: 'December 5, 2025',
    readTime: '6 min read',
    category: 'Technology'
  },
  {
    title: 'Building Your First Tokenized Asset Portfolio',
    excerpt: 'A beginner-friendly guide to getting started with tokenized asset investments.',
    author: 'Michael Rodriguez',
    date: 'November 28, 2025',
    readTime: '10 min read',
    category: 'Guides'
  },
  {
    title: 'The Role of Smart Contracts in Asset Management',
    excerpt: 'Exploring how smart contracts automate and secure real-world asset transactions.',
    author: 'David Kim',
    date: 'November 20, 2025',
    readTime: '8 min read',
    category: 'Technology'
  }
];

const categories = ['All', 'Industry Insights', 'Technology', 'Guides', 'Compliance', 'Banking', 'Real Estate'];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">Blog</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Insights & Updates
            </h1>
            <p className="text-xl text-muted-foreground">
              Stay informed about the latest in real-world asset tokenization, 
              industry trends, and platform updates.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Badge 
                key={category} 
                variant={category === 'All' ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12">
        <div className="container">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center min-h-[300px]">
                <div className="text-center p-8">
                  <Badge className="mb-4">{featuredPost.category}</Badge>
                  <p className="text-muted-foreground">Featured Article</p>
                </div>
              </div>
              <CardContent className="p-8 flex flex-col justify-center">
                <Badge variant="secondary" className="w-fit mb-4">Featured</Badge>
                <h2 className="text-2xl font-bold mb-4">{featuredPost.title}</h2>
                <p className="text-muted-foreground mb-6">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {featuredPost.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {featuredPost.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {featuredPost.readTime}
                  </span>
                </div>
                <Button className="w-fit">
                  Read Article
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <Card key={index} className="group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Badge variant="secondary">{post.category}</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{post.excerpt}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <Card className="max-w-2xl mx-auto text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Subscribe to Our Newsletter</h2>
            <p className="text-muted-foreground mb-6">
              Get the latest insights on RWA tokenization delivered to your inbox weekly.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-2 rounded-lg border bg-background"
              />
              <Button>Subscribe</Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
