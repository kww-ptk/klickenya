import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF, and AVIF images are allowed." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File is too large. Maximum size is 10 MB." }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
    const token = process.env.SANITY_WRITE_TOKEN;

    if (!projectId || !token) {
      return NextResponse.json({ error: "Image upload is not configured." }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();

    const sanityRes = await fetch(
      `https://${projectId}.api.sanity.io/v2024-01-01/assets/images/${dataset}?filename=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
        },
        body: bytes,
      }
    );

    if (!sanityRes.ok) {
      const text = await sanityRes.text();
      console.error("Sanity asset upload failed:", text);
      return NextResponse.json({ error: "Upload to storage failed." }, { status: 502 });
    }

    const data = await sanityRes.json();
    const doc = data.document;

    return NextResponse.json({
      assetId: doc._id as string,
      url: doc.url as string,
    });
  } catch (err) {
    console.error("Image upload error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
