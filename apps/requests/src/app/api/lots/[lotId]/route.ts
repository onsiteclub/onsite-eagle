import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — single lot details with jobsite info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("frm_lots")
      .select("id, lot_number, current_phase, jobsite_id, status, jobsite:frm_jobsites(name)")
      .eq("id", lotId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
