import './polyfill/array';
import * as Iopa from 'iopa';
import { ReactiveDialogsCapability } from './middleware/reactive-dialogs-manager';
import { default as Skill } from './schema/skill';
export interface SkillsCapability {
    verbose: boolean;
    timeout: 300000;
    skills: {
        [key: string]: Skill;
    };
    add(name: string): Skill;
    skill(name: string): Skill | undefined;
}
export interface AppBotExtensions {
    intent(intentName: string, func: Iopa.FC): Skill;
    intent(intentName: string, schema: any, func?: Iopa.FC): Skill;
    intent(intentName: string, schema: any | Iopa.FC, func?: Iopa.FC): Skill;
    dictionary(dictionary: {
        [key: string]: string[];
    }): Skill;
    skill(name: string): Skill;
    dialog(name: string, ...args: any[]): void;
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
