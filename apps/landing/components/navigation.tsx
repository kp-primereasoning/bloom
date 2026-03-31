"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Leaf } from "lucide-react"

const NAV_LINKS = [
  { label: "HOME",       href: "/" },
  { label: "FLORISTS",   href: "/florists" },
  { label: "PROPERTIES", href: "/property-managers" },
  { label: "CONTACT",    href: "/contact" },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#FFFBF7]/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Leaf className="h-5 w-5 text-bloom-sage transition-transform group-hover:rotate-12" />
            <span className="font-serif text-xl text-bloom-dark tracking-tight">Bloom</span>
          </Link>

          {/* Desktop nav - centered */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-20">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="text-sm text-stone-500 hover:text-bloom-dark transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Register CTA */}
          <div className="hidden md:block ml-auto">
            <Button asChild
              className="bg-bloom-dark hover:bg-stone-800 text-white rounded-full px-6 py-2.5 text-sm font-medium uppercase tracking-wide transition-transform hover:scale-[1.02]">
              <a href="/register">Register</a>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-stone-600 hover:text-bloom-dark transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-stone-100 py-4 space-y-1">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-stone-600 hover:text-bloom-dark hover:bg-stone-50 rounded-lg transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full border border-stone-400/60 inline-block" />
                {link.label}
              </Link>
            ))}
            <div className="pt-3 px-3">
              <Button asChild className="w-full bg-bloom-sage text-white rounded-full text-sm font-medium">
                <a href="/register" onClick={() => setIsOpen(false)}>Register</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
