"use client"

import { useEffect, useRef } from "react"
import { Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export default function ContactPage() {
  const heroTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroTextRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.1 }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-bloom-dark">

      {/* HERO */}
      <section className="pt-32 pb-16 lg:pt-48 lg:pb-28 px-8 lg:px-16 max-w-4xl mx-auto">
        <div ref={heroTextRef}>
          <h1 className="font-serif text-[clamp(3rem,5.5vw,5.5rem)] leading-[1.0] text-[#2C1810] tracking-tight mb-6">
            Get in touch.
          </h1>
          <p className="text-[1.0625rem] text-stone-500 leading-relaxed max-w-sm font-light">
            Whether you're a resident, florist, or property manager, we'd love to hear from you.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="border-t border-stone-200 py-14 lg:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6 lg:px-16">
          <form className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm text-stone-600 mb-2">Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 bg-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm text-stone-600 mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 bg-white"
                />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm text-stone-600 mb-2">Subject</label>
              <input
                id="subject"
                type="text"
                placeholder="What's this about?"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 bg-white"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm text-stone-600 mb-2">Message</label>
              <textarea
                id="message"
                rows={6}
                placeholder="Tell us what's on your mind..."
                className="w-full px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 bg-white resize-none"
              />
            </div>
            <Button type="submit"
              className="bg-[#2C1810] hover:bg-stone-900 text-white rounded-lg px-8 py-5 text-sm font-medium tracking-wide transition-transform hover:scale-[1.02]">
              Send message
            </Button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-stone-800 bg-[#2C1810] py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-bloom-sage" />
            <span className="font-serif text-lg text-white">Bloom</span>
          </div>
          <div className="flex gap-10 text-sm text-stone-500">
            <a href="/florists"          className="hover:text-white transition-colors">Florists</a>
            <a href="/property-managers" className="hover:text-white transition-colors">Properties</a>
            <a href="/contact"           className="hover:text-white transition-colors">Contact</a>
          </div>
          <span className="text-xs text-stone-600">© 2026 Bloom</span>
        </div>
      </footer>

    </div>
  )
}
