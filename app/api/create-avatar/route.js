import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { client as sanityClient } from "@/app/lib/sanity";
import { Resend } from "resend";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const SERVICE_NAME = "kavisha-ai";
const REGION = "us-central1";
const ROOT_DOMAIN = "kavisha.ai";

const auth = new GoogleAuth({
  ...(process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY
    ? {
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
    }
    : {}),
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

const deleteBrand = async (brandId) => {
  if (!brandId) return;
  try {
    await sanityClient.delete(brandId);
  } catch (error) { }
};

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const creatorEmail = decodedToken?.email;
      if (!creatorEmail) {
        return NextResponse.json(
          { error: "Please sign in to create an avatar." },
          { status: 401 }
        );
      }

      try {
        await connectDB();
      } catch (dbErr) {
        console.error("create-avatar: connectDB failed", dbErr);
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      const user = await User.findOne({ email: creatorEmail });
      if (!user) {
        return NextResponse.json(
          { error: "Session incomplete. Please sign out and sign in again." },
          { status: 403 }
        );
      }
      if (user.hasCreatedAvatar) {
        return NextResponse.json(
          { error: "You can only create one avatar per account. You have already created one." },
          { status: 400 }
        );
      }

      return runCreateAvatar(request, creatorEmail);
    },
    onUnauthenticated: async () => {
      return NextResponse.json(
        { error: "Please sign in to create an avatar." },
        { status: 401 }
      );
    },
  });
}

async function runCreateAvatar(request, creatorEmail) {
  let brandId = null;

  try {
    const formData = await request.formData();

    const subdomain = formData.get("subdomain");
    const brandName = formData.get("brandName");
    const loginButtonText = formData.get("loginButtonText");
    const title = formData.get("title");
    const subtitle = formData.get("subtitle");
    const email = formData.get("email");
    const about = formData.get("about");
    const imageFile = formData.get("image");

    if (!subdomain || !String(subdomain).trim()) {
      return NextResponse.json(
        { error: "Subdomain is required." },
        { status: 400 }
      );
    }
    const normalizedSubdomain = String(subdomain).trim().toLowerCase().replace(/\.kavisha\.ai$/i, "");

    if (!normalizedSubdomain) {
      return NextResponse.json(
        { error: "Subdomain is required." },
        { status: 400 }
      );
    }

    // Subdomain: only lowercase letters, numbers, hyphens (DNS-safe)
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalizedSubdomain)) {
      return NextResponse.json(
        { error: "Subdomain can only contain letters, numbers and hyphens." },
        { status: 400 }
      );
    }

    if (!sanityClient) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const existingBrand = await sanityClient.fetch(
      `*[_type == "brand" && subdomain == $sub][0]`,
      { sub: normalizedSubdomain }
    );

    if (existingBrand) {
      return NextResponse.json(
        { error: "This subdomain is already taken. Please choose another." },
        { status: 400 }
      );
    }

    // Upload image to Sanity if provided (non-blocking: avatar works without image)
    let imageAsset = null;
    if (imageFile && imageFile.size > 0) {
      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        imageAsset = await sanityClient.assets.upload("image", buffer, {
          filename: (imageFile.name && String(imageFile.name).trim()) || "avatar-image.jpg",
        });
      } catch (uploadErr) {
        console.warn("create-avatar: image upload failed", uploadErr?.message || uploadErr);
      }
    }

    // Create lead_journey service with about, default behaviour and rules
    const avatarName = String(brandName || normalizedSubdomain).trim() || "this person";
    const defaultBehaviour = `You are ${avatarName}'s digital avatar.`;
    const defaultRules = "Don't use abusive language. Be calm and polite.";

    const services = [{
      _key: `lead_journey_${Date.now()}`,
      name: "lead_journey",
      title: "Talk to me",
      initialMessage: "Hello, How can I assist you today?",
      about: (about && String(about).trim()) ? String(about).trim() : "No description provided.",
      behaviour: defaultBehaviour,
      rules: defaultRules,
    }];

    // Build brand document
    const brandDoc = {
      _type: "brand",
      brandName: brandName || normalizedSubdomain,
      loginButtonText: loginButtonText || "Talk to me now",
      title: title || `Welcome to ${normalizedSubdomain}`,
      subtitle: subtitle || "",
      subdomain: normalizedSubdomain,
      admins: email?.trim() ? [String(email).trim()] : [],
      services,
    };

    // Add brandImage and logo if uploaded (same image for both)
    if (imageAsset) {
      brandDoc.brandImage = {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAsset._id,
        },
      };
      brandDoc.logo = {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAsset._id,
        },
      };
    }

    const brand = await sanityClient.create(brandDoc);
    brandId = brand._id;

    const domainName = `${normalizedSubdomain}.${ROOT_DOMAIN}`;
    const gcpClient = await auth.getClient();
    const token = (await gcpClient.getAccessToken()).token;

    const response = await fetch(
      `https://${REGION}-run.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/domainmappings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiVersion: "domains.cloudrun.com/v1",
          kind: "DomainMapping",
          metadata: { name: domainName, namespace: PROJECT_ID },
          spec: { routeName: SERVICE_NAME },
        }),
      }
    );

    let data = {};
    try {
      const text = await response.text();
      if (text) data = JSON.parse(text);
    } catch {
      // ignore parse error
    }

    if (!response.ok) {
      await deleteBrand(brandId);
      const msg = (data?.error && String(data.error)) || "We couldn't set up your domain right now. Please try again later.";
      return NextResponse.json(
        { error: msg },
        { status: 502 }
      );
    }

    if (email?.trim() && resend) {
      try {
        const editProfileUrl = `https://${domainName}/admin/${normalizedSubdomain}/edit-profile`;
        const trainUrl = `https://${domainName}/admin/${normalizedSubdomain}/train/v2`;

        await resend.emails.send({
          from: "hello@kavisha.ai",
          to: email.trim(),
          subject: `AI Avatar Created for ${brandName || normalizedSubdomain}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Hello!</h2>
              <p>Your AI avatar for <strong>${brandName || normalizedSubdomain}</strong> has been created successfully!</p>
              <p>Domain mapping is currently in progress. You can check your domain after 30 minutes at:</p>
              <p><a href="https://${domainName}" style="color: #2563eb; text-decoration: none;">https://${domainName}</a></p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #111827;">Admin Access</h3>
                <p>You can login and manage your avatar using your admin email:</p>
                <p style="font-weight: bold; color: #2563eb;">${email.trim()}</p>
                
                <p style="margin-top: 20px;">Manage your avatar:</p>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin-bottom: 10px;">
                    <a href="${editProfileUrl}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                      ✏️ Edit Profile & Personality
                    </a>
                    <br>
                    <span style="color: #6b7280; font-size: 14px;">${editProfileUrl}</span>
                  </li>
                  <li style="margin-bottom: 10px;">
                    <a href="${trainUrl}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                      🎓 Train Your Avatar
                    </a>
                    <br>
                    <span style="color: #6b7280; font-size: 14px;">${trainUrl}</span>
                  </li>
                </ul>
              </div>
              
              <p style="margin-top: 30px;">Thank you for using Kavisha.ai!</p>
            </div>
          `,
        });
      } catch (emailError) { }
    }

    try {
      await User.updateOne(
        { email: creatorEmail },
        { $set: { hasCreatedAvatar: true } }
      );
    } catch (updateErr) {
      console.error("create-avatar: User.updateOne failed", updateErr);
      // Don't delete brand: avatar and domain are already created; support can fix the flag
      return NextResponse.json(
        { error: "Your avatar was created but we couldn't complete your account update. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, domainName }, { status: 201 });
  } catch (error) {
    await deleteBrand(brandId);
    console.error("create-avatar:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
