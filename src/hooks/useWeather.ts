import { useEffect, useState } from "react";

export type Weather = {
  temperature: number;
  weathercode: number;
  isDay: boolean;
};

// WMO weather codes → emoji-free icon descriptor (we use lucide on render)
export function weatherLabel(code: number): string {
  if (code === 0) return "Despejado";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Niebla";
  if ([51, 53, 55, 56, 57].includes(code)) return "Llovizna";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Lluvia";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta";
  return "Clima";
}

export function useWeather() {
  const [data, setData] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-26.18&longitude=-58.18&current_weather=true&timezone=America%2FArgentina%2FBuenos_Aires",
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(json => {
        const cw = json?.current_weather;
        if (cw) {
          setData({
            temperature: Math.round(cw.temperature),
            weathercode: cw.weathercode,
            isDay: cw.is_day === 1,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  return { weather: data, loading };
}
