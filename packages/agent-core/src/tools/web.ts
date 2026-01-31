/**
 * @fileoverview Web tools for searching and fetching web content
 * @module @ue-bot/agent-core/tools/web
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import type { ToolContext } from '../types';
import { BaseTool } from './base-tool';

/**
 * Maximum content size to return
 */
const MAX_CONTENT_SIZE = 50000; // 50KB

/**
 * User agent for web requests
 */
const USER_AGENT =
  'Mozilla/5.0 (compatible; UE-Bot/1.0; +https://github.com/DuongThanhTaii/UE-Bot)';

// ============================================================================
// Web Search Tool
// ============================================================================

/**
 * Tool for searching the web using Brave Search API
 */
export class WebSearchTool extends BaseTool {
  name = 'web_search';
  group = 'web' as const;
  description =
    'Search the web for information. Returns relevant search results with titles, URLs, and snippets.';

  parameters = z.object({
    query: z.string().describe('Search query'),
    count: z.number().int().min(1).max(20).default(5).describe('Number of results to return'),
    freshness: z
      .enum(['day', 'week', 'month', 'year'])
      .optional()
      .describe('Filter results by freshness'),
  });

  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env['BRAVE_SEARCH_API_KEY'];
  }

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<SearchResults> {
    if (!this.apiKey) {
      throw new Error('Brave Search API key not configured');
    }

    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', params.query);
    url.searchParams.set('count', params.count.toString());
    if (params.freshness) {
      url.searchParams.set('freshness', params.freshness);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as BraveSearchResponse;

    const results: SearchResult[] = (data.web?.results || []).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      publishedDate: result.age,
    }));

    return {
      query: params.query,
      results,
      total: results.length,
    };
  }
}

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
    }>;
  };
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

interface SearchResults {
  query: string;
  results: SearchResult[];
  total: number;
}

// ============================================================================
// Web Fetch Tool
// ============================================================================

/**
 * Tool for fetching and extracting content from web pages
 */
export class WebFetchTool extends BaseTool {
  name = 'web_fetch';
  group = 'web' as const;
  description =
    'Fetch a web page and extract its main content. Useful for reading articles, documentation, etc.';

  parameters = z.object({
    url: z.string().url().describe('URL to fetch'),
    selector: z.string().optional().describe('Optional CSS selector to extract specific content'),
    includeLinks: z.boolean().default(false).describe('Include links found in the content'),
    raw: z.boolean().default(false).describe('Return raw HTML instead of extracted text'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<FetchResult> {
    const response = await fetch(params.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML
    const dom = new JSDOM(html, { url: params.url });
    const document = dom.window.document;

    // Get title
    const title = document.title || '';

    // If raw mode, return HTML
    if (params.raw) {
      return {
        url: params.url,
        title,
        content: html.slice(0, MAX_CONTENT_SIZE),
        contentType: 'html',
      };
    }

    // If selector specified, extract that element
    if (params.selector) {
      const element = document.querySelector(params.selector);
      if (!element) {
        throw new Error(`Selector "${params.selector}" not found`);
      }

      const content = element.textContent?.trim() || '';
      return {
        url: params.url,
        title,
        content: content.slice(0, MAX_CONTENT_SIZE),
        contentType: 'text',
      };
    }

    // Use Readability to extract main content
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      // Fallback to body text
      const bodyText = document.body?.textContent?.trim() || '';
      return {
        url: params.url,
        title,
        content: bodyText.slice(0, MAX_CONTENT_SIZE),
        contentType: 'text',
      };
    }

    const result: FetchResult = {
      url: params.url,
      title: article.title || title,
      content: article.textContent.slice(0, MAX_CONTENT_SIZE),
      contentType: 'article',
      byline: article.byline || undefined,
      excerpt: article.excerpt || undefined,
    };

    // Extract links if requested
    if (params.includeLinks) {
      const links: Array<{ text: string; href: string }> = [];
      const anchors = document.querySelectorAll('a[href]');

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute('href');
        const text = anchor.textContent?.trim();

        if (href && text && href.startsWith('http')) {
          links.push({ text, href });
        }
      });

      result.links = links.slice(0, 50); // Limit links
    }

    return result;
  }
}

interface FetchResult {
  url: string;
  title: string;
  content: string;
  contentType: 'html' | 'text' | 'article';
  byline?: string;
  excerpt?: string;
  links?: Array<{ text: string; href: string }>;
}

// ============================================================================
// Screenshot Tool (placeholder - needs puppeteer)
// ============================================================================

/**
 * Tool for taking screenshots of web pages
 * Note: Requires puppeteer to be installed separately
 */
export class ScreenshotTool extends BaseTool {
  name = 'screenshot';
  group = 'web' as const;
  description = 'Take a screenshot of a web page (not implemented - requires puppeteer).';

  parameters = z.object({
    url: z.string().url().describe('URL to screenshot'),
    width: z.number().int().positive().default(1280).describe('Viewport width'),
    height: z.number().int().positive().default(720).describe('Viewport height'),
    fullPage: z.boolean().default(false).describe('Capture full scrollable page'),
  });

  protected async execute(
    _params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<never> {
    throw new Error(
      'Screenshot tool is not implemented. Install puppeteer and implement this tool.'
    );
  }
}

// ============================================================================
// API Request Tool
// ============================================================================

/**
 * Tool for making HTTP API requests
 */
export class ApiRequestTool extends BaseTool {
  name = 'api_request';
  group = 'web' as const;
  description = 'Make an HTTP request to an API endpoint.';

  parameters = z.object({
    url: z.string().url().describe('URL to request'),
    method: z
      .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      .default('GET')
      .describe('HTTP method'),
    headers: z.record(z.string()).optional().describe('Request headers'),
    body: z.string().optional().describe('Request body (for POST/PUT/PATCH)'),
    timeout: z.number().int().positive().default(30000).describe('Request timeout in milliseconds'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeout);

    // Use context abort signal if available
    if (context.abortSignal) {
      context.abortSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(params.url, {
        method: params.method,
        headers: {
          'User-Agent': USER_AGENT,
          ...params.headers,
        },
        body: params.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Get response body
      const contentType = response.headers.get('content-type') || '';
      let data: unknown;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new Error(`Request timed out after ${params.timeout}ms`);
      }
      throw error;
    }
  }
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create all web tools
 * @param braveApiKey - Brave Search API key (optional, can use env var)
 */
export function createWebTools(braveApiKey?: string): BaseTool[] {
  return [
    new WebSearchTool(braveApiKey),
    new WebFetchTool(),
    new ApiRequestTool(),
    // Note: ScreenshotTool not included by default as it requires puppeteer
  ];
}
