export async function POST(request) {
  try {
    // Dynamic import to avoid bundling issues
    const { default: pdf } = await import("pdf-parse/lib/pdf-parse.js");

    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!file) {
      return new Response(JSON.stringify({ error: "No PDF file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if file is PDF
    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({ error: "File must be a PDF" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF with options
    const data = await pdf(buffer, {
      // Options to prevent file system access
      max: 0, // 0 means no page limit
      version: "v1.10.100", // Specify version to avoid auto-detection
    });

    return new Response(
      JSON.stringify({
        success: true,
        text: data.text,
        pages: data.numpages,
        info: data.info || {},
        metadata: data.metadata || {},
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PDF extraction error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to extract text from PDF",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
