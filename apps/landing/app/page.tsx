"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { ArrowRight, Leaf } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/register"

const PLANS = [
  {
    name: "Essential",
    price: "$75",
    stems: "10–12 stems",
    cadence: "Every two weeks",
    extras: null,
    featured: false,
  },
  {
    name: "Signature",
    price: "$100",
    stems: "18–20 stems",
    cadence: "Every two weeks",
    extras: "One vase per year",
    featured: true,
  },
  {
    name: "Statement",
    price: "$125",
    stems: "28–30 stems",
    cadence: "Every two weeks",
    extras: "Four vases per year, quarterly refresh",
    featured: false,
  },
]

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
      )
      gsap.fromTo(
        widgetRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.9, ease: "power3.out", delay: 0.4 }
      )

      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          }
        )
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-bloom-cream text-bloom-dark">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-20 pb-16 lg:pt-0 lg:pb-0">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-[7fr_5fr] gap-12 lg:gap-20 items-center min-h-[85vh]">

            {/* Left: headline */}
            <div ref={heroRef}>
              <p className="text-sm tracking-[0.2em] uppercase text-bloom-sage mb-8 font-medium">
                Floral subscriptions for apartment buildings
              </p>
              <h1 className="font-serif text-[clamp(3rem,7vw,6rem)] leading-[1.0] tracking-tight mb-8">
                Your building<br />
                gets a{" "}
                <em className="not-italic text-bloom-sage">florist.</em>
              </h1>
              <p className="text-[18px] text-stone-600 leading-relaxed mb-4 max-w-md font-light">
                Fresh flowers every two weeks, from one local florist assigned to your building.
                No subscription box. No trip to the shop. Just flowers at your door.
              </p>
              <p className="text-[15px] text-stone-400 mb-12 max-w-sm">
                Bloom doesn't sell flowers — your florist does. We handle the contract, the schedule, and the delivery coordination.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={APP_URL}
                  className="inline-flex items-center justify-center gap-2 bg-bloom-dark text-bloom-cream px-8 py-4 rounded-full text-[15px] font-medium hover:bg-stone-800 transition-colors"
                >
                  Check your building
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 border border-stone-300 text-stone-700 px-8 py-4 rounded-full text-[15px] font-medium hover:border-stone-500 transition-colors bg-transparent"
                >
                  How it works
                </a>
              </div>
            </div>

            {/* Right: upcoming delivery widget */}
            <div ref={widgetRef} className="hidden lg:block">
              <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-sm ml-auto">
                <p className="text-[11px] tracking-[0.18em] uppercase text-stone-400 mb-6">Next delivery</p>
                <div className="space-y-5">
                  <div>
                    <p className="text-[13px] text-stone-500 mb-1">Building</p>
                    <p className="text-[15px] font-medium">The Meridian, Unit 4B</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-stone-500 mb-1">Date</p>
                    <p className="text-[15px] font-medium">Thursday, April 3rd</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-stone-500 mb-1">Florist</p>
                    <p className="text-[15px] font-medium">Field & Flora, SF</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-stone-500 mb-1">Arrangement</p>
                    <p className="text-[15px] font-medium">Signature — 18 stems</p>
                  </div>
                  <div className="pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-bloom-sage" />
                      <p className="text-[13px] text-stone-500">Scheduled</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-stone-400 mt-3 text-right pr-1">Example delivery — yours will look like this.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <div className="bg-bloom-dark py-4 overflow-hidden border-y border-stone-800">
        <div className="marquee-track flex whitespace-nowrap">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="flex items-center shrink-0">
              {[
                "Ranunculus", "Garden Roses", "Lisianthus",
                "Sweet Peas", "Anemones", "Tulips",
                "Peonies", "Dahlias", "Scabiosa",
                "Hellebores", "Fritillaria", "Clematis",
              ].map((flower) => (
                <span key={flower} className="inline-flex items-center gap-4 mx-4">
                  <span className="text-[13px] tracking-widest uppercase text-stone-400 font-light">{flower}</span>
                  <Leaf className="h-3 w-3 text-bloom-sage opacity-60 shrink-0" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="pt-28 pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">

          <div className="reveal mb-20">
            <p className="text-sm tracking-[0.2em] uppercase text-bloom-sage mb-4 font-medium">How it works</p>
            <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight max-w-xl">
              Two steps. Then just answer the door.
            </h2>
          </div>

          {/* Step 1 — 7/5 left-heavy */}
          <div className="reveal grid lg:grid-cols-[7fr_5fr] gap-16 items-start mb-20 pb-20 border-b border-stone-100">
            <div>
              <span className="font-serif text-[80px] leading-none text-stone-100 select-none block -mb-4">01</span>
              <h3 className="font-serif text-3xl mb-5">Your building signs up.</h3>
              <p className="text-[17px] text-stone-600 leading-relaxed mb-4">
                Property managers activate Bloom for their building — they pick a florist from our local network, set the delivery schedule, and configure how many units are on the program.
              </p>
              <p className="text-[15px] text-stone-400">
                If your building isn't live yet, you can request it. We'll reach out to your property manager.
              </p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-8 self-start">
              <p className="text-[12px] tracking-widest uppercase text-stone-400 mb-6">For property managers</p>
              <ul className="space-y-4 text-[14px] text-stone-600">
                {[
                  "Select a florist from the local network",
                  "Set delivery day and cadence",
                  "Residents subscribe themselves — no manual tracking",
                  "Dashboard shows participation, deliveries, and billing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-bloom-sage mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/property-managers"
                className="inline-flex items-center gap-1.5 text-[13px] text-bloom-sage mt-6 hover:underline"
              >
                Details for buildings <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Step 2 — 5/7 right-heavy */}
          <div className="reveal grid lg:grid-cols-[5fr_7fr] gap-16 items-start">
            <div className="bg-bloom-dark rounded-2xl p-8 self-start order-2 lg:order-1">
              <p className="text-[12px] tracking-widest uppercase text-stone-500 mb-6">For residents</p>
              <ul className="space-y-4 text-[14px] text-stone-400">
                {[
                  "Sign up with your email and unit number",
                  "Pick Essential, Signature, or Statement",
                  "Enter a card — billed monthly",
                  "Flowers show up every two weeks",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-bloom-sage mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <span className="font-serif text-[80px] leading-none text-stone-100 select-none block -mb-4">02</span>
              <h3 className="font-serif text-3xl mb-5">You pick a size and subscribe.</h3>
              <p className="text-[17px] text-stone-600 leading-relaxed mb-4">
                Once your building is live, residents sign up individually. Choose your arrangement size, add a card, and you're done. The florist handles the rest — sourcing, arranging, and delivering to your door.
              </p>
              <p className="text-[15px] text-stone-400">
                You can skip a delivery any time before the cutoff. Pause or cancel without calling anyone.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── THE FLORIST BIT ───────────────────────────────────── */}
      <section className="py-24 bg-bloom-cream">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="reveal grid lg:grid-cols-2 gap-16 items-end">
            <div>
              <p className="text-sm tracking-[0.2em] uppercase text-bloom-sage mb-6 font-medium">The florist</p>
              <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight mb-8">
                One florist.<br />
                <em className="not-italic text-stone-400 font-light">Your building's florist.</em>
              </h2>
              <p className="text-[18px] text-stone-600 leading-relaxed mb-6">
                Each building works with a single local florist — not a rotating pool, not a warehouse fulfillment center. Your florist knows your building's delivery window, your lobby, and what's in season.
              </p>
              <p className="text-[16px] text-stone-500 leading-relaxed">
                We source from independent shops and studios in your city. They set their own prices, keep their margins, and build a predictable revenue line from the buildings they serve.
              </p>
              <Link
                href="/florists"
                className="inline-flex items-center gap-2 mt-8 text-[14px] font-medium text-bloom-dark hover:text-bloom-sage transition-colors"
              >
                For florists <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Offset quote — deliberately not centered */}
            <div className="relative">
              <div className="bg-stone-900 rounded-2xl p-10 text-bloom-cream">
                <p className="font-serif text-2xl leading-snug mb-8">
                  "We do 40 units at The Meridian every other Thursday. It's become the best part of our week."
                </p>
                <div>
                  <p className="text-[14px] font-medium">Sarah K.</p>
                  <p className="text-[13px] text-stone-400">Field & Flora, San Francisco</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-bloom-sage/10 rounded-full -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="reveal mb-16">
            <p className="text-sm tracking-[0.2em] uppercase text-bloom-sage mb-4 font-medium">Pricing</p>
            <h2 className="font-serif text-[clamp(2rem,4vw,3.5rem)] leading-tight mb-4">
              Three sizes. Every two weeks.
            </h2>
            <p className="text-[17px] text-stone-500 max-w-lg">
              Billed monthly. Skip any delivery before the Thursday cutoff. Cancel anytime.
            </p>
          </div>

          <div className="reveal grid md:grid-cols-3 gap-6 max-w-5xl">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border ${
                  plan.featured
                    ? "border-bloom-sage bg-stone-900 text-bloom-cream"
                    : "border-stone-200 bg-white"
                }`}
              >
                {plan.featured && (
                  <p className="text-[11px] tracking-[0.18em] uppercase text-bloom-sage mb-6">Most popular</p>
                )}
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className={`font-serif text-2xl ${plan.featured ? "text-bloom-cream" : "text-stone-900"}`}>
                    {plan.name}
                  </h3>
                  <span className={`text-3xl font-light ${plan.featured ? "text-bloom-cream" : "text-stone-900"}`}>
                    {plan.price}
                  </span>
                </div>
                <p className={`text-[13px] mb-1 ${plan.featured ? "text-stone-400" : "text-stone-500"}`}>per month</p>
                <div className={`border-t mt-6 pt-6 space-y-3 ${plan.featured ? "border-stone-700" : "border-stone-100"}`}>
                  <p className={`text-[14px] ${plan.featured ? "text-stone-300" : "text-stone-600"}`}>{plan.stems}</p>
                  <p className={`text-[14px] ${plan.featured ? "text-stone-300" : "text-stone-600"}`}>{plan.cadence}</p>
                  {plan.extras && (
                    <p className="text-[14px] text-bloom-sage">{plan.extras}</p>
                  )}
                </div>
                <a
                  href={APP_URL}
                  className={`mt-8 flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[14px] font-medium transition-colors ${
                    plan.featured
                      ? "bg-bloom-sage text-white hover:bg-green-600"
                      : "border border-stone-200 text-stone-700 hover:border-stone-400"
                  }`}
                >
                  Get started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER NOTE ──────────────────────────────────────── */}
      <section className="py-20 bg-bloom-cream border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="reveal max-w-2xl">
            <p className="font-serif text-2xl text-stone-900 leading-relaxed mb-6">
              Bloom started with one building in San Francisco in 2024. If yours isn't on the list yet,{" "}
              <a href="mailto:hello@bloom.com" className="underline underline-offset-4 decoration-stone-300 hover:decoration-stone-600 transition-colors">
                reach out.
              </a>
            </p>
            <p className="text-[15px] text-stone-500">
              We add new buildings as we bring on florists in each city. It takes a few weeks.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="py-12 bg-bloom-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-bloom-sage" />
              <span className="text-bloom-cream font-serif text-xl">Bloom</span>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-2 text-[13px] text-stone-500">
              <Link href="/florists" className="hover:text-stone-300 transition-colors">Florists</Link>
              <Link href="/property-managers" className="hover:text-stone-300 transition-colors">Buildings</Link>
              <a href="mailto:hello@bloom.com" className="hover:text-stone-300 transition-colors">hello@bloom.com</a>
            </div>
            <p className="text-[12px] text-stone-600">© 2026 Bloom</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
