import './polyfill/array';
import 'whatwg-url';
import * as Iopa from 'iopa';
import { ReactiveDialogsCapability } from './middleware/reactive-dialogs-manager';
import { default as Skill } from './schema/skill';
export interface SkillsCapability {
    /** debugging is verbose for this skill */
    verbose: boolean;
    /**  session timeout in milliseconds, 0 to disable */
    timeout: 300000;
    /** map of skill names to skills */
    skills: {
        [key: string]: Skill;
    };
    /** add a new skill with given name and return it */
    add(name: any): Skill;
    /** get the skill with the given name */
    skill(name: any): Skill | undefined;
}
export interface AppBotExtensions {
    /** register a new intent handler for the default skill  */
    intent(intentName: string, func: Iopa.FC): Skill;
    intent(intentName: string, schema: any, func?: Iopa.FC): Skill;
    intent(intentName: string, schema: any | Iopa.FC, func?: Iopa.FC): Skill;
    /** register a new dictionary for the default skill  */
    dictionary(dictionary: {
        [key: string]: string[];
    }): Skill;
    /** register a new skill  */
    skill(name: string): Skill;
    /** @deprecated add a v1 dialog;  use reactivedialogs.use() going forward */
    dialog(name: string, ...args: any[]): any;
    /** shortcut access to reactivedialogs capability */
    reactivedialogs: ReactiveDialogsCapability;
}
export interface DialogApp extends Iopa.App, AppBotExtensions {
}
declare const IopaBotFramework: {
    (this: any, app: Iopa.App): void;
    connectors: {
        [key: string]: (app: any) => any;
    };
};
export default IopaBotFramework;
