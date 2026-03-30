"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Leaf } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import dynamic from "next/dynamic"

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-[#FFF5EE] to-rose-100" />,
})

gsap.registerPlugin(ScrollTrigger)

const MARQUEE_WORDS = [
  "Local florists", "·", "Monthly delivery", "·", "Chicago", "·", "New York", "·",
  "Boston", "·", "47 buildings", "·", "No errands", "·", "Petit — Grand — Luxe", "·",
  "Your apartment, better", "·",
]

export default function HomePage() {
  const badgeRef  = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef    = useRef<HTMLDivElement>(null)
  const statsRef  = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    buildingAddress: "", apartmentNumber: "", plan: "",
  })
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(badgeRef.current,    { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6 })
        .fromTo(headlineRef.current, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.2 }, "-=0.3")
        .fromTo(subtitleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.8")
        .fromTo(ctaRef.current,      { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.6")

      if (statsRef.current) {
        gsap.fromTo(Array.from(statsRef.current.children),
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.12,
            scrollTrigger: { trigger: statsRef.current, start: "top 82%" } }
        )
      }
    })
    return () => ctx.revert()
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim())       e.firstName       = "Required"
    if (!form.lastName.trim())        e.lastName        = "Required"
    if (!form.email.trim())           e.email           = "Required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email"
    if (!form.buildingAddress.trim()) e.buildingAddress = "Required"
    if (!form.apartmentNumber.trim()) e.apartmentNumber = "Required"
    if (!form.plan)                   e.plan            = "Pick a size"
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setSubmitting(true)
    setErrors({})
    await new Promise(r => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
  }

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="min-h-screen bg-bloom-cream text-bloom-dark selection:bg-bloom-rose selection:text-white">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <HeroScene />
        <div className="container relative z-10 mx-auto px-6 lg:px-12">
          <div className="max-w-2xl">
            <div ref={badgeRef} className="mb-6">
              <span className="inline-block text-xs font-medium tracking-[0.18em] uppercase text-bloom-sage border border-bloom-sage/40 px-4 py-1.5 rounded-full">
                Now in 47 buildings
              </span>
            </div>

            <h1
              ref={headlineRef}
              className="font-serif text-[clamp(3.5rem,9vw,8rem)] leading-[0.95] tracking-tight mb-8"
            >
              Flowers.
              <br />
              Every month.
              <br />
              <span className="italic font-light text-bloom-sage">You live here.</span>
            </h1>

            <p
              ref={subtitleRef}
              className="text-[1.125rem] md:text-[1.1875rem] text-stone-600 leading-relaxed mb-10 max-w-xl font-light"
            >
              A local florist brings fresh flowers to your door—every month. Your building handles the logistics. You just pick a size.
            </p>

            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg"
                className="bg-bloom-dark hover:bg-stone-800 text-bloom-cream text-base px-8 py-6 rounded-full transition-transform hover:scale-[1.02]">
                <a href="#sign-up">Get started →</a>
              </Button>
              <Button asChild variant="ghost" size="lg"
                className="text-stone-500 hover:text-bloom-dark text-base px-8 py-6 rounded-full">
                <a href="#how-it-works">How does it work?</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="overflow-hidden bg-bloom-dark py-3 border-y border-stone-800">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((item, i) => (
            <span key={i} className="mx-5 text-sm font-medium text-stone-400 shrink-0">{item}</span>
          ))}
        </div>
      </div>

      {/* ── THE PITCH (asymmetric 7/5) ── */}
      <section className="py-28 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[7fr_5fr] gap-16 lg:gap-24 items-center">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-[3.25rem] leading-tight text-stone-900 mb-8">
                The flowers your apartment deserves,{" "}
                <em className="not-italic font-light text-bloom-sage">finally on schedule.</em>
              </h2>
              <p className="text-[1.0625rem] text-stone-600 leading-relaxed mb-5 max-w-lg">
                We work with florists who already deliver to your neighborhood. No markups. No imported filler. The arrangement at your door came from a shop maybe 3 miles away.
              </p>
              <p className="text-[1.0625rem] text-stone-600 leading-relaxed max-w-lg">
                Since March&nbsp;2024, we've done over 6,000 deliveries across Chicago, New York, and Boston. Nearly zero complaints about the flowers. A few about the timing. We're working on it.
              </p>
            </div>

            {/* Editorial stat card */}
            <div className="relative">
              <div className="bg-bloom-dark text-bloom-cream rounded-2xl p-10">
                <div className="font-serif text-[5rem] leading-none text-bloom-rose mb-2">6,247</div>
                <div className="text-stone-300 text-lg font-light mb-8 leading-snug">
                  deliveries since<br />March&nbsp;2024.
                </div>
                <div className="space-y-3 border-t border-stone-700 pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Cities</span>
                    <span className="text-stone-200">3</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Buildings</span>
                    <span className="text-stone-200">47</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Sourced overseas</span>
                    <span className="text-stone-200">Zero</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-full bg-bloom-rose/20 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (2×2 bento, not 3 cards) ── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="mb-14">
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">
              How it actually works
            </h2>
            <p className="text-[1.0625rem] text-stone-500">
              No apps to download. No florist to find. No deciding.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                num: "01",
                title: "Your building signs up",
                desc: "The property manager brings us on as a building amenity. They sort the logistics with us—you don't have to do anything to make this happen.",
                bg: "bg-stone-50",
              },
              {
                num: "02",
                title: "You pick Petit, Grand, or Luxe",
                desc: "Small bouquet for the nightstand. A proper centerpiece. Or the full arrangement that makes people ask when they walk in. One choice. Done.",
                bg: "bg-bloom-sage/10",
              },
              {
                num: "03",
                title: "A florist delivers to your door",
                desc: "Not left in the lobby. Not buzzed in at 7am. Your building gives us access. We coordinate the florist. You find it waiting—or get a knock.",
                bg: "bg-bloom-rose/10",
              },
              {
                num: "04",
                title: "It happens again next month",
                desc: "You don't have to remember. You don't have to reorder. You might notice your apartment looks noticeably better. That part is just a bonus.",
                bg: "bg-stone-50",
              },
            ].map((step, i) => (
              <div key={i} className={`${step.bg} rounded-2xl p-8 border border-stone-100`}>
                <div className="font-serif text-5xl text-stone-200 mb-4 leading-none select-none">{step.num}</div>
                <h3 className="font-serif text-xl text-stone-900 mb-3">{step.title}</h3>
                <p className="text-stone-600 text-[0.9375rem] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ROW ── */}
      <div className="bg-bloom-dark py-16">
        <div ref={statsRef} className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { num: "47",     label: "Buildings" },
            { num: "2,400+", label: "Active subscribers" },
            { num: "3",      label: "Cities" },
            { num: "$45",    label: "Starting price" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-serif text-5xl text-bloom-rose mb-2 leading-none">{s.num}</div>
              <div className="text-xs text-stone-500 tracking-[0.15em] uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <section className="py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-14 gap-4">
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900">
              Three sizes.
            </h2>
            <p className="text-[1.0625rem] text-stone-500 md:text-right max-w-xs">
              Monthly delivery. Cancel whenever. Your building probably already covers part of it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* Petit */}
            <div className="rounded-2xl border border-stone-200 bg-white p-8 flex flex-col hover:shadow-md transition-shadow">
              <h3 className="font-serif text-2xl text-stone-900 mb-1">Petit</h3>
              <p className="text-stone-500 text-sm mb-6">For a nightstand, a kitchen counter. Wherever you want a bit of color without overdoing it.</p>
              <div className="mb-6">
                <span className="text-4xl font-semibold text-stone-900">$45</span>
                <span className="text-stone-400 text-sm">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1 text-sm text-stone-600">
                <li>Seasonal bouquet, compact format</li>
                <li>Monthly delivery to your door</li>
                <li>Care card included</li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-stone-300 hover:bg-stone-50">
                <a href="#sign-up">Choose Petit</a>
              </Button>
            </div>

            {/* Grand — elevated, featured */}
            <div className="rounded-2xl border-2 border-bloom-rose/50 bg-white p-8 flex flex-col shadow-xl shadow-rose-50 md:-mt-6">
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-bloom-rose mb-4 block">
                Most popular
              </span>
              <h3 className="font-serif text-2xl text-stone-900 mb-1">Grand</h3>
              <p className="text-stone-500 text-sm mb-6">The one people notice. Full stems, mixed varieties, real presence in a room.</p>
              <div className="mb-6">
                <span className="text-4xl font-semibold text-stone-900">$75</span>
                <span className="text-stone-400 text-sm">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1 text-sm text-stone-700">
                <li className="font-medium">Large mixed bouquet</li>
                <li>Premium seasonal varieties</li>
                <li>Personalization options</li>
                <li>Priority scheduling</li>
              </ul>
              <Button asChild className="w-full rounded-full bg-bloom-dark hover:bg-stone-800 text-bloom-cream">
                <a href="#sign-up">Choose Grand</a>
              </Button>
            </div>

            {/* Luxe */}
            <div className="rounded-2xl border border-stone-200 bg-white p-8 flex flex-col hover:shadow-md transition-shadow">
              <h3 className="font-serif text-2xl text-stone-900 mb-1">Luxe</h3>
              <p className="text-stone-500 text-sm mb-6">A designer arrangement. Rare stems. The kind of thing that gets photographed.</p>
              <div className="mb-6">
                <span className="text-4xl font-semibold text-stone-900">$120</span>
                <span className="text-stone-400 text-sm">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1 text-sm text-stone-600">
                <li>Designer-curated arrangements</li>
                <li>Exotic and rare stems</li>
                <li>Multiple vase placements</li>
                <li>White-glove delivery</li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-stone-300 hover:bg-stone-50">
                <a href="#sign-up">Choose Luxe</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SIGN UP ── */}
      <section id="sign-up" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">
              Get on the list.
            </h2>
            <p className="text-[1.0625rem] text-stone-600">
              Tell us where you live and we'll check if your building is already set up—or add you to the waitlist if not.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-12 text-center">
              <div className="font-serif text-4xl text-bloom-sage mb-3">✓</div>
              <h3 className="font-serif text-2xl text-stone-900 mb-2">You're on the list.</h3>
              <p className="text-stone-500 text-[1.0625rem]">
                We'll be in touch within a couple of days. Check your inbox—spam too, just in case.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 mb-1.5">First name</label>
                  <Input id="firstName" placeholder="Jane" value={form.firstName}
                    onChange={e => update("firstName", e.target.value)}
                    className={`rounded-xl ${errors.firstName ? "border-red-400 focus-visible:ring-red-300" : "border-stone-200"}`} />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 mb-1.5">Last name</label>
                  <Input id="lastName" placeholder="Smith" value={form.lastName}
                    onChange={e => update("lastName", e.target.value)}
                    className={`rounded-xl ${errors.lastName ? "border-red-400 focus-visible:ring-red-300" : "border-stone-200"}`} />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                <Input id="email" type="email" placeholder="jane@example.com" value={form.email}
                  onChange={e => update("email", e.target.value)}
                  className={`rounded-xl ${errors.email ? "border-red-400 focus-visible:ring-red-300" : "border-stone-200"}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="buildingAddress" className="block text-sm font-medium text-stone-700 mb-1.5">Building address</label>
                <Input id="buildingAddress" placeholder="123 Main St" value={form.buildingAddress}
                  onChange={e => update("buildingAddress", e.target.value)}
                  className={`rounded-xl ${errors.buildingAddress ? "border-red-400 focus-visible:ring-red-300" : "border-stone-200"}`} />
                {errors.buildingAddress && <p className="text-xs text-red-500 mt-1">{errors.buildingAddress}</p>}
              </div>
              <div>
                <label htmlFor="apartmentNumber" className="block text-sm font-medium text-stone-700 mb-1.5">Unit number</label>
                <Input id="apartmentNumber" placeholder="4B" value={form.apartmentNumber}
                  onChange={e => update("apartmentNumber", e.target.value)}
                  className={`rounded-xl ${errors.apartmentNumber ? "border-red-400 focus-visible:ring-red-300" : "border-stone-200"}`} />
                {errors.apartmentNumber && <p className="text-xs text-red-500 mt-1">{errors.apartmentNumber}</p>}
              </div>
              <div>
                <label htmlFor="plan" className="block text-sm font-medium text-stone-700 mb-1.5">Preferred size</label>
                <select id="plan" value={form.plan} onChange={e => update("plan", e.target.value)}
                  className={`w-full h-10 px-3 py-2 border bg-white rounded-xl text-sm focus:outline-none focus:ring-1 ${
                    errors.plan ? "border-red-400 focus:ring-red-300" : "border-stone-200 focus:ring-bloom-sage focus:border-bloom-sage"
                  }`}>
                  <option value="">Pick one</option>
                  <option value="petit">Petit — $45/mo</option>
                  <option value="grand">Grand — $75/mo</option>
                  <option value="luxe">Luxe — $120/mo</option>
                </select>
                {errors.plan && <p className="text-xs text-red-500 mt-1">{errors.plan}</p>}
              </div>
              <Button type="submit" disabled={submitting}
                className="w-full bg-bloom-dark hover:bg-stone-800 rounded-full py-6 text-base disabled:opacity-60">
                {submitting
                  ? "Sending…"
                  : <span className="flex items-center justify-center gap-2">Sign up <ArrowRight className="h-4 w-4" /></span>
                }
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-14 bg-stone-900 text-stone-400">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="h-5 w-5 text-bloom-rose" />
                <span className="text-white font-serif text-xl">Bloom</span>
              </div>
              <p className="text-sm text-stone-500 max-w-[180px] leading-relaxed">
                Fresh flowers. Local florists. Monthly.
              </p>
            </div>
            <div className="flex gap-14 text-sm">
              <div className="space-y-3">
                <div className="text-stone-600 text-xs uppercase tracking-[0.15em]">Partners</div>
                <a href="/florists"            className="block hover:text-white transition-colors">Florists</a>
                <a href="/property-managers"   className="block hover:text-white transition-colors">Buildings</a>
              </div>
              <div className="space-y-3">
                <div className="text-stone-600 text-xs uppercase tracking-[0.15em]">Company</div>
                <a href="#" className="block hover:text-white transition-colors">Contact</a>
                <a href="#" className="block hover:text-white transition-colors">Privacy</a>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-6 text-xs text-stone-700">
            © 2026 Bloom. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
