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

import {
  FC,
  IopaBotContext,
  BotDialog,
  IopaBotApp,
  BotSessionDialogLegacy
} from 'iopa-types'

import { BOT } from '../constants'

class Dialog implements BotDialog {
  public name: string

  public steps: DialogStep[]

  constructor(name, steps) {
    this.name = name
    this.steps = steps
  }
}

type DialogStep = string[] | FC

export default class DialogManager {
  app: IopaBotApp

  dialogs: { [key: string]: Dialog } = {}

  constructor(app: IopaBotApp) {
    this.app = app

    this.app.dialog = (name, ...args) => {
      if (!(typeof name === 'string')) {
        throw new Error(
          'dialog must start with dialog name, then array of intents, then function to call'
        )
      }

      this.dialogs[name] = new Dialog(name, args)
    }

    app.setCapability('urn:io.iopa.bot:dialog', {
      'iopa.Version': BOT.VERSION,
      dialogs: this.dialogs,
      beginDialog: (
        name: string,
        context: IopaBotContext,
        next: () => Promise<void>
      ) => {
        const dialog = this.dialogs[name]

        if (!dialog) {
          console.log(`Dialog ${name} not a v1 dialog`)
          return next()
        }

        let dialogFunc = dialog.steps[0] as FC

        if (typeof dialogFunc !== 'function') {
          dialogFunc = dialog.steps[1] as FC
          context.get('bot.Session').set('bot.CurrentDialog', {
            name: dialog.name,
            step: 2,
            totalSteps: dialog.steps.length
          })
        } else {
          context.get('bot.Session').set('bot.CurrentDialog', {
            name: dialog.name,
            step: 1,
            totalSteps: dialog.steps.length
          })
        }

        //  resetSessionSkill(context)

        return dialogFunc(context, next)
      }
    })
  }

  async invoke(
    context: IopaBotContext,
    next: () => Promise<void>
  ): Promise<void> {
    if (context['urn:bot:dialog:invoke']) {
      const dialogId = context['urn:bot:dialog:invoke']
      await context
        .capability('urn:io.iopa.bot:dialog')
        .beginDialog(dialogId, context, next)
      return Promise.resolve(null)
    }

    if (!context[BOT.Intent]) {
      return next()
    }
    // must have an intent to process dialog

    console.log('>> skill', context.get('bot.Session').get('bot.Skill'))
    console.log('>> intent', context.get('bot.Intent'))
    console.log(
      '>> dialog',
      context.get('bot.Session').get('bot.CurrentDialog')
    )
    if (!context.get('bot.Session').get('bot.CurrentDialog')) {
      await this._matchBeginDialog(context, next)
      return Promise.resolve(null)
    }

    return this._continueDialog(context, next)
  }

  private async _matchBeginDialog(
    context: IopaBotContext,
    next
  ): Promise<void> {
    let dialogFunc: FC | null = null

    Object.keys(this.dialogs).some((key) => {
      const dialog = this.dialogs[key]

      if (typeof dialog.steps[0] !== 'function') {
        const intents = (dialog.steps[0] as unknown) as Array<string>
        if (
          intents.includes(context.get('bot.Intent')) ||
          intents.includes('*')
        ) {
          dialogFunc = dialog.steps[1] as FC
          context.get('bot.Session').set('bot.CurrentDialog', {
            name: dialog.name,
            step: 2,
            totalSteps: dialog.steps.length
          })
          resetSessionSkill(context)
          return true // break
        }
      }
      return false // continue
    })

    if (dialogFunc) {
      return dialogFunc(context, next)
    }
    return next()
  }

  private async _continueDialog(context: IopaBotContext, next): Promise<void> {
    const sessionDialog = context
      .get('bot.Session')
      .get('bot.CurrentDialog') as BotSessionDialogLegacy

    const dialog = this.dialogs[sessionDialog.name]

    if (!dialog) {
      // not a recognized flow but do not clear in case its a V2 dialog
      // with invalid consumer input, in which case we need to retain the
      // current dialog information to continue after the
      return this._matchBeginDialog(context, next)
    }

    if (sessionDialog.step >= dialog.steps.length) {
      // was at end of dialog so just clear
      context.get('bot.Session').set('bot.CurrentDialog', null)
      context.get('bot.Session').set('bot.LastDialogEndedDate', Date.now())
      resetSessionSkill(context)
      return this._matchBeginDialog(context, next)
    }

    let intentFilter: string[] | null
    let dialogFunc: FC

    intentFilter = dialog.steps[sessionDialog.step] as string[]

    if (typeof intentFilter === 'function') {
      // Dialog step has no intent filter, invoke dialogFunc
      dialogFunc = intentFilter
      intentFilter = null
    } else if (
      intentFilter &&
      !intentFilter.includes(context[BOT.Intent]) &&
      !intentFilter.includes('*')
    ) {
      // No matching intent for current dialog step, see if we should start another dialog
      return this._matchBeginDialog(context, next)
    } else {
      // Match with current dialog step intent filter, advance and invoke dialogFunc
      sessionDialog.step += 1
      dialogFunc = dialog.steps[sessionDialog.step] as FC
    }

    sessionDialog.step += 1

    await dialogFunc(context, next)
    return Promise.resolve(null)
  }
}

function resetSessionSkill(context: IopaBotContext) {
  context.get('bot.Session').set('bot.Skill', 'default')
  context.get('bot.Session').delete('bot.SkillVersion')
}
