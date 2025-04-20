// pages/api/ratings.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// ← use the public anon key here
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { planet_name, rating } = req.body as {
    planet_name: string;
    rating: number;
  };

  // ← insert only planet_name & rating (no user_id)
  const { data, error } = await supabase
    .from("ratings")
    .insert([{ planet_name, rating }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
}
