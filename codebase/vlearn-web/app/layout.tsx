import type { Metadata } from "next";
import { Source_Sans_3, Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VLearn · Học tập có đối chiếu",
  description: "Tóm tắt slide có trích dẫn và kiểm duyệt trước khi lưu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${workSans.variable} ${sourceSans.variable}`}>{children}</body>
    </html>
  );
}


