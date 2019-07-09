import * as Iopa from 'iopa';
interface Db {
    get<T>(path: string): Promise<T | null>;
    put<T>(path: string, item: T): Promise<void>;
    delete(path: string): Promise<void>;
}
export interface Session {
    id: string;
    updated: number;
    [key: string]: any;
}
export interface SessionDbCapability {
    /** return item from session storage */
    get(id: string, timeout: number): Promise<Session>;
    /** put item into session storage */
    put(session: Partial<Session> & {
        id: string;
    }): any;
    /** delete item from session storage */
    delete(id: string): any;
    /** stop dialog manager and dispose resources */
    dispose(): any;
}
export default class SessionMiddleware implements Iopa.Component {
    app: Iopa.App | null;
    db: Db | null;
    constructor(app: Iopa.App);
    invoke(context: any, next: any): Promise<void>;
}
export {};
