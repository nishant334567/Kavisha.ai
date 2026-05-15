const mongoose = require("mongoose");

/** Matches Sanity `image` field shape for import / urlFor-style reads */
const SanityImageSchema = new mongoose.Schema(
    {
        _type: { type: String, default: "image" },
        asset: {
            _type: { type: String, default: "reference" },
            _ref: { type: String, default: "" },
        },
    },
    { _id: false, strict: false }
);

const WidgetLauncherSchema = new mongoose.Schema(
    {
        buttonImage: { type: SanityImageSchema, default: undefined },
        enableAttentionAnimation: { type: Boolean, default: false },
        chatbotWidgetHeader: { type: String, default: "" },
        copyReadMoreUrl: { type: String, default: "" },
        whatsappPhoneNumberId: { type: String, default: "" },
        whatsappCloudPhoneNumberId: { type: String, default: "" },
    },
    { _id: false }
);

const BrandServiceSchema = new mongoose.Schema(
    {
        /** Sanity array item key — keep verbatim on import (maps to session `serviceKey`) */
        _key: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        initialMessage: { type: String, default: "" },
        title: { type: String, required: true, trim: true },
        /** Sanity allows empty; do not use `required` (Mongoose rejects "") */
        about: { type: String, default: "" },
        behaviour: { type: String, default: "" },
        rules: { type: String, default: "" },
        logo: { type: SanityImageSchema, default: undefined },
        introquestions: {
            type: [String],
            default: [],
            validate: {
                validator: (v) => !Array.isArray(v) || v.length <= 5,
                message: "Maximum 5 initial questions allowed.",
            },
        },
    },
    { _id: false }
);

const SupportChannelsSchema = new mongoose.Schema(
    {
        slackWebhookUrl: { type: String, default: "" },
        supportEmail: { type: String, default: "" },
    },
    { _id: false }
);

const BrandSchema = new mongoose.Schema(
    {
        brandName: { type: String, required: true, trim: true },
        loginButtonText: { type: String, required: true, trim: true },

        logo: { type: SanityImageSchema, default: undefined },
        brandImage: { type: SanityImageSchema, default: undefined },

        clientWidgetUrl: { type: String, default: "" },

        brandHeroZoom: {
            type: Number,
            default: 1,
            min: 1,
            max: 3,
        },
        brandHeroFocusY: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        brandHeroFocusX: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },

        acceptPayment: { type: Boolean, default: false },
        paymentQr: { type: SanityImageSchema, default: undefined },

        title: { type: String, required: true, trim: true },
        subtitle: { type: String, required: true, default: "" },

        subdomain: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        featuredAvatar: { type: Boolean, default: false },

        enableCommunityOnboarding: { type: Boolean, default: false },
        enableProfessionalConnect: { type: Boolean, default: false },
        enableFriendConnect: { type: Boolean, default: false },
        communityName: { type: String, default: "Community", trim: true },

        primaryBrandColor: { type: String, default: "", trim: true },
        secondaryBrandColor: { type: String, default: "", trim: true },

        widgetLauncher: {
            type: WidgetLauncherSchema,
            default: () => ({}),
        },

        enableQuiz: { type: Boolean, default: false },
        quizName: { type: String, default: "Take quiz/survey", trim: true },

        enableProducts: { type: Boolean, default: false },
        enableBooking: { type: Boolean, default: false },
        enableBlogs: { type: Boolean, default: false },
        enableLinks: { type: Boolean, default: true },
        enableJobs: { type: Boolean, default: false },

        services: { type: [BrandServiceSchema], default: [] },

        supportChannels: {
            type: SupportChannelsSchema,
            default: () => ({}),
        },

        enableAdminMessages: { type: Boolean, default: false },

        admins: { type: [String], default: [] },

        /** Optional: original Sanity document `_id` — not in Studio schema; useful for migration only */
        sanityId: { type: String, default: "", trim: true, index: true },
    },
    { timestamps: true, collection: "brands" }
);

BrandSchema.index({ subdomain: 1 }, { unique: true });
BrandSchema.index({ featuredAvatar: 1 });
BrandSchema.index({ "widgetLauncher.whatsappPhoneNumberId": 1 });
BrandSchema.index({ "widgetLauncher.whatsappCloudPhoneNumberId": 1 });
BrandSchema.index({ "services._key": 1 });
BrandSchema.index({ "services.name": 1 });

const Brand =
    mongoose.models.Brand || mongoose.model("Brand", BrandSchema);

module.exports = Brand;