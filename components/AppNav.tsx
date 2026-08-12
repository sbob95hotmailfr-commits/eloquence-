import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/conversation", label: "Conversation" },
  { href: "/progress", label: "Progression" },
  { href: "/settings", label: "Paramètres" },
];

export function AppNav() {
  return (
    <nav className="flex items-center justify-between border-b border-border-subtle px-6 py-3">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-display text-lg">
          Éloquence
        </Link>
        <div className="hidden sm:flex items-center gap-3 text-sm">
          {LINKS.slice(1).map((l) => (
            <Link key={l.href} href={l.href} className="text-foreground/70 hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <ThemeToggle />
    </nav>
  );
}
