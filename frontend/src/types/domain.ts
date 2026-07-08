export type UserRole = "driver" | "host" | "admin";
export type ListingStatus = "draft" | "active" | "paused" | "archived";
export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  price_cents: number;
  currency: string;
  capacity: number;
  covered: boolean;
  ev_charging: boolean;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface ListingSearchResult {
  items: Listing[];
  total: number;
}

export interface Booking {
  id: string;
  listing_id: string;
  driver_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  total_cents: number;
  currency: string;
  created_at: string;
}
