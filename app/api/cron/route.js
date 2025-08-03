import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import { IncompleteSessionEmailTemplate } from "@/app/components/IncompleteSessionEmailTemplate";
import { NextResponse } from "next/server";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        {
          message: "❌ Unauthorized access",
        },
        { status: 401 }
      );
    }

    await connectDB();
    //all unique users with atleast 1 session complete
    const incompleteSessions = await Session.distinct("userId", {
      allDataCollected: true,
    });

    const userWithAllIncomplete = await Session.distinct("userId", {
      userId: { $nin: incompleteSessions },
    });

    const allIncompleteSessionUserEmails = await User.find({
      _id: { $in: userWithAllIncomplete },
    }).select("email");

    if (allIncompleteSessionUserEmails.length === 0) {
      return NextResponse.json({
        message: "No users with incomplete sessions found",
        emailsSent: 0,
      });
    }

    const emailList = allIncompleteSessionUserEmails.map((user) => user.email);
    const BATCH_SIZE = 100;
    const emailBatches = [];
    let totalEmailsSent = 0;

    for (
      let i = 0;
      i < allIncompleteSessionUserEmails.length;
      i += BATCH_SIZE
    ) {
      const batch = allIncompleteSessionUserEmails.slice(i, i + BATCH_SIZE);
      const emailBatch = batch.map((user) => ({
        from: "team@kavisha.ai",
        to: [user.email],
        subject:
          "Complete your conversation to meet great people & opportunities: Team Kavisha",
        react: IncompleteSessionEmailTemplate({
          receiverEmail: user.email,
        }),
      }));

      try {
        const { data, error } = await resend.batch.send(emailBatch);
        if (error) {
          emailBatches.push({
            batchNumber: i + 1,
            success: false,
            error: error.message,
          });
          continue;
        } else {
          emailBatches.push({
            batchNumber: i + 1,
            success: true,
            emailsSent: emailBatch.length,
            batchIds: Array.isArray(data)
              ? data.map((d) => d.id)
              : data?.data
                ? data.data.map((d) => d.id)
                : [],
          });
          totalEmailsSent += emailBatch.length;
          console.log(
            `✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} sent: ${emailBatch.length} emails`
          );
          if (i + BATCH_SIZE < allIncompleteSessionUserEmails.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (batchError) {
        emailBatches.push({
          batchNumber: i + 1,
          success: false,
          error: batchError.message,
        });
      }
    }
    return NextResponse.json({
      message: "Bulk email campaign completed",
      timestamp: new Date().toISOString(),
      totalUsers: allIncompleteSessionUserEmails.length,
      emailList: emailList,
      totalEmailsSent: totalEmailsSent,
      batchesProcessed: emailBatches.length,
      batchResults: emailBatches,
    });
  } catch (err) {
    console.error("Bulk email cron error:", err);
    return NextResponse.json(
      {
        message: "Bulk email failed",
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
