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

import * as Iopa from 'iopa'
const { SERVER } = Iopa.constants
import { BOT } from '../constants'
import { Session } from 'inspector'
import { SkillsCapability } from '../iopa-bot-framework'
import Skill from '../schema/skill'

export default function parseIntent(
  context: Iopa.Context,
  next: () => Promise<void>
): Promise<void> {
  // Ensure this context record is actually a valid (bot) message
  if (!context[BOT.Session] || !context[BOT.Text]) {
    return next()
  }

  const session: Session = context[BOT.Session]
  const skills = (context[SERVER.Capabilities][
    BOT.CAPABILITIES.Skills
  ] as SkillsCapability).skills

  context[BOT.Slots] = {}

  let skill: Skill

  //
  // FIRST CHECK CURRENT SKILL (IF IN SESSION)
  //

  if (session[BOT.Skill]) {
    skill = skills[session[BOT.Skill]]

    if (!skill) {
      // not a recognized skill so clear
      context[BOT.Session][BOT.Skill] = null
    } else if (parseSkillIntents(skill, context)) {
      session[BOT.NewSession] = false
      session[BOT.Skill] = skill.name
      return invokeIntent(context, next)
    }
  }

  //
  // CHECK DEFAULT SKILL (IF DIFFERENT)
  //

  if (session[BOT.Skill] != 'default') {
    skill = skills['default']

    if (parseSkillIntents(skill, context)) {
      session[BOT.NewSession] = false
      return invokeIntent(context, next)
    }
  }

  //
  // CHECK ALL OTHER GLOBAL SKILLS
  //

  for (let key in skills) {
    let skill = skills[key]

    if (
      skill.isGlobal() &&
      skill.name != 'default' &&
      skill.name != session[BOT.Skill]
    ) {
      if (parseSkillIntents(skill, context)) {
        if (!session[BOT.Skill]) {
          session[BOT.NewSession] = true
        } else {
          session[BOT.NewSession] = false
        }

        session[BOT.Skill] = skill.name

        break
      }
    }
  }

  return invokeIntent(context, next)
}

function parseSkillIntents(skill: Skill, context: Iopa.Context): boolean {
  let result = false

  if (context[BOT.Intent] == 'urn:io.iopa.bot:intent:literal') {
    // Go through each intent in the skill to find a valid response.
    for (var i in Object.keys(skill.intents)) {
      var key = Object.keys(skill.intents)[i]
      result = _matchUtterancesForIntent(skill, context, key)
      if (result) break
    }
  } else {
    result = _matchUtterancesForIntent(skill, context, context[BOT.Intent])
  }

  return result
}

function invokeIntent(
  context: Iopa.Context,
  next: () => Promise<void>
): Promise<void> {
  const session: Session = context[BOT.Session]

  const skills = (context[SERVER.Capabilities][
    BOT.CAPABILITIES.Skills
  ] as SkillsCapability).skills

  if (!context[BOT.Intent]) {
    return next()
  }

  if (!session[BOT.Skill]) {
    session[BOT.Skill] = 'default'
  }

  let intent = skills[session[BOT.Skill]].intents[context[BOT.Intent]]

  if (intent && intent['function']) {
    return intent['function'](context, next)
  }

  return next()
}

function _matchUtterancesForIntent(
  skill: Skill,
  context: Iopa.Context,
  intentkey: string
): boolean {
  const input: string = context[BOT.Text]

  const utterances: string[] = []

  skill
    .utterances()
    .split('\n')
    .forEach(function(template) {
      // Get the intent name from this template line.
      const matches = template.match(/([\/a-zA-Z0-9\.\:]+)\t/)
      if (matches && matches[1] == intentkey) {
        // The intent matches ours, let's use it. First, strip out intent name.
        const start = template.indexOf('\t')
        template = template.substring(start + 1)

        // Add this utterance for processing.
        utterances.push(template)
      }
    })

  if (!skill.intents[intentkey]) {
    if (intentkey != BOT.INTENTS.Launch)
      context.log('Missing Schema for intent ' + intentkey)
    return false
  }

  const slots = skill.intents[intentkey].schema
    ? skill.intents[intentkey].schema.slots
    : null
  let result = _parseText(input, utterances, slots, skill.dictionaries)

  if (result.isValid) {
    let session = context[BOT.Session]
    context[BOT.Intent] = intentkey
    context[BOT.Slots] = {}
    for (let j in result.pairs) {
      let pair = result.pairs[j]
      context[BOT.Slots][pair.name] = pair.value
    }
  }

  return result.isValid
}

function _parseText(
  text: string,
  utterances: string[],
  slots: string[],
  dictionary: { [key: string]: string[] }
) {
  var result = {
    isValid: false,
    pairs: [] as { name: string; value: string }[]
  }

  for (var h in utterances) {
    var template = utterances[h]
    var regEx = /[ \n\r\t,\!`\(\)\[\]:;\"\?\/\\\<\+\=>]+/
    result = { isValid: true, pairs: [] }

    if (text === template) {
      break
    }

    if (template && template.length > 0) {
      // Remove leading and trailing periods.
      text = text.replace(/(^\.+)|(\.+$)/g, '').toLowerCase()

      // Find all variables and fill in values.
      var tokens = template.split(regEx).filter(function(e) {
        return e
      })
      var words = text.split(regEx).filter(function(e) {
        return e
      }) // remove empty strings.

      if (tokens.length == words.length) {
        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i]
          var word = words[i]

          if (token != word) {
            // A word doesn't match, but is it a variable?
            var tokenParts = token.match(/{([a-zA-Z0-9\_\']+)\|([a-zA-Z0-9]+)}/)
            if (tokenParts && tokenParts.length == 3) {
              // Found a variable.
              var name = tokenParts[2]

              // Check if the value matches the variable type.
              var isValidType: boolean
              var type = slots[name]
              switch (type) {
                case 'NUMBER':
                  isValidType = !!parseFloat(word)
                  break
                case 'DATE':
                  isValidType = !!Date.parse(word)
                  break
                case 'LITERAL':
                  isValidType = true
                  break
                default:
                  isValidType = false
                  // This is a slot variable, check if the value exists in the dictionary.
                  var utteranceValue = tokenParts[1]
                  if (utteranceValue.toLowerCase() == word.toLowerCase()) {
                    isValidType = true
                  } else if (dictionary && dictionary[type]) {
                    var array = dictionary[type]
                    var arraylength = array.length

                    for (var j = 0; j < arraylength; j++) {
                      var dictionaryValue = dictionary[type][j]
                      if (word.toLowerCase() == dictionaryValue.toLowerCase()) {
                        isValidType = true
                        break
                      }
                    }
                  }
              }

              if (isValidType) {
                // It's a valid variable and type.
                result.pairs.push({ name: name, value: word })
              } else {
                // It's a variable, but the type is wrong (ie., text supplied where a number should be, etc).
                result.isValid = false
                break
              }
            } else if (token && /^(\{.+\})$/.test(token)) {
              // token is a custom slot type {SomeType}.
              var name = token.substring(1, token.length - 1)
              if (slots[name]) {
                // This is a valid custom slot type.
                result.pairs.push({ name: name, value: word })
              }
            } else {
              result.isValid = false
              break
            }
          }
        }
      } else {
        result.isValid = false
        continue
      }
    } else {
      result.isValid = false
    }

    if (result.isValid) {
      break
    }
  }

  return result
}
