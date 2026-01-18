/**
 * NFC API Route - Proxy for NFC Reader Service
 *
 * This API route acts as a proxy between the frontend and the standalone
 * NFC reader service. It forwards poll requests and returns card data.
 */

import { NextRequest, NextResponse } from "next/server";

const NFC_SERVICE_URL = process.env.NFC_SERVICE_URL || "http://localhost:3001";

/**
 * GET /api/nfc?action=poll|status
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "poll";

  try {
    let endpoint = "";
    let timeout = 30000; // 30 seconds default

    switch (action) {
      case "poll":
        endpoint = "/poll";
        timeout = 30000; // Long timeout for long-polling
        break;
      case "status":
        endpoint = "/status";
        timeout = 5000;
        break;
      case "health":
        endpoint = "/health";
        timeout = 5000;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Forward request to NFC service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${NFC_SERVICE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `NFC service error: ${response.status} - ${errorText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[NFC API] Error:", error);

    // Check if it's a timeout/abort error
    if (error.name === "AbortError") {
      return NextResponse.json({
        success: false,
        error: "NFC service request timeout",
      });
    }

    // Check if service is unreachable
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return NextResponse.json({
        success: false,
        error: "NFC service not running. Please start the NFC service.",
        serviceUrl: NFC_SERVICE_URL,
      });
    }

    return NextResponse.json({
      success: false,
      error: error.message || "Failed to communicate with NFC service",
    });
  }
}
