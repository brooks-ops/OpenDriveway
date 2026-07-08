import {
  Calendar,
  Download,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { apiSend } from "../lib/api";
import { pageMeta } from "../lib/pageMeta";
import { BottomNav, type BottomNavItem } from "./BottomNav";
import { useAuth } from "./auth-context";
import { MetaHead } from "./MetaHead";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const guestNavItems: BottomNavItem[] = [
  { name: "Search", icon: Search, href: "/search" },
  { name: "Bookings", icon: Calendar, href: "/dashboard" },
  { name: "Messages", icon: MessageSquare, href: "/dashboard" },
  { name: "Profile", icon: UserIcon, href: "/dashboard" },
];

const hostNavItems: BottomNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Listings", icon: Home, href: "/dashboard" },
  { name: "Bookings", icon: Calendar, href: "/dashboard" },
  { name: "Profile", icon: UserIcon, href: "/dashboard" },
];

const adminNavItems: BottomNavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Listings", icon: Home, href: "/search" },
  { name: "Bookings", icon: Calendar, href: "/dashboard" },
  { name: "Users", icon: Users, href: "/dashboard" },
];

const publicNavItems: BottomNavItem[] = [
  { name: "Search", icon: Search, href: "/search" },
  { name: "Host", icon: ShieldCheck, href: "/become-a-host" },
  { name: "Login", icon: LogIn, href: "/login" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2.5 text-base font-bold transition ${
    isActive ? "bg-moss text-cream shadow-glow" : "text-ink hover:bg-curb"
  }`;

export function Layout() {
  const { user, loading, signOut, refreshProfile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const meta = pageMeta(location.pathname);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setShowInstallButton(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const navItems = useMemo(() => {
    if (!user) return publicNavItems;
    if (user.role === "admin") return adminNavItems;
    if (user.role === "host") return hostNavItems;
    return guestNavItems;
  }, [user]);

  const showBecomeHostButton = user && user.role === "driver";
  const showBottomNav = Boolean(user);

  async function handleBecomeHost() {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setStatusMessage(null);
      await apiSend("/api/auth/me", "PATCH", { role: "host" });
      await refreshProfile();
      navigate("/dashboard/listings/new");
    } catch {
      setStatusMessage("Could not upgrade this account right now. Make sure the local API and database are running.");
    }
  }

  async function handleInstallClick() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstallButton(false);
  }

  async function handleLogout() {
    await signOut();
    setIsMenuOpen(false);
    navigate("/");
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#003f17,#001d0b)] text-cream">
        <MetaHead {...meta} />
        <div className="flex flex-col items-center">
          <img src="/brand/opendriveway-badge.jpeg" alt="" className="mb-4 h-20 w-20 animate-pulse rounded-full object-cover shadow-glow" />
          <p className="font-bold text-cream/82">Loading OpenDriveway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 text-ink lg:pb-0">
      <MetaHead {...meta} />
      <header className="sticky top-0 z-40 border-b border-moss/15 bg-cream/92 backdrop-blur">
        <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8 xl:px-10">
          <Link to="/" className="flex items-center gap-3 text-xl font-black tracking-tight lg:text-2xl" onClick={() => setIsMenuOpen(false)}>
            <img src="/brand/opendriveway-badge.jpeg" alt="" className="h-12 w-12 rounded-full object-cover shadow-glow lg:h-14 lg:w-14" />
            <span className="text-ink">OpenDriveway</span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <NavLink key={item.name} to={item.href} className={navLinkClass}>
                <item.icon size={18} /> {item.name}
              </NavLink>
            ))}
            {showBecomeHostButton ? (
              <button onClick={handleBecomeHost} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-moss px-4 py-2.5 text-base font-black text-cream shadow-glow">
                <ShieldCheck size={18} /> Become a Host
              </button>
            ) : null}
            {user ? (
              <button onClick={handleLogout} className="inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2.5 text-base font-bold text-ink hover:bg-curb">
                <LogOut size={18} /> Logout
              </button>
            ) : null}
          </div>

          <button
            onClick={() => setIsMenuOpen((value) => !value)}
            className="grid h-12 w-12 place-items-center rounded-md bg-moss text-cream shadow-glow lg:hidden"
            aria-label="Open navigation"
          >
            {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="border-t border-moss/15 bg-cream lg:hidden">
            <div className="px-4 py-4">
              {user ? (
                <div className="mb-3 rounded-md bg-curb p-3">
                  <p className="font-black">{user.full_name || "OpenDriveway user"}</p>
                  <p className="text-sm text-ink/65">{user.email}</p>
                </div>
              ) : null}
              <div className="grid gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-3 font-bold ${isActive ? "bg-moss text-cream" : "text-ink hover:bg-curb"}`
                    }
                  >
                    <item.icon size={19} /> {item.name}
                  </NavLink>
                ))}
                {showBecomeHostButton ? (
                  <button onClick={handleBecomeHost} className="mt-2 flex items-center gap-3 rounded-md bg-moss px-3 py-3 font-bold text-cream">
                    <ShieldCheck size={19} /> Earn Money as a Host
                  </button>
                ) : null}
                {showInstallButton ? (
                  <button onClick={handleInstallClick} className="flex items-center gap-3 rounded-md px-3 py-3 font-bold text-ink hover:bg-curb">
                    <Download size={19} /> Install App
                  </button>
                ) : null}
                {user ? (
                  <button onClick={handleLogout} className="flex items-center gap-3 rounded-md px-3 py-3 font-bold text-ink hover:bg-curb">
                    <LogOut size={19} /> Logout
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {showBecomeHostButton ? (
        <section className="bg-[linear-gradient(90deg,#006b22,#00a832)] text-cream">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div>
              <h2 className="text-lg font-black">Have a driveway? Start hosting.</h2>
              <p className="text-sm font-medium text-cream/82">List a real parking spot and manage bookings from your dashboard.</p>
            </div>
            <button onClick={handleBecomeHost} className="inline-flex items-center gap-2 rounded-md bg-cream px-4 py-2 font-black text-moss">
              <ShieldCheck size={18} /> Become a Host
            </button>
          </div>
        </section>
      ) : null}

      {statusMessage ? (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <p className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-900">{statusMessage}</p>
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-moss/10 bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm font-semibold text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>OpenDriveway marketplace MVP</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-moss">Terms</Link>
            <Link to="/privacy" className="hover:text-moss">Privacy</Link>
          </div>
        </div>
      </footer>

      {showBottomNav ? <BottomNav items={navItems} /> : null}
    </div>
  );
}
