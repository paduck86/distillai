import type { Request, Response, NextFunction } from 'express';
import * as cheerio from 'cheerio';
import { ValidationError } from '../middleware/error.middleware.js';

interface BookmarkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  domain: string;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(base: string, relative: string | null | undefined): string | null {
  if (!relative) return null;

  try {
    // If already absolute URL
    if (relative.startsWith('http://') || relative.startsWith('https://')) {
      return relative;
    }

    // If protocol-relative URL
    if (relative.startsWith('//')) {
      return `https:${relative}`;
    }

    // Resolve relative URL
    const baseUrl = new URL(base);
    return new URL(relative, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Find favicon from HTML
 */
function findFavicon($: cheerio.Root, baseUrl: string): string | null {
  // Try various favicon selectors in priority order
  const faviconSelectors = [
    'link[rel="icon"][type="image/png"]',
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="icon"]',
  ];

  for (const selector of faviconSelectors) {
    const href = $(selector).attr('href');
    if (href) {
      return resolveUrl(baseUrl, href);
    }
  }

  // Default favicon path
  try {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch {
    return null;
  }
}

/**
 * GET /api/bookmark/preview
 * Fetch URL metadata for bookmark preview
 */
export async function getBookmarkPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required');
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    console.log(`Fetching bookmark preview for: ${url}`);

    // Fetch the webpage with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new ValidationError(`Failed to fetch URL: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        // Not HTML, return basic info
        const preview: BookmarkPreview = {
          url,
          title: url,
          description: null,
          image: null,
          favicon: null,
          siteName: null,
          domain: extractDomain(url),
        };
        return res.json({ data: preview });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata using Open Graph, Twitter Cards, and standard meta tags
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text().trim() ||
        null;

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        null;

      const image = resolveUrl(url,
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[name="twitter:image:src"]').attr('content')
      );

      const siteName =
        $('meta[property="og:site_name"]').attr('content') ||
        null;

      const favicon = findFavicon($, url);

      const preview: BookmarkPreview = {
        url,
        title: title ? title.slice(0, 200) : extractDomain(url),
        description: description ? description.slice(0, 500) : null,
        image,
        favicon,
        siteName,
        domain: extractDomain(url),
      };

      res.json({ data: preview });
    } catch (fetchError) {
      clearTimeout(timeout);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new ValidationError('Request timeout: URL took too long to respond');
      }
      throw fetchError;
    }
  } catch (error) {
    next(error);
  }
}
