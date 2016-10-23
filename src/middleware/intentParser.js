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

const iopa = require('iopa'),
  constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER, 
  BOT = require('../constants').BOT;

  var util = require('util');


module.exports = function parseIntent(context, next) {

    var intentFunc = null;
    var session = context[BOT.Session];
    context[BOT.Slots] = {};

    var skills = context[SERVER.Capabilities][BOT.CAPABILITIES.Skills].skills;

    for (var key in skills) {

        var skill = skills[key];

        if (parseSkillIntents(skill, context)) {

            if (!session[BOT.Skill]) {  // TODO MAYBE CHECK FOR != PRIOR SKILL
                session[BOT.NewSession] = true;
            } else {
                session[BOT.NewSession] = false;
            }

            session[BOT.Skill] = skill.name;

            break;
        }
    }

    return invokeIntent(context, next);

};

function parseSkillIntents(skill, context) {

    var result = false;
     var input = context[BOT.Text];

    if (context[BOT.Intent] == 'urn:io.iopa.bot:intent:literal')
    {
        // Go through each intent in the skill to find a valid response.
        for (var i in Object.keys(skill.intents)) {
            var key = Object.keys(skill.intents)[i];
            result = _matchUtterancesForIntent(skill, context, key);
            if (result)
                break;
        }
    } else
    {
         result = _matchUtterancesForIntent(skill, context, context[BOT.Intent]);
    }

    return result;
}

function invokeIntent(context, next) {
    var session = context[BOT.Session];
   
    if (!session[BOT.Skill])
      return next();

    var skills = context[SERVER.Capabilities][BOT.CAPABILITIES.Skills].skills;

    var intent = skills[session[BOT.Skill]].intents[context[BOT.Intent]];

    if (intent && intent["function"])
        return intent["function"](context, next);

     return next();
};


function _matchUtterancesForIntent(skill, context, intentkey) {

    var input = context[BOT.Text];

    var utterances = [];
    skill.utterances().split('\n').forEach(function (template) {
        // Get the intent name from this template line.
        var matches = template.match(/([\/a-zA-Z0-9\.\:]+)\t/);
        if (matches && matches[1] == intentkey) {
            // The intent matches ours, let's use it. First, strip out intent name.
            var start = template.indexOf('\t');
            template = template.substring(start + 1);

            // Add this utterance for processing.
            utterances.push(template);
        }
    });

    if (!skill.intents[intentkey])
    {
         if (intentkey != BOT.INTENTS.Launch)
           context.log("Missing Schema for intent " + intentkey);
         return false;
    }

    var slots = skill.intents[intentkey].schema ? skill.intents[intentkey].schema.slots : null;
     var result = _parseText(input, utterances, skill.intents[intentkey].schema.slots);

    if (result.isValid) {
        var session = context[BOT.Session];
        context[BOT.Intent] = intentkey;
        context[BOT.Slots] = {};
        for (var j in result.pairs) {
            var pair = result.pairs[j];
            context[BOT.Slots][pair.name] = pair.value;
        };
    }
    
    return result.isValid;
}

function _parseText(text, utterances, slots) {
    var result = { isValid: true, pairs: [] };

    for (var h in utterances) {
        var template = utterances[h];
        var regEx = /[ \n\r\t,\!`\(\)\[\]:;\"\?\/\\\<\+\=>]+/;
        result = { isValid: true, pairs: [] };

        if (template && template.length > 0) {
          
            // Remove leading and trailing periods.
            text = text.replace(/(^\.+)|(\.+$)/g, '');

            // Find all variables and fill in values.
            var tokens = template.split(regEx).filter(function (e) { return e });;
            var words = text.split(regEx).filter(function (e) { return e }); // remove empty strings.

            if (tokens.length == words.length) {
                for (var i = 0; i < tokens.length; i++) {
                    var token = tokens[i];
                    var word = words[i];

                     if (token.toLowerCase() != word.toLowerCase()) {
                        // A word doesn't match, but is it a variable?
                        var tokenParts = token.match(/{([a-zA-Z0-9\_]+)\|([a-zA-Z0-9]+)}/);
                        if (tokenParts && tokenParts.length == 3) {
                            // Found a variable.
                            var name = tokenParts[2];

                            // Check if the value matches the variable type.
                            var isValidType = true;
                            var type = slots[name];
                            switch (type) {
                                case 'NUMBER': isValidType = parseFloat(word); break;
                                case 'DATE': isValidType = Date.parse(word); break;
                                case 'LITERAL': isValidType = true; break;
                            };

                            if (isValidType) {
                                // It's a valid variable and type.
                                result.pairs.push({ name: name, value: word });
                            }
                            else {
                                // It's a variable, but the type is wrong (ie., text supplied where a number should be, etc).
                                result.isValid = false;
                                break;
                            }
                        }
                        else if (token && /^(\{.+\})$/.test(token)) {
                            // token is a custom slot type {SomeType}.
                            var name = token.substring(1, token.length - 1);
                            if (slots[name]) {
                                // This is a valid custom slot type.
                                result.pairs.push({ name: name, value: word });
                            }
                        }
                        else {
                            result.isValid = false;
                            break;
                        }
                    }
                }
            }
            else {
                result.isValid = false;
                continue;
            }
        }
        else {
            result.isValid = false;
        }

        if (result.isValid) {
            break;
        }
    };

    return result;
}
