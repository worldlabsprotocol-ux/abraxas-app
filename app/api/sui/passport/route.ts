// FILE: app/api/sui/passport/route.ts
// Query Abraxas Passport objects on Sui devnet by object ID or owner address.

import { NextResponse } from "next/server";
import { getSuiClient } from "@/lib/sui/client";
import { getSuiDeployment, passportTypeFilter } from "@/lib/sui/config";
import { getActiveSuiNetwork } from "@/lib/sui/config";
import { parseSuiPassportObject } from "@/lib/sui/parsePassport";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const objectId = searchParams.get("objectId");
  const owner = searchParams.get("owner");

  const sui = getSuiClient();
  const deployment = getSuiDeployment();
  const network = getActiveSuiNetwork();

  if (!deployment.packageId?.startsWith("0x")) {
    return NextResponse.json(
      {
        error: "Sui Passport package not deployed on active network",
        network,
        mainnet_path: "/api/sui/mainnet/readiness",
      },
      { status: 503 },
    );
  }

  try {
    if (objectId) {
      const obj = await sui.getObject({
        id: objectId,
        options: { showContent: true, showType: true },
      });
      if (!obj.data) {
        return NextResponse.json({ error: "Object not found" }, { status: 404 });
      }
      const parsed = parseSuiPassportObject(objectId, {
        ...obj.data,
        objType: obj.data.type,
        content: obj.data.content,
      });
      if (!parsed) {
        return NextResponse.json({ error: "Not a Passport object" }, { status: 400 });
      }
      return NextResponse.json({ network, deployment, passport: parsed });
    }

    const lookupOwner = owner || deployment.demoOwnerAddress;
    if (!lookupOwner) {
      return NextResponse.json({ error: "owner query param required" }, { status: 400 });
    }

    const owned = await sui.getOwnedObjects({
      owner: lookupOwner,
      filter: { StructType: passportTypeFilter() },
      options: { showContent: true, showType: true },
    });

    const passports = owned.data
      .map(entry => {
        if (!entry.data) return null;
        return parseSuiPassportObject(entry.data.objectId, {
          ...entry.data,
          objType: entry.data.type,
          content: entry.data.content,
        });
      })
      .filter(Boolean);

    return NextResponse.json({
      network,
      deployment,
      owner: lookupOwner,
      count: passports.length,
      passports,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sui RPC error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
