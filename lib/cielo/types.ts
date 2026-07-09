// FILE: lib/cielo/types.ts

export type CalendarBlockSource =
  | "abraxas_pending"
  | "abraxas_confirmed"
  | "operator"
  | "maintenance";

export interface BlockedDate {
  start: string;
  end: string;
  source?: CalendarBlockSource;
  booking_id?: string | null;
  note?: string | null;
}

export interface CalendarBlockRow {
  id: string;
  start_date: string;
  end_date: string;
  source: CalendarBlockSource;
  booking_id: string | null;
  note: string | null;
  created_at: string;
}

export interface CieloAvailability {
  blocked: BlockedDate[];
  calendar: "abraxas_protocol";
  sources: {
    pending_bookings: number;
    confirmed_bookings: number;
    operator_blocks: number;
    total_nights_blocked: number;
  };
  airbnb_listing_url: string;
  last_attested_at: string | null;
}
