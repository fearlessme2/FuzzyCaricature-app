export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64;
    const extraNotes = body.extraNotes;

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return new Response("Missing Cloudflare API keys in Netlify Environment Variables.", { status: 500 });
    }

    const prompt = [
      "Black and white ink caricature illustration, strictly head and shoulders portrait only, centered on a pure solid white background.",
      "Drawn by a master street caricature artist using freestyle rough coarse black India ink brush strokes that taper to sharp thin points at the ends.",
      "High contrast stark black ink linework on clean white paper, no gray shading, no background scenery, exaggerated funny facial features while keeping likeness.",
      extraNotes ? "Extra details: " + extraNotes : ""
    ].join(" ");

    const model = imageBase64
      ? "@cf/runwayml/stable-diffusion-v1-5-img2img"
      : "@cf/black-forest-labs/flux-1-schnell";

    const payload = {
      prompt: prompt,
      negative_prompt: "full body, waist, hands, background scenery, gray gradient, photorealistic, 3d render, color, soft airbrush"
    };

    if (imageBase64) {
      const binary = atob(imageBase64);
      const bytes = new Uint8Array(binary.length);
      let i = 0;
      while (i !== binary.length) {
        bytes.set(Uint8Array.of(binary.charCodeAt(i)), i);
        i = i + 1;
      }
      payload.image = Array.from(bytes);
      payload.strength = 0.62;
    }

    const response = await fetch(
      "https://cloudflare.com" + accountId + "/ai/run/" + model,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errDetail = await response.text();
      return new Response("Cloudflare Error: " + errDetail, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      const b64 = json.result && json.result.image;
      if (!b64) {
        return new Response("No image returned from Cloudflare.", { status: 500 });
      }
      const binStr = atob(b64);
      const imgBytes = new Uint8Array(binStr.length);
      let j = 0;
      while (j !== binStr.length) {
        imgBytes.set(Uint8Array.of(binStr.charCodeAt(j)), j);
        j = j + 1;
      }
      return new Response(imgBytes, {
        headers: { "Content-Type": "image/png" },
      });
    }

    const imageBuffer = await response.arrayBuffer();
    return new Response(imageBuffer, {
      headers: { "Content-Type": "image/png" },
    });
  } catch (err) {
    return new Response("Server Exception: " + err.message, { status: 500 });
  }
};
