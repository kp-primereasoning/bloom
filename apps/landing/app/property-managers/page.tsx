"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowRight, BarChart3, Users, Sparkles, Shield, CheckCircle, Leaf, Building2 } from "lucide-react"
import gsap from "gsap"

export default function PropertyManagersPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(heroRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBF7] via-[#FFF5EE] to-[#FFE4D6] opacity-80" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />

        <div ref={heroRef} className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 py-32 text-center">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-stone-900 leading-[1.1] mb-6">
            An amenity that
            <br />
            <span className="text-rose-500">blooms</span>
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            A floral program for your building. We run it. Your residents love it. Your team does nothing.
          </p>
          <Button
            size="lg"
            className="bg-stone-900 hover:bg-stone-800 text-white text-base px-8 py-6 rounded-full shadow-lg shadow-stone-900/20"
          >
            Partner your building
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-rose-600 font-medium mb-4">Benefits</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              What Bloom does for your building
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Fresh flowers as a building perk. Residents notice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, title: "A perk that stands out", description: "Not every building has a flower program. Yours will." },
              { icon: Users, title: "Happier residents", description: "Small touches make people want to stay." },
              { icon: Shield, title: "Nothing for your team to do", description: "We handle the florists, deliveries, and billing." },
              { icon: BarChart3, title: "See what's working", description: "A dashboard that shows sign-ups and participation." }
            ].map((benefit, index) => (
              <div
                key={index}
                className="group p-6 rounded-3xl bg-gradient-to-b from-stone-50 to-white border border-stone-100 hover:shadow-xl hover:shadow-stone-100 transition-all duration-500 text-center"
              >
                <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="font-serif text-lg text-stone-900 mb-2">{benefit.title}</h3>
                <p className="text-stone-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-rose-600 font-medium mb-4">Process</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              How it works for your building
            </h2>
            <p className="text-lg text-stone-600">
              From sign-up to first delivery in under a week.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Activate Your Property",
                description: "We set up your building with a delivery cadence that works for you.",
                features: ["Quick onboarding call", "Custom delivery schedule", "No upfront costs"]
              },
              {
                step: "2",
                title: "Residents Subscribe",
                description: "Residents opt in to the floral program at their preferred tier.",
                features: ["Simple sign-up flow", "Three arrangement sizes", "Monthly billing"]
              },
              {
                step: "3",
                title: "Bloom Handles the Rest",
                description: "We coordinate florists, deliveries, and resident communication.",
                features: ["Local florist matching", "Coordinated building access", "Participation dashboard"]
              }
            ].map((item, index) => (
              <Card key={index} className="rounded-3xl border-stone-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center text-sm font-bold mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-xl text-stone-900 mb-2">{item.title}</h3>
                  <p className="text-stone-500 text-sm mb-6">{item.description}</p>
                  <ul className="space-y-3">
                    {item.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-stone-600 text-sm">
                        <CheckCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-rose-600 font-medium mb-4">Get started</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              Bring Bloom to your building
            </h2>
            <p className="text-lg text-stone-600">
              Tell us about your property and we'll get you set up.
            </p>
          </div>

          <Card className="rounded-3xl border-stone-200 shadow-xl shadow-stone-100">
            <CardContent className="p-8 md:p-10">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactName" className="block text-sm font-medium text-stone-700 mb-2">
                      Your Name
                    </label>
                    <Input id="contactName" placeholder="Enter your name" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-2">
                      Title
                    </label>
                    <Input id="title" placeholder="e.g., Property Manager" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                      Email Address
                    </label>
                    <Input id="email" type="email" placeholder="Enter your email" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-2">
                      Phone Number
                    </label>
                    <Input id="phone" type="tel" placeholder="Enter your phone" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="propertyName" className="block text-sm font-medium text-stone-700 mb-2">
                    Property Name
                  </label>
                  <Input id="propertyName" placeholder="Enter your building or property name" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div>
                  <label htmlFor="propertyAddress" className="block text-sm font-medium text-stone-700 mb-2">
                    Property Address
                  </label>
                  <Input id="propertyAddress" placeholder="Enter the property address" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="unitCount" className="block text-sm font-medium text-stone-700 mb-2">
                      Number of Units
                    </label>
                    <select id="unitCount" className="w-full h-10 px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none" required>
                      <option value="">Select range</option>
                      <option value="50-100">50–100 units</option>
                      <option value="100-250">100–250 units</option>
                      <option value="250-500">250–500 units</option>
                      <option value="500+">500+ units</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="managementCompany" className="block text-sm font-medium text-stone-700 mb-2">
                      Management Company
                    </label>
                    <Input id="managementCompany" placeholder="Optional" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-stone-700 mb-2">
                    Anything else we should know?
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none"
                    placeholder="Tell us about your property, resident demographics, or any questions..."
                  />
                </div>

                <Button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 rounded-full py-6 text-base">
                  Request a Partnership
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-stone-900 text-stone-400">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-rose-400" />
              <span className="text-white font-medium">Bloom</span>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="/residents" className="hover:text-white transition-colors">Residents</a>
              <a href="/florists" className="hover:text-white transition-colors">Florists</a>
              <a href="/property-managers" className="hover:text-white transition-colors">Buildings</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
