// sanity/schemaTypes/brand.js
export default {
  name: "brand",
  title: "Brand",
  type: "document",
  fields: [
    {
      name: "brandName",
      title: "Brand Name",
      type: "string",
      description: "The name of the brand (e.g., Kavisha, Amazon)",
      validation: (Rule) => Rule.required(),
    },

    {
      name: "loginButtonText",
      title: "Login Button Text",
      type: "string",
      description:
        "The text for the login button (e.g., 'Talk to me', 'Talk to us now')",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "logo",
      title: "Brand Logo",
      type: "image",
      description: "Upload the brand logo (for navbar)",
      options: {
        hotspot: true,
      },
    },
    {
      name: "brandImage",
      title: "Brand Hero Image",
      type: "image",
      description: "Upload the main brand hero image (for login/landing page)",
      options: {
        hotspot: true,
      },
    },
    {
      name: "clientWidgetUrl",
      title: "Website URL for Widget",
      type: "url",
      description: "Paste the website URL where the widget will be embedded.",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
    },
    {
      name: "brandHeroZoom",
      title: "Hero zoom (homepage)",
      type: "number",
      description:
        "1 = fill the hero frame (default). Higher zooms in (tighter crop). Used with the 3:1 hero on the public avatar page.",
      initialValue: 1,
      validation: (Rule) => Rule.min(1).max(3),
    },
    {
      name: "brandHeroFocusY",
      title: "Hero vertical focus (%)",
      type: "number",
      description:
        "0 = top of photo, 50 = center, 100 = bottom. Shifts which part of the image stays visible when cropped.",
      initialValue: 50,
      validation: (Rule) => Rule.min(0).max(100).integer(),
    },
    {
      name: "brandHeroFocusX",
      title: "Hero horizontal focus (%)",
      type: "number",
      description:
        "0 = left, 50 = center, 100 = right. Shifts horizontal crop for tall portraits.",
      initialValue: 50,
      validation: (Rule) => Rule.min(0).max(100).integer(),
    },
    {
      name: "acceptPayment",
      title: "Accept Payment for Personal Calls",
      type: "boolean",
      description:
        "Toggle to enable payment requirement for personal one-on-one calls. When enabled, users will be asked to pay before scheduling a call.",
      initialValue: false,
    },
    {
      name: "paymentQr",
      title: "QR to receive payment",
      type: "image",
      description:
        "Upload the QR where you can receive payment in you bank account",
      options: {
        hotspot: true,
      },
      hidden: ({ parent }) => !parent?.acceptPayment,
    },
    {
      name: "title",
      title: "Main Title",
      type: "string",
      description:
        "Main title text for the landing page (e.g., 'Transform your Automobile Merchandising')",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "subtitle",
      title: "Subtitle/Description",
      type: "text",
      rows: 4,
      description:
        "Subtitle or description text for the landing page (can be long)",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "subdomain",
      title: "Subdomain",
      type: "string",
      description: "The subdomain this brand is for (e.g., spyne, kavisha)",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "featuredAvatar",
      title: "Featured on homepage",
      type: "boolean",
      description: "Show this avatar in the featured section on the Kavisha homepage",
      initialValue: false,
    },
    {
      name: "enableCommunityOnboarding",
      title: "Enable Community Onboarding",
      type: "boolean",
      description:
        "Toggle to enable community onboarding options (job seeker, recruiter, friends)",
      initialValue: false,
    },
    {
      name: "enableProfessionalConnect",
      title: "Enable Professional Connect",
      type: "boolean",
      description: "Show Hire People and Find Jobs buttons in community",
      initialValue: false,
    },
    {
      name: "enableFriendConnect",
      title: "Enable Friend Connect",
      type: "boolean",
      description: "Show Find Friends button in community",
      initialValue: false,
    },
    {
      name: "communityName",
      title: "Community Name",
      type: "string",
      description: "Name/label for the community feature (e.g., 'My Community', 'Connect')",
      initialValue: "Community",
      hidden: ({ parent }) => !parent?.enableCommunityOnboarding,
    },
    {
      name: "primaryBrandColor",
      title: "Primary brand color (widget)",
      type: "string",
      description:
        "Optional hex (e.g. #2d545e). Embed widget launcher and primary actions. Leave empty for default teal (highlight) styling.",
    },
    {
      name: "secondaryBrandColor",
      title: "Secondary brand color (legacy)",
      type: "string",
      description:
        "Deprecated for the widget; saving widget colors clears this. Optional fallback in older data only.",
    },
    {
      name: "communityColorsMatchWidget",
      title: "Community colors match widget",
      type: "boolean",
      description:
        "When enabled, Community uses the same primary/secondary colors as the widget. Turn off to set separate community colors in My Services.",
      initialValue: true,
    },
    {
      name: "communityPrimaryBrandColor",
      title: "Community primary color (override)",
      type: "string",
      description:
        "Only used when Community colors are set independently from the widget. Optional hex for Community title, buttons, sidebar New, etc.",
    },
    {
      name: "communitySecondaryBrandColor",
      title: "Community secondary color (override)",
      type: "string",
      description:
        "Only used when Community colors differ from the widget. Optional hex for tags and card accents on Community.",
    },
    {
      name: "widgetLauncher",
      title: "Embed widget (floating button)",
      type: "object",
      description:
        "Controls the closed-state chat launcher on sites that embed the Kavisha widget (bottom-right).",
      options: {
        collapsible: true,
        collapsed: false,
      },
      fields: [
        {
          name: "buttonImage",
          title: "Button image / logo",
          type: "image",
          description:
            "Optional. Replaces the default chat bubble icon. Use a square or near-square image (about 96–128px) for best results.",
          options: {
            hotspot: true,
          },
        },
        {
          name: "enableAttentionAnimation",
          title: "Subtle attention animation",
          type: "boolean",
          description:
            "When enabled, the floating button plays a gentle periodic shake so visitors notice it.",
          initialValue: false,
        },
        {
          name: "chatbotWidgetHeader",
          title: "Chatbot widget header",
          type: "string",
          description:
            "Title in the top bar when the embed chat is open. Leave empty to use the default “{Brand}'s AI Chat” title.",
        },
        {
          name: "copyReadMoreUrl",
          title: "“Read more” URL for copy to clipboard",
          type: "url",
          description:
            "If set, copied assistant replies begin with: To read more, visit [this URL]. Use your public site (e.g. https://entrackr.com). Applies to main chat and embed widget.",
        },
      ],
    },
    {
      name: "supportChannel",
      title: "Support channel",
      type: "object",
      description:
        "Shown to visitors who need help (e.g. after being blocked from the avatar). Use an email and/or a Slack link for unblock or support requests.",
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        {
          name: "email",
          title: "Support email",
          type: "string",
          description:
            "Optional. Address users can write to for unblock requests or other support.",
        },
        {
          name: "slackUrl",
          title: "Slack URL",
          type: "url",
          description:
            "Optional. Link to a Slack channel or workflow (https) for support or unblock requests.",
        },
      ],
    },
    {
      name: "enableQuiz",
      title: "Enable Quiz/Survey",
      type: "boolean",
      description:
        "Toggle to enable quiz and survey functionality",
      initialValue: false,
    },
    {
      name: "quizName",
      title: "Quiz/Survey Name",
      type: "string",
      description: "Name/label for the quiz/survey feature (e.g., 'My Quizzes', 'Assessments')",
      initialValue: "Take quiz/survey",
      hidden: ({ parent }) => !parent?.enableQuiz,
    },
    {
      name: "enableProducts",
      title: "Enable Products",
      type: "boolean",
      description: "Toggle to enable products, cart, and order history for users",
      initialValue: false,
    },
    {
      name: "enableBooking",
      title: "Enable Booking / Bookable Services",
      type: "boolean",
      description: "When enabled, users can see and use the bookable services (Services list and Booking history). Admins can manage booking services and orders.",
      initialValue: false,
    },
    {
      name: "enableBlogs",
      title: "Enable Blog",
      type: "boolean",
      description: "When enabled, users can see the blog (list and posts). Admins can create, edit, and manage blog posts.",
      initialValue: false,
    },
    {
      name: "enableLinks",
      title: "Enable Links",
      type: "boolean",
      description:
        "When enabled, users see the Links page and navigation. Admins can manage the link tree in Admin → Links.",
      initialValue: true,
    },
    {
      name: "enableJobs",
      title: "Enable Jobs",
      type: "boolean",
      description:
        "When enabled, users can browse jobs and apply. Admins can create and manage job listings.",
      initialValue: false,
    },
    {
      name: "services",
      title: "Services",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "name",
              title: "Service Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "initialMessage",
              title: "ChatBot Initial Message",
              type: "string",
              validation: (Rule) => Rule.required(),
              description:
                "First assistant message in chat (saved to history). On the embed widget, it types out letter-by-letter once when a new chat is created.",
            },
            {
              name: "title",
              title: "Service Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "about",
              title: "About You",
              type: "text",
              rows: 25,
              description: "Introduction",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "behaviour",
              title: "AI Chatbot behaviour",
              type: "text",
              rows: 25,
              description: "How this chat bot should behave.",
              // validation: (Rule) => Rule.required(),
            },
            {
              name: "rules",
              title: "Rules, restrictions and guideline for your AI chatbot.",
              type: "text",
              rows: 25,
              description: "Does and dont's for the chatbot ",
              // validation: (Rule) => Rule.required(),
            },
            {
              name: "logo",
              title: "Service Logo",
              type: "image",
              description: "Logo/icon for this service",
              options: {
                hotspot: true,
              },
            },
            {
              name: "introquestions",
              title: "Initial Questions",
              type: "array",
              of: [{ type: "string" }],
              validation: (Rule) => Rule.max(5).error("Maximum 5 initial questions allowed."),
            },
          ],
          preview: {
            select: {
              title: "name",
              subtitle: "title",
              media: "logo",
            },
          },
        },
      ],
    },

    {
      name: "enableAdminMessages",
      title: "Enable admin messages (embed widget)",
      type: "boolean",
      description:
        "When on, signed-in users see the Messages button in the embed widget to DM your team (uses Admins emails below). When off, that entry point is hidden.",
      initialValue: false,
    },
    {
      name: "admins",
      title: "Admins",
      type: "array",
      of: [{ type: "string" }],
    },
  ],
  preview: {
    select: {
      title: "brandName",
      subtitle: "subdomain",
      media: "logo",
    },
  },
};
