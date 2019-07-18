"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ReactiveCards = require("reactive-cards");
const reactive_dialogs_1 = require("reactive-dialogs");
const Iopa = require("iopa");
const { IOPA, SERVER } = Iopa.constants;
const constants_1 = require("../constants");
const forEachAsync_1 = require("../util/forEachAsync");
const parse_url_1 = require("../polyfill/parse_url");
// TO DO, get from host context
const defaultPauseInterval = 200;
const logDebug = true;
exports.useReactiveDialogs = (context) => {
    return context[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs];
};
exports.useBotSession = (context) => [
    context[constants_1.BOT.Session],
    newState => {
        context[constants_1.BOT.Session] = newState
            ? Object.assign(context[constants_1.BOT.Session], newState)
            : { id: context[constants_1.BOT.Session]['id'] };
        return context[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Session].put(context[constants_1.BOT.Session]);
    }
];
const RDM_VERSION = '2.0';
/**
 * The ReactiveDialogManager registers bot dialog flows provided as reactive-dialog
 * functional components.
 *
 * It maintains session state to keep track of the current dialog step and directive within a dialog step,
 * and manages intents to branch through the flow according to the declared logic
 * within the reactive-dialog directives
 */
class ReactiveDialogManager {
    /** public IOPA constructor used to register this capability */
    constructor(app) {
        this.flows = {};
        this.launchIntentsToFlows = {};
        this.app = app;
        app.properties[SERVER.CancelTokenSource] =
            app.properties[SERVER.CancelTokenSource] ||
                new Iopa.util.CancellationTokenSource();
        app.properties[SERVER.CancelToken] =
            app.properties[SERVER.CancelTokenSource].token;
        this.commandHandlers = new Map();
        //
        // set up useReactiveDialogs() public capability handle
        //
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs] = {
            'iopa.Version': constants_1.BOT.VERSION,
            use: (jsx) => {
                this.register(app, jsx);
            },
            render: (element, context, next) => {
                return this.render(element, context, next);
            },
            renderFlow: (id, stepId, context, next) => {
                return this.renderFlowById(id, stepId, context, next);
            },
            end: (context) => __awaiter(this, void 0, void 0, function* () {
                return this.endFlow(context, { reason: 'capability.end' });
            }),
            registerCommand: (command, handler) => {
                this.commandHandlers.set(command, handler);
                return () => {
                    this.commandHandlers.delete(command);
                };
            },
            _commandHandlers: this.commandHandlers
        };
        app.reactivedialogs =
            app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs];
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs][IOPA.Version] = constants_1.BOT.VERSION;
        //
        // Register well-known intent and default command handlers
        //
        app.intent('reactivedialogs:intents:start', {
            slots: {
                FlowId: true
            },
            utterances: ['/dialog {-|FlowId}']
        }, (context, next) => __awaiter(this, void 0, void 0, function* () {
            context.response.responseHandled = true;
            const flowId = context[constants_1.BOT.Slots]['FlowId'];
            return this.renderFlowById(flowId, null, context, next);
        }));
        this.commandHandlers.set('end', (_command, _props, context) => __awaiter(this, void 0, void 0, function* () {
            this.endFlow(context, { reason: 'command:end' });
            return false;
        }));
        this.commandHandlers.set('pause', (_command, props, context) => __awaiter(this, void 0, void 0, function* () {
            yield delay(context, props.delay || defaultPauseInterval);
            return true;
        }));
        this.commandHandlers.set('return', (_command, props, context) => __awaiter(this, void 0, void 0, function* () {
            const botSession = exports.useBotSession(context)[0];
            const prevDialog = botSession[constants_1.BOT.CurrentDialog];
            if (prevDialog && prevDialog.previousId) {
                yield this.renderFlowById(botSession[constants_1.BOT.Skill], prevDialog.previousId, context, () => Promise.resolve());
            }
            return false;
        }));
    }
    /**
     * Public IOPA invoke method that handles the processing of each inbound
     * record;
     */
    invoke(context, next) {
        const flows = exports.useReactiveDialogs(context);
        //
        // Check for well known context in case its a record to actually invoke
        // a new flow
        //
        if (context['urn:bot:dialog:invoke']) {
            const flowId = context['urn:bot:dialog:invoke'];
            return flows.renderFlow(flowId, null, context, next);
        }
        //
        // Check for intent provided by Intent pre-processor.
        // Must have an intent to continue
        //
        if (!context[constants_1.BOT.Intent]) {
            return next();
        }
        const botSession = exports.useBotSession(context)[0];
        var isV2Dialog = !!botSession[constants_1.BOT.SkillVersion];
        if (!isV2Dialog)
            return next();
        console.log('>> skill', botSession[constants_1.BOT.Skill]);
        console.log('>> intent', context[constants_1.BOT.Intent]);
        console.log('>> dialog', botSession[constants_1.BOT.CurrentDialog]);
        //
        // Check if we are checking for a new session or continuing an existing session
        //
        if (!botSession[constants_1.BOT.CurrentDialog]) {
            return this._matchBeginFlow(context, next);
        }
        else {
            return this._continueFlow(context, next);
        }
    }
    /** Check if we can process the intent and therefore start this dialog */
    _matchBeginFlow(context, next) {
        const reactive = exports.useReactiveDialogs(context);
        const intent = context[constants_1.BOT.Intent];
        const flowId = this.launchIntentsToFlows[intent];
        if (!flowId) {
            console.log('No current dialog, and could not find as launch intent');
            // TO DO: Check for global '*'
            return next();
        }
        return reactive.renderFlow(flowId, null, context, next);
    }
    _continueFlow(context, next) {
        const [botSession, setBotSession] = exports.useBotSession(context);
        const intent = context[constants_1.BOT.Intent];
        var flowId = botSession[constants_1.BOT.Skill];
        var flow = this.flows[flowId];
        if (!flow) {
            // not a recognized flow so clear
            console.log(`Dialog Flow  ${flowId} in session no longer available in registry`);
            if (this.commandHandlers.has('dialog-abend')) {
                this.commandHandlers.get('dialog-abend')('dialog-abend', {
                    id: botSession[constants_1.BOT.Skill],
                    reason: `Dialog Flow ${flowId} in session no longer available in registry`
                }, context);
            }
            setBotSession(null);
            return this._matchBeginFlow(context, next);
        }
        if (botSession[constants_1.BOT.SkillVersion] &&
            flow.props.version.split('.')[0] !==
                botSession[constants_1.BOT.SkillVersion].split('.')[0]) {
            // major version change so clear
            console.log(`Dialog Flow ${flowId} major version ${flow.props.version} updated while participant was mid session on version ${botSession[constants_1.BOT.SkillVersion]}`);
            if (this.commandHandlers.has('dialog-abend')) {
                this.commandHandlers.get('dialog-abend')('dialog-abend', {
                    id: botSession[constants_1.BOT.Skill],
                    reason: `Dialog Flow ${flowId} major version ${flow.props.version} updated while participant was mid session on version ${botSession[constants_1.BOT.SkillVersion]}`
                }, context);
            }
            setBotSession(null);
            return this._matchBeginFlow(context, next);
        }
        const { id: dialogId, lastDirective, lastPromptActions, iopaBotVersion } = botSession[constants_1.BOT.CurrentDialog];
        if (iopaBotVersion !== RDM_VERSION) {
            return next();
        }
        const dialogSeqNo = flow.props.children.findIndex(directive => directive.type == 'dialog' && directive.props.id == dialogId);
        if (dialogSeqNo == -1) {
            //
            // not a recognized dialog step so clear
            //
            console.log(`Current session dialog step ${dialogId} in flow ${flowId} no longer available in registry`);
            if (this.commandHandlers.has('dialog-abend')) {
                this.commandHandlers.get('dialog-abend')('dialog-abend', {
                    id: botSession[constants_1.BOT.Skill],
                    reason: `Current session dialog step ${dialogId} in flow ${flowId} no longer available in registry`
                }, context);
            }
            setBotSession(null);
            return this._matchBeginFlow(context, next);
        }
        setBotSession({
            [constants_1.BOT.Variables]: Object.assign({}, botSession[constants_1.BOT.Variables], { [`${dialogId}${lastDirective ? `.${lastDirective}` : ''}`]: intent, [`${dialogId}${lastDirective ? `.${lastDirective}.raw` : '.raw'}`]: context[constants_1.BOT.Text] })
        });
        if (dialogSeqNo == flow.props.children.length - 1) {
            // TO DO POST READING OF END FLOW WITH ALL PROPERTIES
            //
            // was at end of flow so end
            //
            setBotSession({
                [constants_1.BOT.LastDialogEndedDate]: new Date().getTime()
            });
            return this.endFlow(context, { reason: 'last-response' });
        }
        const dialog = flow.props.children[dialogSeqNo];
        if (lastDirective == null ||
            lastDirective >= dialog.props.children.length) {
            //
            // invalid lastCompletedDirective
            //  - nevertheless log and continue in case the saved actions are still good enough
            //
            console.log(`Last directive sequence #${lastDirective} of dialog #${dialogId} in flow ${flowId} no longer available in registry`);
        }
        if (!lastPromptActions) {
            //
            // was not in a prompt directive so just post the result to session bag
            // and continue with next directive or dialog
            //
            return this.proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective);
        }
        else {
            ///
            /// match intent to actions Element
            ///
            const intentFilters = lastPromptActions.map(action => action.props.intents || action.props.utterances || [toString(action)]);
            const selectedActionSeqNo = intentFilters.findIndex(filters => filters.includes(intent) || filters.includes('*'));
            if (selectedActionSeqNo == -1) {
                const notUnderstoodDialog = `${dialogId}-not-understood`;
                const notUnderstoodSkill = `not-understood`;
                const nextStep = flow.props.children.find(dialog => dialog.props.id == notUnderstoodDialog) ||
                    flow.props.children.find(dialog => dialog.props.id == notUnderstoodSkill);
                if (nextStep) {
                    return this.renderDialogStep(flow, nextStep, context);
                }
                // No matching intent for current flow dialog step, see if we should start another flow
                return this._matchBeginFlow(context, next);
            }
            const action = lastPromptActions[selectedActionSeqNo];
            if (action.props.url) {
                action.props.type = 'openurl';
            }
            switch (action.props.type) {
                case 'submit':
                    return this.proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective);
                case 'openurl':
                    return renderActionOpenUrl(action, context);
                default:
                    console.log(`card type ${action.props.type} not yet supported in reactive-dialogs manager`);
                    return this.proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective);
            }
        }
    }
    proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective) {
        if (lastDirective !== null &&
            lastDirective < dialog.props.children.length - 1) {
            //
            // not at end of dialog step
            // no op as we got a participant response while we were still handling directives for this step
            //
            return Promise.resolve();
        }
        else if (dialogSeqNo < flow.props.children.length - 1) {
            //
            // end of directives in current dialog step, but not at end of flow
            //
            const nextStep = flow.props.children[dialogSeqNo + 1];
            return this.renderDialogStep(flow, nextStep, context);
        }
        else {
            //
            // at end of flow
            //
            return this.endFlow(context, { reason: 'last-directive' });
        }
    }
    /** helper method to register a jsx flow element in this capability's inventory  */
    register(app, jsx) {
        const flow = jsx({});
        if (!flow) {
            return;
        }
        if (flow.type !== 'flow') {
            return throwErr('Tried to register a flow that is not a reactive-dialogs type');
        }
        //
        // Register Flow in main inventory
        //
        const flowId = flow.props.id;
        if (flowId in this.flows) {
            return throwErr(`Tried to register a dialog flow with id ${flowId} that already has been registered;  restart engine first`);
        }
        this.flows[flowId] = flow;
        const skill = app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].add(flowId);
        //
        // Register all intents used in this flow
        //
        flow.props.children.forEach(dialog => {
            this.registerDialogStep(dialog, skill);
        });
        //
        // Add this flow's launch intents to main inventory of launch intents
        //
        if (flow.props.utterances && flow.props.utterances.length > 0) {
            if (!Array.isArray(flow.props.utterances)) {
                throwErr('utterances on <flow> must be an array of strings');
            }
            const skills = app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].skills;
            const launchSkill = flow.props.canLaunchFromGlobal
                ? skills.default
                : skill;
            const existingIntent = launchSkill.lookupIntent(flow.props.utterances);
            if (existingIntent) {
                this.launchIntentsToFlows[existingIntent] = flowId;
            }
            else {
                const launchName = `reactiveDialogs:flow:${flowId}:launchIntent`;
                launchSkill.intent(launchName, { utterances: flow.props.utterances });
                this.launchIntentsToFlows[launchName] = flowId;
            }
        }
        console.log(' registered ', flowId, skill);
    }
    /** helper method to register a single dialog step in this skills inventory  */
    registerDialogStep(dialog, skill) {
        dialog.props.children
            .filter(dialogChild => dialogChild.type == 'card' || typeof dialogChild.type == 'function')
            .forEach(dialogChild => {
            if (dialogChild.type == 'card') {
                this.registerDialogCard(dialogChild, skill);
            }
            else {
                this.registerDialogFuction(dialogChild, skill);
            }
        });
    }
    /** helper method to register a single card in this skills inventory  */
    registerDialogFuction(fn, skill) {
        const dialogChild = fn.type(Object.assign({}, fn.props, fn.type.defaultProps));
        if (dialogChild == null) {
            return;
        }
        if (dialogChild.type == 'card') {
            this.registerDialogCard(dialogChild, skill);
        }
        else if (typeof dialogChild.type == 'function') {
            this.registerDialogFuction(dialogChild, skill);
        }
    }
    /** helper method to register a single card in this skills inventory  */
    registerDialogCard(card, skill) {
        card.props.children
            .filter(cardChild => cardChild.type == 'actionset')
            .forEach(actionset => {
            this.registerDialogCardActions(actionset, skill);
        });
        // TO DO CASCADE THROUGH CONTAINER actionsets (V1.2+)
    }
    /** helper method to register a single card action set in this skills inventory  */
    registerDialogCardActions(actionset, skill) {
        actionset.props.children
            .filter(action => action.type == 'action')
            .forEach(action => {
            let response = toString(action).toLowerCase();
            const utterances = action.props.utterances || [response];
            const name = this.registerUtterances(utterances[0].replace(/[\W_]+/g, ''), utterances, skill);
            action.props.intents = action.props.intents || [];
            action.props.intents.push(name);
        });
    }
    /** helper method to register a single card action set in this skills inventory  */
    registerUtterances(name, utterances, skill) {
        const schemaUtterances = utterances.map(s => s.toLowerCase()).sort();
        const existingIntent = skill.lookupIntent(schemaUtterances);
        if (existingIntent) {
            return existingIntent;
        }
        skill.intent(name, { utterances: schemaUtterances });
        return name;
    }
    /** helper method to render an anonymous reactive-dialog flow or set of directives without pre-registration; */
    render(element, context, next) {
        return throwErr('Inline render of unregistered reactive-dialogs elements not yet implemented');
    }
    /** find in inventory and render a specific flow and/or flow dialog step */
    renderFlowById(id, dialogId, context, next) {
        const [botSession, setBotSession] = exports.useBotSession(context);
        if (id && botSession[constants_1.BOT.Skill] && id !== botSession[constants_1.BOT.Skill]) {
            if (this.commandHandlers.has('dialog-end')) {
                this.commandHandlers.get('dialog-end')('dialog-end', {
                    id: botSession[constants_1.BOT.Skill],
                    reason: `switch ${id}`
                }, context);
            }
        }
        const flowId = id || botSession[constants_1.BOT.Skill];
        if (!flowId) {
            console.log(`Cannot infer blank id to render when not in a current flow;  continuing with pipeline`);
            return next();
        }
        const flow = this.flows[flowId];
        if (!flow) {
            console.log(`Dialog Flow ${flowId} not found in V2 handler;  continuing with pipeline`);
            return next();
        }
        if (flow.props.children.length == 0) {
            console.log(`Dialog Flow ${flowId} is empty`);
            return Promise.resolve();
        }
        let dialogStep;
        if (!dialogId &&
            !id &&
            botSession[constants_1.BOT.CurrentDialog] &&
            botSession[constants_1.BOT.CurrentDialog].id) {
            // find next step if both flow id and dialog id are blank
            const currentDialogId = botSession[constants_1.BOT.CurrentDialog].id;
            const currentSeq = flow.props.children.findIndex(dialog => dialog.props.id == currentDialogId);
            if (currentSeq < flow.props.children.length - 1) {
                dialogStep = flow.props.children[currentSeq + 1];
            }
            else {
                dialogStep = flow.props.children[0];
            }
        }
        else if (dialogId) {
            dialogStep = flow.props.children.find(c => c.props.id === dialogId);
            if (!dialogStep) {
                console.log(`Step ${dialogId} not found on dialog ${flowId};  starting with first dialog step`);
                dialogStep = flow.props.children[0];
            }
        }
        else {
            dialogStep = flow.props.children[0];
        }
        if (!botSession[constants_1.BOT.Skill] || flow.props.id !== botSession[constants_1.BOT.Skill]) {
            if (this.commandHandlers.has('dialog-start')) {
                this.commandHandlers.get('dialog-start')('dialog-start', {
                    id: flow.props.id,
                    intent: context['urn:bot:dialog:invoke']
                        ? 'urn:bot:dialog:invoke'
                        : context[constants_1.BOT.Intent]
                }, context);
            }
        }
        setBotSession({
            [constants_1.BOT.Skill]: flow.props.id,
            [constants_1.BOT.SkillVersion]: flow.props.version,
            [constants_1.BOT.CurrentDialog]: null,
            [constants_1.BOT.Variables]: botSession[constants_1.BOT.Variables] || {}
        });
        return this.renderDialogStep(flow, dialogStep, context);
    }
    /** render a given react-dialogs dialog step element to the host platform */
    renderDialogStep(flow, dialog, context) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting flow dialog step #', dialog.props.id);
            const [botSession, setBotSession] = exports.useBotSession(context);
            if (!botSession) {
                /** dialog manager must have been disposed */ return;
            }
            const prevDialog = botSession[constants_1.BOT.CurrentDialog];
            const currentDialog = {
                id: dialog.props.id,
                previousId: prevDialog ? prevDialog.id : undefined,
                iopaBotVersion: RDM_VERSION,
                lastDirective: null,
                lastPromptActions: null
            };
            setBotSession({
                [constants_1.BOT.CurrentDialog]: currentDialog,
                [constants_1.BOT.isMultiChoicePrompt]: false
            });
            const isNotWaitingOnPrompt = yield forEachAsync_1.asyncForEachIfTrue(dialog.props.children, (directive, i) => __awaiter(this, void 0, void 0, function* () {
                if (this.app.properties[SERVER.CancelToken].isCancelled)
                    return false;
                console.log(`Performing dialog step ${dialog.props.id} directive ${i}`);
                currentDialog.lastDirective = i;
                setBotSession({
                    [constants_1.BOT.CurrentDialog]: currentDialog
                });
                const isNotWaitingOnPrompt = yield renderDirective(directive, context);
                return isNotWaitingOnPrompt;
            }));
            if (isNotWaitingOnPrompt) {
                const isLastItem = flow.props.children[flow.props.children.length - 1] === dialog;
                if (isLastItem) {
                    return this.endFlow(context, { reason: 'last-response' });
                }
                const currentSeq = flow.props.children.findIndex(d => d.props.id == dialog.props.id);
                if (currentSeq !== -1) {
                    const nextStep = flow.props.children[currentSeq + 1];
                    return this.renderDialogStep(flow, nextStep, context);
                }
            }
            return;
        });
    }
    /** end the current flow if there is one being executed */
    endFlow(context, props) {
        const [botSession, setBotSession] = exports.useBotSession(context);
        console.log(`Ending dialog flow ${botSession[constants_1.BOT.Skill]}`);
        if (this.commandHandlers.has('dialog-end')) {
            this.commandHandlers.get('dialog-end')('dialog-end', Object.assign({ id: botSession[constants_1.BOT.Skill], success: true }, props), context);
        }
        setBotSession(null);
        context.response[constants_1.BOT.ShouldEndSession] = true;
        return Promise.resolve();
    }
}
exports.default = ReactiveDialogManager;
function renderDirective(element, context) {
    const vdom = reactive_dialogs_1.render(element);
    switch (vdom.type) {
        case 'text':
            return renderText(vdom, context);
        case 'card':
            saveActionsFromCard(vdom, context);
            return renderCard(vdom, context);
        case 'action':
            return renderAction(vdom, context);
        default:
            throwErr(`invalid dialog flow: <${element.type}> not a valid dialog directive or card type`);
            return Promise.resolve(false);
    }
}
function renderText(element, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = toString(element);
        const pause = element.props.pause || defaultPauseInterval;
        yield context.response.sendAll([text]);
        yield delay(context, pause || defaultPauseInterval);
        return true;
    });
}
function renderCard(element, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const setBotSession = exports.useBotSession(context)[1];
        const actionset = element.props.children.find(child => child.type == 'actionset');
        if (actionset) {
            //
            // render openurl as submit
            //
            actionset.props.children.forEach(action => {
                if (action.props.type === 'openurl') {
                    action.props.type = 'submit';
                    action.props.data = action.props.utterances
                        ? action.props.utterances[0]
                        : toString(action).toLowerCase();
                }
            });
            yield setBotSession({ [constants_1.BOT.isMultiChoicePrompt]: true });
        }
        const card = ReactiveCards.render(element);
        const pause = element.props.pause || defaultPauseInterval;
        yield context.response.sendAll([{ text: '', attachments: [card] }]);
        yield delay(context, pause || defaultPauseInterval);
        return !card.actions;
    });
}
function saveActionsFromCard(element, context) {
    const [botSession, setBotSession] = exports.useBotSession(context);
    const currentDialog = botSession[constants_1.BOT.CurrentDialog];
    const actionset = element.props.children.find(actionset => actionset.type == 'actionset');
    if (!actionset) {
        return;
    }
    currentDialog.lastPromptActions = actionset.props.children.filter(action => action.type == 'action');
    setBotSession({ [constants_1.BOT.CurrentDialog]: currentDialog });
}
function renderAction(element, context) {
    switch (element.props.type) {
        case 'openurl':
            return renderActionOpenUrl(element, context);
        case 'showcard':
        case 'submit':
        default:
            throwErr(`Invalid action type '${element.props.type}' when used as a direct child of <step>`);
            return Promise.resolve(true);
    }
}
function renderActionOpenUrl(element, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!element.props.url) {
            // continue with dialog next step
            return renderActionDialogFlow('', '', element, context);
        }
        if (element.props.url.indexOf(':') == -1) {
            element.props.url = `dialog:/` + element.props.url;
        }
        const url = parse_url_1.parse_url(element.props.url);
        switch (url.protocol) {
            case 'dialog:':
                const flowId = url.pathname.replace(/^\/*/, '');
                const dialogId = url.hash ? url.hash.replace(/^#/, '') : undefined;
                if (!url.hash && !flowId) {
                    console.log('found blank action url in dialog, continuing');
                    return Promise.resolve(true);
                }
                yield renderActionDialogFlow(flowId, dialogId, element, context);
                return Promise.resolve(false);
            case 'https:':
            case 'http:':
                yield renderActionCommand('openurl', { url }, element, context);
                return Promise.resolve(false);
            case 'command:':
                //
                // <action type="openurl" url="command:pause?delay=500" />
                //
                return renderActionCommand(url.pathname.replace(/^\/*/, ''), Object.assign({}, fromEntries(url.searchParams['entries']())), element, context);
            default:
                throwErr(`unknown protocol ${url.protocol} on ${element.props.url}`);
                return Promise.resolve(true);
        }
    });
}
function renderActionDialogFlow(id, dialogId, element, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const reactive = exports.useReactiveDialogs(context);
        yield reactive.renderFlow(id, dialogId, context, () => Promise.resolve());
        return false;
    });
}
function logStartOfDialog(context) { }
function logAbandondedDialog(context) { }
function logCompletedDialog(context) { }
function renderActionCommand(command, params, element, context) {
    const reactive = exports.useReactiveDialogs(context);
    const handler = reactive._commandHandlers.get(command);
    if (handler) {
        return handler(command, Object.assign({ url: element.props.url, data: element.props.data }, params), context);
    }
    else {
        throwErr(`No handler registered for command ${command} on ${element.props.url}`);
        return Promise.resolve(true);
    }
}
const toString = child => {
    return child.props.children.join('');
};
const delay = (context, interval) => {
    return new Promise(resolve => {
        setTimeout(resolve, context.response[constants_1.BOT.isDelayDisabled] ? 40 : interval);
    });
};
function throwErr(...args) {
    var message = Array.prototype.slice.call(args).join(' ');
    throw new Error(message);
}
function fromEntries(iterable) {
    return [...iterable].reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {});
}
function camelize(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index == 0 ? word.toLowerCase() : word.toUpperCase();
    })
        .replace(/\s+/g, '');
}
