"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

function Petal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 80" className={className} style={style} fill="currentColor">
      <path d="M30 0 C46 22, 58 44, 30 80 C2 44, 14 22, 30 0Z" />
    </svg>
  )
}

function WidePetal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 60" className={className} style={style} fill="currentColor">
      <path d="M0 30 C22 14, 52 4, 80 30 C52 56, 22 46, 0 30Z" />
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
          y: `random(-18, 18)`,
          x: `random(-12, 12)`,
          rotation: `random(-12, 12)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.5,
        })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(150deg, #FFF8F5 0%, #FFF5EE 55%, #FCEAE0 100%)"
      }} />
      {/* Ambient glow — right side only */}
      <div className="absolute top-0 right-0 w-[55%] h-[65%] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(ellipse, rgba(232,160,160,0.2) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[40%] rounded-full blur-[80px]"
        style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />

      {/* Intentional petal cluster — upper right, bleeding off screen */}
      <Petal     className="petal absolute text-rose-300/40" style={{ top: "-4%",  right: "6%",  width: "140px", height: "140px", transform: "rotate(28deg)"  }} />
      <WidePetal className="petal absolute text-rose-200/35" style={{ top: "6%",   right: "-2%", width: "120px", height: "120px", transform: "rotate(-15deg)" }} />
      <Petal     className="petal absolute text-rose-300/30" style={{ top: "16%",  right: "14%", width: "95px",  height: "95px",  transform: "rotate(-40deg)" }} />
      <WidePetal className="petal absolute text-rose-200/25" style={{ top: "22%",  right: "2%",  width: "80px",  height: "80px",  transform: "rotate(55deg)"  }} />

      {/* Mid-right — sparse */}
      <Petal     className="petal absolute text-rose-300/20" style={{ top: "42%",  right: "8%",  width: "70px",  height: "70px",  transform: "rotate(-22deg)" }} />
      <WidePetal className="petal absolute text-rose-200/18" style={{ top: "55%",  right: "18%", width: "60px",  height: "60px",  transform: "rotate(38deg)"  }} />

      {/* Lower right — anchor the composition */}
      <Petal     className="petal absolute text-rose-300/25" style={{ top: "72%",  right: "5%",  width: "90px",  height: "90px",  transform: "rotate(15deg)"  }} />
      <WidePetal className="petal absolute text-rose-200/20" style={{ top: "80%",  right: "22%", width: "65px",  height: "65px",  transform: "rotate(-48deg)" }} />
    </div>
  )
}
