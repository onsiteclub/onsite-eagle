import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// POST — upload delivery photo to Supabase Storage
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestId = formData.get("request_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Build storage path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    const folder = requestId ? `deliveries/${requestId}` : "deliveries/unsorted";
    const storagePath = `${folder}/${timestamp}_${random}.jpg`;

    // Convert File to ArrayBuffer then Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Upload
    const { error: uploadError } = await supabase.storage
      .from("frm-media")
      .upload(storagePath, bytes, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("frm-media")
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
