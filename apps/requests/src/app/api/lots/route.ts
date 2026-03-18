import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — list all lots
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: lots, error } = await supabase
      .from("frm_lots")
      .select("id, lot_number, current_phase, jobsite_id, status, jobsite:frm_jobsites(name)")
      .order("lot_number", { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(lots ?? []);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — bulk create lots for a jobsite
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { jobsite_id, count } = body;

    if (!jobsite_id || !count || count < 1 || count > 500) {
      return NextResponse.json({ error: "jobsite_id and count (1-500) required" }, { status: 400 });
    }

    // Check existing lots to find next number
    const { data: existing } = await supabase
      .from("frm_lots")
      .select("lot_number")
      .eq("jobsite_id", jobsite_id)
      .order("lot_number", { ascending: false })
      .limit(1);

    const startFrom = existing?.length
      ? parseInt(existing[0].lot_number || "0") + 1
      : 1;

    // Create lots in batch
    const lots = Array.from({ length: count }, (_, i) => ({
      jobsite_id,
      lot_number: String(startFrom + i),
      status: "pending",
    }));

    const { data, error } = await supabase
      .from("frm_lots")
      .insert(lots)
      .select("id, lot_number");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update jobsite lot count
    const { count: totalLots } = await supabase
      .from("frm_lots")
      .select("*", { count: "exact", head: true })
      .eq("jobsite_id", jobsite_id);

    await supabase
      .from("frm_jobsites")
      .update({ total_lots: totalLots ?? count })
      .eq("id", jobsite_id);

    return NextResponse.json(data ?? [], { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
