import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/my-valuations", "/valuation/"],
      },
    ],
    sitemap: "https://www.agencyappraiser.com/sitemap.xml",
  }
}
