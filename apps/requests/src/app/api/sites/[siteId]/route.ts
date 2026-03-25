import { createAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET — single site details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("frm_jobsites")
      .select("id, name, address, city, total_lots, status, machine_down, machine_down_at, machine_down_reason, refuel_needed, refuel_needed_at")
      .eq("id", siteId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — update site details
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const supabase = createAdminClient();
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if ("name" in body) updates.name = body.name?.trim() || null;
    if ("address" in body) updates.address = body.address?.trim() || null;
    if ("city" in body) updates.city = body.city?.trim() || null;

    // Machine down toggle
    if ("machine_down" in body) {
      updates.machine_down = !!body.machine_down;
      if (body.machine_down) {
        updates.machine_down_at = new Date().toISOString();
        updates.machine_down_reason = body.machine_down_reason?.trim() || null;
      } else {
        updates.machine_down_at = null;
        updates.machine_down_reason = null;
      }
    }

    // Refuel needed toggle
    if ("refuel_needed" in body) {
      updates.refuel_needed = !!body.refuel_needed;
      updates.refuel_needed_at = body.refuel_needed ? new Date().toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if ("name" in updates && !updates.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("frm_jobsites")
      .update(updates)
      .eq("id", siteId)
      .select("id, name, address, city, total_lots, machine_down, machine_down_at, machine_down_reason, refuel_needed, refuel_needed_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove site + all related data (lots, requests, etc.)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    // Verify site exists and name matches (friction)
    const { data: site } = await supabase
      .from("frm_jobsites")
      .select("id, name")
      .eq("id", siteId)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (body.confirm_name !== site.name) {
      return NextResponse.json(
        { error: "Site name does not match" },
        { status: 400 }
      );
    }

    // Use DB function that handles full FK cascade
    const { data, error } = await supabase.rpc("delete_site_cascade", {
      target_site_id: siteId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
