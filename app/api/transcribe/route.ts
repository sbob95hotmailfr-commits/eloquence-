import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Fichier audio manquant." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Transcription indisponible : clé API manquante côté serveur." },
      { status: 500 }
    );
  }

  const upstream = new FormData();
  upstream.append("file", audio, "recording.webm");
  upstream.append("model", process.env.TRANSCRIPTION_MODEL ?? "whisper-1");
  upstream.append("language", "fr");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: upstream,
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `Échec de la transcription (${res.status}).`, detail },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { text: string };
    return NextResponse.json({ transcription: data.text });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter le service de transcription." },
      { status: 502 }
    );
  }
}
