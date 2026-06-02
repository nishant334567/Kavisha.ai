const mongoose = require("mongoose");

const WidgetLauncherSchema = new mongoose.Schema(
    {
        buttonImageUrl: { type: String, default: "" },
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
        _key: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        initialMessage: { type: String, default: "" },
        title: { type: String, required: true, trim: true },
        about: { type: String, default: "" },
        behaviour: { type: String, default: "" },
        rules: { type: String, default: "" },
        /** "chat" (default) = lead-journey; "collect-data" = /api/collect-data intake */
        type: { type: String, default: "chat", trim: true },
        collectQuestions: {
            type: [String],
            default: [],
            validate: {
                validator: (v) => !Array.isArray(v) || v.length <= 20,
                message: "Maximum 20 collect questions allowed.",
            },
        },
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

        logoUrl: { type: String, default: "" },
        brandImageUrl: { type: String, default: "" },

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
        paymentQrUrl: { type: String, default: "" },

        title: { type: String, default: "", trim: true },
        subtitle: { type: String, default: "", trim: true },

        subdomain: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        featuredAvatar: { type: Boolean, default: false },
        /** When false, hidden from /talk-to-avatar. Omitted/true = visible (legacy brands). */
        talkToAvatarPublished: { type: Boolean, default: true },

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
        shopifyShopUrl: { type: String, default: "", trim: true },
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