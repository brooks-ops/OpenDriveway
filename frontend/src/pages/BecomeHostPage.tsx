import { ArrowRight, BadgeDollarSign, MapPinned, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../components/auth-context";
import { apiSend } from "../lib/api";

export function BecomeHostPage() {
  const navigate = useNavigate();
  const { session, user, refreshProfile } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  async function startHosting() {
    if (!session) {
      navigate("/login?mode=signup&intent=host&next=/dashboard/listings/new");
      return;
    }
    if (user?.role !== "host" && user?.role !== "admin") {
      try {
        await apiSend("/api/auth/me", "PATCH", { role: "host" });
        await refreshProfile();
      } catch {
        setMessage("Could not upgrade this account to host. Make sure the local API and database are running.");
        return;
      }
    }
    navigate("/dashboard/listings/new");
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <h1 className="max-w-3xl text-5xl font-black leading-tight">Earn from driveway space you already have.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">OpenDriveway gives hosts the tools to publish real spaces, verify payout readiness through Stripe Connect, and reach drivers searching near high-demand destinations.</p>
          <button onClick={startHosting} className="mt-8 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-bold text-white">
            Start hosting <ArrowRight size={18} />
          </button>
          {message ? <p className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm font-bold text-yellow-900">{message}</p> : null}
        </div>
        <div className="grid gap-4">
          {[
            { icon: MapPinned, title: "List precise spaces", text: "Set address, coordinates, capacity, amenities, and active status." },
            { icon: BadgeDollarSign, title: "Use Stripe Connect", text: "Onboard securely for marketplace payouts before taking reservations." },
            { icon: ShieldCheck, title: "Stay in control", text: "Publish, pause, archive, and update pricing as demand changes." },
          ].map((item) => (
            <div key={item.title} className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
              <item.icon className="text-moss" size={26} />
              <h2 className="mt-3 text-lg font-black">{item.title}</h2>
              <p className="mt-1 text-ink/65">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
