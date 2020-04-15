import * as Iopa from 'iopa';
interface Intent {
    name: string;
    function: Iopa.FC;
    schema?: any;
}
export default class Skill {
    name: string;
    messages: {
        [key: string]: string;
    };
    exhaustiveUtterances: boolean;
    dictionaries: {
        [key: string]: string[];
    };
    intents: {
        [key: string]: Intent;
    };
    private _global;
    isGlobal(): boolean;
    constructor(name: any);
    global(flag: boolean): this;
    lookupIntent(utterances: string[]): string | undefined;
    intent(intentName: string, func: Iopa.FC): this;
    intent(intentName: string, schema: any, func?: Iopa.FC): this;
    dictionary(dictionary: {
        [key: string]: string[];
    }): this;
    launch(func: Iopa.FC): this;
    sessionEnded(func: Iopa.FC): this;
    schema(): string;
    utterances(): string;
}
export {};
