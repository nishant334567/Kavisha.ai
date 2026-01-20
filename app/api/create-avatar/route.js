import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import path from "path";
import { client as sanityClient } from "@/app/lib/sanity";
import { Resend } from "resend";

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
    : {
        keyFile: path.join(
          process.cwd(),
          "app/secrets/service-account-key.json"
        ),
      }),
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

const deleteBrand = async (brandId) => {
  if (!brandId) return;
  try {
    await sanityClient.delete(brandId);
  } catch (error) {}
};

export async function POST(request) {
  let brandId = null;

  try {
    const formData = await request.formData();

    const subdomain = formData.get("subdomain");
    const brandName = formData.get("brandName");
    const loginButtonText = formData.get("loginButtonText");
    const title = formData.get("title");
    const subtitle = formData.get("subtitle");
    const email = formData.get("email");
    const personality = formData.get("personality");
    const imageFile = formData.get("image");

    if (!subdomain) {
      return NextResponse.json(
        { message: "Subdomain is required" },
        { status: 400 }
      );
    }

    const existingBrand = await sanityClient.fetch(
      `*[_type == "brand" && subdomain == "${subdomain}"][0]`
    );

    if (existingBrand) {
      return NextResponse.json(
        { error: "Brand with this subdomain already exists" },
        { status: 400 }
      );
    }

    // Upload image to Sanity if provided
    let imageAsset = null;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageAsset = await sanityClient.assets.upload("image", buffer, {
        filename: imageFile.name || "avatar-image.jpg",
      });
    }

    // Create lead_journey service with personality in intro field
    const services = [];
    if (personality?.trim()) {
      services.push({
        _key: `lead_journey_${Date.now()}`,
        name: "lead_journey",
        title: "Talk to me",
        initialMessage: "Hello, How can I assist you today?",
        intro: personality.trim(),
      });
    }

    // Build brand document
    const brandDoc = {
      _type: "brand",
      brandName: brandName || subdomain,
      loginButtonText: loginButtonText || "Talk to me now",
      title: title || `Welcome to ${subdomain}`,
      subtitle: subtitle || "",
      subdomain,
      admins: email?.trim() ? [email] : [],
      services: services,
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

    const domainName = `${subdomain}.${ROOT_DOMAIN}`;
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

    const data = await response.json();

    if (!response.ok) {
      await deleteBrand(brandId);
      return NextResponse.json(
        {
          error: data.error?.message || "Failed to create domain mapping.",
        },
        { status: 400 }
      );
    }

    if (email?.trim() && resend) {
      try {
        const editProfileUrl = `https://${domainName}/admin/${subdomain}/edit-profile`;
        const trainUrl = `https://${domainName}/admin/${subdomain}/train/v2`;

        await resend.emails.send({
          from: "hello@kavisha.ai",
          to: email.trim(),
          subject: `AI Avatar Created for ${brandName || subdomain}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Hello!</h2>
              <p>Your AI avatar for <strong>${brandName || subdomain}</strong> has been created successfully!</p>
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
      } catch (emailError) {}
    }

    return NextResponse.json({ success: true, domainName }, { status: 201 });
  } catch (error) {
    await deleteBrand(brandId);
    return NextResponse.json(
      { error: error.message || "Failed to create avatar" },
      { status: 500 }
    );
  }
}
