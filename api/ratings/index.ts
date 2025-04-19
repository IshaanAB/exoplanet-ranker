// pages/api/ratings.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// 1) Init Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2) Define what a returned row looks like
type RatingRow = {
  id: number;
  planet_name: string;
  rating: number;
  submitted_at: string;
};

// 3) Define what we accept on POST
type RatingInsert = {
  planet_name: string;
  rating: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 4) Grab payload
  const { planet_name, rating } = req.body as RatingInsert;

  // 5) Insert & immediately select the new rows
  const { data, error } = await supabase
    .from("ratings")
    .insert([{ planet_name, rating }])  // no generics, no options
    .select();                           // fetches back the inserted rows

  // 6) Handle errors
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 7) Cast & guard
  const rows = (data as RatingRow[] | null) ?? [];
  if (rows.length === 0) {
    return res.status(500).json({ error: "No rating returned after insert." });
  }

  // 8) Return the first inserted row
  return res.status(200).json(rows[0]);
}
