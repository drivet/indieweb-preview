import clone from "clone";
import {
  AuthorInfo,
  interpret_entry,
  parse_mf2,
  SimplifiedEntry,
} from "mf2utiljs";
import { unfurl } from "unfurl.js";

export type Metadata = Awaited<ReturnType<typeof unfurl>>;
export interface Image {
  url: string;
  alt?: string;
}
export interface SiteInfo {
  name?: string;
  url: string;
  icon?: string;
}
export interface Preview {
  indieweb: boolean;
  title?: string;
  description?: string;
  image?: Image;
  published?: string;
  author?: AuthorInfo;
  site?: SiteInfo;
}
export type { AuthorInfo };

interface MetadataAndMf2 {
  url: string;
  mf2?: SimplifiedEntry;
  metadata?: Metadata;
}

function truncate(str: string, chars: number, replace = "...") {
  const truncated = str.substring(0, chars);
  if (truncated.length === str.length) {
    return str;
  } else {
    const replaceLength = replace.length;
    return truncated.substring(0, chars - replaceLength) + replace;
  }
}

function extractSummary(meta: SimplifiedEntry) {
  if (meta.summary) {
    return meta.summary;
  } else if (meta["content-plain"]) {
    return truncate(meta["content-plain"], 500);
  }
}

function extractPicture(meta: SimplifiedEntry): Image | undefined {
  const url = meta?.featured || meta?.photo || undefined;
  if (url) {
    return {
      url,
      alt: "featured photo",
    };
  }
}

async function scrape(url: string): Promise<MetadataAndMf2 | null> {
  try {
    const parsed = await parse_mf2(url);
    const mf2 = await interpret_entry(parsed, url);
    const unfurled = await unfurl(url);

    const hasMf2 = mf2 && Object.keys(mf2).length > 0;
    const hasMeta = unfurled && Object.keys(unfurled).length > 0;
    if (hasMf2 || hasMeta) {
      return {
        url,
        mf2: hasMf2 ? mf2 : undefined,
        metadata: hasMeta ? unfurled : undefined,
      };
    } else {
      return null;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error scraping ${url}, ${JSON.stringify(error)}`);
    return null;
  }
}

function extractSiteInfo(url: string, md: Metadata): SiteInfo | undefined {
  const u = new URL(url);
  const name = md.open_graph?.site_name || md.twitter_card?.site || u.hostname;
  const siteUrl = u.origin;
  const icon = md.favicon;

  return {
    url: siteUrl,
    name,
    icon,
  };
}

export async function preview(url: string): Promise<Preview | null> {
  const scraped = clone(await scrape(url));
  if (!scraped) {
    return null;
  }

  if (scraped.mf2) {
    const mf2 = scraped.mf2;
    const mf2Data: Omit<Preview, 'indieweb' | 'site'> = {
      title: mf2.name,
      description: extractSummary(mf2),
      image: extractPicture(mf2),
      published: mf2.published,
      author: mf2.author,
    };

    if (mf2Data.title || mf2Data.description || mf2Data.image || 
        mf2Data.published || mf2Data.author) {
      return {
        indieweb: true,
        ...mf2Data,
        // microformats/indieweb doesn't define site info, so fall back to OG metadata
        site: scraped.metadata
          ? extractSiteInfo(url, scraped.metadata)
          : undefined,
      };
    }
  }

  if (!scraped.metadata) {
    return null;
  }

  const md = scraped.metadata;
  return {
    indieweb: false,
    title: md.open_graph?.title || md.twitter_card?.title || md.title,
    description:
      md.open_graph?.description ||
      md.twitter_card?.description ||
      md.description,
    image: (md.open_graph?.images || md.twitter_card?.images || [])[0],
    site: extractSiteInfo(url, md),
    author: md.open_graph?.article?.author
      ? { name: md.open_graph?.article?.author }
      : undefined,
  };
}
