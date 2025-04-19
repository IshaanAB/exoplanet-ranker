import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const nasaURL =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,pl_rade,pl_eqt,st_teff+from+pscomppars&format=csv";

  try {
    const response = await fetch(nasaURL);
    const csv = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from NASA" });
  }
}
