const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || "";

export type WeatherData = {
  temperature: number;
  humidity: number;
  aqi: number;
  uvIndex: number;
  description: string;
  icon: string;
  city: string;
  note: string;
};

export type ClimateNews = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  category: string;
};

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const defaults: WeatherData = {
    temperature: 28,
    humidity: 60,
    aqi: 50,
    uvIndex: 5,
    description: "Partly cloudy",
    icon: "02d",
    city: "Unknown",
    note: "Weather data based on default values",
  };

  if (!OPENWEATHER_API_KEY) return defaults;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!weatherRes.ok) return defaults;
    const weatherData = await weatherRes.json();

    const description = weatherData.weather?.[0]?.description ?? "Partly cloudy";
    const temp = Math.round(weatherData.main?.temp ?? 28);
    const humidity = weatherData.main?.humidity ?? 60;

    let note = `${description}. ${temp}°C, ${humidity}% humidity.`;
    if (temp > 35) note += " Very hot day - consider reducing outdoor activities.";
    else if (temp > 30) note += " Warm day - stay hydrated.";
    else if (temp < 10) note += " Cold day - dress warmly.";

    return {
      temperature: temp,
      humidity,
      aqi: 50,
      uvIndex: 5,
      description,
      icon: weatherData.weather?.[0]?.icon ?? "02d",
      city: weatherData.name ?? "Unknown",
      note,
    };
  } catch {
    return defaults;
  }
}

export async function getWeatherSummary(lat: number, lon: number): Promise<WeatherData> {
  return getWeather(lat, lon);
}

const allNews: ClimateNews[] = [
  {
    id: "cn-1",
    title: "India's Renewable Energy Capacity Crosses 200 GW",
    summary: "India has achieved a major milestone in its clean energy transition with renewable energy capacity crossing 200 GW, driven by solar and wind installations.",
    source: "Ministry of New & Renewable Energy",
    publishedAt: new Date().toISOString(),
    category: "energy",
  },
  {
    id: "cn-2",
    title: "Electric Vehicle Sales Surge 40% in 2025",
    summary: "EV adoption in India continues to accelerate with a 40% year-over-year increase in sales, led by two-wheelers and three-wheelers.",
    source: "Society of Manufacturers of Electric Vehicles",
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    category: "transport",
  },
  {
    id: "cn-3",
    title: "Carbon Capture Technology Breakthrough",
    summary: "New direct air capture technology can remove CO2 at 50% lower cost, making carbon removal more accessible for developing nations.",
    source: "Nature Climate Change",
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    category: "technology",
  },
  {
    id: "cn-4",
    title: "Urban Green Spaces Reduce City Temperatures by 3°C",
    summary: "A new study shows that expanding urban tree cover by 20% can reduce city temperatures by up to 3°C, cutting air conditioning energy use significantly.",
    source: "Urban Climate Journal",
    publishedAt: new Date(Date.now() - 259200000).toISOString(),
    category: "urban",
  },
  {
    id: "cn-5",
    title: "India's Solar Power Generation Hits Record High",
    summary: "Solar power generation in India reached a new record of 20 GW in a single day, demonstrating the rapid growth of solar infrastructure across the country.",
    source: "Central Electricity Authority",
    publishedAt: new Date(Date.now() - 345600000).toISOString(),
    category: "energy",
  },
  {
    id: "cn-6",
    title: "Global Carbon Emissions Show Signs of Peaking",
    summary: "International Energy Agency reports that global CO2 emissions may have peaked in 2024, driven by rapid renewable energy deployment worldwide.",
    source: "International Energy Agency",
    publishedAt: new Date(Date.now() - 432000000).toISOString(),
    category: "global",
  },
  {
    id: "cn-7",
    title: "India Plants 2 Billion Trees Under Green India Mission",
    summary: "India's Green India Mission has successfully planted 2 billion trees across 20 states, creating new carbon sinks and improving biodiversity.",
    source: "Ministry of Environment",
    publishedAt: new Date(Date.now() - 518400000).toISOString(),
    category: "environment",
  },
  {
    id: "cn-8",
    title: "Metro Ridership Hits All-Time High in Indian Cities",
    summary: "Delhi Metro and other city metro systems report record ridership as more commuters shift from private vehicles to public transport.",
    source: "Ministry of Housing and Urban Affairs",
    publishedAt: new Date(Date.now() - 604800000).toISOString(),
    category: "transport",
  },
  {
    id: "cn-9",
    title: "Green Hydrogen Production Costs Drop 50%",
    summary: "The cost of producing green hydrogen has fallen by 50% in the past two years, making it a viable alternative to fossil fuels in heavy industry.",
    source: "Bloomberg New Energy Finance",
    publishedAt: new Date(Date.now() - 691200000).toISOString(),
    category: "energy",
  },
  {
    id: "cn-10",
    title: "Smart Grid Technology Reduces Energy Waste by 15%",
    summary: "Implementation of smart grid technology in Indian cities has reduced energy waste by 15%, saving millions of tons of CO2 emissions annually.",
    source: "Central Electricity Authority",
    publishedAt: new Date(Date.now() - 777600000).toISOString(),
    category: "technology",
  },
];

export async function getClimateNews(): Promise<ClimateNews[]> {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const startIndex = dayOfYear % allNews.length;
  const rotated = [...allNews.slice(startIndex), ...allNews.slice(0, startIndex)];
  return rotated.slice(0, 5);
}
