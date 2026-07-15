// FILE: lib/cielo/flagshipHighlights.ts
// Curated guest-facing facts from FLAGSHIP_PROPERTY — readable booking context.

import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";

const D = FLAGSHIP_PROPERTY;
const P = D.property;
const L = D.location;
const F = D.financials;

export const CIELO_BOOKING_HIGHLIGHTS = {
  tagline: D.tagline,
  subtitle: `${D.subtitle} · ${L.city}, ${L.state}`,
  nightlyRange: `$${F.nightlyRateOff}–$${F.nightlyRatePeak}/night on Abraxas`,
  avgNightly: F.nightlyRateAvg,
  checkIn: P.checkIn,
  checkOut: P.checkOut,
  guests: `${P.guestCapacity} guests (${P.totalSleepCapacity} max capacity)`,
  beds: `${P.bedrooms} bed · ${P.beds} beds · ${P.bathrooms} baths`,
  rating: `${D.guestProfile.avgRating} ★ · ${D.guestProfile.totalReviews} reviews · Superhost`,
  response: `${D.ownership.responseRate} response · ${D.ownership.responseTime}`,
  signature: P.signatureFeature,
  wellness: P.amenities.wellness.slice(0, 6),
  locationBlurb: `${L.ridgeline}. ${L.views}.`,
  driveTimes: L.driveTimes,
  selfCheckIn: P.checkInMethod,
  wifi: "1 Gig fiber WiFi",
  ev: P.evCharger,
} as const;

export const CIELO_GUEST_ESSENTIALS = [
  { label: "Sleeps", value: CIELO_BOOKING_HIGHLIGHTS.guests },
  { label: "Layout", value: CIELO_BOOKING_HIGHLIGHTS.beds },
  { label: "Check-in", value: `${CIELO_BOOKING_HIGHLIGHTS.checkIn} · keypad` },
  { label: "Check-out", value: CIELO_BOOKING_HIGHLIGHTS.checkOut },
  { label: "Two nights", value: `$${F.twoNightsAllIn.toLocaleString()} incl. all fees` },
  { label: "Guests say", value: CIELO_BOOKING_HIGHLIGHTS.rating },
] as const;
