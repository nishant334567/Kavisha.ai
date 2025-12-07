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
        "The text for the login button (e.g., 'Talk to me now, Talk to us now')",
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
      name: "paymentQr",
      title: "QR to receive payment",
      type: "image",
      description:
        "Upload the QR where you can receive payment in you bank account",
      options: {
        hotspot: true,
      },
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
      name: "enableCommunityOnboarding",
      title: "Enable Community Onboarding",
      type: "boolean",
      description:
        "Toggle to enable community onboarding options (job seeker, recruiter, friends)",
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
            },
            {
              name: "title",
              title: "Service Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "prompt",
              title: "Service Prompt",
              type: "text",
              rows: 25,
              description: "AI prompt or description for this service",
              validation: (Rule) => Rule.required(),
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
