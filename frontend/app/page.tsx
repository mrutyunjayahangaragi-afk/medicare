"use client";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Statistics from "@/components/landing/Statistics";
import HowItWorks from "@/components/landing/HowItWorks";
import CtaBanner from "@/components/landing/CtaBanner";
import About from "@/components/landing/About";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen" suppressHydrationWarning>
      <Navbar />
      <Hero />
      <Features />
      <Statistics />
      <HowItWorks />
      <CtaBanner />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
