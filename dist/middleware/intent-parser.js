"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Iopa = require("iopa");
const { SERVER } = Iopa.constants;
const constants_1 = require("../constants");
function parseIntent(context, next) {
    if (!context[constants_1.BOT.Session] || !context[constants_1.BOT.Text]) {
        return next();
    }
    const session = context[constants_1.BOT.Session];
    const skills = context[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].skills;
    context[constants_1.BOT.Slots] = {};
    let skill;
    if (session[constants_1.BOT.Skill]) {
        skill = skills[session[constants_1.BOT.Skill]];
        if (!skill) {
            context[constants_1.BOT.Session][constants_1.BOT.Skill] = null;
        }
        else if (parseSkillIntents(skill, context)) {
            session[constants_1.BOT.NewSession] = false;
            session[constants_1.BOT.Skill] = skill.name;
            return invokeIntent(context, next);
        }
    }
    if (session[constants_1.BOT.Skill] != 'default') {
        skill = skills['default'];
        if (parseSkillIntents(skill, context)) {
            session[constants_1.BOT.NewSession] = false;
            session[constants_1.BOT.Skill] = 'default';
            return invokeIntent(context, next);
        }
    }
    for (let key in skills) {
        let skill = skills[key];
        if (skill.isGlobal() &&
            skill.name != 'default' &&
            skill.name != session[constants_1.BOT.Skill]) {
            if (parseSkillIntents(skill, context)) {
                if (!session[constants_1.BOT.Skill]) {
                    session[constants_1.BOT.NewSession] = true;
                }
                else {
                    session[constants_1.BOT.NewSession] = false;
                }
                session[constants_1.BOT.Skill] = skill.name;
                break;
            }
        }
    }
    return invokeIntent(context, next);
}
exports.default = parseIntent;
function parseSkillIntents(skill, context) {
    let result = false;
    const utterances = skill.utterances().split('\n');
    if (context[constants_1.BOT.Intent] == 'urn:io.iopa.bot:intent:literal') {
        for (var i in Object.keys(skill.intents)) {
            var key = Object.keys(skill.intents)[i];
            result = _matchUtterancesForIntent(skill, utterances, context, key);
            if (result)
                break;
        }
    }
    else {
        result = _matchUtterancesForIntent(skill, utterances, context, context[constants_1.BOT.Intent]);
    }
    return result;
}
function invokeIntent(context, next) {
    const session = context[constants_1.BOT.Session];
    const skills = context[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Skills].skills;
    if (!context[constants_1.BOT.Intent]) {
        return next();
    }
    if (!session[constants_1.BOT.Skill]) {
        session[constants_1.BOT.Skill] = 'default';
    }
    let intent = skills[session[constants_1.BOT.Skill]].intents[context[constants_1.BOT.Intent]];
    if (intent && intent['function']) {
        return intent['function'](context, next);
    }
    return next();
}
function _matchUtterancesForIntent(skill, allutterance, context, intentkey) {
    const input = context[constants_1.BOT.Text];
    const utterances = [];
    allutterance
        .forEach(function (template) {
        const matches = template.match(/([\/a-zA-Z0-9\.\:]+)\t/);
        if (matches && matches[1] == intentkey) {
            const start = template.indexOf('\t');
            template = template.substring(start + 1);
            utterances.push(template);
        }
    });
    if (!skill.intents[intentkey]) {
        if (intentkey != constants_1.BOT.INTENTS.Launch)
            context.log('Missing Schema for intent ' + intentkey);
        return false;
    }
    const slots = skill.intents[intentkey].schema
        ? skill.intents[intentkey].schema.slots
        : null;
    let result = _parseText(input, utterances, slots, skill.dictionaries);
    if (result.isValid) {
        let session = context[constants_1.BOT.Session];
        context[constants_1.BOT.Intent] = intentkey;
        context[constants_1.BOT.Slots] = {};
        for (let j in result.pairs) {
            let pair = result.pairs[j];
            context[constants_1.BOT.Slots][pair.name] = pair.value;
        }
    }
    return result.isValid;
}
function _parseText(text, utterances, slots, dictionary) {
    var result = {
        isValid: false,
        pairs: []
    };
    for (var h in utterances) {
        var template = utterances[h];
        var regEx = /[\s\n\r\t,\!`\(\)\[\]:;\"\?\/\\\<\+\=>]+/;
        result = { isValid: true, pairs: [] };
        if (text === template) {
            break;
        }
        if (template && template.length > 0) {
            text = text.replace(/(^\.+)|(\.+$)/g, '').toLowerCase();
            var tokens = template.split(regEx).filter(function (e) {
                return e;
            });
            var words = text.split(regEx).filter(function (e) {
                return e;
            });
            if (tokens.length == words.length) {
                for (var i = 0; i < tokens.length; i++) {
                    var token = tokens[i];
                    var word = words[i];
                    if (token != word) {
                        var tokenParts = token.match(/{([a-zA-Z0-9\_\']+)\|([a-zA-Z0-9]+)}/);
                        if (tokenParts && tokenParts.length == 3) {
                            var name = tokenParts[2];
                            var isValidType;
                            var type = slots[name];
                            switch (type) {
                                case 'NUMBER':
                                    isValidType = !!parseFloat(word);
                                    break;
                                case 'DATE':
                                    isValidType = !!Date.parse(word);
                                    break;
                                case 'LITERAL':
                                    isValidType = true;
                                    break;
                                default:
                                    isValidType = false;
                                    var utteranceValue = tokenParts[1];
                                    if (utteranceValue.toLowerCase() == word.toLowerCase()) {
                                        isValidType = true;
                                    }
                                    else if (dictionary && dictionary[type]) {
                                        var array = dictionary[type];
                                        var arraylength = array.length;
                                        for (var j = 0; j < arraylength; j++) {
                                            var dictionaryValue = dictionary[type][j];
                                            if (word.toLowerCase() == dictionaryValue.toLowerCase()) {
                                                isValidType = true;
                                                break;
                                            }
                                        }
                                    }
                            }
                            if (isValidType) {
                                result.pairs.push({ name: name, value: word });
                            }
                            else {
                                result.isValid = false;
                                break;
                            }
                        }
                        else if (token && /^(\{.+\})$/.test(token)) {
                            var name = token.substring(1, token.length - 1);
                            if (slots[name]) {
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
    }
    return result;
}
