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
      .select("id, lot_number, block, current_phase, jobsite_id, status, jobsite:frm_jobsites(name, machine_down, machine_down_reason)")
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

// POST — register a worker name on this lot
// Body: { worker_name: string }
// Returns updated lot + all lots where this worker is registered (for "My Lots")
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const supabase = createAdminClient();
    const { worker_name } = await req.json();

    if (!worker_name || typeof worker_name !== "string" || !worker_name.trim()) {
      return NextResponse.json({ error: "worker_name required" }, { status: 400 });
    }

    const name = worker_name.trim();

    // Get current lot
    const { data: lot, error: lotErr } = await supabase
      .from("frm_lots")
      .select("id, registered_workers, jobsite_id")
      .eq("id", lotId)
      .single();

    if (lotErr || !lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    // Add worker name if not already present (case-insensitive check)
    const current: string[] = lot.registered_workers ?? [];
    const alreadyRegistered = current.some(
      (w) => w.toLowerCase() === name.toLowerCase()
    );

    if (!alreadyRegistered) {
      const { error: updateErr } = await supabase
        .from("frm_lots")
        .update({ registered_workers: [...current, name] })
        .eq("id", lotId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    // Find all lots where this worker is registered (for "My Lots" bar)
    const { data: myLots } = await supabase
      .from("frm_lots")
      .select("id, lot_number, block, jobsite_id, status, jobsite:frm_jobsites(name)")
      .contains("registered_workers", [name])
      .neq("status", "archived")
      .order("lot_number");

    return NextResponse.json({ registered: true, my_lots: myLots ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT — rename a lot (supervisor)
// Body: { lot_number: string }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const supabase = createAdminClient();
    const { lot_number } = await req.json();

    if (!lot_number || typeof lot_number !== "string" || !lot_number.trim()) {
      return NextResponse.json({ error: "lot_number required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("frm_lots")
      .update({ lot_number: lot_number.trim() })
      .eq("id", lotId)
      .select("id, lot_number, block, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET by worker name — find all lots where worker is registered
// Query: ?worker_name=John
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    await params; // consume params
    const supabase = createAdminClient();
    const { worker_name } = await req.json();

    if (!worker_name || typeof worker_name !== "string") {
      return NextResponse.json({ error: "worker_name required" }, { status: 400 });
    }

    const { data: myLots } = await supabase
      .from("frm_lots")
      .select("id, lot_number, block, jobsite_id, status, jobsite:frm_jobsites(name)")
      .contains("registered_workers", [worker_name.trim()])
      .neq("status", "archived")
      .order("lot_number");

    return NextResponse.json(myLots ?? []);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
