import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — list all jobsites with lot counts
export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("frm_jobsites")
    .select("id, name, address, city, total_lots, completed_lots, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST — create new jobsite
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const { name, address, city } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("frm_jobsites")
    .insert({
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      status: "active",
      total_lots: 0,
      completed_lots: 0,
    })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
