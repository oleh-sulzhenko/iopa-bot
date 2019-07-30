interface URL {
    protocol: string;
    host: string;
    port: string | number;
    pathname: string;
    path: string;
    query: string;
    hash: string;
}
export declare function parse_url(url: any): URL;
export {};
