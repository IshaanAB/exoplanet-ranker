// pages/api/ratings/[planet].ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (same as in ratings.ts)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only GET is allowed here
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { planet } = req.query;
  if (typeof planet !== "string") {
    return res.status(400).json({ error: "Planet name must be provided in the URL." });
  }

  // Fetch all ratings for this planet
  const { data, error } = await supabase
    .from("ratings")
    .select("rating")
    .eq("planet_name", planet);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // data is RatingRow[] – each item has a .rating property
  const ratings = (data as Array<{ rating: number }> | null) ?? [];
  const count = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const average = count > 0 ? sum / count : 0;

  return res.status(200).json({ average, count });
}
