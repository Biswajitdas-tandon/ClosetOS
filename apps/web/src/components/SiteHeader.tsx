import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({ user }: { user?: { email?: string | null } | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-medium tracking-tight">
          ClosetOS
        </Link>
        <nav className="flex items-center gap-5 whitespace-nowrap text-sm text-text-secondary">
          <Link href="/library" className="transition-colors hover:text-text-primary">
            Library
          </Link>
          <Link href="/outfits" className="transition-colors hover:text-text-primary">
            Outfits
          </Link>
          <Link href="/calendar" className="transition-colors hover:text-text-primary">
            Calendar
          </Link>
          <Link href="/wishlist" className="hidden transition-colors hover:text-text-primary md:inline">
            Wishlist
          </Link>
          <Link href="/packing" className="hidden transition-colors hover:text-text-primary md:inline">
            Packing
          </Link>
          <Link href="/library/add" className="hidden transition-colors hover:text-text-primary lg:inline">
            Add item
          </Link>
          <ThemeToggle />
          {user ? (
            <Link href="/account" className="text-text-muted hover:text-text-primary">
              {user.email}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3 py-1.5 text-text-onAccent transition-colors hover:bg-accent-hover"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
