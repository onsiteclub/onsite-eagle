import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — list material requests
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const statusFilter = req.nextUrl.searchParams.get("status");
    const lotIdFilter = req.nextUrl.searchParams.get("lot_id");
    const siteIdFilter = req.nextUrl.searchParams.get("site_id");

    let query = supabase
      .from("frm_material_requests")
      .select(
        "id, material_name, quantity, unit, status, urgency_level, urgency_score, requested_at, requested_by_name, delivered_by_name, delivery_notes, photo_url, in_transit_at, delivered_at, notes, urgency_reason, lot:frm_lots(lot_number), jobsite:frm_jobsites(name)"
      )
      .is("deleted_at", null)
      .order("requested_at", { ascending: false })
      .limit(200);

    if (lotIdFilter) {
      query = query.eq("lot_id", lotIdFilter);
    }

    if (siteIdFilter) {
      query = query.eq("jobsite_id", siteIdFilter);
    }

    if (statusFilter) {
      const statuses = statusFilter.split(",");
      query = query.in("status", statuses);
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

// POST — create new material request
export async function POST(req: NextRequest) {
  try {
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

    // PWA test user — no real auth, use existing test profile
    const ANON_USER_ID = "0ea274f3-5cc0-4157-a16a-92fa0e05f9d4";

    const { data, error } = await supabase
      .from("frm_material_requests")
      .insert({
        lot_id,
        phase_id: lot?.current_phase || "floor_1",
        jobsite_id: lot?.jobsite_id,
        material_name: material_name.trim(),
        quantity: parseInt(quantity),
        unit: unit || "pcs",
        urgency_level: urgency_level || "medium",
        urgency_reason: notes?.trim() || null,
        requested_by: ANON_USER_ID,
        requested_by_name: requested_by_name || "Unknown",
        status: "requested",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — update request status
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { id, status, delivered_by_name, delivery_notes, photo_url } = body;

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
      if (photo_url) updates.photo_url = photo_url;
    }

    const { error } = await supabase
      .from("frm_material_requests")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
