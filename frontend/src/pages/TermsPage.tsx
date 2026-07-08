export function TermsPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-moss">OpenDriveway terms</p>
      <h1 className="mt-3 text-4xl font-black sm:text-5xl">Terms of Service</h1>
      <div className="mt-8 space-y-6 leading-8 text-ink/75">
        <p>
          These starter terms are provided for MVP launch readiness and should be reviewed by a qualified attorney before
          OpenDriveway is offered broadly to the public.
        </p>
        <p>
          OpenDriveway connects drivers looking for parking with hosts who list privately controlled parking spaces.
          Hosts are responsible for making sure they have the right to offer a space, that the listing is accurate, and
          that the space is safe and available during the booked time.
        </p>
        <p>
          Drivers are responsible for providing accurate booking information, parking only in the booked space and time
          window, following posted rules, and removing vehicles promptly when the reservation ends.
        </p>
        <p>
          Payments, host onboarding, refunds, and payouts may be processed by Stripe. OpenDriveway may restrict, cancel,
          or refund bookings when fraud, safety, payment failure, listing inaccuracy, or misuse is suspected.
        </p>
        <p>
          OpenDriveway is not a parking operator, insurer, towing provider, or property manager. To the fullest extent
          permitted by law, use of the marketplace is at the user's own risk.
        </p>
      </div>
    </section>
  );
}
