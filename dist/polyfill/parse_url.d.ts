interface URL {
    protocol: string;
    hostname: string;
    port: string | number;
    pathname: string;
    query: string;
    hash: string;
}
export declare function parse_url(url: any): URL;
export {};
