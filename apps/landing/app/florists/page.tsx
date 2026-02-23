"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowRight, TrendingUp, Users, MapPin, Clock, CheckCircle, Leaf } from "lucide-react"
import gsap from "gsap"

export default function FloristsPage() {
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
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBF7] via-[#FFF5EE] to-[#FFE4D6] opacity-80" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />

        <div ref={heroRef} className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 py-32 text-center">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-stone-900 leading-[1.1] mb-6">
            Grow your business
            <br />
            <span className="text-rose-500">with Bloom</span>
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Steady orders from apartment buildings in your area. We bring the customers, you bring the flowers.
          </p>
          <Button
            size="lg"
            className="bg-stone-900 hover:bg-stone-800 text-white text-base px-8 py-6 rounded-full shadow-lg shadow-stone-900/20"
          >
            Apply to partner
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-rose-600 font-medium mb-4">Benefits</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              Why florists choose Bloom
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              More orders, better routes, and customers who keep coming back.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, title: "Steady orders", description: "Recurring subscriptions mean you know what's coming each week." },
              { icon: Users, title: "More customers", description: "Hundreds of residents in buildings near you, already subscribed." },
              { icon: MapPin, title: "One stop, many deliveries", description: "Multiple orders in the same building. One trip." },
              { icon: Clock, title: "Your schedule", description: "You always know delivery dates ahead of time." }
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

      {/* How It Works Section */}
      <section className="py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-rose-600 font-medium mb-4">Process</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              How partnership works
            </h2>
            <p className="text-lg text-stone-600">
              Three steps to your first delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Apply & Get Approved",
                description: "Submit your application with portfolio and business details",
                features: ["Quick online application", "Portfolio review process", "Quality standards verification"]
              },
              {
                step: "2",
                title: "Receive Orders",
                description: "Get weekly batch orders from subscribers in your area",
                features: ["Advance order notifications", "Detailed delivery instructions", "Customer preferences included"]
              },
              {
                step: "3",
                title: "Make & Deliver",
                description: "Put together the arrangements and drop them off",
                features: ["Creative freedom in design", "Coordinated building access", "Prompt payment processing"]
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

      {/* Requirements Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-rose-600 font-medium mb-4">Requirements</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              What we look for
            </h2>
            <p className="text-lg text-stone-600">
              We keep the bar high so residents get great flowers every time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="p-8 rounded-3xl bg-gradient-to-b from-stone-50 to-white border border-stone-100">
              <h3 className="font-serif text-xl text-stone-900 mb-6">Business Requirements</h3>
              <ul className="space-y-4">
                {[
                  "Licensed florist business with 2+ years experience",
                  "Reliable delivery vehicle and transportation",
                  "Ability to handle 20+ orders per delivery day",
                  "Professional liability insurance"
                ].map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-stone-600">
                    <CheckCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-stone-50 to-white border border-stone-100">
              <h3 className="font-serif text-xl text-stone-900 mb-6">Quality Standards</h3>
              <ul className="space-y-4">
                {[
                  "Fresh, high-quality flowers from reputable suppliers",
                  "Professional arrangement and presentation skills",
                  "Timely delivery within specified windows",
                  "Excellent customer service and communication"
                ].map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-stone-600">
                    <CheckCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sign-up Form Section */}
      <section className="py-24 bg-[#FFFBF7]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-rose-600 font-medium mb-4">Apply now</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              Join our florist network
            </h2>
            <p className="text-lg text-stone-600">
              Tell us about your shop and we'll be in touch.
            </p>
          </div>

          <Card className="rounded-3xl border-stone-200 shadow-xl shadow-stone-100">
            <CardContent className="p-8 md:p-10">
              <form className="space-y-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-stone-700 mb-2">
                    Business Name
                  </label>
                  <Input id="businessName" placeholder="Enter your business name" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactName" className="block text-sm font-medium text-stone-700 mb-2">
                      Contact Person
                    </label>
                    <Input id="contactName" placeholder="Enter contact person name" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-2">
                      Title/Position
                    </label>
                    <Input id="title" placeholder="e.g., Owner, Manager" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                      Email Address
                    </label>
                    <Input id="email" type="email" placeholder="Enter business email" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-2">
                      Phone Number
                    </label>
                    <Input id="phone" type="tel" placeholder="Enter business phone" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessAddress" className="block text-sm font-medium text-stone-700 mb-2">
                    Business Address
                  </label>
                  <Input id="businessAddress" placeholder="Enter your business address" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" required />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="yearsInBusiness" className="block text-sm font-medium text-stone-700 mb-2">
                      Years in Business
                    </label>
                    <select id="yearsInBusiness" className="w-full h-10 px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none" required>
                      <option value="">Select years</option>
                      <option value="1-2">1-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="serviceArea" className="block text-sm font-medium text-stone-700 mb-2">
                      Service Area Radius
                    </label>
                    <select id="serviceArea" className="w-full h-10 px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none" required>
                      <option value="">Select radius</option>
                      <option value="5">Within 5 miles</option>
                      <option value="10">Within 10 miles</option>
                      <option value="15">Within 15 miles</option>
                      <option value="20+">20+ miles</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-stone-700 mb-2">
                    Website/Portfolio URL
                  </label>
                  <Input id="website" type="url" placeholder="https://your-website.com" className="rounded-xl border-stone-200 focus:border-rose-300 focus:ring-rose-300" />
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-stone-700 mb-2">
                    Experience & Specialties
                  </label>
                  <textarea
                    id="experience"
                    rows={4}
                    className="w-full px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none"
                    placeholder="Tell us about your experience, specialties, and what makes your floral arrangements unique..."
                  />
                </div>

                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-stone-700 mb-2">
                    Weekly Order Capacity
                  </label>
                  <select id="capacity" className="w-full h-10 px-3 py-2 border border-stone-200 bg-white rounded-xl text-sm focus:border-rose-300 focus:ring-rose-300 focus:outline-none">
                    <option value="">Select capacity</option>
                    <option value="20-50">20-50 orders per week</option>
                    <option value="50-100">50-100 orders per week</option>
                    <option value="100-200">100-200 orders per week</option>
                    <option value="200+">200+ orders per week</option>
                  </select>
                </div>

                <Button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 rounded-full py-6 text-base">
                  Submit Partnership Application
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
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
