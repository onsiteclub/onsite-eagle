import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — bundle with lot details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  try {
    const { bundleId } = await params;
    const supabase = createAdminClient();

    const { data: bundle, error } = await supabase
      .from("frm_worker_bundles")
      .select("id, jobsite_id, label, lot_ids, created_at")
      .eq("id", bundleId)
      .single();

    if (error || !bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    // Fetch site info
    const { data: site } = await supabase
      .from("frm_jobsites")
      .select("id, name, address, city")
      .eq("id", bundle.jobsite_id)
      .single();

    // Fetch lot details for the IDs in the bundle
    const { data: lots } = await supabase
      .from("frm_lots")
      .select("id, lot_number")
      .in("id", bundle.lot_ids)
      .order("lot_number", { ascending: true });

    return NextResponse.json({
      id: bundle.id,
      label: bundle.label,
      site: site ?? { id: bundle.jobsite_id, name: "Unknown" },
      lots: lots ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — update lot list
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  try {
    const { bundleId } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.lot_ids) update.lot_ids = body.lot_ids;
    if (body.label !== undefined) update.label = body.label?.trim() || null;

    const { data, error } = await supabase
      .from("frm_worker_bundles")
      .update(update)
      .eq("id", bundleId)
      .select("id, jobsite_id, label, lot_ids")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove bundle
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  try {
    const { bundleId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("frm_worker_bundles")
      .delete()
      .eq("id", bundleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
