import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Les médias du projet sont hébergés sur Cloudinary. Sans cette
    // déclaration, next/image refuse l'URL et la page plante au rendu.
    // Le hostname est commun à tous les comptes ; seul le cloud name change,
    // et il fait partie du chemin.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
