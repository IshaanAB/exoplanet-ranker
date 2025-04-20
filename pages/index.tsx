import { useEffect, useState } from "react";
import Papa from "papaparse";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface Planet {
  name: string;
  radius: number;
  temp: number;
  flux: number;
  esi: number;
}

interface Stat {
  average: number;
  count: number;
}

type SortField = "ESI" | "Radius" | "Temperature" | "AvgRating";


export default function Home() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [stats, setStats] = useState<{ [key: string]: Stat }>({});

  // Filter, sort, paginate, and search controls
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("ESI");
  const [minRadius, setMinRadius] = useState(0);
  const [maxRadius, setMaxRadius] = useState(10);
  const [minESI, setMinESI] = useState(0);
  const [displayCount, setDisplayCount] = useState(10);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // 1️⃣ fetch the initial session
    supabase.auth.getSession().then((res) => {
      // res.data is never null here, but TS errs, so guard:
      if (res.data && res.data.session) {
        setSession(res.data.session);
      }
    });

    // 2️⃣ subscribe to sign-in/sign-out
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    fetch("/api/exoplanets")
      .then((res) => res.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            const cleaned = (results.data as any[])
              .map((row) => {
                const name = row["pl_name"];
                const radius = parseFloat(row["pl_rade"]);
                const temp = parseFloat(row["pl_eqt"]);
                const flux = parseFloat(row["st_teff"]);
                if (
                  name &&
                  !isNaN(radius) &&
                  !isNaN(temp) &&
                  !isNaN(flux) &&
                  radius > 0 &&
                  temp > 0
                ) {
                  const esi_r = 1 - Math.abs(radius - 1) / (radius + 1);
                  const esi_t = 1 - Math.abs(temp - 288) / (temp + 288);
                  const esi = Math.sqrt(esi_r * esi_t);
                  return { name, radius, temp, flux, esi };
                }
                return null;
              })
              .filter((x): x is Planet => x !== null);

            setPlanets(cleaned);
          },
        });
      });
  }, []);
  const filteredAndSorted = planets
  .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  .filter(
    (p) => p.radius >= minRadius && p.radius <= maxRadius && p.esi >= minESI
  )
  .sort((a, b) => {
    switch (sortField) {
      case "Radius":
        return a.radius - b.radius;
      case "Temperature":
        return a.temp - b.temp;
      case "AvgRating": {
        const aStat = stats[a.name]?.average ?? 0;
        const bStat = stats[b.name]?.average ?? 0;
        return bStat - aStat;
      }
      case "ESI":
      default:
        return b.esi - a.esi;
    }
  });
const displayList = filteredAndSorted.slice(0, displayCount);
 // only watch displayList, which is your filteredAndSorted.slice(0, displayCount)
useEffect(() => {
  if (displayList.length === 0) return;
  displayList.forEach((planet) => {
    if (stats[planet.name]) return;   // skip if already fetched
    fetch(`/api/ratings/${encodeURIComponent(planet.name)}`)
      .then((res) => res.json())
      .then((json: Stat) =>
        setStats((prev) => ({ ...prev, [planet.name]: json }))
      )
      .catch(() => {
        // on error, you could setStats(prev => ({...prev, [planet.name]: {average:0,count:0}}))
      });
  });
}, [displayList]);


  // Filter by search, radius, ESI then sort
 

  function handleRatingChange(name: string, value: number) {
    setRatings({ ...ratings, [name]: value });
  }

 // inside your Home() component

async function submitRatings() {
  // 1️⃣ Guard: if no user is signed in, do nothing (or show a message)
  if (!session) {
    alert("Please Sign In before submitting your ratings!");
    return;
  }

  // 2️⃣ Otherwise proceed as before
  await Promise.all(
    Object.entries(ratings).map(([planet_name, rating]) =>
      fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planet_name, rating }),
      })
    )
  );

  alert("Thanks for rating! 🚀");
  setStats({}); // refresh averages
}


  return (
    <div className="p-8">
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        Rate Real Exoplanets! 🌍
      </h1>
      <div className="mb-6">
        {!session ? (
          <button
            onClick={() =>
              supabase.auth.signInWithOAuth({ provider: "github" })
            }
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Sign in with GitHub
          </button>
        ) : (
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            Sign out ({session.user.email})
          </button>
        )}
      </div>

      {/* Search, Filter & Sort Controls */}
      <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <label>
          Search:
          <input
            type="text"
            placeholder="Planet name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginLeft: 5 }}
          />
        </label>
        <label>
          Sort by:
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            style={{ marginLeft: 5 }}
          >
            <option value="ESI">ESI</option>
            <option value="Radius">Radius</option>
            <option value="Temperature">Temp</option>
            <option value="AvgRating">Avg Rating</option>
          </select>
        </label>
        <label>
          Radius:
          {minRadius}–{maxRadius}
          <input
            type="range"
            min={0}
            max={10}
            value={minRadius}
            onChange={(e) => setMinRadius(parseFloat(e.target.value))}
            style={{ margin: "0 5px" }}
          />
          <input
            type="range"
            min={0}
            max={10}
            value={maxRadius}
            onChange={(e) => setMaxRadius(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Min ESI {minESI.toFixed(2)}:
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={minESI}
            onChange={(e) => setMinESI(parseFloat(e.target.value))}
            style={{ marginLeft: 5 }}
          />
        </label>
        <label>
          Show first:
          <input
            type="number"
            min={1}
            max={filteredAndSorted.length || 1}
            value={displayCount}
            onChange={(e) =>
              setDisplayCount(
                Math.min(
                  Math.max(1, Number(e.target.value)),
                  filteredAndSorted.length || 1
                )
              )
            }
            style={{ marginLeft: 5, width: 60 }}
          />
        </label>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayList.map((planet) => (
          <div key={planet.name} className="border p-4 rounded-xl shadow">
          <h2 className="text-xl font-semibold">{planet.name}</h2>
          <p>Radius: {planet.radius.toFixed(2)} R⊕</p>
          <p>Temperature: {planet.temp.toFixed(1)} K</p>
          <p>Star Temp (proxy for flux): {planet.flux.toFixed(1)} K</p>
          <p>🌍 ESI: {planet.esi.toFixed(3)}</p>
          {stats[planet.name] ? (
            <p>
              ⭐️ Avg: {stats[planet.name].average.toFixed(2)} (
              {stats[planet.name].count} ratings)
            </p>
          ) : (
            <p>Loading stats…</p>
          )}
          <label>Habitability Rating (0–10):</label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={ratings[planet.name] ?? 5}
            onChange={(e) =>
              handleRatingChange(planet.name, parseInt(e.target.value))
            }
          />
          <p>Your Rating: {ratings[planet.name] ?? 5}</p>
        </div>
      ))}
    </div>
    <button
      onClick={submitRatings}
      disabled={!session}
      className={`px-6 py-2 rounded text-white ${
        session ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"
      }`}
    >
      Submit Ratings
    </button>

    </div>
  );
}
