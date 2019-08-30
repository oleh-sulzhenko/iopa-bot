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

import './polyfill/array'
import * as Iopa from 'iopa'
const { IOPA, SERVER } = Iopa.constants
import { BOT } from './constants'

import { default as sessionMiddleware } from './middleware/session'
import { default as DialogManagerMiddleware } from './middleware/dialog-manager'
import { default as ReactiveDialogsMiddleware, 
  ReactiveDialogsCapability
} from './middleware/reactive-dialogs-manager'
import { default as IntentParserMiddleware } from './middleware/intent-parser'
import { default as Skill } from './schema/skill'

export interface SkillsCapability {
  /** debugging is verbose for this skill */
  verbose: boolean
  /**  session timeout in milliseconds, 0 to disable */
  timeout: 300000 //
  /** map of skill names to skills */
  skills: { [key: string]: Skill }
  /** add a new skill with given name and return it */
  add(name: string): Skill
  /** get the skill with the given name */
  skill(name: string): Skill | undefined
}

export interface AppBotExtensions {
  /** register a new intent handler for the default skill  */
  intent(intentName: string, func: Iopa.FC): Skill
  intent(intentName: string, schema: any, func?: Iopa.FC): Skill
  intent(intentName: string, schema: any | Iopa.FC, func?: Iopa.FC): Skill

  /** register a new dictionary for the default skill  */
  dictionary(dictionary: { [key: string]: string[] }): Skill

  /** register a new skill  */
  skill(name: string): Skill

  /** @deprecated add a v1 dialog;  use reactivedialogs.use() going forward */
  dialog(name: string, ...args: any[]): void

  /** shortcut access to reactivedialogs capability */
  reactivedialogs: ReactiveDialogsCapability
}

export interface DialogApp extends Iopa.App, AppBotExtensions {}

class SkillsManager {
  private defaultSkill: Skill

  constructor(app: Iopa.App & AppBotExtensions) {
    console.log('REGISTERED SKILLS MANAGER on ' + app.properties[SERVER.AppId])
    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills] = {
      verbose: false,
      timeout: 300000, // session timeout in milliseconds, 0 to disable
      skills: {} as { [key: string]: Skill },

      add: function(name) {
        if (!this.skills[name]) this.skills[name] = new Skill(name)
        return this.skills[name]
      },

      skill: function(name) {
        return this.skills[name]
      }
    } as SkillsCapability

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills][IOPA.Version] =
      BOT.VERSION
    this.defaultSkill = app.properties[SERVER.Capabilities][
      BOT.CAPABILITIES.Skills
    ].add('default')

    app.intent = this.defaultSkill.intent.bind(this.defaultSkill)
    app.dictionary = this.defaultSkill.dictionary.bind(this.defaultSkill)

    app.skill = function(name: string) {
      name = name || 'default'
      return app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills].add(
        name
      )
    }
    
    app.use(sessionMiddleware, "iopa-bot-sessionMiddleware")
    app.use(IntentParserMiddleware, "iopa-bot-IntentParserMiddleware")
    app.use(ReactiveDialogsMiddleware, "iopa-bot-ReactiveDialogsMiddleware")
    app.use(DialogManagerMiddleware, "iopa-bot-DialogManagerMiddleware")
    console.log("registered iopa-bot middleware")
  }
}

const IopaBotFramework = function(this, app: Iopa.App) {
  this.ref = new SkillsManager(app)
}

IopaBotFramework.connectors = {} as { [key: string]: (app: any) => any }

export default IopaBotFramework
