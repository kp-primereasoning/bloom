"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    num: "01",
    title: "Your building signs up",
    desc: "The property manager brings us on as an amenity. They handle the florist access and scheduling. You don't have to make this happen.",
  },
  {
    num: "02",
    title: "You pick a size",
    desc: "Petit for the nightstand. Grand for a proper centerpiece. Luxe for the one people ask about. One decision, then you're done.",
  },
  {
    num: "03",
    title: "A florist delivers to your door",
    desc: "Not left in the lobby. Your building gives us access. We coordinate with a local florist. You find it waiting—or get a knock.",
  },
  {
    num: "04",
    title: "It happens again next month",
    desc: "No reordering. No remembering. Your apartment just consistently looks better. That's the whole thing.",
  },
]

const PLANS = [
  {
    name: "Petit",
    price: "$45",
    desc: "Compact seasonal bouquet. For a nightstand, a shelf, anywhere you want a bit of color.",
    tag: null,
  },
  {
    name: "Grand",
    price: "$75",
    desc: "Our signature size. Full stems, mixed varieties, real presence in a room. Personalization options available.",
    tag: "Most chosen",
  },
  {
    name: "Luxe",
    price: "$120",
    desc: "Designer-curated arrangements. Exotic and rare stems. Multiple placements. White-glove delivery.",
    tag: null,
  },
]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "/register"

export default function HomePage() {
  const heroTextRef = useRef<HTMLDivElement>(null)
  const heroPhotoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(heroTextRef.current,  { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, delay: 0.1 })
        .fromTo(heroPhotoRef.current, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.2 }, "-=0.8")

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

      {/* ── HERO ── */}
      <section className="min-h-[100svh] grid lg:grid-cols-2">

        {/* Left — text */}
        <div className="flex flex-col justify-center px-8 lg:px-16 pt-32 pb-16 lg:py-0">
          <div ref={heroTextRef}>
            <h1 className="font-serif text-[clamp(3rem,5.5vw,5.5rem)] leading-[1.0] text-[#2C1810] tracking-tight mb-6">
              Fresh flowers<br />
              for your<br />
              <em className="not-italic text-bloom-sage">apartment.</em>
            </h1>

            <p className="text-[1.0625rem] text-stone-500 leading-relaxed mb-10 max-w-sm font-light">
              A local florist. Your building. Every month.
              Create an account and we'll notify you the moment your building goes live.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild
                className="bg-[#2C1810] hover:bg-stone-900 text-white rounded-lg px-8 py-5 text-sm font-medium tracking-wide transition-transform hover:scale-[1.02]">
                <a href={`${APP_URL}/onboarding/register`}>Create account</a>
              </Button>
              <Button asChild variant="outline"
                className="border-stone-300 text-stone-600 hover:bg-stone-100 rounded-lg px-8 py-5 text-sm font-medium">
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>

            {/* Stats row — mobile only */}
            <div className="flex gap-8 mt-12 lg:hidden">
              {[
                { num: "$45",     label: "from" },
                { num: "3",       label: "cities" },
                { num: "Monthly", label: "delivery" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-serif text-2xl text-[#2C1810] leading-none">{s.num}</div>
                  <div className="text-[0.65rem] tracking-[0.18em] text-stone-400 uppercase mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — full-bleed photo */}
        <div ref={heroPhotoRef} className="relative min-h-[50vw] lg:min-h-0">
          <Image
            src="/hero.png"
            alt="Fresh flowers in a city apartment"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Blend edge into cream on desktop */}
          <div className="hidden lg:block absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#FFFBF7] to-transparent" />

          {/* Stats — desktop, overlaid bottom-right */}
          <div className="hidden lg:flex absolute bottom-10 right-10 gap-8 bg-white/70 backdrop-blur-sm rounded-2xl px-8 py-5">
            {[
              { num: "$45",     label: "Starting price" },
              { num: "3",       label: "Cities" },
              { num: "Monthly", label: "Delivery" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-serif text-3xl text-[#2C1810] leading-none mb-1">{s.num}</div>
                <div className="text-[0.65rem] tracking-[0.18em] text-stone-500 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-t border-stone-200 py-14 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-6 lg:gap-24 mb-10 lg:mb-16">
            <div className="reveal">
              <span className="text-[0.6875rem] tracking-[0.28em] uppercase text-stone-400 font-medium">How it works</span>
            </div>
            <p className="reveal font-serif text-2xl md:text-3xl text-stone-800 font-light leading-snug">
              Four steps. None of them require you to do much.
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

      {/* ── PRICING ── */}
      <section className="border-t border-stone-200 py-14 lg:py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-6 lg:gap-24 mb-10 lg:mb-16">
            <div className="reveal">
              <span className="text-[0.6875rem] tracking-[0.28em] uppercase text-stone-400 font-medium">Sizes & pricing</span>
            </div>
            <p className="reveal font-serif text-2xl md:text-3xl text-stone-800 font-light leading-snug">
              Three options. Monthly delivery included.
            </p>
          </div>
          {PLANS.map((plan, i) => (
            <div key={i} className="reveal grid lg:grid-cols-[200px_1fr_auto] gap-4 lg:gap-16 py-8 lg:py-10 border-t border-stone-200 lg:items-center">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="font-serif text-2xl text-stone-900">{plan.name}</h3>
                  {plan.tag && (
                    <span className="text-[0.625rem] text-bloom-sage border border-bloom-sage/40 px-2 py-0.5 rounded-full tracking-[0.15em] uppercase">
                      {plan.tag}
                    </span>
                  )}
                </div>
                <div className="font-serif text-4xl text-stone-900 leading-none">
                  {plan.price}<span className="text-sm font-sans text-stone-400 font-normal ml-0.5">/mo</span>
                </div>
              </div>
              <p className="text-[0.9375rem] text-stone-500 leading-relaxed max-w-md">{plan.desc}</p>
              <Button asChild
                className="w-full lg:w-auto bg-[#2C1810] hover:bg-stone-900 text-white rounded-lg text-sm transition-transform hover:scale-[1.02]">
                <a href={`${APP_URL}/onboarding/register`}>Get started</a>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28 bg-[#2C1810] text-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <p className="reveal font-serif text-3xl md:text-4xl lg:text-5xl leading-tight mb-4 font-light">
            Your building.<br />Your flowers.
          </p>
          <p className="reveal text-stone-400 text-[1.0625rem] mb-10 font-light">
            Create an account and we'll let you know when you're good to go.
          </p>
          <Button asChild
            className="reveal bg-white text-[#2C1810] hover:bg-stone-100 rounded-lg px-10 py-5 text-sm font-medium tracking-wide transition-transform hover:scale-[1.02]">
            <a href={`${APP_URL}/onboarding/register`}>Create your account →</a>
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-stone-800 bg-[#2C1810] py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-bloom-sage" />
            <span className="font-serif text-lg text-white">Bloom</span>
          </div>
          <div className="flex gap-10 text-sm text-stone-500">
            <a href="/florists"          className="hover:text-white transition-colors">Florists</a>
            <a href="/property-managers" className="hover:text-white transition-colors">Buildings</a>
            <a href="#"                  className="hover:text-white transition-colors">Contact</a>
          </div>
          <span className="text-xs text-stone-600">© 2026 Bloom</span>
        </div>
      </footer>

    </div>
  )
}
