import { urlFor } from "@/app/lib/sanity";

/** Resolve a Sanity image field to a CDN URL (logo, brandImage, widget launcher, etc.). */
export function getSanityImageUrl(image, opts = {}) {
  if (!image?.asset?._ref || !urlFor) return null;
  try {
    let builder = urlFor(image);
    if (opts.width) builder = builder.width(opts.width);
    if (opts.height) builder = builder.height(opts.height);
    if (opts.fit) builder = builder.fit(opts.fit);
    if (opts.auto) builder = builder.auto(opts.auto);
    return builder.url() || null;
  } catch {
    return null;
  }
}
