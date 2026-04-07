interface OpenMeteoResponse {
  hourly: {
    time: string[];
    cloud_cover: number[];
    visibility: number[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
  };
}

export interface SkyHour {
  time: string;
  cloudCover: number;
  visibility: number;
  temp: number;
  humidity: number;
  wind: number;
}

export interface SkyDay {
  date: string;
  hours: SkyHour[];
}

export async function fetchSkyForecast(lat: number, lng: number): Promise<SkyDay[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: 'cloud_cover,visibility,temperature_2m,relative_humidity_2m,wind_speed_10m',
    forecast_days: '7',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status}`);
  }

  const data: OpenMeteoResponse = await res.json();
  const { time, cloud_cover, visibility, temperature_2m, relative_humidity_2m, wind_speed_10m } = data.hourly;

  const byDay: Record<string, SkyHour[]> = {};

  for (let i = 0; i < time.length; i++) {
    const date = time[i].slice(0, 10);
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push({
      time: time[i],
      cloudCover: cloud_cover[i],
      visibility: visibility[i],
      temp: temperature_2m[i],
      humidity: relative_humidity_2m[i],
      wind: wind_speed_10m[i],
    });
  }

  return Object.entries(byDay).map(([date, hours]) => ({ date, hours }));
}
