"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Pause, Volume2, VolumeX } from "lucide-react"
import gsap from "gsap"

export default function ExampleBPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(contentRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 0.3 }
      )
    })
    return () => ctx.revert()
  }, [])

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="relative min-h-screen bg-stone-900 overflow-hidden">
      {/* Background Video/Image Container */}
      <div className="absolute inset-0 z-0">
        {/* Video Background - Replace src with your video URL */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/hero-fallback.jpg" // Fallback image while video loads
        >
          {/* Add your video source here */}
          {/* <source src="/hero-video.mp4" type="video/mp4" /> */}
        </video>

        {/* Fallback/Placeholder - Remove when you have actual media */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950">
          {/* Decorative gradient orbs to simulate floral imagery */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Video Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-2">
        <button
          onClick={toggleVideo}
          className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors"
          aria-label={isVideoPlaying ? "Pause video" : "Play video"}
        >
          {isVideoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          onClick={toggleMute}
          className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="w-full py-6 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-white text-xl font-semibold tracking-tight">
              Bloom
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/residents" className="text-white/70 hover:text-white transition-colors text-sm">
                Residents
              </Link>
              <Link href="/florists" className="text-white/70 hover:text-white transition-colors text-sm">
                Florists
              </Link>
              <Button
                asChild
                size="sm"
                className="bg-white text-stone-900 hover:bg-white/90 rounded-full px-6"
              >
                <Link href="/residents">Get Started</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
          <div ref={contentRef} className="max-w-4xl mx-auto text-center">
            {/* Small label */}
            <p className="text-rose-400 text-sm font-medium tracking-widest uppercase mb-6">
              Floral Subscriptions
            </p>

            {/* Main headline */}
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white leading-[1.05] mb-8">
              Nature delivered
              <br />
              to your door
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
              Curated arrangements from local artisans, bringing the beauty of fresh flowers into your everyday life.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-stone-900 hover:bg-white/90 text-base px-10 py-6 rounded-full shadow-2xl shadow-black/20"
              >
                <Link href="/residents">
                  Start your subscription
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="text-white border border-white/30 hover:bg-white/10 text-base px-10 py-6 rounded-full"
              >
                <Link href="#how-it-works">
                  Learn more
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="w-full py-8 px-6 lg:px-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-wrap justify-center md:justify-start gap-8 text-sm text-white/50">
              <div>
                <span className="text-white font-semibold text-2xl">2,847+</span>
                <p>Happy subscribers</p>
              </div>
              <div>
                <span className="text-white font-semibold text-2xl">50+</span>
                <p>Partner florists</p>
              </div>
              <div>
                <span className="text-white font-semibold text-2xl">4.9</span>
                <p>Average rating</p>
              </div>
            </div>
            <p className="text-white/40 text-sm">
              Free delivery · Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 hidden lg:block">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  )
}
