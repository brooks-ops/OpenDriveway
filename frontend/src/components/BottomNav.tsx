import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

export interface BottomNavItem {
  name: string;
  icon: LucideIcon;
  href: string;
}

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-moss/15 bg-cream/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(0,64,23,0.12)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-xs font-bold transition ${
                isActive ? "text-moss" : "text-ink/58"
              }`
            }
          >
            <item.icon size={21} aria-hidden="true" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
