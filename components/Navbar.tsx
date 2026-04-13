"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiSearch,
  FiBarChart2,
  FiStar,
  FiBriefcase,
  FiFilter,
  FiGrid,
} from "react-icons/fi";

const NAV_LINKS = [
  { href: "/", label: "Search", icon: FiSearch },
  { href: "/compare", label: "Compare", icon: FiBarChart2 },
  { href: "/watchlist", label: "Watchlist", icon: FiStar },
  { href: "/portfolio", label: "Portfolio", icon: FiBriefcase },
  { href: "/screener", label: "Screener", icon: FiFilter },
  { href: "/heatmap", label: "Heatmap", icon: FiGrid },
];

function LogoSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="nav-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#0a0a0a" />
      <rect x="96" y="280" width="56" height="140" rx="8" fill="url(#nav-logo-g)" opacity="0.5" />
      <rect x="192" y="200" width="56" height="220" rx="8" fill="url(#nav-logo-g)" opacity="0.65" />
      <rect x="288" y="140" width="56" height="280" rx="8" fill="url(#nav-logo-g)" opacity="0.8" />
      <rect x="384" y="80" width="56" height="340" rx="8" fill="url(#nav-logo-g)" />
      <line x1="124" y1="270" x2="412" y2="70" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default function Navbar({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="fixed top-5 left-4 right-4 sm:left-6 sm:right-6 z-50 flex items-center justify-between gap-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <LogoSVG />
        <span className="text-lg font-bold tracking-tight text-white hidden sm:inline">Stockify</span>
      </Link>

      {/* Desktop nav pill */}
      <nav className="hidden lg:flex items-center rounded-full border border-white/10 bg-black/50 backdrop-blur-2xl p-1 gap-0.5 shadow-2xl">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Icon size={13} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile nav pill — icon only */}
      <nav className="flex lg:hidden items-center rounded-full border border-white/10 bg-black/50 backdrop-blur-2xl p-1 gap-0.5 shadow-2xl">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full p-2 transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
              }`}
              title={link.label}
            >
              <Icon size={15} />
            </Link>
          );
        })}
      </nav>

      {/* Right slot (auth buttons, etc.) */}
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}
