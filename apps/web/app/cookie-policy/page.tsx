import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <Badge className="mb-4" variant="secondary">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground">Last updated: January 1, 2026</p>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                1. What Are Cookies
              </h2>
              <p className="text-muted-foreground">
                Cookies are small text files that are stored on your device
                (computer, tablet, or mobile) when you visit our website. They
                help us provide you with a better experience by remembering your
                preferences, analyzing how you use our site, and personalizing
                content.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                2. Types of Cookies We Use
              </h2>

              <h3 className="text-lg font-medium mb-3">Essential Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies are necessary for the website to function
                properly. They enable core functionality such as security,
                authentication, and session management. You cannot disable these
                cookies.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Cookie Name</th>
                      <th className="text-left py-2">Purpose</th>
                      <th className="text-left py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">session_id</td>
                      <td className="py-2">User session management</td>
                      <td className="py-2">Session</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">auth_token</td>
                      <td className="py-2">Authentication state</td>
                      <td className="py-2">7 days</td>
                    </tr>
                    <tr>
                      <td className="py-2">csrf_token</td>
                      <td className="py-2">Security protection</td>
                      <td className="py-2">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-medium mb-3">Performance Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies collect information about how you use our website,
                such as which pages you visit most often. This data helps us
                improve the website's performance and user experience.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Cookie Name</th>
                      <th className="text-left py-2">Purpose</th>
                      <th className="text-left py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">_ga</td>
                      <td className="py-2">Google Analytics tracking</td>
                      <td className="py-2">2 years</td>
                    </tr>
                    <tr>
                      <td className="py-2">_gid</td>
                      <td className="py-2">Google Analytics session</td>
                      <td className="py-2">24 hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-medium mb-3">Functional Cookies</h3>
              <p className="text-muted-foreground mb-4">
                These cookies remember your preferences and choices to provide
                enhanced functionality and personalization.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Cookie Name</th>
                      <th className="text-left py-2">Purpose</th>
                      <th className="text-left py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">theme</td>
                      <td className="py-2">Light/dark mode preference</td>
                      <td className="py-2">1 year</td>
                    </tr>
                    <tr>
                      <td className="py-2">language</td>
                      <td className="py-2">Language preference</td>
                      <td className="py-2">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                3. Third-Party Cookies
              </h2>
              <p className="text-muted-foreground mb-4">
                We may use third-party services that set their own cookies:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Analytics:</strong> Google Analytics for website usage
                  analysis
                </li>
                <li>
                  <strong>Security:</strong> Cloudflare for DDoS protection and
                  security
                </li>
                <li>
                  <strong>Verification:</strong> Civic for identity verification
                  services
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                These third parties have their own privacy policies governing
                how they use information collected through their cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                4. Managing Cookies
              </h2>
              <p className="text-muted-foreground mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Browser Settings:</strong> Most browsers allow you to
                  view, manage, and delete cookies through their settings.
                </li>
                <li>
                  <strong>Cookie Preferences:</strong> Use our cookie consent
                  banner to manage your preferences.
                </li>
                <li>
                  <strong>Opt-out Links:</strong> Use third-party opt-out tools
                  like the Google Analytics opt-out browser add-on.
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Note: Disabling certain cookies may affect the functionality of
                our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                5. Browser-Specific Instructions
              </h2>
              <p className="text-muted-foreground mb-4">
                To manage cookies in your browser:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Chrome:</strong> Settings → Privacy and Security →
                  Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Preferences → Privacy & Security →
                  Cookies
                </li>
                <li>
                  <strong>Safari:</strong> Preferences → Privacy → Cookies
                </li>
                <li>
                  <strong>Edge:</strong> Settings → Privacy, Search and Services
                  → Cookies
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                6. Local Storage and Similar Technologies
              </h2>
              <p className="text-muted-foreground">
                In addition to cookies, we may use local storage and other
                similar technologies to store information on your device. This
                includes storing your wallet connection preferences and session
                data. These technologies are subject to the same controls as
                cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                7. Updates to This Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Cookie Policy from time to time to reflect
                changes in our practices or for other operational, legal, or
                regulatory reasons. We encourage you to review this page
                periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about our use of cookies, please contact
                us at{" "}
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
            href="/privacy-policy"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Privacy Policy
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/risk-disclosure"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Risk Disclosure
          </Link>
        </div>
      </div>
    </div>
  );
}
