import { connectDB } from "@/app/lib/db.js";
import Brand from "@/app/models/Brand";
import { uploadToBucket } from "@/app/lib/gcs";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import { normalizeLoginButtonText } from "@/app/lib/loginButtonText";
import { resolveBrandImageUrl } from "@/app/lib/brandImageUrl";
import { getKavishaRootHost } from "@/app/lib/kavishaSiteEnv";

function normSubdomain(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.kavisha\.ai$/i, "");
  return s || null;
}

/** Hidden full admin; not shown in brand admin lists. */
function isHiddenPlatformAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === "hello@kavisha.ai";
}

/** @param {string} email */
export function isReservedPlatformSuperadminEmail(email) {
  return isHiddenPlatformAdminEmail(email);
}

/** Admin emails visible to brand admins (excludes hidden super-admin). */
export function filterVisibleAdmins(admins) {
  if (!Array.isArray(admins)) return [];
  return admins.filter((a) => !isHiddenPlatformAdminEmail(a));
}

/** assignedTo values visible to brand admins (excludes hidden super-admin). */
export function filterVisibleAssignedTo(assignedTo) {
  if (assignedTo == null) return [];
  const list = Array.isArray(assignedTo)
    ? assignedTo
    : typeof assignedTo === "string" && assignedTo.trim()
      ? [assignedTo.trim()]
      : [];
  return list
    .map((e) => (typeof e === "string" ? e.trim() : String(e || "").trim()))
    .filter(Boolean)
    .filter((e) => !isHiddenPlatformAdminEmail(e));
}

function brandDocId(doc) {
  if (!doc) return null;
  if (doc._id?.toString) return doc._id.toString();
  return null;
}

function buildLeadPromptFromService(service) {
  if (!service || typeof service !== "object") return "";
  const parts = [];
  if (String(service.about || "").trim()) {
    parts.push(
      `About the person you represent (real world): ${String(service.about).trim()}`
    );
  }
  if (String(service.behaviour || "").trim()) {
    parts.push(
      `How to behave as the avatar: ${String(service.behaviour).trim()}`
    );
  }
  if (String(service.rules || "").trim()) {
    parts.push(`Some special rules to follow: ${String(service.rules).trim()}`);
  }
  return parts.length > 0 ? `${parts.join(". ")} ` : "";
}

function whatsAppLeadFromBrandDoc(doc) {
  if (!doc) return null;
  const brand = normSubdomain(doc.subdomain);
  const services = Array.isArray(doc.services) ? doc.services : [];
  const lead = services.find(
    (s) => String(s?.name || "").toLowerCase() === "lead_journey"
  );
  const serviceKey = String(lead?._key || "").trim();
  if (!brand || !serviceKey) return null;

  const cloud = String(
    doc.widgetLauncher?.whatsappCloudPhoneNumberId || ""
  ).replace(/\D/g, "");

  return {
    brand,
    serviceKey,
    ...(cloud && { cloudPhoneNumberId: cloud }),
  };
}

export function isTalkToAvatarPublished(brand) {
  return brand?.talkToAvatarPublished !== false;
}

function transformPublicBrand(brand, image = null) {
  const sub = normSubdomain(brand?.subdomain);
  const rootHost = getKavishaRootHost();
  return {
    id: brandDocId(brand),
    name: brand.brandName,
    title: brand.title || "",
    subtitle: brand.subtitle || "",
    subdomain: sub,
    image,
    link: sub ? `https://${sub}.${rootHost}` : "",
    logo: image,
    clientWidgetUrl: brand.clientWidgetUrl || "",
    talkToAvatarPublished: isTalkToAvatarPublished(brand),
  };
}

/** Brand document from Mongo only. */
export async function getBrandBySubdomain(subdomain) {
  const sub = normSubdomain(subdomain);
  if (!sub) return null;
  try {
    await connectDB();
    return Brand.findOne({ subdomain: sub }).lean();
  } catch (e) {
    console.warn("[brandRepository] getBrand:", e?.message || e);
    return null;
  }
}

export async function subdomainExists(subdomain) {
  const sub = normSubdomain(subdomain);
  if (!sub) return false;
  try {
    await connectDB();
    const n = await Brand.countDocuments({ subdomain: sub });
    return n > 0;
  } catch {
    return false;
  }
}

export async function filterAvailableSubdomains(subdomains) {
  if (!Array.isArray(subdomains) || subdomains.length === 0) return [];
  const available = [];
  for (const raw of subdomains) {
    const sub = normSubdomain(raw);
    if (!sub) continue;
    if (!(await subdomainExists(sub))) available.push(sub);
  }
  return available;
}

export async function listPublicBrands({
  featuredOnly = false,
  talkToAvatarOnly = false,
} = {}) {
  try {
    await connectDB();
    const q = { subdomain: { $ne: "kavisha" } };
    if (featuredOnly) q.featuredAvatar = true;
    if (talkToAvatarOnly) {
      q.$or = [
        { talkToAvatarPublished: true },
        { talkToAvatarPublished: { $exists: false } },
      ];
    }
    const brands = await Brand.find(q).sort({ brandName: 1 }).lean();
    return Promise.all(
      brands.map(async (b) => {
        const image = await resolveBrandImageUrl(b.logoUrl);
        return transformPublicBrand(b, image);
      })
    );
  } catch (e) {
    console.warn("[brandRepository] listBrands:", e?.message || e);
    return [];
  }
}

export async function getPublicBrandTheme(subdomain) {
  const doc = await getBrandBySubdomain(subdomain);
  if (!doc) {
    return {
      primaryBrandColor: null,
      secondaryBrandColor: null,
      widgetLauncherImageUrl: null,
      widgetLauncherAnimation: false,
      widgetChatbotHeader: null,
      widgetCopyReadMoreUrl: null,
      enableAdminMessages: false,
      enableFriendConnect: false,
      enableProfessionalConnect: false,
      widgetWhatsAppNumberId: null,
    };
  }

  const wl = doc.widgetLauncher;
  const headerRaw =
    typeof wl?.chatbotWidgetHeader === "string"
      ? wl.chatbotWidgetHeader.trim()
      : "";
  const widgetChatbotHeader = headerRaw.length > 0 ? headerRaw : null;

  const readMoreRaw =
    typeof wl?.copyReadMoreUrl === "string" ? wl.copyReadMoreUrl.trim() : "";
  const widgetCopyReadMoreUrl = readMoreRaw.length > 0 ? readMoreRaw : null;

  const waRaw =
    typeof wl?.whatsappPhoneNumberId === "string"
      ? wl.whatsappPhoneNumberId.replace(/\D/g, "")
      : "";
  const widgetWhatsAppNumberId =
    waRaw.length >= 8 && waRaw.length <= 15 ? waRaw : null;

  const widgetLauncherImageUrl = await resolveBrandImageUrl(wl?.buttonImageUrl);

  return {
    primaryBrandColor: normalizeBrandHex(doc.primaryBrandColor),
    secondaryBrandColor: normalizeBrandHex(doc.secondaryBrandColor),
    widgetLauncherImageUrl,
    widgetLauncherAnimation: Boolean(wl?.enableAttentionAnimation),
    widgetChatbotHeader,
    widgetCopyReadMoreUrl,
    enableAdminMessages: Boolean(doc.enableAdminMessages),
    enableFriendConnect: Boolean(doc.enableFriendConnect),
    enableProfessionalConnect: Boolean(doc.enableProfessionalConnect),
    widgetWhatsAppNumberId,
  };
}

export async function mapBrandToClientContext(brand, userEmail) {
  if (!brand) return null;
  const subdomain = normSubdomain(brand.subdomain);
  const [logoUrl, brandImageUrl, paymentQrUrl] = await Promise.all([
    resolveBrandImageUrl(brand.logoUrl),
    resolveBrandImageUrl(brand.brandImageUrl),
    resolveBrandImageUrl(brand.paymentQrUrl),
  ]);
  const em = String(userEmail || "").trim().toLowerCase();
  const isAdmin =
    Boolean(userEmail) &&
    (isHiddenPlatformAdminEmail(userEmail) ||
      (Array.isArray(brand.admins) &&
        brand.admins.some((a) => String(a || "").trim().toLowerCase() === em)));

  return {
    brandId: brandDocId(brand),
    brandName: brand.brandName,
    loginButtonText: normalizeLoginButtonText(brand.loginButtonText),
    logoUrl,
    brandImageUrl,
    brandHeroZoom:
      typeof brand.brandHeroZoom === "number" && Number.isFinite(brand.brandHeroZoom)
        ? brand.brandHeroZoom
        : 1,
    brandHeroFocusY:
      typeof brand.brandHeroFocusY === "number" &&
      Number.isFinite(brand.brandHeroFocusY)
        ? brand.brandHeroFocusY
        : 50,
    brandHeroFocusX:
      typeof brand.brandHeroFocusX === "number" &&
      Number.isFinite(brand.brandHeroFocusX)
        ? brand.brandHeroFocusX
        : 50,
    paymentQrUrl,
    acceptPayment: brand.acceptPayment || false,
    title: brand.title,
    subtitle: brand.subtitle,
    admins: filterVisibleAdmins(brand.admins || []),
    isBrandAdmin: isAdmin,
    subdomain,
    initialmessage: brand.initialmessage,
    enableCommunityOnboarding: true,
    enableProfessionalConnect: brand.enableProfessionalConnect || false,
    enableFriendConnect: brand.enableFriendConnect || false,
    communityName: brand.communityName || "Community",
    enableQuiz: brand.enableQuiz || false,
    quizName: brand.quizName || "Take quiz/survey",
    enableJobs: brand.enableJobs || false,
    enableProducts: brand.enableProducts || false,
    shopifyShopUrl:
      typeof brand.shopifyShopUrl === "string" ? brand.shopifyShopUrl.trim() : "",
    enableBooking: brand.enableBooking || false,
    enableBlogs: brand.enableBlogs || false,
    enableLinks: brand.enableLinks !== false,
    services: brand.services,
    primaryBrandColor: brand.primaryBrandColor || "",
    secondaryBrandColor: brand.secondaryBrandColor || "",
    assistantCopyReadMoreUrl:
      typeof brand.widgetLauncher?.copyReadMoreUrl === "string"
        ? brand.widgetLauncher.copyReadMoreUrl.trim()
        : "",
    clientWidgetUrl: brand.clientWidgetUrl || "",
    talkToAvatarPublished: isTalkToAvatarPublished(brand),
  };
}

export async function getLeadPrompt(brand, serviceKey) {
  const key = String(serviceKey || "").trim();
  if (!key) return "";
  const doc = await getBrandBySubdomain(brand);
  if (!doc) return "";
  const service = (doc.services || []).find((s) => s._key === key);
  return buildLeadPromptFromService(service);
}

export async function getWhatsAppLeadBrand({
  displayDigits = "",
  graphPhoneNumberId = "",
} = {}) {
  const d = String(displayDigits).replace(/\D/g, "");
  const g = String(graphPhoneNumberId).replace(/\D/g, "");
  if (!d && !g) return null;

  const or = [];
  if (g) or.push({ "widgetLauncher.whatsappCloudPhoneNumberId": g });
  if (d) or.push({ "widgetLauncher.whatsappPhoneNumberId": d });

  try {
    await connectDB();
    const doc = await Brand.findOne({ $or: or }).lean();
    return whatsAppLeadFromBrandDoc(doc);
  } catch (e) {
    console.warn("[brandRepository] whatsApp:", e?.message || e);
    return null;
  }
}

export async function isBrandAdmin(email, brand) {
  if (!email || !brand) return false;
  if (isHiddenPlatformAdminEmail(email)) return true;
  const sub = normSubdomain(brand);
  if (!sub) return false;
  try {
    await connectDB();
    const doc = await Brand.findOne({ subdomain: sub }).select("admins").lean();
    return Array.isArray(doc?.admins) && doc.admins.includes(email);
  } catch (e) {
    console.warn("[brandRepository] isBrandAdmin:", e?.message || e);
    return false;
  }
}

export async function getBrandAdmins(brand) {
  const doc = await getBrandBySubdomain(brand);
  return filterVisibleAdmins(doc?.admins);
}

export async function getBrandServiceKeys(brand) {
  const doc = await getBrandBySubdomain(brand);
  const services = Array.isArray(doc?.services) ? doc.services : [];
  return services.map((s) => s._key).filter(Boolean);
}

export async function getBrandService(brand, serviceKey) {
  const key = String(serviceKey || "").trim();
  if (!key) return null;
  const doc = await getBrandBySubdomain(brand);
  if (!doc) return null;
  return (doc.services || []).find((s) => s._key === key) || null;
}

export async function getLeadJourneyServices(brand) {
  const doc = await getBrandBySubdomain(brand);
  const services = Array.isArray(doc?.services) ? doc.services : [];
  return services
    .filter((s) => String(s?.name || "").toLowerCase() === "lead_journey")
    .map((s) => ({
      serviceKey: s._key,
      title: (s.title && String(s.title).trim()) || "Lead journey",
      initialMessage: s.initialMessage,
    }))
    .filter((s) => s.serviceKey);
}

export async function updateBrandBySubdomain(subdomain, { set = {}, unset = [] } = {}) {
  const sub = normSubdomain(subdomain);
  if (!sub) return null;

  const $set = { ...set };
  const $unset = {};
  for (const key of unset) {
    if (key) $unset[key] = "";
  }

  try {
    await connectDB();
    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    if (!Object.keys(update).length) return getBrandBySubdomain(sub);

    return Brand.findOneAndUpdate({ subdomain: sub }, update, {
      new: true,
      runValidators: true,
    }).lean();
  } catch (e) {
    console.warn("[brandRepository] update:", e?.message || e);
    throw e;
  }
}

/** Create brand in Mongo only. */
export async function createBrandDocument(brandDoc) {
  const { _type, _id, _rev, _createdAt, _updatedAt, ...rest } = brandDoc || {};
  const subdomain = normSubdomain(rest.subdomain);
  if (!subdomain) throw new Error("subdomain is required");

  await connectDB();
  const doc = await Brand.create({ ...rest, subdomain });
  return doc.toObject();
}

export async function deleteBrandBySubdomain(subdomain) {
  const sub = normSubdomain(subdomain);
  if (!sub) return;
  try {
    await connectDB();
    await Brand.deleteOne({ subdomain: sub });
  } catch (e) {
    console.warn("[brandRepository] delete:", e?.message || e);
  }
}

const BRAND_IMAGE_UPLOAD = {
  logo: { slug: "logo", urlField: "logoUrl" },
  brandImage: { slug: "brand-image", urlField: "brandImageUrl" },
  paymentQr: { slug: "payment-qr", urlField: "paymentQrUrl" },
};

function extFromFilename(filename) {
  const m = String(filename || "").match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : "jpg";
}

export async function uploadBrandImageToGcs(subdomain, imageType, buffer, filename) {
  const sub = normSubdomain(subdomain);
  const meta = BRAND_IMAGE_UPLOAD[imageType];
  if (!sub || !meta) throw new Error("Invalid subdomain or imageType");

  const objectPath = `brands/${sub}/${meta.slug}.${extFromFilename(filename)}`;
  const lower = String(filename || "").toLowerCase();
  const contentType = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

  const url = await uploadToBucket(objectPath, buffer, contentType);
  if (!url) throw new Error("GCS bucket not configured");
  if (url.includes("storage.googleapis.com/")) {
    const bucketName =
      process.env.GCS_KNOWLEDGE_BASE || process.env.GCS_BUCKET_NAME;
    if (bucketName) {
      return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
    }
  }
  return url;
}

/** Upload brand image to GCS and persist stable public URL on Brand. */
export async function uploadBrandImage(subdomain, imageType, buffer, filename) {
  const sub = normSubdomain(subdomain);
  const meta = BRAND_IMAGE_UPLOAD[imageType];
  if (!sub || !meta) throw new Error("Invalid subdomain or imageType");

  const url = await uploadBrandImageToGcs(sub, imageType, buffer, filename);
  return updateBrandBySubdomain(sub, { set: { [meta.urlField]: url } });
}
