// app/api/long-transcribe/route.js
import { SpeechClient } from "@google-cloud/speech";

// Initialize with explicit key file path (if needed)
const client = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to your service account key
  projectId: process.env.GOOGLE_CLOUD_PROJECT, // Your GCP project ID
});

// Store operation status (in production, use a database)
const operationStatus = new Map();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gcsUri = searchParams.get("gcsuri");
  const operationName = searchParams.get("operation");

  // If operation name is provided, check status
  if (operationName) {
    return checkOperationStatus(operationName);
  }

  if (!gcsUri) {
    return Response.json({ error: "gcsUri is required" }, { status: 400 });
  }

  return startTranscription(gcsUri);
}

async function startTranscription(gcsUri) {
  const audio = { uri: gcsUri };
  const config = {
    encoding: "MP3", // Updated to match the audio file format
    sampleRateHertz: 16000, // You may need to adjust this based on your actual audio
    languageCode: "en-US",
  };

  try {
    // Start the long-running operation
    const [operation] = await client.longRunningRecognize({ audio, config });
    const operationName = operation.name;

    // Store initial status
    operationStatus.set(operationName, {
      status: "RUNNING",
      startTime: new Date().toISOString(),
      gcsUri: gcsUri,
    });

    // Start background processing (don't await)
    processTranscriptionInBackground(operationName, operation);

    return Response.json({
      message: "Transcription started in background",
      operationName: operationName,
      status: "RUNNING",
      checkStatusUrl: `/api/long-transcribe?operation=${operationName}`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

async function checkOperationStatus(operationName) {
  const status = operationStatus.get(operationName);

  if (!status) {
    return Response.json({ error: "Operation not found" }, { status: 404 });
  }

  return Response.json(status);
}

async function processTranscriptionInBackground(operationName, operation) {
  try {
    console.log(
      `Starting background transcription for operation: ${operationName}`
    );

    // Wait for the operation to complete with retry logic
    const response = await waitForOperationWithRetry(operation, operationName);

    // Update status to completed
    operationStatus.set(operationName, {
      status: "COMPLETED",
      startTime: operationStatus.get(operationName)?.startTime,
      completedTime: new Date().toISOString(),
      transcript: response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n"),
      gcsUri: operationStatus.get(operationName)?.gcsUri,
    });

    console.log(`Transcription completed for operation: ${operationName}`);
  } catch (err) {
    console.error(`Transcription failed for operation ${operationName}:`, err);

    // Update status to failed
    operationStatus.set(operationName, {
      status: "FAILED",
      startTime: operationStatus.get(operationName)?.startTime,
      error: err.message,
      gcsUri: operationStatus.get(operationName)?.gcsUri,
    });
  }
}

async function waitForOperationWithRetry(
  operation,
  operationName,
  maxRetries = 5
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Attempt ${attempt}/${maxRetries} for operation: ${operationName}`
      );
      const [response] = await operation.promise();
      return response;
    } catch (error) {
      console.error(
        `Attempt ${attempt} failed for operation ${operationName}:`,
        error.message
      );

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Recreate the operation client for the retry
      try {
        const operationId = operationName.split("/").pop();
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const fullOperationName = `projects/${projectId}/operations/${operationId}`;

        // Get the operation again
        const [newOperation] = await client.operationsClient.getOperation({
          name: fullOperationName,
        });

        if (newOperation.done) {
          // Operation is actually complete, return the result
          return newOperation.response;
        }

        // Update the operation reference for the next attempt
        operation = client.operationsClient.getOperation({
          name: fullOperationName,
        });
      } catch (recreateError) {
        console.error(`Failed to recreate operation:`, recreateError);
      }
    }
  }
}
