import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { default: pdf } = await import("pdf-parse/lib/pdf-parse.js");

    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdf(buffer, {
      max: 0,
      version: "v1.10.100",
    });

    return NextResponse.json({ success: true, text: data.text });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to extract text from PDF",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
