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

function RoundPetal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 70 70" className={className} style={style} fill="currentColor">
      <path d="M35 4 C55 4, 66 20, 66 35 C66 50, 55 66, 35 66 C15 66, 4 50, 4 35 C4 20, 15 4, 35 4Z" />
    </svg>
  )
}

function LongPetal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 100" className={className} style={style} fill="currentColor">
      <path d="M20 0 C38 20, 40 50, 20 100 C0 50, 2 20, 20 0Z" />
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
          y: `random(-25, 25)`,
          x: `random(-15, 15)`,
          rotation: `random(-20, 20)`,
          duration: `random(4, 7)`,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.25,
        })
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF8F5] via-[#FFF5EE] to-rose-50" />
      {/* Warm glow — biased right */}
      <div className="absolute top-0 right-0 w-[65%] h-[70%] bg-rose-200/25 rounded-full blur-[80px]" />
      <div className="absolute bottom-0 right-[10%] w-[40%] h-[50%] bg-amber-100/20 rounded-full blur-[60px]" />
      <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-bloom-rose/15 rounded-full blur-[50px]" />

      {/* Large cluster — top right, bleeds off screen */}
      <LongPetal className="petal absolute text-rose-300/50" style={{ top: "-5%", right: "8%",  width: "110px", height: "110px", transform: "rotate(35deg)" }} />
      <Petal     className="petal absolute text-rose-200/60" style={{ top: "2%",  right: "18%", width: "90px",  height: "90px",  transform: "rotate(-15deg)" }} />
      <RoundPetal className="petal absolute text-rose-300/40" style={{ top: "8%", right: "5%",  width: "75px",  height: "75px",  transform: "rotate(60deg)" }} />
      <LongPetal className="petal absolute text-rose-200/45" style={{ top: "12%", right: "28%", width: "65px",  height: "65px",  transform: "rotate(-40deg)" }} />
      <Petal     className="petal absolute text-rose-300/55" style={{ top: "18%", right: "12%", width: "80px",  height: "80px",  transform: "rotate(20deg)" }} />

      {/* Mid-right scatter */}
      <RoundPetal className="petal absolute text-rose-200/35" style={{ top: "30%", right: "6%",  width: "55px", height: "55px", transform: "rotate(-25deg)" }} />
      <Petal      className="petal absolute text-rose-300/45" style={{ top: "35%", right: "22%", width: "70px", height: "70px", transform: "rotate(50deg)" }} />
      <LongPetal  className="petal absolute text-rose-200/40" style={{ top: "45%", right: "10%", width: "50px", height: "50px", transform: "rotate(-60deg)" }} />
      <Petal      className="petal absolute text-rose-300/30" style={{ top: "55%", right: "30%", width: "60px", height: "60px", transform: "rotate(15deg)" }} />

      {/* Lower right */}
      <RoundPetal className="petal absolute text-rose-200/45" style={{ top: "65%", right: "8%",  width: "65px", height: "65px", transform: "rotate(40deg)" }} />
      <Petal      className="petal absolute text-rose-300/35" style={{ top: "72%", right: "20%", width: "50px", height: "50px", transform: "rotate(-30deg)" }} />
      <LongPetal  className="petal absolute text-rose-200/30" style={{ top: "80%", right: "5%",  width: "80px", height: "80px", transform: "rotate(70deg)" }} />

      {/* A few on the left — subtle, don't compete with text */}
      <Petal     className="petal absolute text-rose-200/25" style={{ top: "15%", left: "5%",  width: "35px", height: "35px", transform: "rotate(-20deg)" }} />
      <RoundPetal className="petal absolute text-rose-200/20" style={{ top: "70%", left: "8%", width: "30px", height: "30px", transform: "rotate(45deg)" }} />
      <Petal     className="petal absolute text-rose-200/20" style={{ top: "85%", left: "35%", width: "40px", height: "40px", transform: "rotate(-50deg)" }} />
    </div>
  )
}
