declare type D1Database = any;

declare type Fetcher = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

declare module "cloudflare:workers" {
  export const env: any;
}
