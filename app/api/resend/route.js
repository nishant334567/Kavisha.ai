import { NextResponse } from "next/server";
import { EmailTemplate } from "@/app/components/EmailTemplate";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request) {
  if (!resend) {
    return NextResponse.json(
      { error: "Resend API key not configured" },
      { status: 500 }
    );
  }

  const {
    toEmail,
    toName,
    senderName,
    profileType,
    matchPercentage,
    jobTitle,
  } = await request.json();
  try {
    const { data, error } = await resend.emails.send({
      from: "Team Kavisha <team@kavisha.ai>",
      to: toEmail,
      subject: "Team Kavisha.ai",
      react: EmailTemplate({
        profileType: profileType,
        senderName: senderName,
        jobTitle: jobTitle,
        matchPercentage: matchPercentage,
        receiverEmail: toEmail,
      }),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
