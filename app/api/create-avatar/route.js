import { NextResponse, after } from "next/server";
import {
  createBrandDocument,
  deleteBrandBySubdomain,
  resolveAvailableSubdomainFromName,
  uploadBrandImageToGcs,
} from "@/app/lib/brandRepository";
import { Resend } from "resend";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import { normalizeLoginButtonText } from "@/app/lib/loginButtonText";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import { mapAvatarDomain } from "@/app/lib/mapAvatarDomain";
import {
  getBrandOrigin,
  getKavishaCloudRunService,
  getKavishaRootHost,
} from "@/app/lib/kavishaSiteEnv";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const UNLIMITED_AVATAR_CREATOR_EMAIL = "hello@kavisha.ai";
export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const creatorEmail = decodedToken?.email;
      const normalizedCreatorEmail = String(creatorEmail || "").trim().toLowerCase();
      const canCreateUnlimitedAvatars =
        normalizedCreatorEmail === UNLIMITED_AVATAR_CREATOR_EMAIL;
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
      if (user.hasCreatedAvatar && !canCreateUnlimitedAvatars) {
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
  let createdSubdomain = null;
  const siteOpts = { request };
  const rootHost = getKavishaRootHost(siteOpts);
  const serviceName = getKavishaCloudRunService(siteOpts);

  try {
    const formData = await request.formData();

    const brandName = formData.get("brandName");
    const loginButtonText = formData.get("loginButtonText");
    const title = formData.get("title");
    const subtitle = formData.get("subtitle");
    const about = formData.get("about");
    const behaviour = formData.get("behaviour");
    const rules = formData.get("rules");
    const primaryBrandColor = formData.get("primaryBrandColor");
    const imageFile = formData.get("image");

    const trimmedBrandName = String(brandName || "").trim();
    if (!trimmedBrandName) {
      return NextResponse.json(
        { error: "Brand name is required." },
        { status: 400 }
      );
    }

    const normalizedSubdomain =
      await resolveAvailableSubdomainFromName(trimmedBrandName);
    if (!normalizedSubdomain) {
      return NextResponse.json(
        { error: "Could not find an available subdomain. Try a different name." },
        { status: 400 }
      );
    }

    let imageUrl = "";
    if (imageFile && imageFile.size > 0) {
      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const name =
          (imageFile.name && String(imageFile.name).trim()) || "avatar-image.jpg";
        imageUrl = await uploadBrandImageToGcs(
          normalizedSubdomain,
          "brandImage",
          buffer,
          name
        );
      } catch (uploadErr) {
        console.warn("create-avatar: image upload failed", uploadErr?.message || uploadErr);
      }
    }

    // Create lead_journey service with about, behaviour and rules (from form or defaults)
    const avatarName = trimmedBrandName || normalizedSubdomain || "this person";
    const defaultBehaviour = `You are ${avatarName}'s digital avatar.`;
    const defaultRules = "Don't use abusive language. Be calm and polite.";
    const behaviourText = (behaviour && String(behaviour).trim()) ? String(behaviour).trim() : defaultBehaviour;
    const rulesText = (rules && String(rules).trim()) ? String(rules).trim() : defaultRules;

    const services = [{
      _key: `lead_journey_${Date.now()}`,
      name: "lead_journey",
      title: "Talk to me",
      initialMessage: "Hello, How can I assist you today?",
      about: (about && String(about).trim()) ? String(about).trim() : "No description provided.",
      behaviour: behaviourText,
      rules: rulesText,
    }];

    const creatorAdminEmail = String(creatorEmail).trim().toLowerCase();
    const admins =
      creatorAdminEmail === UNLIMITED_AVATAR_CREATOR_EMAIL
        ? [UNLIMITED_AVATAR_CREATOR_EMAIL]
        : [creatorAdminEmail, UNLIMITED_AVATAR_CREATOR_EMAIL];

    // Build brand document
    const brandDoc = {
      _type: "brand",
      brandName: trimmedBrandName || normalizedSubdomain,
      loginButtonText: normalizeLoginButtonText(loginButtonText),
      title: title || `Welcome to ${normalizedSubdomain}`,
      subtitle: subtitle || "",
      subdomain: normalizedSubdomain,
      admins,
      services,
    };

    if (imageUrl) {
      brandDoc.logoUrl = imageUrl;
      brandDoc.brandImageUrl = imageUrl;
    }

    const brandColor = normalizeBrandHex(String(primaryBrandColor || ""));
    if (brandColor) {
      brandDoc.primaryBrandColor = brandColor;
    }

    createdSubdomain = normalizedSubdomain;
    await createBrandDocument(brandDoc);

    const domainName = `${normalizedSubdomain}.${rootHost}`;

    after(() => {
      mapAvatarDomain({
        subdomain: normalizedSubdomain,
        rootHost,
        serviceName,
      }).catch((err) =>
        console.error("create-avatar: domain mapping failed", err)
      );
    });

    if (creatorAdminEmail && resend) {
      try {
        const brandOrigin = getBrandOrigin(normalizedSubdomain, siteOpts);
        const editProfileUrl = `${brandOrigin}/admin/${normalizedSubdomain}/edit-profile`;
        const trainUrl = `${brandOrigin}/admin/${normalizedSubdomain}/train/v2`;

        await resend.emails.send({
          from: "hello@kavisha.ai",
          to: creatorAdminEmail,
          subject: `AI Avatar Created for ${trimmedBrandName || normalizedSubdomain}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Hello!</h2>
              <p>Your AI avatar for <strong>${trimmedBrandName || normalizedSubdomain}</strong> has been created successfully!</p>
              <p>Domain mapping is currently in progress. You can check your domain after 30 minutes at:</p>
              <p><a href="${brandOrigin}" style="color: #2563eb; text-decoration: none;">${brandOrigin}</a></p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #111827;">Admin Access</h3>
                <p>You can login and manage your avatar using your admin email:</p>
                <p style="font-weight: bold; color: #2563eb;">${creatorAdminEmail}</p>
                
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
      } catch (emailError) {
        console.warn(
          "[create-avatar] welcome_email_failed",
          emailError?.message || emailError
        );
      }
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

    return NextResponse.json(
      { success: true, domainName, subdomain: normalizedSubdomain },
      { status: 201 }
    );
  } catch (error) {
    await deleteBrandBySubdomain(createdSubdomain);
    console.error("create-avatar:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
