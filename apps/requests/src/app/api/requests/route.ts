import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — list material requests
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const statusFilter = req.nextUrl.searchParams.get("status");

  let query = supabase
    .from("frm_material_requests")
    .select(
      "id, material_name, quantity, unit, status, urgency_level, urgency_score, requested_at, requested_by_name, notes, urgency_reason, delivery_notes, lot:frm_lots(lot_number, address), jobsite:frm_jobsites(name)"
    )
    .is("deleted_at", null)
    .order("requested_at", { ascending: false })
    .limit(200);

  if (statusFilter) {
    const statuses = statusFilter.split(",");
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST — create new material request
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const { material_name, quantity, unit, lot_id, urgency_level, notes, requested_by_name } = body;

  if (!material_name || !quantity || !lot_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get lot details for phase and jobsite
  const { data: lot } = await supabase
    .from("frm_lots")
    .select("current_phase, jobsite_id")
    .eq("id", lot_id)
    .single();

  const { data, error } = await supabase
    .from("frm_material_requests")
    .insert({
      lot_id,
      phase_id: lot?.current_phase || "frame_start",
      jobsite_id: lot?.jobsite_id,
      material_name: material_name.trim(),
      quantity: parseInt(quantity),
      unit: unit || "pcs",
      urgency_level: urgency_level || "medium",
      urgency_reason: notes?.trim() || null,
      requested_by_name: requested_by_name || "Unknown",
      status: "requested",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH — update request status
export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const { id, status, delivered_by_name, delivery_notes } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };

  if (status === "in_transit") {
    updates.in_transit_at = new Date().toISOString();
  } else if (status === "delivered") {
    updates.delivered_at = new Date().toISOString();
    updates.delivered_by_name = delivered_by_name || null;
    updates.delivery_notes = delivery_notes || null;
  }

  const { error } = await supabase
    .from("frm_material_requests")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
