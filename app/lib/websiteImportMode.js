/** @typedef {'generic' | 'blog' | 'ecommerce'} WebsiteImportMode */

/**
 * @param {string} [mode]
 * @returns {WebsiteImportMode}
 */
export function normalizeWebsiteImportMode(mode) {
  if (mode === "blog") return "blog";
  if (mode === "ecommerce") return "ecommerce";
  return "generic";
}

/** @param {WebsiteImportMode} mode */
export function isWebsiteImportMode(mode) {
  return mode === "generic" || mode === "blog" || mode === "ecommerce";
}

/** @param {WebsiteImportMode} mode */
export function websiteImportModeLabel(mode) {
  if (mode === "blog") return "Blog";
  if (mode === "ecommerce") return "E-commerce";
  return "Website";
}

/** Dialog title for link picker */
export function websitePagesDialogTitle(mode) {
  if (mode === "blog") return "Blog pages";
  if (mode === "ecommerce") return "Product pages";
  return "Website pages";
}
