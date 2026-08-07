"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfile, isDemo } from "@/lib/data";

const LINKS = [
  { href: "/", label: "Today", icon: SunIcon },
  { href: "/brain", label: "Brain", icon: BrainIcon },
  { href: "/blogs", label: "Blogs", icon: BookIcon },
  { href: "/add", label: "Add", icon: PlusIcon },
  { href: "/follow", label: "Follow", icon: CompassIcon },
  { href: "/recall", label: "Recall", icon: BoltIcon },
];

/** The chapter reader is the one route wider than `max-w-6xl` — from 1400px it
 *  gains a diagram rail and fills the window. The top bar matches its container
 *  and padding there, or the wordmark floats a couple of hundred pixels inboard
 *  of the chapter title sitting right under it. Only there: the bar's contents
 *  are fixed-width and wrap into a mess if it is narrowed to a reading measure,
 *  which is what the route uses below 1400. */
const WIDE_ROUTE = /^\/learn\/class-9\/[^/]+\/[^/]+/;

export default function Nav() {
  const pathname = usePathname();
  const wide = WIDE_ROUTE.test(pathname);
  const [stats, setStats] = useState<{ streak: number } | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  // isDemo depends on the guest cookie, which the server can't see — read it
  // after mount so SSR and first client render agree.
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setDemo(isDemo);
    getProfile()
      .then((p) => {
        setStats({ streak: p.streak });
        setAuthStatus("authenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, [pathname]);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#0b0a0e]/90 via-[#0b0a0e]/60 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_72%,transparent)] pb-3">
        <div
          className={`mx-auto flex h-[68px] items-center justify-between ${
            wide
              ? "max-w-6xl px-4 sm:px-6 min-[1400px]:max-w-[1600px] min-[1400px]:px-8"
              : "max-w-6xl px-4 sm:px-6"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a5c] to-[#f5b95f] shadow-[0_0_28px_rgba(255,122,92,0.45)]">
              <BrainIcon className="h-5 w-5 text-[#1a120e]" />
            </span>
            <span className="flex flex-col">
              <span className="display text-lg font-bold leading-tight tracking-tight">Knovis</span>
              <span className="hidden text-[9.5px] leading-tight tracking-wide text-faint sm:block">
                learn it once — never forget it
              </span>
            </span>
            {demo && (
              <span className="micro ml-1 rounded-full bg-[#f5b95f]/12 px-2.5 py-1 !text-[#f5b95f]">
                demo
              </span>
            )}
          </Link>

          {/* Desktop links — floating pill group */}
          <nav data-tour="nav" className="hidden items-center gap-1 rounded-full bg-white/[0.035] p-1 backdrop-blur-xl md:flex">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  pathname === href
                    ? "bg-[#f4f1e9] text-[#131118] shadow-[0_4px_16px_rgba(244,241,233,0.15)]"
                    : "text-muted hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {stats && (
              <span
                className="flex items-center gap-1.5 rounded-full bg-[#ff7a5c]/12 px-3 py-1 text-sm font-semibold text-[#ff9a80]"
                title="Daily streak"
              >
                <FlameIcon className="h-4 w-4" />
                {stats.streak}
              </span>
            )}

            {/* Auth controls */}
            {demo || authStatus === "unauthenticated" ? (
              <Link
                href="/login"
                className="hidden rounded-full bg-gradient-to-r from-[#ff7a5c] to-[#f5b95f] px-4 py-1.5 text-sm font-semibold text-[#1a120e] shadow-[0_0_18px_rgba(255,122,92,0.35)] transition-all hover:shadow-[0_0_28px_rgba(255,122,92,0.55)] md:flex items-center gap-1.5"
              >
                <UserIcon className="h-3.5 w-3.5" />
                Sign in
              </Link>
            ) : authStatus === "authenticated" ? (
              <Link
                href="/profile"
                title="Profile"
                className={`hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all md:flex ${
                  pathname === "/profile"
                    ? "bg-[#f4f1e9] text-[#131118] shadow-[0_4px_16px_rgba(244,241,233,0.15)]"
                    : "bg-white/[0.05] text-muted hover:text-white"
                }`}
              >
                <UserIcon className="h-4 w-4" />
                Profile
              </Link>
            ) : (
              <div className="hidden md:block w-20" />
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom tabs */}
      <nav data-tour="nav" className="fixed inset-x-3 bottom-3 z-40 rounded-[1.5rem] bg-[#14111a]/80 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:hidden">
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                pathname === href ? "text-[#ff9a80]" : "text-faint"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
          {/* Mobile auth/profile tab */}
          <Link
            href={demo || authStatus === "unauthenticated" ? "/login" : "/profile"}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              pathname === (demo || authStatus === "unauthenticated" ? "/login" : "/profile") ? "text-[#ff9a80]" : "text-faint"
            }`}
          >
            <UserIcon className="h-5 w-5" />
            {demo || authStatus === "unauthenticated" ? "Sign in" : "Profile"}
          </Link>
        </div>
      </nav>
    </>
  );
}

export function BrainIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="5" cy="6" r="1.6" />
      <circle cx="19" cy="6" r="1.6" />
      <circle cx="5" cy="18" r="1.6" />
      <circle cx="19" cy="18" r="1.6" />
      <path d="M6.3 7.1l3.9 3.4M17.7 7.1l-3.9 3.4M6.3 16.9l3.9-3.4M17.7 16.9l-3.9-3.4" />
    </svg>
  );
}

function SunIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function BoltIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M13 2L4.5 13.5h6L11 22l8.5-11.5h-6L13 2z" />
    </svg>
  );
}

export function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-4.4 0-8-3.2-8-7.6 0-3 1.9-5.2 3.4-7 .3-.4 1-.2 1 .3.1 1 .4 2 1.1 2.6C10.3 8.6 11 5 10.2 1.9c-.1-.5.4-.9.8-.7C15.3 3.6 20 8.6 20 15.4c0 4.4-3.6 7.6-8 7.6zm0-2c1.7 0 3-1.3 3-3 0-1.3-.8-2.3-1.6-3.3-.2-.3-.7-.3-.9 0-.7 1-1.5 2-1.5 3.3-.6-.4-1-.9-1.3-1.5-.2-.4-.7-.4-.9 0-.3.6-.8 1.5-.8 2.5 0 1.7 1.3 3 3 3h1z" />
    </svg>
  );
}

function BookIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CompassIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.1 5-5 2.1 2.1-5 5-2.1z" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
