"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utterances = require("alexa-utterances");
const BOT = require('../constants').BOT;
class Skill {
    constructor(name) {
        this.name = name;
        this._global = true;
        this.messages = {
            NO_INTENT_FOUND: "Sorry, the skill didn't know what to do with that intent",
            NO_LAUNCH_FUNCTION: 'Try telling the skill what to do instead of opening it',
            INVALID_REQUEST_TYPE: 'Error: not a valid request',
            GENERIC_ERROR: 'Sorry, the application encountered an error'
        };
        this.exhaustiveUtterances = false;
        this.dictionaries = {};
        this.intents = {};
    }
    isGlobal() {
        return this._global;
    }
    global(flag) {
        this._global = flag;
        return this;
    }
    lookupIntent(utterances) {
        const searchKey = utterances.join(':');
        const intent = Object.keys(this.intents)
            .map(key => this.intents[key])
            .find(intent => intent.schema.utterances.join(':') == searchKey);
        return intent ? intent.name : undefined;
    }
    intent(intentName, schema, func) {
        if (intentName.indexOf(' ') > -1) {
            throw new Error(`Intent cannot be registered with spaces in the name "${intentName}"`);
        }
        if (typeof schema == 'function') {
            func = schema;
            schema = null;
        }
        this.intents[intentName] = {
            name: intentName,
            function: func
        };
        if (schema) {
            this.intents[intentName].schema = schema;
        }
        return this;
    }
    dictionary(dictionary) {
        for (var attrname in dictionary) {
            this.dictionaries[attrname] = dictionary[attrname];
        }
        return this;
    }
    launch(func) {
        this.intent(BOT.INTENTS.Launch, func);
        return this;
    }
    sessionEnded(func) {
        this.intent(BOT.INTENTS.SessionEnded, func);
        return this;
    }
    schema() {
        var schema = {
            intents: []
        }, intentName, intent, key;
        for (intentName in this.intents) {
            intent = this.intents[intentName];
            var intentSchema = {
                intent: intent.name,
                slots: []
            };
            if (intent.schema) {
                if (intent.schema.slots) {
                    for (key in intent.schema.slots) {
                        intentSchema.slots.push({
                            name: key,
                            type: intent.schema.slots[key]
                        });
                    }
                }
            }
            schema.intents.push(intentSchema);
        }
        return JSON.stringify(schema, null, 3);
    }
    utterances() {
        var intentName, intent, out = '';
        for (intentName in this.intents) {
            intent = this.intents[intentName];
            if (intent.schema && intent.schema.utterances) {
                const _this = this;
                intent.schema.utterances.forEach(function (sample) {
                    var list = Utterances(sample, intent.schema.slots, _this.dictionaries, _this.exhaustiveUtterances);
                    list.forEach(function (utterance) {
                        out +=
                            intent.name + '\t' + utterance.replace(/\s+/g, ' ').trim() + '\n';
                    });
                });
            }
        }
        return out;
    }
}
exports.default = Skill;
