import { client } from "../sanity";

export const brandQueries = {
  getBySubdomain: async (subdomain) => {
    return await client.fetch(
      `
      *[_type == "brand" && subdomain == $subdomain && isActive == true][0] {
        brandName,
        header,
        logo,
        subdomain,
        description
      }
    `,
      { subdomain }
    );
  },
};
