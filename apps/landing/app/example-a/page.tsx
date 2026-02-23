"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Star, Leaf, Truck, Heart } from "lucide-react"
import gsap from "gsap"

export default function ExampleAPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      tl.fromTo(headlineRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1 }
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.6"
      )
      .fromTo(ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4"
      )
      .fromTo(imageRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 1 },
        "-=0.8"
      )
      .fromTo(featuresRef.current?.children || [],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
        "-=0.4"
      )
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBF7] via-[#FFF5EE] to-[#FFE4D6] opacity-80" />

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              <h1
                ref={headlineRef}
                className="font-serif text-5xl md:text-6xl lg:text-7xl text-stone-900 leading-[1.1] mb-6"
              >
                Bring nature
                <br />
                <span className="text-rose-500">into your home</span>
              </h1>

              <p
                ref={subtitleRef}
                className="text-xl md:text-2xl text-stone-600 leading-relaxed mb-10 max-w-lg"
              >
                Artisan floral arrangements delivered to your doorstep.
                Fresh. Beautiful. Effortless.
              </p>

              <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-base px-8 py-6 rounded-full shadow-lg shadow-stone-900/20"
                >
                  Start your subscription
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-stone-700 hover:text-stone-900 text-base px-8 py-6 rounded-full group"
                >
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Watch how it works
                </Button>
              </div>

              {/* Trust indicators */}
              <div ref={featuresRef} className="flex flex-wrap items-center gap-6 text-sm text-stone-500">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 border-2 border-white flex items-center justify-center text-xs font-medium text-rose-600">
                        {['S', 'M', 'J', 'A'][i]}
                      </div>
                    ))}
                  </div>
                  <span className="ml-2">2,847+ happy subscribers</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div ref={imageRef} className="order-1 lg:order-2 relative">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-stone-900/10">
                {/* Placeholder for hero image - you'd replace this with an AI-generated image */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-rose-50 to-amber-50 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white/50 flex items-center justify-center">
                      <Leaf className="h-16 w-16 text-rose-300" />
                    </div>
                    <p className="text-stone-400 text-sm">
                      Hero image placeholder
                      <br />
                      <span className="text-xs">Recommended: Elegant floral arrangement photo</span>
                    </p>
                  </div>
                </div>

                {/* Floating card */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">Next delivery: Thursday</p>
                      <p className="text-sm text-stone-500">Spring Collection arriving</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-200/50 rounded-full blur-xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-rose-200/50 rounded-full blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-rose-600 font-medium mb-4">Why Bloom?</p>
            <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
              The easiest way to enjoy
              <br />
              fresh flowers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Curated with care",
                description: "Each arrangement is hand-crafted by local artisan florists using the freshest seasonal blooms."
              },
              {
                icon: Truck,
                title: "Seamless delivery",
                description: "We coordinate with your building for hassle-free delivery right to your lobby or door."
              },
              {
                icon: Leaf,
                title: "Sustainably sourced",
                description: "Our flowers come from eco-conscious farms committed to sustainable growing practices."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-3xl bg-gradient-to-b from-stone-50 to-white border border-stone-100 hover:shadow-xl hover:shadow-stone-100 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="font-serif text-xl text-stone-900 mb-3">{feature.title}</h3>
                <p className="text-stone-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 bg-[#FFFBF7]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Image Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-2xl bg-gradient-to-br from-rose-100 to-amber-50 ${i === 2 ? 'translate-y-8' : ''} ${i === 4 ? 'translate-y-8' : ''}`}
                >
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Leaf className="h-12 w-12" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Testimonial */}
            <div>
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="font-serif text-3xl md:text-4xl text-stone-900 leading-snug mb-8">
                "Bloom has completely transformed my apartment. Every two weeks feels like a little gift to myself."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-200 to-rose-300 flex items-center justify-center text-white font-medium">
                  EM
                </div>
                <div>
                  <p className="font-medium text-stone-900">Emma Mitchell</p>
                  <p className="text-stone-500">Premium subscriber since 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-rose-600 font-medium mb-4">Simple pricing</p>
          <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">
            Start from $29/month
          </h2>
          <p className="text-xl text-stone-600 mb-10 max-w-2xl mx-auto">
            Free delivery. Cancel anytime. Choose weekly, bi-weekly, or monthly—whatever suits your lifestyle.
          </p>
          <Button
            size="lg"
            className="bg-stone-900 hover:bg-stone-800 text-white text-base px-10 py-6 rounded-full shadow-lg shadow-stone-900/20"
          >
            View all plans
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-transparent to-amber-500/10" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
            Ready to bloom?
          </h2>
          <p className="text-xl text-stone-300 mb-10 max-w-2xl mx-auto">
            Join thousands of residents who've made fresh flowers a part of their everyday life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white hover:bg-stone-100 text-stone-900 text-base px-10 py-6 rounded-full"
            >
              Get started today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
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
              <Link href="/residents" className="hover:text-white transition-colors">Residents</Link>
              <Link href="/florists" className="hover:text-white transition-colors">Florists</Link>
              <Link href="#" className="hover:text-white transition-colors">About</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
