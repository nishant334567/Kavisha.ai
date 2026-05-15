import { connectDB } from "@/app/lib/db.js";
import Brand from "@/app/models/Brand";
import { uploadSanityImageAsset as uploadSanityImageAssetImpl } from "@/app/lib/sanityImages";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import { normalizeLoginButtonText } from "@/app/lib/loginButtonText";
import { getSanityImageUrl } from "@/app/lib/brandImageUrl";

const ROOT_HOST =
  process.env.NODE_ENV === "staging" ? "staging.kavisha.ai" : "kavisha.ai";

function normSubdomain(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.kavisha\.ai$/i, "");
  return s || null;
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

function transformPublicBrand(brand) {
  const sub = normSubdomain(brand?.subdomain);
  const logoUrl = getSanityImageUrl(brand?.logo);
  return {
    id: brandDocId(brand),
    name: brand.brandName,
    title: brand.title || "",
    subtitle: brand.subtitle || "",
    subdomain: sub,
    image: logoUrl,
    link: sub ? `https://${sub}.${ROOT_HOST}` : "",
    logo: logoUrl,
    clientWidgetUrl: brand.clientWidgetUrl || "",
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

export async function listPublicBrands({ featuredOnly = false } = {}) {
  try {
    await connectDB();
    const q = { subdomain: { $ne: "kavisha" } };
    if (featuredOnly) q.featuredAvatar = true;
    const brands = await Brand.find(q).sort({ brandName: 1 }).lean();
    return brands.map(transformPublicBrand);
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

  const widgetLauncherImageUrl = wl?.buttonImage
    ? getSanityImageUrl(wl.buttonImage, {
        width: 128,
        height: 128,
        fit: "max",
        auto: "format",
      })
    : null;

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

export function mapBrandToClientContext(brand, userEmail) {
  if (!brand) return null;
  const subdomain = normSubdomain(brand.subdomain);
  const logoUrl = getSanityImageUrl(brand.logo);
  const brandImageUrl = getSanityImageUrl(brand.brandImage);
  const paymentQrUrl = getSanityImageUrl(brand.paymentQr);
  const isAdmin =
    Boolean(userEmail) &&
    Array.isArray(brand.admins) &&
    brand.admins.includes(userEmail);

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
    admins: brand.admins || [],
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
  return Array.isArray(doc?.admins) ? doc.admins : [];
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

/** Create brand in Mongo only (image fields may reference Sanity asset ids). */
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

/** @deprecated Use deleteBrandBySubdomain */
export async function deleteBrandBySanityId(_sanityId) {
  /* no-op: brands are Mongo-only */
}

export async function uploadSanityImageAsset(buffer, filename) {
  return uploadSanityImageAssetImpl(buffer, filename);
}

export async function setBrandImageField(subdomain, imageType, assetId) {
  const imageRef = {
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
  };
  return updateBrandBySubdomain(subdomain, { set: { [imageType]: imageRef } });
}
