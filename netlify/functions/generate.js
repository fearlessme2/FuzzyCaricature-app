export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { imageBase64, extraNotes } = await req.json();

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    const stylePrompt = [
      "Black and white ink caricature illustration, strictly head and shoulders portrait only, centered on a pure solid white background.",
      "Drawn by a master street caricature artist using freestyle rough coarse black India ink brush strokes that taper to sharp thin points at the ends.",
      "High contrast stark black ink linework on clean white paper, no gray shading, no background scenery, exaggerated funny facial features while keeping likeness.",
      extraNotes ? `Extra details: ${extraNotes}` : ""
    ].join(" ");

    const model = imageBase64
      ? "@cf/runwayml/stable-diffusion-v1-5-img2img"
      : "@cf/black-forest-labs/flux-1-schnell";

    const payload = {
      prompt: stylePrompt,
      negative_prompt: "full body, waist, hands, background scenery, gray gradient, photorealistic, 3d render, color, soft airbrush"
    };

    if (imageBase64) {
      const binary = atob(imageBase64);
      payload.image = Array.from(binary, (c) => c.charCodeAt(0));
      payload.strength = 0.62;
    }

    const response = await fetch(
      `https://cloudflare.com{accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      return new Response("AI Generation Failed", { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    return new Response(imageBuffer, {
      headers: { "Content-Type": "image/png" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
