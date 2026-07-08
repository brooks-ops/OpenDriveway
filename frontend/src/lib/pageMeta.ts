export function pageMeta(pathname: string) {
  if (pathname.startsWith("/search")) {
    return {
      title: "Find & Book Driveway Parking - OpenDriveway",
      description: "Search active driveway parking spaces near events, airports, downtown areas, campuses, and other destinations.",
      keywords: "find parking, driveway parking, event parking, airport parking, book parking",
    };
  }

  if (pathname.startsWith("/dashboard/listings/new")) {
    return {
      title: "Create a Listing - OpenDriveway",
      description: "Create and publish a driveway parking listing for OpenDriveway.",
      keywords: "list driveway, host parking, driveway rental",
    };
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      title: "Dashboard - OpenDriveway",
      description: "Manage your OpenDriveway account, reservations, host listings, and payout onboarding.",
      keywords: "parking dashboard, host dashboard, parking bookings",
    };
  }

  if (pathname.startsWith("/become-a-host")) {
    return {
      title: "Become a Host - OpenDriveway",
      description: "Turn unused driveway parking space into local income with OpenDriveway.",
      keywords: "rent my driveway, host parking, driveway income",
    };
  }

  if (pathname.startsWith("/login")) {
    return {
      title: "Login - OpenDriveway",
      description: "Access your OpenDriveway driver or host account.",
      keywords: "OpenDriveway login, parking account",
    };
  }

  if (pathname.startsWith("/listings")) {
    return {
      title: "Parking Listing - OpenDriveway",
      description: "View driveway parking details, amenities, pricing, and reservation options.",
      keywords: "parking listing, reserve parking, driveway space",
    };
  }

  if (pathname.startsWith("/terms")) {
    return {
      title: "Terms of Service - OpenDriveway",
      description: "OpenDriveway marketplace terms for drivers and hosts.",
      keywords: "OpenDriveway terms, parking marketplace terms",
    };
  }

  if (pathname.startsWith("/privacy")) {
    return {
      title: "Privacy Policy - OpenDriveway",
      description: "OpenDriveway privacy policy for account, location, booking, and payment data.",
      keywords: "OpenDriveway privacy, parking marketplace privacy",
    };
  }

  return {
    title: "OpenDriveway | Find & Rent Driveway Parking",
    description: "OpenDriveway connects drivers with homeowner driveway parking near events, airports, downtown areas, and destinations.",
    keywords: "driveway parking, rent driveway, event parking, parking marketplace",
  };
}
