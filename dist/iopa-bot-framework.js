"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill/array");
const Iopa = require("iopa");
const { IOPA, SERVER } = Iopa.constants;
const constants_1 = require("./constants");
const session_1 = require("./middleware/session");
const dialog_manager_1 = require("./middleware/dialog-manager");
const reactive_dialogs_manager_1 = require("./middleware/reactive-dialogs-manager");
const intent_parser_1 = require("./middleware/intent-parser");
const skill_1 = require("./schema/skill");
class SkillsManager {
    constructor(app) {
        console.log('REGISTERED SKILLS MANAGER on ' + app.properties[SERVER.AppId]);
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills] = {
            verbose: false,
            timeout: 300000,
            skills: {},
            add: function (name) {
                if (!this.skills[name])
                    this.skills[name] = new skill_1.default(name);
                return this.skills[name];
            },
            skill: function (name) {
                return this.skills[name];
            }
        };
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills][IOPA.Version] =
            constants_1.BOT.VERSION;
        this.defaultSkill = app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].add('default');
        app.intent = this.defaultSkill.intent.bind(this.defaultSkill);
        app.dictionary = this.defaultSkill.dictionary.bind(this.defaultSkill);
        app.skill = function (name) {
            name = name || 'default';
            return app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].add(name);
        };
        app.use(session_1.default, "iopa-bot-sessionMiddleware");
        app.use(intent_parser_1.default, "iopa-bot-IntentParserMiddleware");
        app.use(reactive_dialogs_manager_1.default, "iopa-bot-ReactiveDialogsMiddleware");
        app.use(dialog_manager_1.default, "iopa-bot-DialogManagerMiddleware");
        console.log("registered iopa-bot middleware");
    }
}
const IopaBotFramework = function (app) {
    this.ref = new SkillsManager(app);
};
IopaBotFramework.connectors = {};
exports.default = IopaBotFramework;
