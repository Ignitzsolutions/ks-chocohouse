import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requireAdminApiWithRequest } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";
import { enforceRateLimit } from "@/lib/request-guard";
import {
  buildUploadedAssetUrl,
  ensureUploadsDir,
  resolveUploadedAssetPath,
} from "@/lib/uploads";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_COUNT = 6;
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
    const rateLimited = enforceRateLimit(request, {
      key: "admin-upload",
      limit: 20,
      windowMs: 60 * 1000,
    });
    if (rateLimited) return rateLimited;

    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    const form = await request.formData();
    await ensureUploadsDir();
    const files = form
      .getAll("files")
      .concat(form.get("file") ?? [])
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (files.length > MAX_FILE_COUNT) {
      return NextResponse.json(
        { error: `A maximum of ${MAX_FILE_COUNT} files can be uploaded at once` },
        { status: 400 }
      );
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
      const outputPath = resolveUploadedAssetPath(fileName);
      const bytes = await file.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(bytes));
      uploadedImages.push(buildUploadedAssetUrl(fileName));
    }

    return NextResponse.json({
      ok: true,
      imageSrc: uploadedImages[0],
      images: uploadedImages,
    });
  } catch (error) {
    return jsonError("Upload failed", 500, error);
  }
}
