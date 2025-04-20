// pages/api/exoplanets.ts
import { NextRequest, NextResponse } from "next/server";

// 1) Tell Next.js to use the Edge runtime
export const config = { runtime: "edge" };

// 2) Your handler now uses ESM and NextResponse
export default async function handler(req: NextRequest) {
  const nasaURL =
    "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,pl_rade,pl_eqt,st_teff+from+pscomppars&format=csv";
  try {
    const res = await fetch(nasaURL);
    const csv = await res.text();
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch exoplanet data" },
      { status: 500 }
    );
  }
}
