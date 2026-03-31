"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { getCognitoSignupUrl } from "@/lib/cognito"

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    num: "01",
    title: "Connect your Shopify store",
    desc: "Link your existing store to Bloom. Your products, your pricing, already in the system.",
  },
  {
    num: "02",
    title: "Map your arrangements to our tiers",
    desc: "Assign your arrangements to Petit, Grand, or Luxe. Bloom routes the right orders to the right products automatically.",
  },
  {
    num: "03",
    title: "Orders appear in your system",
    desc: "When residents subscribe, orders flow directly into Shopify. No manual entry, no extra tools.",
  },
  {
    num: "04",
    title: "Deliver to the building",
    desc: "One stop, multiple residents. Building access is coordinated. You show up and deliver.",
  },
]

const BENEFITS = [
  {
    title: "Predictable volume",
    desc: "Subscriptions mean you know your order count before the week starts. No slow days, no guessing.",
  },
  {
    title: "Efficient routes",
    desc: "All your Bloom deliveries go to one building per stop. Less driving, more delivering.",
  },
  {
    title: "Grow your catalog",
    desc: "Recommend new products directly in the app. If residents upgrade, it runs through your Shopify store.",
  },
]

export default function FloristsPage() {
  const heroTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroTextRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.1 }
      )
      gsap.utils.toArray<HTMLElement>(".reveal").forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%" } }
        )
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-bloom-dark">

      {/* HERO */}
      <section className="min-h-[100svh] grid lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 lg:px-16 pt-32 pb-16 lg:pt-32 lg:pb-0">
          <div ref={heroTextRef}>
            <h1 className="font-serif text-[clamp(3rem,5.5vw,5.5rem)] leading-[1.0] text-[#2C1810] tracking-tight mb-6">
              A steady stream<br />
              of orders from<br />
              <em className="not-italic text-bloom-sage">local buildings.</em>
            </h1>
            <p className="text-[1.0625rem] text-stone-500 leading-relaxed mb-10 max-w-sm font-light">
              Bloom connects your shop to apartment buildings in your area. Integrated with Shopify so orders land in your system automatically.
            </p>
            <Button asChild
              className="bg-[#2C1810] hover:bg-stone-900 text-white rounded-lg px-8 py-5 text-sm font-medium tracking-wide transition-transform hover:scale-[1.02]">
              <a href={getCognitoSignupUrl()}>Apply to partner</a>
            </Button>
          </div>
        </div>
        <div className="relative min-h-[50vw] lg:min-h-0">
          <Image
            src="/florist.png"
            alt="Florist arranging fresh flowers"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="hidden lg:block absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#FFFBF7] to-transparent" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-stone-200 py-14 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-6 lg:gap-24 mb-10 lg:mb-16">
            <div className="reveal">
              <span className="text-[0.6875rem] tracking-[0.28em] uppercase text-stone-400 font-medium">How it works</span>
            </div>
            <p className="reveal font-serif text-2xl md:text-3xl text-stone-800 font-light leading-snug">
              Connect once. Orders come to you.
            </p>
          </div>
          {STEPS.map((step, i) => (
            <div key={i} className="reveal grid lg:grid-cols-[1fr_2fr] gap-3 lg:gap-24 py-6 lg:py-8 border-t border-stone-100">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-2xl text-stone-200 select-none leading-none shrink-0">{step.num}</span>
                <h3 className="font-serif text-lg text-stone-900 leading-snug">{step.title}</h3>
              </div>
              <p className="text-[0.9375rem] text-stone-500 leading-relaxed max-w-lg pl-10 lg:pl-0">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-t border-stone-200 py-14 lg:py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-6 lg:gap-24 mb-10 lg:mb-16">
            <div className="reveal">
              <span className="text-[0.6875rem] tracking-[0.28em] uppercase text-stone-400 font-medium">Why Bloom</span>
            </div>
            <p className="reveal font-serif text-2xl md:text-3xl text-stone-800 font-light leading-snug">
              Built around how florists actually work.
            </p>
          </div>
          {BENEFITS.map((b, i) => (
            <div key={i} className="reveal grid lg:grid-cols-[1fr_2fr] gap-3 lg:gap-24 py-6 lg:py-8 border-t border-stone-100">
              <h3 className="font-serif text-lg text-stone-900 leading-snug">{b.title}</h3>
              <p className="text-[0.9375rem] text-stone-500 leading-relaxed max-w-lg">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-[#2C1810] text-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <p className="reveal font-serif text-3xl md:text-4xl lg:text-5xl leading-tight mb-4 font-light">
            Ready to grow with Bloom?
          </p>
          <p className="reveal text-stone-400 text-[1.0625rem] mb-10 font-light">
            Apply to partner and we'll reach out to get you set up.
          </p>
          <Button asChild
            className="reveal bg-white text-[#2C1810] hover:bg-stone-100 rounded-lg px-10 py-5 text-sm font-medium tracking-wide transition-transform hover:scale-[1.02]">
            <a href={getCognitoSignupUrl()}>Apply to partner</a>
          </Button>
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
