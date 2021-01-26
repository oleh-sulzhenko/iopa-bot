/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Iopa Bot Framework
 * Copyright (c) 2016-2020 Internet Open Protocol Alliance
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

import * as Utterances from 'alexa-utterances'
import { FC, BotSkill, BotIntent, BotIntentSchemaAlexa } from 'iopa-types'
import { BOT } from '../constants'

export default class Skill implements BotSkill {
  /** unique short name of the skill */
  public name: string

  /** things to say  */
  public messages: { [key: string]: string }

  /** use a minimal set of utterances or the full cartesian product?  */
  public exhaustiveUtterances: boolean

  /**  A mapping of keywords to arrays of possible values, for expansion of sample utterances */
  public dictionaries: { [key: string]: string[] }

  /**  The itents that this skill can process */
  public intents: { [key: string]: BotIntent }

  /**  global skills are always used in parsing;  non-global only parsed when launched */
  private _global: boolean

  constructor(name: string) {
    this.name = name
    this._global = true
    this.messages = {
      // When an intent was passed in that the skill was not configured to handle
      NO_INTENT_FOUND:
        "Sorry, the skill didn't know what to do with that intent",
      // When the skill was used with 'open' or 'launch' but no launch handler was defined
      NO_LAUNCH_FUNCTION:
        'Try telling the skill what to do instead of opening it',
      // When a request type was not recognized
      INVALID_REQUEST_TYPE: 'Error: not a valid request',
      // If some other exception happens
      GENERIC_ERROR: 'Sorry, the application encountered an error'
    }
    // use a minimal set of utterances or the full cartesian product?
    this.exhaustiveUtterances = false
    // A mapping of keywords to arrays of possible values, for expansion of sample utterances
    this.dictionaries = {}

    this.intents = {}
  }

  public isGlobal(): boolean {
    return this._global
  }

  /** global skills are always used in parsing;  non-global only parsed when launched */
  global(flag: boolean): this {
    // global skills are always used in parsing;  non-global only parsed when launched
    this._global = flag
    return this
  }

  lookupIntent(utterances: string[]): string | undefined {
    const searchKey = utterances.join(':')

    const intent = Object.keys(this.intents)
      .map((key) => this.intents[key])
      .find(
        (intentfind) => intentfind.schema.utterances.join(':') === searchKey
      )

    return intent ? intent.name : undefined
  }

  /** register a new intent handler for this skill  */
  intent(intentName: string, func: FC): this

  intent(intentName: string, schema: any, func?: FC): this

  intent(intentName: string, schema: any | FC, func?: FC): this {
    if (intentName.indexOf(' ') > -1) {
      throw new Error(
        `Intent cannot be registered with spaces in the name "${intentName}"`
      )
    }

    if (typeof schema === 'function') {
      func = schema as FC
      schema = null
    }

    this.intents[intentName] = {
      name: intentName,
      function: func as FC
    }

    if (schema) {
      this.intents[intentName].schema = schema
    }

    return this
  }

  /** register a new dictionary for this skill  */
  dictionary(dictionary: { [key: string]: string[] }): this {
    Object.keys(dictionary).forEach((attrname) => {
      this.dictionaries[attrname] = dictionary[attrname]
    })
    return this
  }

  /** @deprecated For alexa-app compatiabilty, just register Intent handler of "urn:io.iopa.bot:launch" */
  launch(func: FC) {
    this.intent(BOT.INTENTS.Launch, func)
    return this
  }

  /** @deprecated For alexa-app compatiabilty,ust register Intent handler of "urn:io.iopa.bot:sessionended" */
  sessionEnded(func: FC) {
    this.intent(BOT.INTENTS.SessionEnded, func)
    return this
  }

  /** Export Helper Function to extract the schema and generate a schema JSON object */
  schema(): string {
    const schema = {
      intents: [] as BotIntentSchemaAlexa[]
    }

    Object.keys(this.intents).forEach((intentName) => {
      const intent: BotIntent = this.intents[intentName]
      const intentSchema: BotIntentSchemaAlexa = {
        intent: intent.name,
        slots: []
      }
      if (intent.schema) {
        if (intent.schema.slots) {
          Object.keys(intent.schema.slots).forEach((key) => {
            intentSchema.slots.push({
              name: key,
              type: intent.schema.slots[key]
            })
          })
        }
      }
      schema.intents.push(intentSchema)
    })
    return JSON.stringify(schema, null, 3)
  }

  /** Export Helper Function to generate a list of sample utterances */
  utterances(): string {
    let intent
    let out = ''

    Object.keys(this.intents).forEach((intentName) => {
      intent = this.intents[intentName]
      if (intent.schema && intent.schema.utterances) {
        intent.schema.utterances.forEach((sample) => {
          const list = Utterances(
            sample,
            intent.schema.slots,
            this.dictionaries,
            this.exhaustiveUtterances
          )
          list.forEach((utterance) => {
            out += `${intent.name}\t${utterance.replace(/\s+/g, ' ').trim()}\n`
          })
        })
      }
    })
    return out
  }
}
