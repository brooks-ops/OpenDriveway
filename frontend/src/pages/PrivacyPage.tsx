export function PrivacyPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-moss">OpenDriveway privacy</p>
      <h1 className="mt-3 text-4xl font-black sm:text-5xl">Privacy Policy</h1>
      <div className="mt-8 space-y-6 leading-8 text-ink/75">
        <p>
          This starter privacy policy is provided for MVP launch readiness and should be reviewed by a qualified attorney
          before public launch.
        </p>
        <p>
          OpenDriveway collects account information, listing information, booking details, approximate or precise location
          information when permitted, device/browser metadata, and payment-related identifiers needed to operate the
          marketplace.
        </p>
        <p>
          Account authentication may be handled by Supabase. Payment processing and host payouts may be handled by
          Stripe. Map and geocoding services may process location searches needed to show and book parking spaces.
        </p>
        <p>
          OpenDriveway uses this information to create accounts, show listings, process bookings and payments, prevent
          fraud, support users, improve marketplace quality, and comply with legal obligations.
        </p>
        <p>
          Users may contact OpenDriveway support to request account help, data correction, or deletion where legally
          available. Some records may be retained when needed for fraud prevention, accounting, dispute handling, or legal
          compliance.
        </p>
      </div>
    </section>
  );
}
