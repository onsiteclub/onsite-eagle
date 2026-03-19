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
      .select("id, name, address, city, total_lots, status")
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
