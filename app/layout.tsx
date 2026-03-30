import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import ToastContainer from "../components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FilForge — Universal File Hub",
  description:
    "Convert images in bulk, merge & split PDFs, and organize pages with drag-and-drop. Fast, private, no cloud storage.",
  keywords: ["image converter", "PDF merge", "PDF split", "bulk file converter", "file tools"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-surface-0 text-white antialiased`} suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-64 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
