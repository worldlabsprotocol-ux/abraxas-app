import { legacyAuthRouteDisabledResponse } from "@/lib/auth/legacyAuthRoutes";

export async function GET() {
  return legacyAuthRouteDisabledResponse();
}

export async function POST() {
  return legacyAuthRouteDisabledResponse();
}
