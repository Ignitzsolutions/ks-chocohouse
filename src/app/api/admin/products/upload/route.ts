import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "node:crypto";
import { requireAdminApi } from "@/lib/admin-auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const form = await request.formData();
    const uploadDir = path.join(process.cwd(), "public", "images", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const files = form
      .getAll("files")
      .concat(form.get("file") ?? [])
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const uploadedImages: string[] = [];

    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Each file size must be between 1B and 5MB" },
          { status: 400 }
        );
      }

      const mimeType = String(file.type ?? "").toLowerCase();
      const ext =
        ALLOWED_IMAGE_TYPES[mimeType] ||
        ALLOWED_IMAGE_TYPES[`image/${path.extname(file.name).replace(".", "").toLowerCase()}`];

      if (!ext) {
        return NextResponse.json(
          {
            error:
              "Unsupported image format. Please upload JPG, PNG, WEBP, AVIF, or GIF.",
          },
          { status: 400 }
        );
      }

      const fileName = `product-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
      const outputPath = path.join(uploadDir, fileName);
      const bytes = await file.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(bytes));
      uploadedImages.push(`/images/uploads/${fileName}`);
    }

    return NextResponse.json({
      ok: true,
      imageSrc: uploadedImages[0],
      images: uploadedImages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
