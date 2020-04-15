import * as Iopa from 'iopa';
export interface DialogCapability {
    dialogs: {
        [key: string]: Dialog;
    };
    beginDialog(name: string, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
}
declare class Dialog {
    name: string;
    steps: DialogStep[];
    constructor(name: any, steps: any);
}
declare type DialogStep = string[] | Iopa.FC;
export default class DialogManager {
    app: any;
    dialogs: {
        [key: string]: Dialog;
    };
    constructor(app: any);
    invoke(context: any, next: any): any;
    private _matchBeginDialog;
    private _continueDialog;
}
export {};
