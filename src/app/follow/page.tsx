"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

type WeatherData = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  city: string;
  latitude: number;
  longitude: number;
};

type TimetableBlock = {
  time: string;
  activity: string;
  description: string;
  isBreak: boolean;
  gameRecommendation?: string;
};

type TimetableResult = {
  headline: string;
  blocks: TimetableBlock[];
  motivation: string;
  gameSuggestions: string[];
};

// Category tags available in Knovis
const TAGS = [
  "Technology",
  "Science",
  "Business",
  "Design",
  "Health",
  "History",
  "Philosophy",
  "Language",
  "Mathematics",
  "Legal",
  "Communication",
  "General",
];

const WEATHER_CODES: Record<number, { text: string; emoji: string }> = {
  0: { text: "Clear Sky", emoji: "☀️" },
  1: { text: "Mainly Clear", emoji: "🌤️" },
  2: { text: "Partly Cloudy", emoji: "⛅" },
  3: { text: "Overcast", emoji: "☁️" },
  45: { text: "Foggy", emoji: "🌫️" },
  48: { text: "Depositing Rime Fog", emoji: "🌫️" },
  51: { text: "Light Drizzle", emoji: "🌦️" },
  53: { text: "Moderate Drizzle", emoji: "🌧️" },
  55: { text: "Dense Drizzle", emoji: "🌧️" },
  61: { text: "Slight Rain", emoji: "🌧️" },
  63: { text: "Moderate Rain", emoji: "🌧️" },
  65: { text: "Heavy Rain", emoji: "🌧️" },
  71: { text: "Slight Snowfall", emoji: "❄️" },
  73: { text: "Moderate Snowfall", emoji: "❄️" },
  75: { text: "Heavy Snowfall", emoji: "❄️" },
  77: { text: "Snow Grains", emoji: "❄️" },
  80: { text: "Slight Rain Showers", emoji: "🌦️" },
  81: { text: "Moderate Rain Showers", emoji: "🌧️" },
  82: { text: "Violent Rain Showers", emoji: "⛈️" },
  85: { text: "Slight Snow Showers", emoji: "🌨️" },
  86: { text: "Heavy Snow Showers", emoji: "🌨️" },
  95: { text: "Thunderstorm", emoji: "⛈️" },
  96: { text: "Thunderstorm with Hail", emoji: "⛈️" },
  99: { text: "Heavy Thunderstorm with Hail", emoji: "⛈️" },
};

function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] ?? { text: "Cloudy", emoji: "☁️" };
}

export default function FollowPage() {
  const [cityInput, setCityInput] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Form states for timetable
  const [chapter, setChapter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableResult | null>(null);

  // Interactive Game State
  const [activeGame, setActiveGame] = useState<"none" | "word-unscramble" | "math-sprint">("none");

  // Game 1: Word Unscramble State
  const [scrambledWord, setScrambledWord] = useState("");
  const [originalWord, setOriginalWord] = useState("");
  const [wordClue, setWordClue] = useState("");
  const [userWordGuess, setUserWordGuess] = useState("");
  const [wordFeedback, setWordFeedback] = useState<string | null>(null);
  const [wordScore, setWordScore] = useState(0);

  // Game 2: Math Sprint State
  const [mathNum1, setMathNum1] = useState(0);
  const [mathNum2, setMathNum2] = useState(0);
  const [mathOp, setMathOp] = useState<"+" | "-" | "*">("+");
  const [userMathAnswer, setUserMathAnswer] = useState("");
  const [mathScore, setMathScore] = useState(0);
  const [mathTimer, setMathSprintTimer] = useState(0);
  const [mathActive, setMathActive] = useState(false);
  const mathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle City geocoding + Weather fetch
  async function handleWeatherFetch(city: string) {
    if (!city.trim()) return;
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city.trim()
        )}&count=1&language=en&format=json`
      );
      if (!geoRes.ok) throw new Error("Failed to find city coordinates");
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("No city found by that name. Try checking spelling or enter coordinates.");
      }
      const firstResult = geoData.results[0];
      const { latitude, longitude, name, country } = firstResult;

      await fetchWeatherForCoords(latitude, longitude, `${name}, ${country}`);
    } catch (e: any) {
      setWeatherError(e.message || "Something went wrong fetching coordinates");
    } finally {
      setLoadingWeather(false);
    }
  }

  // Handle GPS location
  function handleUseGps() {
    if (!navigator.geolocation) {
      setWeatherError("Geolocation is not supported by your browser");
      return;
    }
    setLoadingWeather(true);
    setWeatherError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await fetchWeatherForCoords(latitude, longitude, "Your GPS Location");
        setLoadingWeather(false);
      },
      (error) => {
        setWeatherError(`GPS Access Denied: ${error.message}`);
        setLoadingWeather(false);
      },
      { timeout: 8000 }
    );
  }

  async function fetchWeatherForCoords(latitude: number, longitude: number, cityName: string) {
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`
      );
      if (!weatherRes.ok) throw new Error("Failed to fetch weather conditions");
      const weatherData = await weatherRes.json();
      const current = weatherData.current;

      setWeather({
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        city: cityName,
        latitude,
        longitude,
      });
    } catch (e: any) {
      setWeatherError(e.message || "Failed to retrieve weather info from Open-Meteo API");
    }
  }

  // Tag toggler
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  }

  // Handle Timetable generation
  async function generateTimetable() {
    setLoadingTimetable(true);
    setTimetableError(null);
    try {
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter: chapter.trim() || "General Studies",
          tags: selectedTags,
          weather,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate timetable");
      }

      const data = await response.json();
      setTimetable(data);
    } catch (e: any) {
      setTimetableError(e.message || "Something went wrong generating the timetable");
    } finally {
      setLoadingTimetable(false);
    }
  }

  // Print function
  function handlePrint() {
    window.print();
  }

  // Word Unscramble Game Helpers
  const STUDY_WORDS = [
    { word: "ALGORITHM", clue: "A step-by-step procedure for solving a problem." },
    { word: "VARIABLE", clue: "A storage location paired with an associated symbolic name." },
    { word: "FUNCTION", clue: "A reusable block of code that performs a specific task." },
    { word: "MATHEMATICS", clue: "The abstract science of number, quantity, and space." },
    { word: "PHOTOSYNTHESIS", clue: "Process by which green plants use sunlight to synthesize nutrients." },
    { word: "RECURSION", clue: "The definition of a function or process in terms of itself." },
    { word: "DATABASE", clue: "A structured set of data held in a computer." },
    { word: "PHILOSOPHY", clue: "The study of the fundamental nature of knowledge, reality, and existence." },
    { word: "COORDINATES", clue: "A group of numbers used to indicate the position of a point." },
    { word: "EPITHELIAL", clue: "A type of animal tissue that lines the cavities and surfaces of structures." },
  ];

  function startNewWordUnscramble() {
    const picked = STUDY_WORDS[Math.floor(Math.random() * STUDY_WORDS.length)];
    setOriginalWord(picked.word);
    setWordClue(picked.clue);
    setUserWordGuess("");
    setWordFeedback(null);

    // Scramble logic
    let arr = picked.word.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // If it scrambled to the exact same word, swap first and last
    if (arr.join("") === picked.word) {
      [arr[0], arr[arr.length - 1]] = [arr[arr.length - 1], arr[0]];
    }
    setScrambledWord(arr.join(""));
  }

  function handleWordGuessSubmit() {
    if (userWordGuess.toUpperCase().trim() === originalWord) {
      setWordFeedback("🎉 Correct! Fantastic job unscrambling.");
      setWordScore((s) => s + 10);
    } else {
      setWordFeedback(`❌ Not quite! The correct word is ${originalWord}.`);
    }
  }

  // Math Sprint Game Helpers
  function generateMathQuestion() {
    const ops: ("+" | "-" | "*")[] = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1 = 0;
    let n2 = 0;
    if (op === "*") {
      n1 = Math.floor(Math.random() * 12) + 2;
      n2 = Math.floor(Math.random() * 12) + 2;
    } else {
      n1 = Math.floor(Math.random() * 90) + 10;
      n2 = Math.floor(Math.random() * 90) + 10;
    }
    setMathNum1(n1);
    setMathNum2(n2);
    setMathOp(op);
    setUserMathAnswer("");
  }

  function startMathSprint() {
    setMathScore(0);
    setMathSprintTimer(30);
    setMathActive(true);
    generateMathQuestion();

    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    mathTimerRef.current = setInterval(() => {
      setMathSprintTimer((prev) => {
        if (prev <= 1) {
          if (mathTimerRef.current) clearInterval(mathTimerRef.current);
          setMathActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleMathSubmit() {
    if (!mathActive) return;
    let correct = false;
    const ans = parseInt(userMathAnswer.trim(), 10);
    if (mathOp === "+") correct = ans === mathNum1 + mathNum2;
    else if (mathOp === "-") correct = ans === mathNum1 - mathNum2;
    else if (mathOp === "*") correct = ans === mathNum1 * mathNum2;

    if (correct) {
      setMathScore((s) => s + 5);
    }
    generateMathQuestion();
  }

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    };
  }, []);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-8 sm:px-6 md:pb-16 print:p-0 print:max-w-none">
        {/* Header section (hidden during print) */}
        <div className="rise mb-8 print:hidden">
          <p className="micro mb-3">Sync with the day</p>
          <h1 className="text-warm-gradient text-4xl font-bold">Follow your path</h1>
          <p className="mt-2 text-muted">
            Retrieve your current weather using Open-Meteo, then dynamically generate a study timetable
            harmonized with your climate. Includes custom games during break intervals!
          </p>
        </div>

        {/* Step 1: Weather Check & Geocoding */}
        {!weather && (
          <div className="glass rise rise-1 p-6 sm:p-8 print:hidden">
            <h2 className="text-xl font-semibold mb-4 text-[#ff9a80] flex items-center gap-2">
              <span>🌦️</span> Step 1: Tell us where you are
            </h2>
            <p className="text-sm text-muted mb-6">
              Knowing your weather allows us to suggest the optimal study pacing, tea breaks, and environment
              settings. Enter your city name or utilize browser GPS coordinates.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter city name (e.g. New York, Tokyo, Berlin)..."
                  className="input pr-24"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleWeatherFetch(cityInput)}
                  disabled={loadingWeather}
                />
                <button
                  onClick={() => handleWeatherFetch(cityInput)}
                  disabled={loadingWeather || !cityInput.trim()}
                  className="absolute right-2 top-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs px-4 py-1.5 transition-all text-foreground"
                >
                  Search
                </button>
              </div>

              <button
                onClick={handleUseGps}
                disabled={loadingWeather}
                className="btn-ghost flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>📍</span> Use GPS Location
              </button>
            </div>

            {loadingWeather && (
              <div className="mt-6 flex items-center justify-center gap-3 text-sm text-[#f5b95f]">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Locating and fetching weather forecast...
              </div>
            )}

            {weatherError && <p className="mt-4 text-sm text-danger">{weatherError}</p>}
          </div>
        )}

        {/* Weather Info & Step 2: Form */}
        {weather && !timetable && (
          <div className="glass rise rise-1 p-6 sm:p-8 print:hidden">
            {/* Weather HUD */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-6 mb-6">
              <div>
                <span className="micro">Current weather at</span>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">{weather.city}</h3>
                <p className="text-xs text-faint">
                  Lat: {weather.latitude.toFixed(4)} · Lon: {weather.longitude.toFixed(4)}
                </p>
              </div>

              <div className="flex items-center gap-5">
                <span className="text-5xl">{getWeatherInfo(weather.weatherCode).emoji}</span>
                <div>
                  <span className="text-3xl font-extrabold text-[#f5b95f]">
                    {weather.temperature.toFixed(1)}°C
                  </span>
                  <p className="text-sm font-medium text-muted">
                    {getWeatherInfo(weather.weatherCode).text} (Feels like {weather.apparentTemperature.toFixed(1)}
                    °C)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.04]">
                <div>
                  <span className="text-faint">HUMIDITY</span>
                  <p className="font-semibold text-foreground">{weather.humidity}%</p>
                </div>
                <div>
                  <span className="text-faint">WIND SPEED</span>
                  <p className="font-semibold text-foreground">{weather.windSpeed} km/h</p>
                </div>
              </div>
            </div>

            {/* Timetable inputs */}
            <h2 className="text-xl font-semibold mb-4 text-[#7fe5cb] flex items-center gap-2">
              <span>📚</span> Step 2: Custom study specs
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  What chapter, subject or topic are you learning?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Bayes Theorem, Recursion & Backtracking, Sarfaesi Section 13"
                  className="input"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  disabled={loadingTimetable}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Select relevant tags / categories (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        disabled={loadingTimetable}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-[#ff7a5c]/20 text-[#ff9a80] border border-[#ff7a5c]/45"
                            : "bg-white/[0.03] text-muted hover:text-white border border-white/[0.05]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 gap-4">
                <button
                  onClick={() => {
                    setWeather(null);
                    setTimetable(null);
                  }}
                  className="btn-ghost text-xs py-2"
                >
                  Change Location
                </button>

                <button
                  onClick={generateTimetable}
                  disabled={loadingTimetable}
                  className="btn-primary"
                >
                  {loadingTimetable ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                        <path
                          d="M22 12a10 10 0 0 0-10-10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>{" "}
                      Creating Timetable...
                    </>
                  ) : (
                    "Generate Timetable 🚀"
                  )}
                </button>
              </div>

              {timetableError && <p className="text-sm text-danger mt-3">{timetableError}</p>}
            </div>
          </div>
        )}

        {/* Timetable Output */}
        {timetable && (
          <div className="space-y-6">
            {/* The Print-Optimized Timetable Container */}
            <div className="glass p-6 sm:p-8 print:bg-white print:text-black print:shadow-none print:p-0 print:border-none">
              {/* Header inside timetable */}
              <div className="flex items-start justify-between border-b border-white/[0.06] pb-6 mb-6 print:border-black/10">
                <div>
                  <span className="micro text-[#ff9a80] print:text-black/50">Weather-Harmonized Study Path</span>
                  <h2 className="text-3xl font-extrabold text-warm-gradient mt-1 print:text-black">
                    {timetable.headline}
                  </h2>
                  <p className="text-muted text-sm mt-1 print:text-black/70">
                    Specifically designed for <strong className="text-foreground print:text-black">{weather?.city}</strong> (
                    {weather?.temperature.toFixed(1)}°C, {getWeatherInfo(weather?.weatherCode ?? 0).text})
                  </p>
                </div>

                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => setTimetable(null)}
                    className="btn-ghost text-xs px-4 py-2"
                  >
                    Adjust Params
                  </button>

                  <button
                    onClick={handlePrint}
                    className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                  >
                    <span>🖨️</span> Print It
                  </button>
                </div>
              </div>

              {/* Motivation Section */}
              <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl mb-6 print:bg-gray-100 print:text-black print:border-black/10">
                <span className="micro text-[#7fe5cb] print:text-black/60">Coaching Insight</span>
                <p className="text-sm text-[#f2f0eb] mt-1 print:text-black italic leading-relaxed">
                  &ldquo;{timetable.motivation}&rdquo;
                </p>
              </div>

              {/* The Timetable Rows */}
              <div className="space-y-4">
                {timetable.blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      block.isBreak
                        ? "bg-[#43d6b5]/5 border-[#43d6b5]/15 text-[#7fe5cb] print:bg-gray-100 print:border-black/20 print:text-black"
                        : "bg-white/[0.015] border-white/[0.04] text-foreground print:bg-white print:border-black/10 print:text-black"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono px-3 py-1 rounded-full ${
                          block.isBreak
                            ? "bg-[#43d6b5]/15 text-[#7fe5cb] print:bg-black/5 print:text-black"
                            : "bg-white/[0.05] text-muted print:bg-black/5 print:text-black"
                        }`}>
                          {block.time}
                        </span>
                        <strong className="text-sm font-semibold uppercase tracking-wider print:text-black">
                          {block.isBreak ? "Break Interval" : "Study Slot"}
                        </strong>
                      </div>

                      {block.isBreak && block.gameRecommendation && (
                        <div className="print:hidden">
                          <button
                            onClick={() => {
                              setActiveGame(
                                block.gameRecommendation?.toLowerCase().includes("math")
                                  ? "math-sprint"
                                  : "word-unscramble"
                              );
                              if (block.gameRecommendation?.toLowerCase().includes("math")) {
                                startMathSprint();
                              } else {
                                startNewWordUnscramble();
                              }
                            }}
                            className="bg-[#43d6b5]/20 hover:bg-[#43d6b5]/30 text-xs px-3.5 py-1 rounded-full text-[#7fe5cb] font-semibold transition-all flex items-center gap-1.5"
                          >
                            <span>🎮</span> Play {block.gameRecommendation}
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="text-lg font-bold mt-2.5 print:text-black">{block.activity}</h4>
                    <p className="text-sm text-muted mt-1 print:text-black/80">{block.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Games Drawer (Hidden during Print) */}
            {activeGame !== "none" && (
              <div className="glass rise p-6 sm:p-8 border border-white/[0.08] relative print:hidden">
                <button
                  onClick={() => {
                    setActiveGame("none");
                    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
                    setMathActive(false);
                  }}
                  className="absolute right-4 top-4 hover:text-white text-muted text-lg font-bold p-2"
                >
                  ✕
                </button>

                {/* Word Unscramble Game Panel */}
                {activeGame === "word-unscramble" && (
                  <div className="text-center">
                    <span className="micro text-[#f5b95f]">Interactive Break Mini-Game</span>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">🧩 Word Unscramble</h3>
                    <p className="text-sm text-muted max-w-lg mx-auto mt-2">
                      Test your academic recall during your breaks. Unscramble the study terms!
                    </p>

                    <div className="my-6 bg-white/[0.03] p-6 rounded-3xl inline-block min-w-[280px]">
                      <span className="micro block mb-1">SCRAMBLED LETTERS</span>
                      <div className="text-3xl font-mono tracking-widest font-extrabold text-[#f5b95f]">
                        {scrambledWord}
                      </div>

                      {wordClue && (
                        <div className="text-xs text-muted mt-3 italic max-w-sm mx-auto">
                          Clue: &ldquo;{wordClue}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Type unscrambled word here..."
                        className="input text-center uppercase tracking-widest text-lg font-mono"
                        value={userWordGuess}
                        onChange={(e) => setUserWordGuess(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleWordGuessSubmit()}
                      />
                      <button onClick={handleWordGuessSubmit} className="btn-primary whitespace-nowrap">
                        Check Word
                      </button>
                    </div>

                    {wordFeedback && (
                      <p className="mt-4 text-sm font-semibold text-foreground">{wordFeedback}</p>
                    )}

                    <div className="mt-6 flex justify-between items-center max-w-md mx-auto border-t border-white/[0.05] pt-4">
                      <span className="text-xs text-faint">
                        SCORE: <strong className="text-[#f5b95f]">{wordScore} pts</strong>
                      </span>
                      <button onClick={startNewWordUnscramble} className="btn-ghost text-xs py-1.5 px-4">
                        Next Word 🔄
                      </button>
                    </div>
                  </div>
                )}

                {/* Math Sprint Panel */}
                {activeGame === "math-sprint" && (
                  <div className="text-center">
                    <span className="micro text-[#7fe5cb]">Interactive Break Mini-Game</span>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">⚡ Quick Math Sprint</h3>
                    <p className="text-sm text-muted max-w-lg mx-auto mt-2">
                      Fire up your synapses with rapid addition, subtraction, or multiplication! You have 30 seconds.
                    </p>

                    <div className="my-6">
                      <div className="flex justify-center items-center gap-6">
                        <div className="bg-white/[0.03] p-4 px-6 rounded-2xl">
                          <span className="micro block text-faint mb-1">SCORE</span>
                          <span className="text-2xl font-mono font-bold text-[#7fe5cb]">{mathScore}</span>
                        </div>

                        <div className="bg-white/[0.03] p-4 px-6 rounded-2xl">
                          <span className="micro block text-faint mb-1">TIMER</span>
                          <span
                            className={`text-2xl font-mono font-bold ${
                              mathTimer <= 5 ? "text-danger animate-pulse" : "text-[#f5b95f]"
                            }`}
                          >
                            {mathTimer}s
                          </span>
                        </div>
                      </div>
                    </div>

                    {mathActive ? (
                      <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-3xl max-w-md mx-auto">
                        <div className="text-4xl font-mono font-extrabold mb-4 text-[#f2f0eb]">
                          {mathNum1} {mathOp} {mathNum2} = ?
                        </div>

                        <div className="flex gap-3">
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Answer..."
                            className="input text-center text-xl font-mono"
                            value={userMathAnswer}
                            onChange={(e) => setUserMathAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleMathSubmit()}
                            autoFocus
                          />
                          <button onClick={handleMathSubmit} className="btn-primary">
                            Submit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/[0.02] border border-white/[0.04] p-8 rounded-3xl max-w-md mx-auto">
                        <h4 className="text-lg font-bold mb-1">Sprint Finished!</h4>
                        <p className="text-sm text-muted mb-5">
                          You scored <strong className="text-[#7fe5cb]">{mathScore} pts</strong> this round.
                        </p>
                        <button onClick={startMathSprint} className="btn-primary">
                          Play Again 🔄
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
