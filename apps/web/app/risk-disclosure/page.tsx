import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <Badge className="mb-4" variant="secondary">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Risk Disclosure</h1>
          <p className="text-muted-foreground">Last updated: January 1, 2026</p>
        </div>

        {/* Warning Alert */}
        <Alert className="mb-8 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Important Notice</AlertTitle>
          <AlertDescription className="text-yellow-600/80">
            Investing in tokenized real-world assets involves significant risks.
            You could lose some or all of your investment. Please read this
            disclosure carefully before investing.
          </AlertDescription>
        </Alert>

        {/* Content */}
        <Card>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                1. General Investment Risks
              </h2>
              <p className="text-muted-foreground mb-4">
                All investments carry risk. When investing through the Solana
                RWA platform, you should be aware of the following:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Loss of Capital:</strong> You may lose some or all of
                  your invested capital. Past performance does not guarantee
                  future results.
                </li>
                <li>
                  <strong>No Guaranteed Returns:</strong> There is no assurance
                  that any investment will generate returns or that you will
                  recover your initial investment.
                </li>
                <li>
                  <strong>Long-term Investment:</strong> Tokenized assets may
                  require a long-term investment horizon and may not be suitable
                  for short-term investors.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                2. Liquidity Risks
              </h2>
              <p className="text-muted-foreground mb-4">
                Tokenized real-world assets may have limited liquidity:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Limited Secondary Market:</strong> There may be no
                  active secondary market for certain tokens, making it
                  difficult to sell your investment.
                </li>
                <li>
                  <strong>Lock-up Periods:</strong> Some investments may have
                  mandatory lock-up periods during which you cannot sell or
                  transfer tokens.
                </li>
                <li>
                  <strong>Price Impact:</strong> Selling large positions may
                  significantly impact the token price.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                3. Blockchain and Technology Risks
              </h2>
              <p className="text-muted-foreground mb-4">
                Investing through blockchain technology introduces unique risks:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Smart Contract Vulnerabilities:</strong> Smart
                  contracts may contain bugs or vulnerabilities that could
                  result in loss of funds.
                </li>
                <li>
                  <strong>Network Risks:</strong> The Solana blockchain may
                  experience congestion, downtime, or other technical issues.
                </li>
                <li>
                  <strong>Private Key Loss:</strong> Losing access to your
                  wallet private keys will result in permanent loss of your
                  tokens.
                </li>
                <li>
                  <strong>Hacking and Security:</strong> Despite security
                  measures, the platform or blockchain may be subject to
                  cyberattacks.
                </li>
                <li>
                  <strong>Technology Obsolescence:</strong> Blockchain
                  technology is rapidly evolving and may become obsolete.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                4. Regulatory Risks
              </h2>
              <p className="text-muted-foreground mb-4">
                The regulatory landscape for tokenized assets is evolving:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Regulatory Changes:</strong> Laws and regulations
                  governing tokenized assets may change, potentially affecting
                  your investment.
                </li>
                <li>
                  <strong>Jurisdictional Restrictions:</strong> Certain
                  investments may become restricted or prohibited in your
                  jurisdiction.
                </li>
                <li>
                  <strong>Tax Implications:</strong> Tax treatment of tokenized
                  assets varies by jurisdiction and may change. Consult a tax
                  professional.
                </li>
                <li>
                  <strong>Enforcement Actions:</strong> Regulatory authorities
                  may take enforcement actions that affect the platform or
                  specific assets.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                5. Asset-Specific Risks
              </h2>
              <h3 className="text-lg font-medium mb-3">Real Estate</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Property values may decline</li>
                <li>Rental income may be lower than projected</li>
                <li>Properties may require unexpected repairs</li>
                <li>Environmental or legal issues may arise</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Commodities</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Commodity prices are volatile</li>
                <li>Storage and handling risks</li>
                <li>Quality and authenticity verification</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Receivables</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Default risk from underlying debtors</li>
                <li>Collection challenges</li>
                <li>Economic downturns may increase defaults</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Market Risks</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Market Volatility:</strong> Token prices may
                  experience significant volatility unrelated to underlying
                  asset performance.
                </li>
                <li>
                  <strong>Economic Conditions:</strong> Macroeconomic factors
                  may negatively impact asset values.
                </li>
                <li>
                  <strong>Correlation Risks:</strong> Multiple assets may
                  decline simultaneously during market stress.
                </li>
                <li>
                  <strong>Currency Risk:</strong> Fluctuations in currency
                  exchange rates may affect returns.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Platform Risks</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Operational Risk:</strong> Platform operations may be
                  disrupted by technical failures or other issues.
                </li>
                <li>
                  <strong>Counterparty Risk:</strong> Third-party service
                  providers may fail to perform their obligations.
                </li>
                <li>
                  <strong>Business Continuity:</strong> The platform may cease
                  operations, affecting access to investments.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                8. Investor Suitability
              </h2>
              <p className="text-muted-foreground mb-4">
                Investing in tokenized assets is not suitable for everyone.
                Before investing, consider:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Your investment objectives and risk tolerance</li>
                <li>Your financial situation and liquidity needs</li>
                <li>Your experience with similar investments</li>
                <li>Whether you can afford to lose your entire investment</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We recommend consulting with financial, legal, and tax advisors
                before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Acknowledgment</h2>
              <p className="text-muted-foreground">
                By using the Solana RWA platform, you acknowledge that you have
                read, understood, and accept the risks described in this
                disclosure. You confirm that you are making investment decisions
                independently and that you have sought professional advice where
                appropriate.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/terms-of-service"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Terms of Service
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/privacy-policy"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Privacy Policy
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/cookie-policy"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
