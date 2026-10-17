import { NextResponse } from "next/server";
import { generateStudyTimetable } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { chapter, tags, weather } = body;
  if (!chapter) {
    return NextResponse.json({ error: "Chapter name is required" }, { status: 400 });
  }

  // Check if GEMINI_API_KEY is available. If not, use fallback.
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Using static fallback for study timetable.");
    const fallback = getFallbackTimetable(chapter, tags || [], weather);
    return NextResponse.json(fallback);
  }

  try {
    const timetable = await generateStudyTimetable(chapter, tags || [], weather);
    return NextResponse.json(timetable);
  } catch (e: any) {
    console.error("Gemini timetable generation failed, falling back to static schema", e);
    const fallback = getFallbackTimetable(chapter, tags || [], weather);
    return NextResponse.json(fallback);
  }
}

function getFallbackTimetable(
  chapter: string,
  tags: string[],
  weather: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    city: string;
  } | null
) {
  const isRainyOrCold = weather
    ? weather.temperature < 15 ||
      [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.weatherCode)
    : false;

  const headline = isRainyOrCold
    ? "Rainy Day Cozy Study Strategy"
    : "Clear Skies High-Energy Study Pacing";

  const motivation = isRainyOrCold
    ? `Since it is cozy and overcast outside in ${weather?.city || "your city"}, lock in with a warm drink and conquer "${chapter}". The perfect atmosphere for deep focus!`
    : `With bright, fresh weather outside in ${weather?.city || "your city"}, use focused blocks to master "${chapter}" and reward your hard work with fresh-air breaks!`;

  const blocks = [
    {
      time: "09:00 AM - 10:30 AM",
      activity: `Deep Dive Study: ${chapter}`,
      description: `Tackle the most complex, theoretical core concepts of "${chapter}" first while your mental energy is at its absolute peak. Shut down all distractions.`,
      isBreak: false,
    },
    {
      time: "10:30 AM - 10:45 AM",
      activity: "Active Recall Coffee & Mind Refresh",
      description: "Step away from your screen. Grab some hydration, stretch, and play a Quick Math game to keep the synapses firing during this break.",
      isBreak: true,
      gameRecommendation: "Math Sprint",
    },
    {
      time: "10:45 AM - 12:15 PM",
      activity: `Practical Practice & Integration`,
      description: `Work on real examples, write notes, or tackle structured questions related to ${tags.length > 0 ? tags.join("/") : "study tags"}. Focus on active application.`,
      isBreak: false,
    },
    {
      time: "12:15 PM - 12:45 PM",
      activity: "Painless Anagram & Airing Break",
      description: "Take a longer rest. Grab a light bite and unscramble some cognitive terms to keep your recall warm without burning out.",
      isBreak: true,
      gameRecommendation: "Word Unscramble",
    },
    {
      time: "12:45 PM - 02:00 PM",
      activity: `Review & Consolidation`,
      description: `Review what you've learned. Put core terms and definitions for "${chapter}" into Knovis. Prepare to retain it forever.`,
      isBreak: false,
    },
  ];

  return {
    headline,
    blocks,
    motivation,
    gameSuggestions: ["Math Sprint", "Word Unscramble"],
  };
}
