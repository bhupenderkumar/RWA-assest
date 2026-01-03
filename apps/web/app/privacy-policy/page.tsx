import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <Badge className="mb-4" variant="secondary">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 1, 2026</p>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                Solana RWA ("we", "our", or "us") is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                2. Information We Collect
              </h2>
              <h3 className="text-lg font-medium mb-3">Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                We may collect personal information that you provide directly,
                including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Full name and contact information</li>
                <li>Government-issued identification documents</li>
                <li>Proof of address</li>
                <li>Financial information for accreditation verification</li>
                <li>Wallet addresses</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">
                Automatically Collected Information
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Device and browser information</li>
                <li>IP address and location data</li>
                <li>Usage patterns and preferences</li>
                <li>Transaction history on the platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground mb-4">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Verify your identity (KYC/AML compliance)</li>
                <li>Process transactions and manage your account</li>
                <li>Provide customer support</li>
                <li>Send important updates and notifications</li>
                <li>Improve our platform and services</li>
                <li>Detect and prevent fraud or illegal activities</li>
                <li>Comply with legal and regulatory requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                4. Information Sharing
              </h2>
              <p className="text-muted-foreground mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>KYC/AML verification providers</li>
                <li>Payment processors and custodians</li>
                <li>Regulatory authorities when required by law</li>
                <li>Service providers who assist in operating our platform</li>
                <li>Professional advisors (lawyers, accountants)</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational security
                measures to protect your personal information, including
                encryption, access controls, and regular security assessments.
                However, no method of transmission over the Internet is 100%
                secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to
                provide our services and comply with legal obligations. KYC/AML
                records may be retained for a minimum of 5 years after the end
                of our business relationship, as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your jurisdiction, you may have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, please contact us at{" "}
                <a
                  href="mailto:privacy@solanarwa.com"
                  className="text-primary hover:underline"
                >
                  privacy@solanarwa.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                8. International Transfers
              </h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in
                countries other than your country of residence. We ensure
                appropriate safeguards are in place to protect your information
                in compliance with applicable data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your
                experience. For more information, please see our{" "}
                <Link
                  href="/cookie-policy"
                  className="text-primary hover:underline"
                >
                  Cookie Policy
                </Link>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new policy on
                this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact
                our Data Protection Officer at{" "}
                <a
                  href="mailto:privacy@solanarwa.com"
                  className="text-primary hover:underline"
                >
                  privacy@solanarwa.com
                </a>
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
            href="/risk-disclosure"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Risk Disclosure
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
