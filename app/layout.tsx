import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/use-auth"


const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
const BASE_URL = "https://www.agencyappraiser.com"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Agency Appraiser | Insurance Agency Valuation & M&A Tools",
    template: "%s | Agency Appraiser",
  },
  description:
    "Free insurance agency valuation tools for independent agents and brokers. Get an instant estimate, run a full 7-category scorecard, or upload your AMS data to find out what your book of business is worth in today's M&A market.",
  keywords: [
    "insurance agency valuation",
    "insurance agency worth",
    "sell insurance agency",
    "insurance agency acquisition",
    "insurance book of business value",
    "independent insurance agency sale",
    "P&C agency multiple",
    "insurance M&A",
    "buy sell insurance agency",
    "agency appraisal",
    "insurance agency calculator",
    "EZLynx valuation",
  ],
  authors: [{ name: "Agency Appraiser" }],
  creator: "Agency Appraiser",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Agency Appraiser",
    title: "Agency Appraiser | Insurance Agency Valuation & M&A Tools",
    description:
      "Find out what your insurance agency is worth. Data-driven valuation tools built for independent agents, brokers, and buyers.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Agency Appraiser — Insurance Agency Valuation" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agency Appraiser | Insurance Agency Valuation & M&A Tools",
    description:
      "Find out what your insurance agency is worth. Free tools for independent P&C agents and brokers.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: BASE_URL },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('agency-appraiser-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark');localStorage.setItem('agency-appraiser-theme','light')}}catch(e){}})()`,
          }}
        />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Agency Appraiser",
              applicationCategory: "BusinessApplication",
              url: BASE_URL,
              description:
                "Free insurance agency valuation calculator. Get an instant estimate or run a full 7-category M&A scorecard for your independent P&C insurance agency.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              audience: {
                "@type": "Audience",
                audienceType: "Insurance agents, brokers, agency buyers and sellers",
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>

        {/* Microsoft Clarity — domain-locked: only fires on agencyappraiser.com */}
        {CLARITY_ID && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`
              (function() {
                var isProduction = typeof window !== 'undefined' &&
                  (window.location.hostname === 'www.agencyappraiser.com' ||
                   window.location.hostname === 'agencyappraiser.com');
                if (!isProduction) return;
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${CLARITY_ID}");
              })();
            `}
          </Script>
        )}

        {/* Meta Pixel — domain-locked: only fires on agencyappraiser.com */}
        {FB_PIXEL_ID && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              (function() {
                var isProduction = typeof window !== 'undefined' &&
                  (window.location.hostname === 'www.agencyappraiser.com' ||
                   window.location.hostname === 'agencyappraiser.com');
                if (!isProduction) return;
                !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
                n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
                document,'script','https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${FB_PIXEL_ID}');
                fbq('track', 'PageView');
              })();
            `}
          </Script>
        )}

        {/* Google Analytics GA4 — domain-locked: only fires on agencyappraiser.com */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                (function() {
                  var isProduction = typeof window !== 'undefined' &&
                    (window.location.hostname === 'www.agencyappraiser.com' ||
                     window.location.hostname === 'agencyappraiser.com');
                  if (!isProduction) return;
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                })();
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
