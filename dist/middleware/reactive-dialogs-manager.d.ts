import { FlowElement, TableElement, DialogElement, ActionElement, CardElement, TextElement, ActionOpenUrlElement, Element, CustomElement, ActionSetElement } from 'reactive-dialogs';
import * as Iopa from 'iopa';
import Skill from '../schema/skill';
export declare type CommandHandler = (command: string, props: {
    [key: string]: any;
}, context: any) => Promise<boolean>;
export interface ReactiveDialogsCapability {
    use(jsx: ({}: {}) => FlowElement | TableElement, meta?: {
        [key: string]: string;
    }): void;
    render(element: Element, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    renderFlow(flowId: string | undefined | null, dialogId: string | undefined | null, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    end(context: Iopa.Context): Promise<void>;
    registerCommand(command: string, handler: CommandHandler): () => void;
    'iopa.Version': string;
    meta: {
        [key: string]: {
            [key: string]: string;
        };
    };
    lists: {
        [key: string]: string[];
    };
    tables: {
        [key: string]: {
            [key: string]: string | string[];
        };
    };
    localResourceProtocolMapper: (partial_url: string) => string;
}
export interface SessionCurrentDialog {
    id: string;
    iopaBotVersion: '2.0';
    lastDirective: number | null;
    previousId: string;
    lastPromptActions: ActionElement[] | null;
}
export interface ReactiveDialogsSession {
    'bot:CurrentDialog': SessionCurrentDialog | null;
    'bot:LastDialogEndedDate': number | null;
    'bot:NewSession': boolean;
    'bot:Skill': string;
    'bot:SkillVersion': string;
    'bot:Slots': string;
    'bot:Variables': any;
}
export declare const useReactiveDialogs: (context: Iopa.Context) => ReactiveDialogsCapability;
export declare const useBotSession: (context: Iopa.Context) => [ReactiveDialogsSession, (newState: any) => Promise<void>];
export default class ReactiveDialogManager {
    app: any;
    private flows;
    private flowsMeta;
    private tableLists;
    private tableMeta;
    private launchIntentsToFlows;
    private commandHandlers;
    private _localResourceProtocolMapper;
    constructor(app: any);
    invoke(context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    private _matchBeginFlow;
    private _continueFlow;
    protected proceedToNextDirective(context: Iopa.Context, flow: FlowElement, dialog: DialogElement, dialogSeqNo: number, lastDirective: number | null): Promise<void>;
    protected register(app: Iopa.App, jsx: ({}: {}) => FlowElement | TableElement, meta?: {
        [key: string]: string;
    }): void;
    protected registerDialogStep(dialog: DialogElement, skill: Skill): void;
    protected registerDialogFuction(fn: CustomElement, skill: Skill): void;
    protected registerDialogCard(card: CardElement, skill: Skill): void;
    protected registerDialogCardActions(actionset: ActionSetElement, skill: Skill): void;
    protected registerUtterances(name: any, utterances: string[], skill: Skill): string;
    protected render(element: Element, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    protected renderFlowById(id: string | null | undefined, dialogId: string | null | undefined, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    protected renderDialogStep(flow: FlowElement, dialog: DialogElement, context: any): Promise<void>;
    protected endFlow(context: Iopa.Context, props: any): Promise<void>;
    protected renderDirective(element: TextElement | CardElement | ActionElement | CustomElement, context: Iopa.Context): Promise<boolean>;
    protected renderText(element: TextElement, context: Iopa.Context): Promise<boolean>;
    protected renderCard(element: CardElement, context: Iopa.Context): Promise<boolean>;
    private saveActionsFromCard;
    protected renderAction(element: ActionElement, context: Iopa.Context): Promise<boolean>;
    protected renderActionOpenUrl(element: ActionOpenUrlElement, context: Iopa.Context): Promise<boolean>;
    protected renderActionDialogFlow(id: string, dialogId: string | undefined, element: ActionOpenUrlElement, context: Iopa.Context): Promise<boolean>;
    protected logStartOfDialog(context: Iopa.Context): void;
    protected logAbandondedDialog(context: Iopa.Context): void;
    protected logCompletedDialog(context: Iopa.Context): void;
    protected renderActionCommand(command: string, params: {
        [key: string]: any;
    }, element: ActionOpenUrlElement, context: Iopa.Context): Promise<boolean>;
}
export declare function getJsonFromUrl(url: any): {};
