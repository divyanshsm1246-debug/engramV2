"use client";

import { FormEvent, useMemo, useState } from "react";
import Nav from "@/components/Nav";

type Weather = {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparent: number;
  wind: number;
  code: number;
};

type Slot = {
  time: string;
  title: string;
  detail: string;
  kind: "study" | "break" | "game" | "review";
};

const TAGS = ["Math", "Science", "History", "English", "Coding", "Exam prep", "Revision", "Creative writing"];
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function splitChapters(raw: string, tags: string[]) {
  const chapters = raw
    .split(/\n|,|;/)
    .map((x) => x.trim())
    .filter(Boolean);
  return chapters.length ? chapters : tags.length ? tags.map((tag) => `${tag} focus chapter`) : ["Main chapter"];
}

function buildTimetable(chapters: string[], startTime: string, weather?: Weather | null): Slot[] {
  const slots: Slot[] = [];
  let cursor = startTime;
  const indoor = weather && (weather.code >= 51 || weather.temperature > 34 || weather.temperature < 8);

  chapters.slice(0, 8).forEach((chapter, index) => {
    slots.push({
      time: `${cursor} - ${addMinutes(cursor, 35)}`,
      title: `Deep study: ${chapter}`,
      detail: "Read actively, write tiny notes, then close the book and explain it aloud.",
      kind: "study",
    });
    cursor = addMinutes(cursor, 35);

    slots.push({
      time: `${cursor} - ${addMinutes(cursor, 10)}`,
      title: index % 2 === 0 ? "Brain break" : "Snack + stretch break",
      detail: indoor ? "Stay inside: hydrate, stretch wrists, rest your eyes." : "Step outside if possible: sunlight, water, and a quick walk.",
      kind: "break",
    });
    cursor = addMinutes(cursor, 10);

    if (index % 2 === 1) {
      slots.push({
        time: `${cursor} - ${addMinutes(cursor, 15)}`,
        title: "Fun game round",
        detail: "Play 5-minute word chain, memory match, Sudoku, or quick typing race — stop on the timer.",
        kind: "game",
      });
      cursor = addMinutes(cursor, 15);
    }
  });

  slots.push({
    time: `${cursor} - ${addMinutes(cursor, 20)}`,
    title: "Final recall check",
    detail: "Write what you remember without looking, mark weak spots, and choose tomorrow's first task.",
    kind: "review",
  });

  return slots;
}

export default function FollowPage() {
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [chapters, setChapters] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Revision"]);
  const [startTime, setStartTime] = useState("16:00");

  const chapterList = useMemo(() => splitChapters(chapters, selectedTags), [chapters, selectedTags]);
  const timetable = useMemo(() => buildTimetable(chapterList, startTime, weather), [chapterList, startTime, weather]);

  async function fetchWeatherByPosition(latitude: number, longitude: number, label = "GPS location") {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather lookup failed");
    const data = await response.json();
    setWeather({
      city: label,
      latitude,
      longitude,
      temperature: Math.round(data.current.temperature_2m),
      apparent: Math.round(data.current.apparent_temperature),
      wind: Math.round(data.current.wind_speed_10m),
      code: data.current.weather_code,
    });
  }

  async function lookupCity(event: FormEvent) {
    event.preventDefault();
    setWeatherError("");
    setLoadingWeather(true);
    try {
      const typedCoords = coords.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (typedCoords) {
        await fetchWeatherByPosition(Number(typedCoords[1]), Number(typedCoords[2]), "Typed coordinates");
        return;
      }
      const query = city.trim();
      if (!query) throw new Error("Enter a city or coordinates first.");
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!geo.ok) throw new Error("City lookup failed");
      const data = await geo.json();
      const place = data.results?.[0];
      if (!place) throw new Error("No matching city found.");
      await fetchWeatherByPosition(place.latitude, place.longitude, `${place.name}${place.country ? `, ${place.country}` : ""}`);
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : "Could not load weather.");
    } finally {
      setLoadingWeather(false);
    }
  }

  function useGps() {
    setWeatherError("");
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await fetchWeatherByPosition(position.coords.latitude, position.coords.longitude);
        } catch (error) {
          setWeatherError(error instanceof Error ? error.message : "Could not load GPS weather.");
        } finally {
          setLoadingWeather(false);
        }
      },
      () => {
        setWeatherError("GPS permission was blocked or unavailable.");
        setLoadingWeather(false);
      }
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-10 sm:px-6 md:pb-16">
        <section className="rise mb-8">
          <p className="micro mb-3 !text-[#43d6b5]">Follow mode</p>
          <h1 className="text-warm-gradient text-4xl font-bold leading-[1.05] sm:text-6xl">Weather-aware study timetable</h1>
          <p className="mt-4 max-w-3xl text-lg text-muted">Enter your city or GPS coordinates, then build a focused timetable with breaks, fun games, recall, and a print-ready plan.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="glass p-6 sm:p-7 print:hidden">
            <h2 className="mb-4 text-2xl font-bold">1. Location + weather</h2>
            <form onSubmit={lookupCity} className="space-y-4">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City name, e.g. Delhi" className="w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-[#43d6b5]/60" />
              <input value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="Coordinates, e.g. 28.61, 77.20" className="w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-[#43d6b5]/60" />
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={loadingWeather}>{loadingWeather ? "Checking…" : "Use location bar"}</button>
                <button type="button" onClick={useGps} className="btn-ghost" disabled={loadingWeather}>Use GPS</button>
              </div>
            </form>
            {weatherError && <p className="mt-4 text-sm text-danger">{weatherError}</p>}
            {weather && (
              <div className="mt-5 rounded-[1.5rem] bg-white/[0.045] p-5">
                <p className="micro mb-2">Open-Meteo live weather</p>
                <div className="flex items-end justify-between gap-4">
                  <div><h3 className="text-xl font-bold">{weather.city}</h3><p className="text-sm text-muted">{WEATHER_CODES[weather.code] ?? "Weather updated"}</p></div>
                  <p className="text-4xl font-bold text-[#f5b95f]">{weather.temperature}°C</p>
                </div>
                <p className="mt-3 text-sm text-muted">Feels {weather.apparent}°C · wind {weather.wind} km/h · {weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)}</p>
              </div>
            )}
          </section>

          <section className="glass p-6 sm:p-7 print:hidden">
            <h2 className="mb-4 text-2xl font-bold">2. Study timetable generator</h2>
            <label className="micro mb-2 block">Chapters</label>
            <textarea value={chapters} onChange={(e) => setChapters(e.target.value)} rows={5} placeholder="Write chapters separated by commas or new lines" className="w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-[#ff7a5c]/60" />
            <div className="mt-4 flex items-center gap-3"><label className="micro">Start</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-full bg-white/[0.06] px-4 py-2 text-sm outline-none ring-1 ring-white/10" /></div>
            <div className="mt-5 flex flex-wrap gap-2">
              {TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return <button key={tag} type="button" onClick={() => setSelectedTags((tags) => active ? tags.filter((t) => t !== tag) : [...tags, tag])} className={`rounded-full px-3.5 py-1.5 text-sm transition ${active ? "bg-[#f5b95f] text-[#1a120e]" : "bg-white/[0.06] text-muted hover:text-white"}`}>{tag}</button>;
              })}
            </div>
          </section>
        </div>

        <section className="glass mt-6 overflow-hidden p-6 sm:p-7 print:bg-white print:text-black">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div><p className="micro mb-1 !text-[#ff9a80]">Generated plan</p><h2 className="text-2xl font-bold">Your proper timetable</h2></div>
            <button onClick={() => window.print()} className="btn-primary">Print it</button>
          </div>
          <div className="grid gap-3">
            {timetable.map((slot, index) => (
              <article key={`${slot.time}-${index}`} className="rounded-[1.25rem] bg-white/[0.045] p-4 ring-1 ring-white/5 print:bg-white print:ring-black/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-mono text-sm text-[#f5b95f] print:text-black">{slot.time}</p><h3 className="text-lg font-bold">{slot.title}</h3></div>
                  <span className="rounded-full bg-white/[0.07] px-3 py-1 text-xs capitalize text-muted print:text-black">{slot.kind}</span>
                </div>
                <p className="mt-2 text-sm text-muted print:text-black">{slot.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
