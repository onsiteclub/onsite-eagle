import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — list all lots (includes block field)
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: lots, error } = await supabase
      .from("frm_lots")
      .select("id, lot_number, block, current_phase, jobsite_id, status, registered_workers, jobsite:frm_jobsites(name)")
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

// POST — create lots for a jobsite
// Mode 1 (singles): { jobsite_id, count, from? }
// Mode 2 (block):   { jobsite_id, block_number, unit_count }
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { jobsite_id, block_number, unit_count, count, from, custom_number } = body;

    if (!jobsite_id) {
      return NextResponse.json({ error: "jobsite_id required" }, { status: 400 });
    }

    let lots: { jobsite_id: string; lot_number: string; block?: string; status: string }[];

    if (custom_number && typeof custom_number === "string") {
      // --- Single lot with custom number (quick add) ---
      lots = [{
        jobsite_id,
        lot_number: custom_number.trim(),
        status: "pending",
      }];
    } else if (block_number && unit_count) {
      // --- Block mode ---
      if (unit_count < 1 || unit_count > 26) {
        return NextResponse.json({ error: "unit_count must be 1-26" }, { status: 400 });
      }

      lots = Array.from({ length: unit_count }, (_, i) => ({
        jobsite_id,
        lot_number: `${block_number}-${String.fromCharCode(65 + i)}`,
        block: String(block_number),
        status: "pending",
      }));
    } else if (count) {
      // --- Singles mode ---
      if (count < 1 || count > 500) {
        return NextResponse.json({ error: "count must be 1-500" }, { status: 400 });
      }

      let startFrom: number;
      if (from !== undefined && from !== null) {
        startFrom = parseInt(String(from));
        if (isNaN(startFrom) || startFrom < 1) {
          return NextResponse.json({ error: "from must be a positive number" }, { status: 400 });
        }
      } else {
        // Auto-detect next number
        const { data: existing } = await supabase
          .from("frm_lots")
          .select("lot_number")
          .eq("jobsite_id", jobsite_id)
          .is("block", null)
          .order("lot_number", { ascending: false })
          .limit(1);

        startFrom = existing?.length
          ? parseInt(existing[0].lot_number || "0") + 1
          : 1;
      }

      lots = Array.from({ length: count }, (_, i) => ({
        jobsite_id,
        lot_number: String(startFrom + i),
        status: "pending",
      }));
    } else {
      return NextResponse.json({ error: "Provide count (singles) or block_number+unit_count (block)" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("frm_lots")
      .insert(lots)
      .select("id, lot_number, block");

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
      .update({ total_lots: totalLots ?? 0 })
      .eq("id", jobsite_id);

    return NextResponse.json(data ?? [], { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — bulk update lot status (archive/unarchive)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const { lot_ids, status } = body;

    if (!lot_ids || !Array.isArray(lot_ids) || lot_ids.length === 0) {
      return NextResponse.json({ error: "lot_ids array required" }, { status: 400 });
    }

    if (!["pending", "archived"].includes(status)) {
      return NextResponse.json({ error: "status must be 'pending' or 'archived'" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("frm_lots")
      .update({ status })
      .in("id", lot_ids)
      .select("id, lot_number, status");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
