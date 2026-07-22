export interface PortfolioAsset {
  id: string;
  type: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  summary?: string;
  meta?: unknown;
}

export interface PortfolioUrlContext {
  resolveEmbedUrl: (url: string) => string;
  resolveWebAssetUrl: (url: string) => string;
  basePath?: string;
}

export interface PortfolioSectionAnchor {
  key: string;
  title: string;
  emoji: string;
  count: number;
  href: string;
}

export const PORTFOLIO_TYPE_SECTIONS: Array<{
  key: string;
  types: readonly string[];
  title: string;
  emoji: string;
}>;

export const TYPE_LAYOUT_OPTION: string;
export const PORTFOLIO_SELECTABLE_TYPES: readonly string[];

export function parseMeta(raw: unknown): Record<string, unknown>;
export function isTypeClassificationLayout(cardLayout: string): boolean;
export function groupPortfolioAssetsByType(chosen: PortfolioAsset[]): Array<{
  key: string;
  types: readonly string[];
  title: string;
  emoji: string;
  items: PortfolioAsset[];
}>;
export function createDefaultUrlContext(basePath?: string): PortfolioUrlContext;
export function buildPortfolioWorksInnerHtml(
  chosen: PortfolioAsset[],
  cardLayout: string | undefined,
  ctx: PortfolioUrlContext,
): string;
export function applyDeterministicPortfolioWorks(
  html: string,
  chosen: PortfolioAsset[],
  cardLayout?: string,
  urlCtx?: PortfolioUrlContext,
): string;
export function buildPortfolioSectionAnchors(chosen: PortfolioAsset[]): PortfolioSectionAnchor[];
export function buildPortfolioNavPromptLines(chosen: PortfolioAsset[]): string;
export function rewritePortfolioCoverLinks(html: string, chosen: PortfolioAsset[]): string;
export function injectPortfolioAnchorNavScript(html: string, chosen: PortfolioAsset[]): string;
export function finalizePortfolioNavigation(html: string, chosen: PortfolioAsset[]): string;
export function buildDeterministicPortfolioShell(displayName: string, chosen: PortfolioAsset[]): string;
export function buildFullPortfolioHtml(
  chosen: PortfolioAsset[],
  cardLayout: string | undefined,
  displayName: string,
  urlCtx?: PortfolioUrlContext,
): string;

declare const module: {
  exports: {
    PORTFOLIO_TYPE_SECTIONS: typeof PORTFOLIO_TYPE_SECTIONS;
    TYPE_LAYOUT_OPTION: typeof TYPE_LAYOUT_OPTION;
    PORTFOLIO_SELECTABLE_TYPES: typeof PORTFOLIO_SELECTABLE_TYPES;
    parseMeta: typeof parseMeta;
    isTypeClassificationLayout: typeof isTypeClassificationLayout;
    groupPortfolioAssetsByType: typeof groupPortfolioAssetsByType;
    createDefaultUrlContext: typeof createDefaultUrlContext;
    buildPortfolioWorksInnerHtml: typeof buildPortfolioWorksInnerHtml;
    applyDeterministicPortfolioWorks: typeof applyDeterministicPortfolioWorks;
    buildPortfolioSectionAnchors: typeof buildPortfolioSectionAnchors;
    buildPortfolioNavPromptLines: typeof buildPortfolioNavPromptLines;
    rewritePortfolioCoverLinks: typeof rewritePortfolioCoverLinks;
    injectPortfolioAnchorNavScript: typeof injectPortfolioAnchorNavScript;
    finalizePortfolioNavigation: typeof finalizePortfolioNavigation;
    buildDeterministicPortfolioShell: typeof buildDeterministicPortfolioShell;
    buildFullPortfolioHtml: typeof buildFullPortfolioHtml;
  };
};

export = module.exports;
