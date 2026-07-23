import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const weatherLabels: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "晴時多雲",
  3: "多雲",
  45: "有霧",
  48: "霧淞",
  51: "細雨",
  53: "小雨",
  55: "雨勢稍強",
  61: "小雨",
  63: "有雨",
  65: "大雨",
  71: "小雪",
  73: "有雪",
  75: "大雪",
  80: "短暫陣雨",
  81: "陣雨",
  82: "強陣雨",
  95: "雷雨",
};

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("latitude"));
  const longitude = Number(request.nextUrl.searchParams.get("longitude"));
  const currency = (
    request.nextUrl.searchParams.get("currency") ?? "JPY"
  ).toUpperCase();

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return NextResponse.json({ error: "invalid destination" }, { status: 400 });
  }

  try {
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(latitude));
    weatherUrl.searchParams.set("longitude", String(longitude));
    weatherUrl.searchParams.set(
      "current",
      "temperature_2m,weather_code",
    );

    const exchangeUrl = `https://open.er-api.com/v6/latest/TWD`;
    const [weatherResponse, exchangeResponse] = await Promise.all([
      fetch(weatherUrl, {
        headers: { "user-agent": "Found Travel Website" },
      }),
      fetch(exchangeUrl, {
        headers: { "user-agent": "Found Travel Website" },
      }),
    ]);

    if (!weatherResponse.ok || !exchangeResponse.ok) {
      throw new Error("upstream unavailable");
    }

    const weather = (await weatherResponse.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const exchange = (await exchangeResponse.json()) as {
      rates?: Record<string, number>;
    };
    const code = weather.current?.weather_code ?? 2;
    const rate = exchange.rates?.[currency];

    if (
      !Number.isFinite(weather.current?.temperature_2m) ||
      !Number.isFinite(rate)
    ) {
      throw new Error("invalid upstream response");
    }

    return NextResponse.json(
      {
        temperature: weather.current!.temperature_2m,
        weatherLabel: weatherLabels[code] ?? "天氣多變",
        rate,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=600, s-maxage=1800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        temperature: 26,
        weatherLabel: "晴時多雲",
        rate: currency === "JPY" ? 4.78 : 1,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=120",
          "X-Travel-Data": "fallback",
        },
      },
    );
  }
}
