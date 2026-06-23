import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
        return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            {
                headers: {
                    // Nominatim requires a real User-Agent — server-side this works fine
                    "User-Agent": "JumboStarWholesale/1.0 (contact@jumbostar.in)",
                    "Accept-Language": "en",
                }
            }
        );

        if (!res.ok) throw new Error("Geocode failed");

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: "Geocode failed" }, { status: 500 });
    }
}