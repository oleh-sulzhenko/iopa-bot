import * as Iopa from 'iopa';
interface Intent {
    name: string;
    function: Iopa.FC;
    schema?: any;
}
export default class Skill {
    /** unique short name of the skill */
    name: string;
    /** things to say  */
    messages: {
        [key: string]: string;
    };
    /** use a minimal set of utterances or the full cartesian product?  */
    exhaustiveUtterances: boolean;
    /**  A mapping of keywords to arrays of possible values, for expansion of sample utterances */
    dictionaries: {
        [key: string]: string[];
    };
    /**  The itents that this skill can process */
    intents: {
        [key: string]: Intent;
    };
    /**  global skills are always used in parsing;  non-global only parsed when launched */
    private _global;
    isGlobal(): boolean;
    constructor(name: any);
    /** global skills are always used in parsing;  non-global only parsed when launched */
    global(flag: boolean): this;
    lookupIntent(utterances: string[]): string | undefined;
    /** register a new intent handler for this skill  */
    intent(intentName: string, func: Iopa.FC): this;
    intent(intentName: string, schema: any, func?: Iopa.FC): this;
    /** register a new dictionary for this skill  */
    dictionary(dictionary: {
        [key: string]: string[];
    }): this;
    /** @deprecated For alexa-app compatiabilty, just register Intent handler of "urn:io.iopa.bot:launch" */
    launch(func: Iopa.FC): this;
    /** @deprecated For alexa-app compatiabilty,ust register Intent handler of "urn:io.iopa.bot:sessionended" */
    sessionEnded(func: Iopa.FC): this;
    /** Export Helper Function to extract the schema and generate a schema JSON object */
    schema(): string;
    /** Export Helper Function to generate a list of sample utterances */
    utterances(): string;
}
export {};
