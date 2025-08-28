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
      name: "header",
      title: "Header Text",
      type: "string",
      description: "The main header text to display",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "logo",
      title: "Logo",
      type: "image",
      description: "Upload the brand logo",
      options: {
        hotspot: true,
      },
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
