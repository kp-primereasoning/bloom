"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowRight, CheckCircle, Leaf } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import dynamic from "next/dynamic"

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-[#FFF5EE] to-rose-100" />
})

gsap.registerPlugin(ScrollTrigger)

export default function HomePage() {
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      tl.fromTo(headlineRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2 }
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.8"
      )
      .fromTo(ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.6"
      )
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-bloom-cream text-bloom-dark selection:bg-bloom-rose selection:text-white">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20 lg:pt-0">
        <HeroScene />
        <div className="container relative z-10 mx-auto px-6 lg:px-12">
          <div className="max-w-2xl pt-10 lg:pt-0">
              <h1
                ref={headlineRef}
                className="font-serif text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight mb-8"
              >
                Flowers, <br />
                <span className="italic text-bloom-sage">on repeat.</span>
              </h1>

              <p
                ref={subtitleRef}
                className="text-xl md:text-2xl text-stone-600 leading-relaxed mb-10 max-w-lg font-light"
              >
                Fresh flowers from a local florist, delivered to your building every month. You don't have to do a thing.
              </p>

              <div ref={ctaRef} className="flex flex-col sm:flex-row gap-5">
                <Button
                  asChild
                  size="lg"
                  className="bg-bloom-dark hover:bg-stone-800 text-bloom-cream text-lg px-8 py-7 rounded-full transition-transform hover:scale-105"
                >
                  <a href="#sign-up">
                    Get Started
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-bloom-dark text-bloom-dark hover:bg-bloom-dark hover:text-bloom-cream text-lg px-8 py-7 rounded-full bg-transparent transition-colors"
                >
                  <a href="#how-it-works">
                    How does it work?
                  </a>
                </Button>
              </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              Here's how it works
            </h2>
            <p className="text-lg text-stone-600">
              We handle the florists, the schedule, and the delivery. You just enjoy the flowers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Your building signs up", desc: "Your property manager activates Bloom and picks a delivery schedule." },
              { step: "2", title: "Pick your size", desc: "Choose Petit, Grand, or Luxe — whatever fits your space and budget." },
              { step: "3", title: "Flowers show up", desc: "A local florist delivers fresh arrangements to your door every month." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white border border-stone-100 hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 bg-bloom-sage text-white rounded-full flex items-center justify-center text-sm font-bold mb-6">
                  {item.step}
                </div>
                <h3 className="font-serif text-xl text-stone-900 mb-2">{item.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              Choose your size
            </h2>
            <p className="text-lg text-stone-600">
              Three sizes. One monthly delivery. Included with your building.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Petit", price: "$45", period: "/mo",
                description: "Perfect for a side table or nightstand.",
                features: ["Small seasonal bouquet", "Monthly delivery", "Care instructions included"],
                featured: false
              },
              {
                name: "Grand", price: "$75", period: "/mo",
                description: "Our signature centerpiece size.",
                features: ["Large mixed bouquet", "Premium flower varieties", "Personalization options"],
                featured: true
              },
              {
                name: "Luxe", price: "$120", period: "/mo",
                description: "The biggest we offer. Hard to miss.",
                features: ["Designer arrangements", "Exotic and rare flowers", "Multiple arrangements", "Priority delivery"],
                featured: false
              }
            ].map((plan, index) => (
              <Card key={index} className={`rounded-3xl border-stone-200 ${plan.featured ? 'border-rose-300 border-2 relative shadow-xl shadow-rose-100' : 'hover:shadow-lg transition-shadow'}`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-rose-500 text-white text-xs font-medium px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="font-serif text-xl text-stone-900 mb-1">{plan.name}</h3>
                  <p className="text-stone-500 text-sm mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-semibold text-stone-900">{plan.price}</span>
                    <span className="text-stone-500">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-stone-600 text-sm">
                        <CheckCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full rounded-full ${plan.featured ? 'bg-stone-900 hover:bg-stone-800' : 'bg-white border border-stone-200 text-stone-900 hover:bg-stone-50'}`}>
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SIGN UP */}
      <section id="sign-up" className="py-24 bg-[#FFFBF7]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              Get started
            </h2>
            <p className="text-lg text-stone-600">
              Fill this out and we'll get you set up.
            </p>
          </div>

          <Card className="rounded-3xl border-stone-200 shadow-xl shadow-stone-100">
            <CardContent className="p-8 md:p-10">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 mb-2">First Name</label>
                    <Input id="firstName" placeholder="Jane" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 mb-2">Last Name</label>
                    <Input id="lastName" placeholder="Smith" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">Email</label>
                  <Input id="email" type="email" placeholder="jane@example.com" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div>
                  <label htmlFor="buildingAddress" className="block text-sm font-medium text-stone-700 mb-2">Building Address</label>
                  <Input id="buildingAddress" placeholder="123 Main St" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div>
                  <label htmlFor="apartmentNumber" className="block text-sm font-medium text-stone-700 mb-2">Unit Number</label>
                  <Input id="apartmentNumber" placeholder="4B" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div>
                  <label htmlFor="plan" className="block text-sm font-medium text-stone-700 mb-2">Preferred Size</label>
                  <select id="plan" className="w-full h-10 px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none" required>
                    <option value="">Pick one</option>
                    <option value="petit">Petit — $45/mo</option>
                    <option value="grand">Grand — $75/mo</option>
                    <option value="luxe">Luxe — $120/mo</option>
                  </select>
                </div>

                <Button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 rounded-full py-6 text-base">
                  Sign Up
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-stone-900 text-stone-400">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-rose-400" />
              <span className="text-white font-medium">Bloom</span>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="/florists" className="hover:text-white transition-colors">Florists</a>
              <a href="/property-managers" className="hover:text-white transition-colors">Buildings</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 text-xs text-stone-600 text-center md:text-left">
            © 2026 Bloom. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
