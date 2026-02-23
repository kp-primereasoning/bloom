"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Leaf } from "lucide-react"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-bloom-cream/80 backdrop-blur-md border-b border-stone-200/50">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Leaf className="h-7 w-7 text-bloom-sage transition-transform group-hover:rotate-12" />
              <span className="text-2xl font-serif text-bloom-dark">Bloom</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <Link
              href="/florists"
              className="text-stone-600 hover:text-bloom-dark transition-colors text-sm font-medium tracking-wide uppercase"
            >
              Florists
            </Link>
            <Link
              href="/property-managers"
              className="text-stone-600 hover:text-bloom-dark transition-colors text-sm font-medium tracking-wide uppercase"
            >
              Buildings
            </Link>
            <Button asChild className="rounded-full px-6 bg-bloom-dark text-bloom-cream hover:bg-stone-800 transition-transform hover:scale-105">
              <a href="/#sign-up">Get Started</a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="text-stone-600"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white/95 backdrop-blur-md rounded-b-2xl">
            <div className="py-4 space-y-1">
              <Link
                href="/florists"
                className="block px-3 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Florists
              </Link>
              <Link
                href="/property-managers"
                className="block px-3 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Buildings
              </Link>
              <div className="pt-2 px-3">
                <Button asChild className="w-full rounded-full">
                  <a href="/#sign-up" onClick={() => setIsOpen(false)}>
                    Get Started
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}