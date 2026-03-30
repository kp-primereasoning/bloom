"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowRight, Leaf } from "lucide-react"
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

const fieldClass = (err: boolean) =>
  `w-full bg-transparent border-0 border-b pb-2 text-[0.9375rem] text-bloom-dark placeholder:text-stone-300 focus:outline-none transition-colors ${
    err ? "border-red-400" : "border-stone-300 focus:border-bloom-dark"
  }`

export default function HomePage() {
  const heroRef  = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    buildingAddress: "", apartmentNumber: "", plan: "",
  })
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.15 }
      )
      gsap.fromTo(photoRef.current,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out", delay: 0.3 }
      )
      gsap.fromTo(statsRef.current,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.9, ease: "power3.out", delay: 0.6 }
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
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true); setErrors({})
    await new Promise(r => setTimeout(r, 900))
    setSubmitting(false); setSubmitted(true)
  }

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="min-h-screen bg-white text-bloom-dark">

      {/* ── HERO ── */}
      <section className="min-h-[100svh] bg-[#FFFBF7] flex flex-col justify-center pt-20 pb-12 overflow-hidden">
        <div className="max-w-[1300px] mx-auto px-6 lg:px-16 w-full">
          <div className="grid lg:grid-cols-[5fr_4fr_2fr] gap-10 lg:gap-12 items-center">

            {/* Left — text */}
            <div ref={heroRef}>
              <h1 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] text-[#2C1810] tracking-tight mb-5">
                We bring fresh<br />
                flowers to your<br />
                <em className="not-italic text-bloom-sage">apartment.</em>
              </h1>

              <p className="text-[1.0625rem] text-stone-500 leading-relaxed mb-8 max-w-sm font-light">
                A local florist. Your building. Every month.
                No errands, no subscriptions to manage.
                Starting at $45/mo.
              </p>

              <div className="flex flex-wrap gap-3 mb-10 lg:mb-16">
                <Button asChild
                  className="bg-[#2C1810] hover:bg-stone-900 text-white rounded-lg px-7 py-4 text-sm font-medium tracking-wide transition-transform hover:scale-[1.02]">
                  <a href="#sign-up">Explore</a>
                </Button>
                <Button asChild variant="outline"
                  className="border-stone-300 text-stone-600 hover:bg-stone-50 rounded-lg px-7 py-4 text-sm font-medium">
                  <a href="#how-it-works">How it works</a>
                </Button>
              </div>

              {/* Wavy line decoration — hidden on small screens */}
              <svg width="220" height="40" viewBox="0 0 220 40" fill="none" className="opacity-60 hidden sm:block">
                <path d="M0 20 C18 4, 36 36, 54 20 C72 4, 90 36, 108 20 C126 4, 144 36, 162 20 C180 4, 198 36, 216 20"
                  stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>

            {/* Center — arch photo */}
            <div ref={photoRef} className="relative flex justify-center py-8 lg:py-0">
              {/* Orange blob — top right */}
              <div className="absolute top-2 right-4 lg:-top-6 lg:-right-8 w-20 h-16 lg:w-28 lg:h-24 z-10 opacity-90"
                style={{ background: "#F4A940", borderRadius: "40% 60% 55% 45% / 45% 40% 60% 55%" }} />
              {/* Rose circle — bottom left */}
              <div className="absolute bottom-2 left-4 lg:-bottom-4 lg:-left-6 w-14 h-14 lg:w-20 lg:h-20 z-10 opacity-80"
                style={{ background: "#E8A0A0", borderRadius: "50%" }} />

              {/* Arch photo frame */}
              <div
                className="relative w-[220px] h-[300px] sm:w-[260px] sm:h-[350px] lg:w-[280px] lg:h-[380px] overflow-hidden z-20"
                style={{ borderRadius: "9999px 9999px 0 0" }}
              >
                <Image
                  src="/hero.png"
                  alt="Fresh flowers in a city apartment"
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>
            </div>

            {/* Right — stats column (desktop only) */}
            <div ref={statsRef} className="hidden lg:flex flex-col gap-10 pl-4 border-l border-stone-200">
              {[
                { num: "$45",     label: "STARTING\nPRICE" },
                { num: "3",       label: "CITIES" },
                { num: "Monthly", label: "DELIVERY" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-serif text-4xl text-[#2C1810] leading-none mb-1">{s.num}</div>
                  <div className="text-[0.65rem] tracking-[0.2em] text-stone-400 uppercase whitespace-pre-line leading-relaxed">{s.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── THE IDEA ── */}
      <section className="py-16 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24 items-start">
            <div className="reveal">
              <span className="text-[0.6875rem] tracking-[0.28em] uppercase text-stone-400 font-medium">The idea</span>
            </div>
            <div>
              <p className="reveal font-serif text-2xl md:text-3xl lg:text-[2.25rem] text-stone-900 leading-[1.2] mb-10 font-light">
                A local florist. Your building. Monthly.
              </p>
              <p className="reveal text-[1.0625rem] text-stone-500 leading-relaxed mb-5 max-w-xl">
                We connect florists who already deliver in your neighborhood with the buildings they pass every day. No warehouse. No markups. The arrangement that shows up at your door came from a shop a few miles away.
              </p>
              <p className="reveal text-[1.0625rem] text-stone-500 leading-relaxed max-w-xl">
                Your property manager sets it up once. You pick a size. It shows up at your door every month. That's the whole thing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-t border-stone-200 py-14 lg:py-24 bg-stone-50">
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
            <div key={i} className="reveal grid lg:grid-cols-[1fr_2fr] gap-3 lg:gap-24 py-6 lg:py-8 border-t border-stone-200">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-2xl text-stone-300 select-none leading-none shrink-0">{step.num}</span>
                <h3 className="font-serif text-lg text-stone-900 leading-snug">{step.title}</h3>
              </div>
              <p className="text-[0.9375rem] text-stone-500 leading-relaxed max-w-lg pl-10 lg:pl-0">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="border-t border-stone-200 py-14 lg:py-24">
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
                  {plan.price}
                  <span className="text-sm font-sans text-stone-400 font-normal ml-0.5">/mo</span>
                </div>
              </div>
              <p className="text-[0.9375rem] text-stone-500 leading-relaxed max-w-md">{plan.desc}</p>
              <Button asChild variant="outline"
                className="w-full lg:w-auto rounded-full border-stone-300 text-stone-600 hover:bg-bloom-dark hover:text-white hover:border-bloom-dark transition-all text-sm">
                <a href="#sign-up">Choose {plan.name}</a>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── SIGN UP ── */}
      <section id="sign-up" className="border-t border-stone-200 py-16 lg:py-28 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24">
            <div className="reveal">
              <span className="text-[0.6875rem] tracking-[0.28em] uppercase text-stone-400 font-medium">Get started</span>
              <p className="mt-6 text-[0.9375rem] text-stone-500 leading-relaxed max-w-[220px]">
                Tell us where you live. We'll check if your building is set up—or add you to the list if not.
              </p>
            </div>
            <div className="reveal">
              {submitted ? (
                <div className="py-8">
                  <p className="font-serif text-3xl text-bloom-sage mb-4">You're on the list.</p>
                  <p className="text-stone-500 text-[1.0625rem] max-w-md">
                    We'll be in touch in a couple of days. Check your inbox—spam folder too, just in case.
                  </p>
                </div>
              ) : (
                <form className="space-y-8" onSubmit={handleSubmit} noValidate>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-8">
                    <div>
                      <label htmlFor="firstName" className="block text-[0.6875rem] tracking-[0.2em] uppercase text-stone-400 mb-3">First name</label>
                      <input id="firstName" placeholder="Jane" value={form.firstName} onChange={e => update("firstName", e.target.value)} className={fieldClass(!!errors.firstName)} />
                      {errors.firstName && <p className="text-xs text-red-500 mt-1.5">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-[0.6875rem] tracking-[0.2em] uppercase text-stone-400 mb-3">Last name</label>
                      <input id="lastName" placeholder="Smith" value={form.lastName} onChange={e => update("lastName", e.target.value)} className={fieldClass(!!errors.lastName)} />
                      {errors.lastName && <p className="text-xs text-red-500 mt-1.5">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-[0.6875rem] tracking-[0.2em] uppercase text-stone-400 mb-3">Email</label>
                    <input id="email" type="email" placeholder="jane@example.com" value={form.email} onChange={e => update("email", e.target.value)} className={fieldClass(!!errors.email)} />
                    {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="buildingAddress" className="block text-[0.6875rem] tracking-[0.2em] uppercase text-stone-400 mb-3">Building address</label>
                    <input id="buildingAddress" placeholder="123 Main St" value={form.buildingAddress} onChange={e => update("buildingAddress", e.target.value)} className={fieldClass(!!errors.buildingAddress)} />
                    {errors.buildingAddress && <p className="text-xs text-red-500 mt-1.5">{errors.buildingAddress}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-8">
                    <div>
                      <label htmlFor="apartmentNumber" className="block text-[0.6875rem] tracking-[0.2em] uppercase text-stone-400 mb-3">Unit number</label>
                      <input id="apartmentNumber" placeholder="4B" value={form.apartmentNumber} onChange={e => update("apartmentNumber", e.target.value)} className={fieldClass(!!errors.apartmentNumber)} />
                      {errors.apartmentNumber && <p className="text-xs text-red-500 mt-1.5">{errors.apartmentNumber}</p>}
                    </div>
                    <div>
                      <label htmlFor="plan" className="block text-[0.6875rem] tracking-[0.2em] uppercase text-stone-400 mb-3">Preferred size</label>
                      <select id="plan" value={form.plan} onChange={e => update("plan", e.target.value)} className={fieldClass(!!errors.plan)}>
                        <option value="">Pick one</option>
                        <option value="petit">Petit — $45/mo</option>
                        <option value="grand">Grand — $75/mo</option>
                        <option value="luxe">Luxe — $120/mo</option>
                      </select>
                      {errors.plan && <p className="text-xs text-red-500 mt-1.5">{errors.plan}</p>}
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={submitting}
                      className="bg-bloom-dark hover:bg-stone-800 text-white rounded-full px-10 py-5 text-sm tracking-wide disabled:opacity-60 transition-transform hover:scale-[1.02]">
                      {submitting ? "Sending…" : "Sign up →"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-stone-200 py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-bloom-sage" />
            <span className="font-serif text-lg text-bloom-dark">Bloom</span>
          </div>
          <div className="flex gap-10 text-sm text-stone-400">
            <a href="/florists"          className="hover:text-bloom-dark transition-colors">Florists</a>
            <a href="/property-managers" className="hover:text-bloom-dark transition-colors">Buildings</a>
            <a href="#"                  className="hover:text-bloom-dark transition-colors">Contact</a>
          </div>
          <span className="text-xs text-stone-400">© 2026 Bloom</span>
        </div>
      </footer>

    </div>
  )
}
