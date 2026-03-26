"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, Leaf } from "lucide-react"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/register"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bloom-cream/80 backdrop-blur-md border-b border-stone-200/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-bloom-sage" />
              <span className="font-serif text-xl text-bloom-dark">Bloom</span>
            </Link>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-10">
            <Link href="/florists" className="text-[13px] tracking-[0.12em] uppercase text-stone-500 hover:text-bloom-dark transition-colors">
              Florists
            </Link>
            <Link href="/property-managers" className="text-[13px] tracking-[0.12em] uppercase text-stone-500 hover:text-bloom-dark transition-colors">
              Buildings
            </Link>
            <a href={`${APP_URL}/login`} className="text-[13px] text-stone-500 hover:text-bloom-dark transition-colors">
              Log in
            </a>
            <a
              href={APP_URL}
              className="bg-bloom-dark text-bloom-cream text-[13px] px-5 py-2.5 rounded-full hover:bg-stone-800 transition-colors"
            >
              Get started
            </a>
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-stone-600 p-1">
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white/95 backdrop-blur-md rounded-b-2xl pb-4">
            <div className="pt-3 space-y-1">
              <Link href="/florists" className="block px-3 py-2.5 text-[14px] text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg" onClick={() => setIsOpen(false)}>
                Florists
              </Link>
              <Link href="/property-managers" className="block px-3 py-2.5 text-[14px] text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg" onClick={() => setIsOpen(false)}>
                Buildings
              </Link>
              <a href={`${APP_URL}/login`} className="block px-3 py-2.5 text-[14px] text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg" onClick={() => setIsOpen(false)}>
                Log in
              </a>
              <div className="px-3 pt-2">
                <a href={APP_URL} className="block text-center bg-bloom-dark text-bloom-cream text-[14px] py-3 rounded-full" onClick={() => setIsOpen(false)}>
                  Get started
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
