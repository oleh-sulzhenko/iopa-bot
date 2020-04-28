"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
const defaultPauseInterval = 200;
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
class ReactiveDialogManager {
    constructor(app) {
        this.flows = {};
        this.flowsMeta = {};
        this.tableLists = {};
        this.tableMeta = {};
        this.launchIntentsToFlows = {};
        this._localResourceProtocolMapper = (partial_url) => partial_url || '';
        this.app = app;
        app.properties[SERVER.CancelTokenSource] =
            app.properties[SERVER.CancelTokenSource] ||
                new Iopa.util.CancellationTokenSource();
        app.properties[SERVER.CancelToken] =
            app.properties[SERVER.CancelTokenSource].token;
        this.commandHandlers = new Map();
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs] = {
            'iopa.Version': constants_1.BOT.VERSION,
            use: (jsx, meta) => {
                this.register(app, jsx, meta);
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
            _commandHandlers: this.commandHandlers,
            meta: this.flowsMeta,
            lists: this.tableLists,
            tables: this.tableMeta,
            set localResourceProtocolMapper(mapper) {
                this._localResourceProtocolMapper = mapper;
                ReactiveCards.setLocalResourceProtocolMapper(mapper);
            },
            get localResourceProtocolMapper() {
                return this._localResourceProtocolMapper;
            }
        };
        app.reactivedialogs =
            app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs];
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.ReactiveDialogs][IOPA.Version] = constants_1.BOT.VERSION;
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
    invoke(context, next) {
        const flows = exports.useReactiveDialogs(context);
        if (context['urn:bot:dialog:invoke']) {
            let flowId = context['urn:bot:dialog:invoke'];
            let dialogId = null;
            if (flowId.indexOf('#') >= 0) {
                let split = flowId.split('#', 2);
                flowId = split[0];
                dialogId = split[1];
            }
            return flows.renderFlow(flowId, dialogId, context, next);
        }
        if (!context[constants_1.BOT.Intent]) {
            return next();
        }
        const botSession = exports.useBotSession(context)[0];
        var isV2Dialog = !!botSession[constants_1.BOT.SkillVersion];
        if (!isV2Dialog)
            return next();
        console.log('>> skill', botSession[constants_1.BOT.Skill]);
        console.log('>> intent', context[constants_1.BOT.Intent]);
        console.log('>> dialog', botSession[constants_1.BOT.CurrentDialog] ? botSession[constants_1.BOT.CurrentDialog].id : "");
        if (!botSession[constants_1.BOT.CurrentDialog]) {
            return this._matchBeginFlow(context, next);
        }
        else {
            return this._continueFlow(context, next);
        }
    }
    _matchBeginFlow(context, next) {
        const reactive = exports.useReactiveDialogs(context);
        const intent = context[constants_1.BOT.Intent];
        const flowId = this.launchIntentsToFlows[intent];
        if (!flowId) {
            console.log('No current dialog, and could not find as launch intent');
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
            [constants_1.BOT.Variables]: Object.assign(Object.assign({}, botSession[constants_1.BOT.Variables]), { [`${dialogId}${lastDirective ? `:${lastDirective}` : ''}`]: intent, [`${dialogId}${lastDirective ? `:${lastDirective}:raw` : ':raw'}`]: context[constants_1.BOT.Text] })
        });
        if (dialogSeqNo == flow.props.children.length - 1) {
            setBotSession({
                [constants_1.BOT.LastDialogEndedDate]: new Date().getTime()
            });
            return this.endFlow(context, { reason: 'last-response' });
        }
        const dialog = flow.props.children[dialogSeqNo];
        if (lastDirective == null ||
            lastDirective >= dialog.props.children.length) {
            console.log(`Last directive sequence #${lastDirective} of dialog #${dialogId} in flow ${flowId} no longer available in registry`);
        }
        if (!lastPromptActions) {
            return this.proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective);
        }
        else {
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
                    return this.renderActionOpenUrl(action, context);
                default:
                    console.log(`card type ${action.props.type} not yet supported in reactive-dialogs manager`);
                    return this.proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective);
            }
        }
    }
    proceedToNextDirective(context, flow, dialog, dialogSeqNo, lastDirective) {
        if (lastDirective !== null &&
            lastDirective < dialog.props.children.length - 1) {
            return Promise.resolve();
        }
        else if (dialogSeqNo < flow.props.children.length - 1) {
            const nextStep = flow.props.children[dialogSeqNo + 1];
            return this.renderDialogStep(flow, nextStep, context);
        }
        else {
            return this.endFlow(context, { reason: 'last-directive' });
        }
    }
    register(app, jsx, meta = {}) {
        const flow = jsx({});
        if (!flow) {
            return;
        }
        if ((flow.type !== 'flow') && (flow.type !== 'table')) {
            return throwErr('Tried to register a flow that is not a reactive-dialogs type');
        }
        if (flow.type == 'table') {
            const tableId = flow.props.id;
            const lists = flow.props.children;
            this.tableMeta[tableId] = Object.assign({ lists: [] }, meta);
            lists.forEach(list => {
                const listid = list.props.id;
                const items = list.props.children;
                this.tableLists[listid] = items;
                this.tableMeta[tableId].lists.push(listid);
                console.log(` registered table ${tableId}  list ${list.props.id}`);
            });
            return;
        }
        const flowId = flow.props.id;
        if (flowId in this.flows) {
            return throwErr(`Tried to register a dialog flow with id ${flowId} that already has been registered;  restart engine first`);
        }
        this.flows[flowId] = flow;
        this.flowsMeta[flowId] = meta;
        const skill = app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].add(flowId);
        if (!meta.global) {
            skill.global(false);
        }
        flow.props.children.forEach(dialog => {
            this.registerDialogStep(dialog, skill);
        });
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
        console.log(`registered dialog flow ${flowId}`);
    }
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
    registerDialogCard(card, skill) {
        card.props.children
            .filter(cardChild => cardChild.type == 'actionset')
            .forEach(actionset => {
            this.registerDialogCardActions(actionset, skill);
        });
    }
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
    registerUtterances(name, utterances, skill) {
        const schemaUtterances = utterances.map(s => s.toLowerCase()).sort();
        const existingIntent = skill.lookupIntent(schemaUtterances);
        if (existingIntent) {
            return existingIntent;
        }
        skill.intent(name, { utterances: schemaUtterances });
        return name;
    }
    render(element, context, next) {
        return throwErr('Inline render of unregistered reactive-dialogs elements not yet implemented');
    }
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
                console.error(`Step ${dialogId} not found on dialog ${flowId};`);
                return Promise.resolve();
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
        setTimeout(() => {
            this.renderDialogStep(flow, dialogStep, context);
        }, 0);
        return next();
    }
    renderDialogStep(flow, dialog, context) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting flow dialog step #', dialog.props.id);
            const [botSession, setBotSession] = exports.useBotSession(context);
            if (!botSession) {
                return;
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
                const isNotWaitingOnPrompt = yield this.renderDirective(directive, context);
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
    renderDirective(element, context) {
        const vdom = reactive_dialogs_1.render(element);
        switch (vdom.type) {
            case 'text':
                return this.renderText(vdom, context);
            case 'card':
                this.saveActionsFromCard(vdom, context);
                return this.renderCard(vdom, context);
            case 'action':
                return this.renderAction(vdom, context);
            default:
                throwErr(`invalid dialog flow: <${element.type}> not a valid dialog directive or card type`);
                return Promise.resolve(false);
        }
    }
    renderText(element, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const text = toString(element);
            const pause = element.props.pause || defaultPauseInterval;
            yield context.response.sendAll([text]);
            yield delay(context, pause || defaultPauseInterval);
            return true;
        });
    }
    renderCard(element, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const [botSession, setBotSession] = exports.useBotSession(context);
            const actionset = element.props.children.find(child => child.type == 'actionset');
            if (actionset) {
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
            const meta = this.flowsMeta[botSession[constants_1.BOT.Skill]];
            const resourceRoot = (meta && meta["nkar"]) ? `${meta["nkar"]}/` : '';
            const card = ReactiveCards.render(element, resourceRoot);
            const pause = element.props.pause || defaultPauseInterval;
            yield context.response.sendAll([{ text: '', attachments: [card] }]);
            yield delay(context, pause || defaultPauseInterval);
            return !card.actions || (card.actions.length == 0);
        });
    }
    saveActionsFromCard(element, context) {
        const [botSession, setBotSession] = exports.useBotSession(context);
        const currentDialog = botSession[constants_1.BOT.CurrentDialog];
        const actionset = element.props.children.find(actionset => actionset.type == 'actionset');
        if (!actionset) {
            return;
        }
        currentDialog.lastPromptActions = actionset.props.children.filter(action => action.type == 'action');
        setBotSession({ [constants_1.BOT.CurrentDialog]: currentDialog });
    }
    renderAction(element, context) {
        switch (element.props.type) {
            case 'openurl':
                return this.renderActionOpenUrl(element, context);
            case 'showcard':
            case 'submit':
            default:
                throwErr(`Invalid action type '${element.props.type}' when used as a direct child of <step>`);
                return Promise.resolve(true);
        }
    }
    renderActionOpenUrl(element, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element.props.url) {
                return this.renderActionDialogFlow('', '', element, context);
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
                    yield this.renderActionDialogFlow(flowId, dialogId, element, context);
                    return Promise.resolve(false);
                case 'https:':
                case 'http:':
                    yield this.renderActionCommand('openurl', { url }, element, context);
                    return Promise.resolve(false);
                case 'command:':
                    return this.renderActionCommand(url.pathname.replace(/^\/*/, ''), getJsonFromUrl(url.query), element, context);
                default:
                    throwErr(`unknown protocol ${url.protocol} on ${element.props.url}`);
                    return Promise.resolve(true);
            }
        });
    }
    renderActionDialogFlow(id, dialogId, element, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const reactive = exports.useReactiveDialogs(context);
            yield reactive.renderFlow(id, dialogId, context, () => Promise.resolve());
            return false;
        });
    }
    logStartOfDialog(context) { }
    logAbandondedDialog(context) { }
    logCompletedDialog(context) { }
    renderActionCommand(command, params, element, context) {
        const reactive = exports.useReactiveDialogs(context);
        const handler = reactive._commandHandlers.get(command);
        if (handler) {
            return handler(command, Object.assign({ url: element.props.url, data: element.props.data }, params), context);
        }
        else {
            throwErr(`No handler registered for the command ${command} on ${element.props.url}`);
            return Promise.resolve(true);
        }
    }
}
exports.default = ReactiveDialogManager;
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
function camelize(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index == 0 ? word.toLowerCase() : word.toUpperCase();
    })
        .replace(/\s+/g, '');
}
function getJsonFromUrl(url) {
    var query = url.substr(1);
    var result = {};
    query.split("&").forEach(function (part) {
        var item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
}
exports.getJsonFromUrl = getJsonFromUrl;
