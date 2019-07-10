"use strict";
/*
 * Iopa Bot Framework
 * Copyright (c) 2016-2019 Internet of Protocols Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Utterances = require("alexa-utterances");
const BOT = require('../constants').BOT;
class Skill {
    isGlobal() {
        return this._global;
    }
    constructor(name) {
        this.name = name;
        this._global = true;
        this.messages = {
            // When an intent was passed in that the skill was not configured to handle
            NO_INTENT_FOUND: "Sorry, the skill didn't know what to do with that intent",
            // When the skill was used with 'open' or 'launch' but no launch handler was defined
            NO_LAUNCH_FUNCTION: 'Try telling the skill what to do instead of opening it',
            // When a request type was not recognized
            INVALID_REQUEST_TYPE: 'Error: not a valid request',
            // If some other exception happens
            GENERIC_ERROR: 'Sorry, the application encountered an error'
        };
        // use a minimal set of utterances or the full cartesian product?
        this.exhaustiveUtterances = false;
        // A mapping of keywords to arrays of possible values, for expansion of sample utterances
        this.dictionaries = {};
        this.intents = {};
    }
    /** global skills are always used in parsing;  non-global only parsed when launched */
    global(flag) {
        // global skills are always used in parsing;  non-global only parsed when launched
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
    /** register a new dictionary for this skill  */
    dictionary(dictionary) {
        for (var attrname in dictionary) {
            this.dictionaries[attrname] = dictionary[attrname];
        }
        return this;
    }
    /** @deprecated For alexa-app compatiabilty, just register Intent handler of "urn:io.iopa.bot:launch" */
    launch(func) {
        this.intent(BOT.INTENTS.Launch, func);
        return this;
    }
    /** @deprecated For alexa-app compatiabilty,ust register Intent handler of "urn:io.iopa.bot:sessionended" */
    sessionEnded(func) {
        this.intent(BOT.INTENTS.SessionEnded, func);
        return this;
    }
    /** Export Helper Function to extract the schema and generate a schema JSON object */
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
    /** Export Helper Function to generate a list of sample utterances */
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
