import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/admin-auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be between 1B and 5MB" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const ext = path.extname(safeName) || ".jpg";
    const fileName = `product-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "images", "uploads");
    const outputPath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(bytes));

    return NextResponse.json({
      ok: true,
      imageSrc: `/images/uploads/${fileName}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
