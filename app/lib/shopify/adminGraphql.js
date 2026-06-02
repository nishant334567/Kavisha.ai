import { getShopify } from "@/app/lib/shopify";
import { gidToNumericId, productGid } from "@/app/lib/shopify/gids";

const SHOP_INFO = `#graphql
  query ShopInfo {
    shop {
      name
      primaryDomain {
        host
        url
      }
    }
  }
`;

const PRODUCT_LIST = `#graphql
  query ProductsPage($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        featuredImage { url }
        variants(first: 1) {
          nodes { price }
        }
      }
    }
  }
`;

const PRODUCT_DETAIL = `#graphql
  query ProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      status
      tags
      featuredImage { url }
      options { name values }
      variants(first: 100) {
        nodes {
          id
          title
          price
          compareAtPrice
          sku
          inventoryQuantity
          inventoryPolicy
          selectedOptions { name value }
          inventoryItem { tracked }
        }
      }
    }
  }
`;

const PRODUCTS_COUNT = `#graphql
  query ProductsCount {
    productsCount { count }
  }
`;

async function request(session, query, variables) {
  const client = new getShopify().clients.Graphql({ session });
  const { data } = await client.request(
    query,
    variables ? { variables } : undefined
  );
  return data;
}

export async function fetchShopInfo(session) {
  const data = await request(session, SHOP_INFO);
  const shop = data?.shop;
  return {
    name: typeof shop?.name === "string" ? shop.name : "",
    primaryDomainHost:
      typeof shop?.primaryDomain?.host === "string" ? shop.primaryDomain.host : "",
    primaryDomainUrl:
      typeof shop?.primaryDomain?.url === "string" ? shop.primaryDomain.url : "",
  };
}

function mapListProduct(node) {
  if (!node) return null;
  const v = node.variants?.nodes?.[0];
  return {
    id: gidToNumericId(node.id),
    title: node.title,
    handle: node.handle,
    status: String(node.status || "").toLowerCase(),
    vendor: node.vendor || "",
    product_type: node.productType || "",
    image: node.featuredImage?.url ? { src: node.featuredImage.url } : undefined,
    variants: v ? [{ price: v.price }] : [],
  };
}

function mapDetailProduct(node) {
  if (!node) return null;

  const variants = (node.variants?.nodes || []).map((v) => {
    const row = {
      id: gidToNumericId(v.id),
      title: v.title,
      price: v.price,
      compare_at_price: v.compareAtPrice ?? null,
      sku: v.sku ?? "",
      inventory_quantity: v.inventoryQuantity,
      inventory_policy: String(v.inventoryPolicy || "").toLowerCase(),
      inventory_management: v.inventoryItem?.tracked ? "shopify" : null,
    };
    (v.selectedOptions || []).forEach((opt, j) => {
      row[`option${j + 1}`] = opt.value;
    });
    if (!row.option1) row.option1 = v.title;
    return row;
  });

  return {
    id: gidToNumericId(node.id),
    admin_graphql_api_id: node.id,
    title: node.title,
    handle: node.handle,
    body_html: node.descriptionHtml || "",
    vendor: node.vendor || "",
    product_type: node.productType || "",
    status: String(node.status || "").toLowerCase(),
    tags: Array.isArray(node.tags) ? node.tags.join(", ") : "",
    image: node.featuredImage?.url ? { src: node.featuredImage.url } : undefined,
    options: (node.options || []).map((o) => ({ name: o.name, values: o.values })),
    variants,
  };
}

export async function fetchProduct(session, productId) {
  const data = await request(session, PRODUCT_DETAIL, {
    id: productGid(productId),
  });
  return mapDetailProduct(data?.product);
}

export async function fetchAllProducts(session) {
  const products = [];
  let after = null;

  do {
    const data = await request(session, PRODUCT_LIST, {
      first: 250,
      after,
    });
    const page = data?.products;
    for (const node of page?.nodes || []) {
      const row = mapListProduct(node);
      if (row) products.push(row);
    }
    after = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return products;
}

export async function fetchProductCount(session) {
  const data = await request(session, PRODUCTS_COUNT);
  return Number(data?.productsCount?.count) || 0;
}
