import { NextResponse } from "next/server";
import { EmailTemplate } from "@/app/components/EmailTemplate";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(res) {
  const {
    toEmail,
    toName,
    senderName,
    profileType,
    matchPercentage,
    jobTitle,
  } = await res.json();
  try {
    const { data, error } = await resend.emails.send({
      from: "team@kavisha.ai",
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
