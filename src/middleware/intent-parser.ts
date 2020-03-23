/*
 * Iopa Bot Framework
 * Copyright (c) 2016-2020 Internet of Protocols Alliance
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

import { IopaBotContext, BotSkill, IopaBotSession } from 'iopa-types'
import { BOT } from '../constants'

export default function parseIntent(
  context: IopaBotContext,
  next: () => Promise<void>
): Promise<void> {
  // Ensure this context record is actually a valid (bot) message
  if (!context.get('bot.Session') || !context.get('bot.Text')) {
    return next()
  }

  const session: IopaBotSession = context.get('bot.Session')
  const { skills } = context.capability('urn:io.iopa.bot:skills')

  context.set('bot.Slots', {})
  //
  // FIRST CHECK CURRENT SKILL (IF IN SESSION)
  //

  if (session.get('bot.Skill')) {
    const skill = skills[session.get('bot.Skill')]

    if (!skill) {
      // not a recognized skill so clear
      session.set('bot.Skill', null)
    } else if (parseSkillIntents(skill, context)) {
      session.set('bot.NewSession', false)
      session.set('bot.Skill', skill.name)
      return invokeIntent(context, next)
    }
  }

  //
  // CHECK DEFAULT SKILL (IF DIFFERENT)
  //
  if (session.get('bot.Skill') !== 'default') {
    const skill = skills.default

    if (parseSkillIntents(skill, context)) {
      session.set('bot.NewSession', false)
      session.set('bot.Skill', 'default')
      return invokeIntent(context, next)
    }
  }

  //
  // CHECK ALL OTHER GLOBAL SKILLS
  //
  Object.keys(skills).some(key => {
    const skill = skills[key]

    if (
      skill.isGlobal() &&
      skill.name !== 'default' &&
      skill.name !== session.get('bot.Skill')
    ) {
      if (parseSkillIntents(skill, context)) {
        if (!session.get('bot.Skill')) {
          session.set('bot.NewSession', true)
        } else {
          session.set('bot.NewSession', false)
        }

        session.set('bot.Skill', skill.name)

        return true // break
      }
    }
    return false // continue
  })

  return invokeIntent(context, next)
}

function parseSkillIntents(skill: BotSkill, context: IopaBotContext): boolean {
  let result = false
  const utterances = skill.utterances().split('\n')

  if (context.get('bot.Intent') === 'urn:io.iopa.bot:intent:literal') {
    // Go through each intent in the skill to find a valid response.
    result = Object.keys(skill.intents).some(key => {
      return _matchUtterancesForIntent(skill, utterances, context, key)
    })
  } else {
    result = _matchUtterancesForIntent(
      skill,
      utterances,
      context,
      context.get('bot.Intent')
    )
  }

  return result
}

function invokeIntent(
  context: IopaBotContext,
  next: () => Promise<void>
): Promise<void> {
  const session: IopaBotSession = context.get('bot.Session')

  const { skills } = context.capability('urn:io.iopa.bot:skills')

  if (!context.get('bot.Intent')) {
    return next()
  }

  if (!session.get('bot.Skill')) {
    session.set('bot.Skill', 'default')
  }

  const intent =
    skills[session.get('bot.Skill')].intents[context.get('bot.Intent')]

  if (intent && intent.function) {
    return intent.function(context, next)
  }

  return next()
}

function _matchUtterancesForIntent(
  skill: BotSkill,
  allutterance: string[],
  context: IopaBotContext,
  intentkey: string
): boolean {
  const input: string = context.get('bot.Text')

  const utterances: string[] = []

  allutterance.forEach(template => {
    // Get the intent name from this template line.
    const matches = template.match(/([/a-zA-Z0-9.:]+)\t/)
    if (matches && matches[1] === intentkey) {
      // The intent matches ours, let's use it. First, strip out intent name.
      const start = template.indexOf('\t')
      // Add this utterance for processing.
      utterances.push(template.substring(start + 1))
    }
  })

  if (!skill.intents[intentkey]) {
    if (intentkey !== BOT.INTENTS.Launch) {
      console.log(`Missing Schema for intent ${intentkey}`)
    }
    return false
  }

  const slots = skill.intents[intentkey].schema
    ? skill.intents[intentkey].schema.slots
    : null
  const result = _parseText(input, utterances, slots, skill.dictionaries)

  if (result.isValid) {
    context.set('bot.Intent', intentkey)
    const newSlots: { [key: string]: string } = {}
    result.pairs.forEach(pair => {
      newSlots[pair.name] = pair.value
    })
    context.set('bot.Slots', newSlots)
  }

  return result.isValid
}

const REGEX = /[\s\n\r\t,!`()[\]:;"?/\\<+=>]+/
const REGEX2 = /{([a-zA-Z0-9_']+)\|([a-zA-Z0-9]+)}/
const REGEX3 = /^(\{.+\})$/

function _parseText(
  textToParse: string,
  utterances: string[],
  slots: { [key: string]: string },
  dictionary: { [key: string]: string[] }
) {
  let text = textToParse
  let result = {
    isValid: false,
    pairs: [] as { name: string; value: string }[]
  }

  utterances.some(template => {
    result = { isValid: true, pairs: [] }

    if (text === template) {
      result.isValid = true
      return true // break
    }

    if (template && template.length > 0) {
      // Remove leading and trailing periods.
      text = text.replace(/(^\.+)|(\.+$)/g, '').toLowerCase()

      // Find all variables and fill in values.
      const tokens = template.split(REGEX).filter(Boolean)
      const words = text.split(REGEX).filter(Boolean) // remove empty strings.

      if (tokens.length === words.length) {
        tokens.some((token, i) => {
          const word = words[i]

          if (token !== word) {
            // A word doesn't match, but is it a variable?
            const tokenParts = token.match(REGEX2)
            if (tokenParts && tokenParts.length === 3) {
              // Found a variable.
              const name = tokenParts[2]

              // Check if the value matches the variable type.
              let isValidType: boolean
              let utteranceValue: string
              const type = slots[name]
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
                  // eslint-disable-next-line prefer-destructuring
                  utteranceValue = tokenParts[1]
                  if (utteranceValue.toLowerCase() === word.toLowerCase()) {
                    isValidType = true
                  } else if (dictionary && dictionary[type]) {
                    isValidType = dictionary[type].some(
                      dictionaryValue =>
                        word.toLowerCase() === dictionaryValue.toLowerCase()
                    )
                  }
                  break
              }

              if (isValidType) {
                // It's a valid variable and type.
                result.pairs.push({ name, value: word })
              } else {
                // It's a variable, but the type is wrong (ie., text supplied where a number should be, etc).
                result.isValid = false
                return true // break
              }
            } else if (token && REGEX3.test(token)) {
              // token is a custom slot type {SomeType}.
              const name = token.substring(1, token.length - 1)
              if (slots[name]) {
                // This is a valid custom slot type.
                result.pairs.push({ name, value: word })
              }
            } else {
              result.isValid = false
              return true // break
            }
          }
          return false // continue
        })
      } else {
        result.isValid = false
        return false // continue
      }
    } else {
      result.isValid = false
    }

    if (result.isValid) {
      return true // break
    }
    return false // continue
  })

  return result
}
