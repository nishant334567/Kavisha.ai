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
      name: "header",
      title: "Header Text",
      type: "string",
      description: "The main header text to display",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "initialmessage",
      title: "Initial Message",
      type: "string",
      description:
        "Optional first message the assistant sends when a new session is created",
    },
    {
      name: "subdomain",
      title: "Subdomain",
      type: "string",
      description: "The subdomain this brand is for (e.g., spyne, kavisha)",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "isActive",
      title: "Is Active",
      type: "boolean",
      description: "Whether this brand configuration is currently active",
      initialValue: true,
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      description: "Brief description of the brand",
    },
    {
      name: "brandData",
      title: "Brand Data",
      type: "text",
      rows: 30,
      description:
        "Detailed brand information, overview, services, business details, FAQs, and comprehensive context for AI chatbot (up to 5000 words recommended)",
      validation: (Rule) =>
        Rule.max(5000).warning(
          "Brand data should not exceed 5000 words for optimal chatbot performance"
        ),
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
