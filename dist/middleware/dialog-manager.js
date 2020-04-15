"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Iopa = require("iopa");
const { IOPA, SERVER } = Iopa.constants;
const constants_1 = require("../constants");
class Dialog {
    constructor(name, steps) {
        this.name = name;
        this.steps = steps;
    }
}
class DialogManager {
    constructor(app) {
        this.dialogs = {};
        this.app = app;
        app.dialog = (name, ...args) => {
            if (!(typeof name === 'string')) {
                throw new Error('dialog must start with dialog name, then array of intents, then function to call');
            }
            this.dialogs[name] = new Dialog(name, args);
        };
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Dialog] = {
            dialogs: this.dialogs,
            beginDialog: (name, context, next) => {
                const dialog = this.dialogs[name];
                if (!dialog) {
                    console.log(`Dialog ${name} not a v1 dialog`);
                    return next();
                }
                let dialogFunc = dialog.steps[0];
                if (typeof dialogFunc != 'function') {
                    dialogFunc = dialog.steps[1];
                    context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog] = {
                        name: dialog.name,
                        step: 2,
                        totalSteps: dialog.steps.length
                    };
                }
                else {
                    context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog] = {
                        name: dialog.name,
                        step: 1,
                        totalSteps: dialog.steps.length
                    };
                }
                resetSessionSkill(context);
                return dialogFunc(context, next);
            }
        };
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Dialog][IOPA.Version] =
            constants_1.BOT.VERSION;
    }
    invoke(context, next) {
        if (context['urn:bot:dialog:invoke']) {
            const dialogId = context['urn:bot:dialog:invoke'];
            return context[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Dialog].beginDialog(dialogId, context, next);
        }
        if (!context[constants_1.BOT.Intent])
            return next();
        console.log('>> skill', context[constants_1.BOT.Session][constants_1.BOT.Skill]);
        console.log('>> intent', context[constants_1.BOT.Intent]);
        console.log('>> dialog', context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog]);
        if (!context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog])
            return this._matchBeginDialog(context, next);
        return this._continueDialog(context, next);
    }
    _matchBeginDialog(context, next) {
        let dialogFunc = null;
        for (var key in this.dialogs) {
            const dialog = this.dialogs[key];
            if (typeof dialog.steps[0] != 'function') {
                let intents = dialog.steps[0];
                if (intents.includes(context[constants_1.BOT.Intent]) || intents.includes('*')) {
                    dialogFunc = dialog.steps[1];
                    context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog] = {
                        name: dialog.name,
                        step: 2,
                        totalSteps: dialog.steps.length
                    };
                    resetSessionSkill(context);
                    break;
                }
            }
        }
        if (dialogFunc)
            return dialogFunc(context, next);
        else
            return next();
    }
    _continueDialog(context, next) {
        var sessionDialog = context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog];
        var dialog = this.dialogs[sessionDialog.name];
        if (!dialog) {
            return this._matchBeginDialog(context, next);
        }
        if (sessionDialog.step >= dialog.steps.length) {
            context[constants_1.BOT.Session][constants_1.BOT.CurrentDialog] = null;
            context[constants_1.BOT.Session][constants_1.BOT.LastDialogEndedDate] = new Date().getTime();
            resetSessionSkill(context);
            return this._matchBeginDialog(context, next);
        }
        let intentFilter;
        let dialogFunc;
        intentFilter = dialog.steps[sessionDialog.step];
        if (typeof intentFilter == 'function') {
            dialogFunc = intentFilter;
            intentFilter = null;
        }
        else if (intentFilter &&
            !intentFilter.includes(context[constants_1.BOT.Intent]) &&
            !intentFilter.includes('*')) {
            return this._matchBeginDialog(context, next);
        }
        else {
            sessionDialog.step++;
            dialogFunc = dialog.steps[sessionDialog.step];
        }
        sessionDialog.step++;
        return dialogFunc(context, next);
    }
}
exports.default = DialogManager;
function resetSessionSkill(context) {
    delete context[constants_1.BOT.Session][constants_1.BOT.SkillVersion];
}
