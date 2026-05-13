import { NextResponse } from "next/server";
import Session from "../../models/ChatSessions.js";
import { withAuth } from "../../lib/firebase/auth-middleware";
import { createOrGetUser } from "../../lib/firebase/create-user";
import { connectDB } from "../../lib/db.js";
import { runLeadJourneyTurn } from "../../lib/runLeadJourneyTurn.js";

function serializeError(error) {
  if (!error) return null;

  return {
    name: error.name || "Error",
    message: error.message || "Unknown error",
    ...(error.code ? { code: error.code } : {}),
    ...(error.status ? { status: error.status } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

function errorResponse(status, error, stage, details = null) {
  return NextResponse.json(
    {
      error,
      stage,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function isRetryableGemini429(error) {
  return error?.status === 429 || error?.vertexStatus === "RESOURCE_EXHAUSTED";
}

function responseStatusForVertexError(error) {
  return isRetryableGemini429(error) ? 429 : 500;
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json();
        const history = Array.isArray(body.history) ? body.history : [];
        const { userMessage, sessionId } = body;
        const dbUser = await createOrGetUser(decodedToken);
        const user = {
          id: dbUser._id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.image,
          profileType: dbUser.profileType,
          isAdmin: dbUser.isAdmin || false,
        };
        if (!sessionId) {
          return errorResponse(400, "Missing sessionId", "validate-session");
        }
        await connectDB();

        const session = await Session.findById(sessionId)
          .select("brand serviceKey chatSummary userId")
          .lean();
        if (!session) {
          return errorResponse(404, "Session not found", "load-session");
        }
        const sessionOwnerId =
          session.userId != null ? String(session.userId) : "";
        if (!sessionOwnerId || sessionOwnerId !== user.id) {
          return errorResponse(
            403,
            "Forbidden — session does not belong to this user",
            "validate-session-owner"
          );
        }
        const brand = session.brand;
        const serviceKey = session.serviceKey;
        const chatSummary = String(session.chatSummary || "").trim();
        if (!brand || !serviceKey) {
          return errorResponse(
            400,
            "Session missing brand or serviceKey",
            "validate-session-config",
            {
              brandPresent: Boolean(brand),
              serviceKeyPresent: Boolean(serviceKey),
            }
          );
        }

        const result = await runLeadJourneyTurn({
          sessionId,
          user: { id: user.id, name: user.name },
          userMessage,
          history,
          brand,
          serviceKey,
          chatSummary,
        });

        if (!result.ok) {
          return errorResponse(
            result.status,
            result.error,
            result.stage,
            result.details
          );
        }
        return NextResponse.json(result.payload);
      } catch (error) {
        const status = responseStatusForVertexError(error);
        const message =
          status === 429
            ? "Rate limited; please try again later"
            : "Lead journey request failed";
        return errorResponse(status, message, "unhandled", serializeError(error));
      }
    },
  });
}
