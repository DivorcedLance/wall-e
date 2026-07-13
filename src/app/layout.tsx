import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SplashProvider } from "@/components/SplashProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "W.A.L.L.-E. — Orquestación de Podadoras Autónomas",
    template: "%s | W.A.L.L.-E.",
  },
  description:
    "Editor isométrico offline para crear, editar y simular espacios verdes con flotas de podadoras autónomas. Planificación inteligente, rutas optimizadas y gestión de batería en tiempo real.",
  keywords: [
    "podadoras autónomas",
    "orquestación de flotas",
    "editor isométrico",
    "jardín inteligente",
    "robot cortacésped",
    "planificación de rutas",
    "gestión de flotas",
    "autonomous mowers",
    "fleet orchestration",
  ],
  authors: [{ name: "W.A.L.L.-E. Team" }],
  creator: "W.A.L.L.-E.",
  publisher: "W.A.L.L.-E.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://walle.app",
    siteName: "W.A.L.L.-E.",
    title: "W.A.L.L.-E. — Orquestación de Podadoras Autónomas",
    description:
      "Editor isométrico offline para crear, editar y simular espacios verdes con flotas de podadoras autónomas.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "W.A.L.L.-E. Editor Isométrico",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "W.A.L.L.-E. — Orquestación de Podadoras Autónomas",
    description:
      "Editor isométrico offline para crear, editar y simular espacios verdes con flotas de podadoras autónomas.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider>
          <SplashProvider>{children}</SplashProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
