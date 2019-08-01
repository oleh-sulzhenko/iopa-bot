import { FlowElement, DialogElement, ActionElement, CardElement, TextElement, ActionOpenUrlElement, Element, CustomElement, ActionSetElement } from 'reactive-dialogs';
import * as Iopa from 'iopa';
import Skill from '../schema/skill';
export interface DialogCapability {
    beginDialog(name: string, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
}
/** Custom command handlers return true if should continue after, false to stop current flow */
export declare type CommandHandler = (command: string, props: {
    [key: string]: any;
}, context: Iopa.Context) => Promise<boolean>;
/** Reactive Dialogs Capability 'urn:io.iopa.bot:reactive-dialogs' */
export interface ReactiveDialogsCapability {
    /** register a reactives-dialog flow in the engine; it will not be rendered until renderFlow is called */
    use(
    /** JSX of dialog flow */
    jsx: ({}: {}) => FlowElement, 
    /** property bag of meta data associated with this flow */
    meta?: {
        [key: string]: string;
    }): void;
    /** render an anonymous reactive-dialog flow or set of directives without pre-registration;
     * used for directives or other elements that don't have their own unique intents */
    render(element: Element, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    /** render (perform) a specific dialog and/or dialog step */
    renderFlow(
    /** id of flow to perform ; use undefined for current flow if there is one executing */
    flowId: string | undefined | null, 
    /** id of dialog step to perform; use undefined for first dialog step in flow */
    dialogId: string | undefined | null, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    /** end the current flow if there is one being executed */
    end(context: Iopa.Context): Promise<void>;
    /** map of command name and associated handlers; returns disposer to remove handler */
    registerCommand(command: string, handler: CommandHandler): () => void;
    /** Version of this capability */
    'iopa.Version': string;
    /** meta data for all currently registered flows */
    meta: {
        [key: string]: {
            [key: string]: string;
        };
    };
    /** set scheme for local resources e.g,, app:// */
    setLocalResourceProtocol(protocol: string): void;
}
export interface SessionCurrentDialog {
    id: string;
    /** version of the IOPA dialogs manager */
    iopaBotVersion: '2.0';
    /** sequence number of the directive last executed in the current dialog step */
    lastDirective: number | null;
    /** id of step rendered before this one (for return logic) */
    previousId: string;
    /** last set of actions prompted to participant */
    lastPromptActions: ActionElement[] | null;
}
/** Reactive Dialogs Session passed to every context record */
export interface ReactiveDialogsSession {
    /** id of the dialog step being executed in the current skill */
    'bot:CurrentDialog': SessionCurrentDialog | null;
    /** timestamp that the last dialog step ended */
    'bot:LastDialogEndedDate': number | null;
    /** Flag indicating whether this intent is the first for this session */
    'bot:NewSession': boolean;
    /** id of the current executing bot session */
    'bot:Skill': string;
    /** V2 semversion of the current executing bot session;  checked in case flow definition upgraded mid conversation */
    'bot:SkillVersion': string;
    /** Skill data for current request */
    'bot:Slots': string;
    /** property bag of all data collected in current skill session, including silent properties specifed on card actions */
    'bot:Variables': any;
}
export declare const useReactiveDialogs: (context: Iopa.Context) => ReactiveDialogsCapability;
export declare const useBotSession: (context: Iopa.Context) => [ReactiveDialogsSession, (newState: any) => Promise<void>];
/**
 * The ReactiveDialogManager registers bot dialog flows provided as reactive-dialog
 * functional components.
 *
 * It maintains session state to keep track of the current dialog step and directive within a dialog step,
 * and manages intents to branch through the flow according to the declared logic
 * within the reactive-dialog directives
 */
export default class ReactiveDialogManager {
    app: any;
    private flows;
    private flowsMeta;
    private launchIntentsToFlows;
    private commandHandlers;
    /** public IOPA constructor used to register this capability */
    constructor(app: any);
    /**
     * Public IOPA invoke method that handles the processing of each inbound
     * record;
     */
    invoke(context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    /** Check if we can process the intent and therefore start this dialog */
    private _matchBeginFlow;
    private _continueFlow;
    protected proceedToNextDirective(context: Iopa.Context, flow: FlowElement, dialog: DialogElement, dialogSeqNo: number, lastDirective: number | null): Promise<void>;
    /** helper method to register a jsx flow element in this capability's inventory  */
    protected register(app: Iopa.App, jsx: ({}: {}) => FlowElement, meta?: {
        [key: string]: string;
    }): void;
    /** helper method to register a single dialog step in this skills inventory  */
    protected registerDialogStep(dialog: DialogElement, skill: Skill): void;
    /** helper method to register a single card in this skills inventory  */
    protected registerDialogFuction(fn: CustomElement, skill: Skill): void;
    /** helper method to register a single card in this skills inventory  */
    protected registerDialogCard(card: CardElement, skill: Skill): void;
    /** helper method to register a single card action set in this skills inventory  */
    protected registerDialogCardActions(actionset: ActionSetElement, skill: Skill): void;
    /** helper method to register a single card action set in this skills inventory  */
    protected registerUtterances(name: any, utterances: string[], skill: Skill): string;
    /** helper method to render an anonymous reactive-dialog flow or set of directives without pre-registration; */
    protected render(element: Element, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    /** find in inventory and render a specific flow and/or flow dialog step */
    protected renderFlowById(id: string | null | undefined, dialogId: string | null | undefined, context: Iopa.Context, next: () => Promise<void>): Promise<void>;
    /** render a given react-dialogs dialog step element to the host platform */
    protected renderDialogStep(flow: FlowElement, dialog: DialogElement, context: any): Promise<void>;
    /** end the current flow if there is one being executed */
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
