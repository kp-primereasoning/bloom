"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

function Petal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 80" className={className} style={style} fill="currentColor">
      <path d="M30 0 C45 20, 60 40, 30 80 C0 40, 15 20, 30 0Z" />
    </svg>
  )
}

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const petals = containerRef.current.querySelectorAll(".petal")

    const ctx = gsap.context(() => {
      petals.forEach((petal, i) => {
        gsap.to(petal, {
          y: `random(-30, 30)`,
          x: `random(-20, 20)`,
          rotation: `random(-25, 25)`,
          duration: `random(3, 6)`,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.3,
        })
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const petals = [
    { top: "8%", left: "20%", size: "60px", color: "text-rose-300/60", rotate: -15 },
    { top: "15%", left: "65%", size: "45px", color: "text-rose-200/50", rotate: 30 },
    { top: "35%", left: "10%", size: "35px", color: "text-rose-300/40", rotate: -45 },
    { top: "25%", left: "80%", size: "55px", color: "text-rose-200/60", rotate: 15 },
    { top: "55%", left: "30%", size: "50px", color: "text-rose-300/50", rotate: -30 },
    { top: "50%", left: "75%", size: "40px", color: "text-rose-200/40", rotate: 60 },
    { top: "70%", left: "15%", size: "45px", color: "text-rose-200/50", rotate: 20 },
    { top: "65%", left: "55%", size: "55px", color: "text-rose-300/60", rotate: -20 },
    { top: "80%", left: "40%", size: "35px", color: "text-rose-200/40", rotate: 45 },
    { top: "85%", left: "85%", size: "50px", color: "text-rose-300/50", rotate: -10 },
    { top: "40%", left: "45%", size: "65px", color: "text-rose-200/30", rotate: 35 },
    { top: "12%", left: "42%", size: "30px", color: "text-rose-300/40", rotate: -55 },
  ]

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Soft radial gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-[#FFF5EE] to-rose-100" />
      <div className="absolute top-1/4 left-1/4 w-[60%] h-[60%] bg-rose-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-amber-100/20 rounded-full blur-3xl" />

      {/* Floating petals */}
      {petals.map((p, i) => (
        <Petal
          key={i}
          className={`petal absolute ${p.color}`}
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
