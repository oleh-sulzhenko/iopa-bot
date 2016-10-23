/*
 * Iopa Bot Framework
 * Copyright (c) 2016 Internet of Protocols Alliance 
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

var Utterances = require("alexa-utterances");

const iopa = require('iopa'),
  constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER, 
  BOT = require('../constants').BOT;

function IopaSkill(name) {

    this.name = name;

    this.messages = {
        // When an intent was passed in that the skill was not configured to handle
        "NO_INTENT_FOUND": "Sorry, the skill didn't know what to do with that intent",
        // When the skill was used with 'open' or 'launch' but no launch handler was defined
        "NO_LAUNCH_FUNCTION": "Try telling the skill what to do instead of opening it",
        // When a request type was not recognized
        "INVALID_REQUEST_TYPE": "Error: not a valid request",
        // If some other exception happens
        "GENERIC_ERROR": "Sorry, the application encountered an error"
    };

    // use a minimal set of utterances or the full cartesian product?
    this.exhaustiveUtterances = false;

    // A mapping of keywords to arrays of possible values, for expansion of sample utterances
    this._dictionary = {};
    
    this.intents = {};
       
    // Unlike alexa-app, no Launch hook, just register Intent handler of "urn:io.iopa.bot:launch"
    // Unlike alexa-app, no SessionEnded hook, just register Intent handler of "urn:io.iopa.bot:sessionended"
}

IopaSkill.prototype.intent = function (intentName, schema, func) {
    if (typeof schema == "function") {
        func = schema;
        schema = null;
    }
    this.intents[intentName] = {
        "name": intentName,
        "function": func
    };
    if (schema) {
        this.intents[intentName].schema = schema;
    }
};

IopaSkill.prototype.dictionary = function (obj2) {
    for (var attrname in obj2) { this.dictionary[attrname] = obj2[attrname]; }
};

IopaSkill.prototype.launch = function (func) {
    this.intent(BOT.INTENTS.Launch, func);
};

IopaSkill.prototype.sessionEnded = function (func) {
   this.intent(BOT.INTENTS.SessionEnded, func);
};

// Helper Function to extract the schema and generate a schema JSON object
IopaSkill.prototype.schema = function () {
    var schema = {
        "intents": []
    }, intentName, intent, key;
    for (intentName in this.intents) {
        intent = this.intents[intentName];
        var intentSchema = {
            "intent": intent.name,
            "slots": []
        };
        if (intent.schema) {
            if (intent.schema.slots) {
                for (key in intent.schema.slots) {
                    intentSchema.slots.push({
                        "name": key,
                        "type": intent.schema.slots[key]
                    });
                }
            }
        }
        schema.intents.push(intentSchema);
    }
    return JSON.stringify(schema, null, 3);
};

// Generate a list of sample utterances
IopaSkill.prototype.utterances = function () {
    var intentName,
        intent,
        out = "";
    for (intentName in this.intents) {
        intent = this.intents[intentName];
        if (intent.schema && intent.schema.utterances) {
            intent.schema.utterances.forEach(function (sample) {
                var list = Utterances(sample,
                    intent.schema.slots,
                    this._dictionary,
                    this.exhaustiveUtterances);
                list.forEach(function (utterance) {
                    out += intent.name + "\t" + (utterance.replace(/\s+/g, " ")).trim() + "\n";
                });
            });
        }
    }
    return out;
};

// Generate a list of custom slots
IopaSkill.prototype.utterances = function () {
    var intentName,
        intent,
        out = "";
    for (intentName in this.intents) {
        intent = this.intents[intentName];
        if (intent.schema && intent.schema.utterances) {
            intent.schema.utterances.forEach(function (sample) {
                var list = Utterances(sample,
                    intent.schema.slots,
                    this.dictionary,
                    this.exhaustiveUtterances);
                list.forEach(function (utterance) {
                    out += intent.name + "\t" + (utterance.replace(/\s+/g, " ")).trim() + "\n";
                });
            });
        }
    }
    return out;
};

module.exports = IopaSkill;
