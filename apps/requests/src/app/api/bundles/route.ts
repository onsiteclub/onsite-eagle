import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — list bundles for a site
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const siteId = req.nextUrl.searchParams.get("site_id");

    let query = supabase
      .from("frm_worker_bundles")
      .select("id, jobsite_id, label, lot_ids, created_at")
      .order("created_at", { ascending: false });

    if (siteId) {
      query = query.eq("jobsite_id", siteId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — create bundle
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { jobsite_id, label, lot_ids } = body;

    if (!jobsite_id || !lot_ids?.length) {
      return NextResponse.json(
        { error: "jobsite_id and lot_ids are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("frm_worker_bundles")
      .insert({
        jobsite_id,
        label: label?.trim() || null,
        lot_ids,
      })
      .select("id, jobsite_id, label, lot_ids")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
