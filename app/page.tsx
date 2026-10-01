"use client";

import Nav from "@/components/Nav";
import Projects from "@/components/Projects";
import About from "@/components/Skills";
import Contact from "@/components/Blog";
import ThreeBackground from "@/components/ThreeBackground";

export default function Home() {
  return (
    <>
      <ThreeBackground />
      <div className="relative z-[1] mx-auto min-h-screen max-w-screen-2xl px-6 py-12 md:px-12 md:py-20 lg:px-24 lg:py-0">
        <div className="lg:flex lg:justify-between lg:gap-4">
          <Nav />
          <main className="flex flex-col pt-6 lg:pt-24 lg:w-1/2 lg:py-24 gap-16 md:gap-24">
            <div className="flex flex-col gap-4">
              <About />
            </div>
            <Projects />
            <Contact />
          </main>
        </div>
      </div>
    </>
  );
}
