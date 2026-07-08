import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiSend } from "../lib/api";

export function NewListingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiSend<{ id: string }>("/api/listings", "POST", {
      title: form.get("title"),
      description: form.get("description"),
      address_line1: form.get("address_line1"),
      address_line2: form.get("address_line2") || null,
      city: form.get("city"),
      state: form.get("state"),
      postal_code: form.get("postal_code"),
      country: "US",
      latitude: form.get("latitude"),
      longitude: form.get("longitude"),
      price_cents: Number(form.get("price_cents")),
      currency: "usd",
      capacity: Number(form.get("capacity")),
      covered: form.get("covered") === "on",
      ev_charging: form.get("ev_charging") === "on",
      status: form.get("status"),
    }).catch((err: Error) => {
      setError(err.message);
      throw err;
    });
    navigate("/dashboard");
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black">New driveway listing</h1>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-md border border-ink/10 bg-white p-6 shadow-sm">
        {[
          ["title", "Title"],
          ["description", "Description"],
          ["address_line1", "Address line 1"],
          ["address_line2", "Address line 2"],
          ["city", "City"],
          ["state", "State"],
          ["postal_code", "Postal code"],
          ["latitude", "Latitude"],
          ["longitude", "Longitude"],
          ["price_cents", "Hourly price in cents"],
          ["capacity", "Capacity"],
        ].map(([name, label]) => (
          <label key={name} className="block">
            <span className="text-sm font-bold">{label}</span>
            {name === "description" ? (
              <textarea name={name} required rows={5} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3" />
            ) : (
              <input name={name} required={name !== "address_line2"} type={["latitude", "longitude"].includes(name) ? "number" : ["price_cents", "capacity"].includes(name) ? "number" : "text"} step="any" className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3" />
            )}
          </label>
        ))}
        <label className="block">
          <span className="text-sm font-bold">Status</span>
          <select name="status" defaultValue="draft" className="mt-1 w-full rounded-md border border-ink/15 px-3 py-3">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 font-bold"><input name="covered" type="checkbox" /> Covered</label>
          <label className="inline-flex items-center gap-2 font-bold"><input name="ev_charging" type="checkbox" /> EV charging</label>
        </div>
        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button className="w-full rounded-md bg-ink px-4 py-3 font-bold text-white">Create listing</button>
      </form>
    </section>
  );
}
