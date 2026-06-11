import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
  } catch (e) {
    const status = e instanceof AdminAuthError ? e.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
  const { id } = await params;
  try {
    const form = await req.formData();
    const set: Record<string, unknown> = {};
    const str = (k: string) => { const v = (form.get(k) as string)?.trim(); if (v) set[k] = v; };
    str("name"); str("colorPrimary"); str("colorAccent"); str("colorDark"); str("fontDisplay"); str("fontBody");

    const modules = form.get("enabledModules") as string | null;
    if (modules) set.enabledModules = JSON.parse(modules);
    const allowed = form.get("allowedListingTypes") as string | null;
    if (allowed) set.allowedListingTypes = JSON.parse(allowed);
    const domain = (form.get("domain") as string)?.trim().toLowerCase();
    if (domain) set.domains = [domain];

    const logo = form.get("logo") as File | null;
    if (logo && logo.size > 0) {
      const asset = await sanityWriteClient.assets.upload(
        "image",
        Buffer.from(await logo.arrayBuffer()),
        { filename: logo.name }
      );
      set.logo = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    }

    await sanityWriteClient.patch(id).set(set).commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/partners PATCH] error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
