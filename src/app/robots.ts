import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: ["/app/", "/api/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://hr.novabos.co.za"}/sitemap.xml`,
  };
}
