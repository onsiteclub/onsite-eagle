import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();

  // Get all lots from all jobsites (test mode — no filtering)
  const { data: lots, error } = await supabase
    .from("frm_lots")
    .select("id, lot_number, current_phase, jobsite_id, status, jobsite:frm_jobsites(name)")
    .order("lot_number", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(lots ?? []);
}
