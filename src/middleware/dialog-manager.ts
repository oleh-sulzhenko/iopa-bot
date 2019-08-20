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
const { IOPA, SERVER } = Iopa.constants
import { BOT } from '../constants'

export interface DialogCapability {
  beginDialog(
    name: string,
    context: Iopa.Context,
    next: () => Promise<void>
  ): Promise<void>
}

class Dialog {
  public name: string
  public steps: DialogStep[]

  constructor(name, steps) {
    this.name = name
    this.steps = steps
  }
}

type DialogStep = string[] | Iopa.FC

export default class DialogManager {
  app: any
  dialogs: { [key: string]: Dialog } = {}

  constructor(app) {
    this.app = app

    app.dialog = (name, ...args) => {
      if (!(typeof name === 'string')) {
        throw new Error(
          'dialog must start with dialog name, then array of intents, then function to call'
        )
      }

      this.dialogs[name] = new Dialog(name, args)
    }

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Dialog] = {
      dialogs: this.dialogs,
      beginDialog: (
        name: string,
        context: Iopa.Context,
        next: () => Promise<void>
      ) => {
        const dialog = this.dialogs[name]

        if (!dialog) throw new Error('Dialog not recognized')

        let dialogFunc = dialog.steps[0] as Iopa.FC

        if (typeof dialogFunc != 'function') {
          dialogFunc = dialog.steps[1] as Iopa.FC
          context[BOT.Session][BOT.CurrentDialog] = {
            name: dialog.name,
            step: 2,
            totalSteps: dialog.steps.length
          }
        } else {
          context[BOT.Session][BOT.CurrentDialog] = {
            name: dialog.name,
            step: 1,
            totalSteps: dialog.steps.length
          }
        }

        return dialogFunc(context, next)
      }
    }

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Dialog][IOPA.Version] =
      BOT.VERSION
  }

  invoke(context, next) {
    if (context['urn:bot:dialog:invoke']) {
      const dialogId = context['urn:bot:dialog:invoke']
      return context[SERVER.Capabilities][BOT.CAPABILITIES.Dialog].beginDialog(
        dialogId,
        context,
        next
      )
    }

    if (!context[BOT.Intent]) return next()
    // must have an intent to process dialog

    console.log('>> skill', context[BOT.Session][BOT.Skill])
    console.log('>> intent', context[BOT.Intent])
    console.log('>> dialog', context[BOT.Session][BOT.CurrentDialog])

    if (!context[BOT.Session][BOT.CurrentDialog])
      return this._matchBeginDialog(context, next)

    return this._continueDialog(context, next)
  }

  private _matchBeginDialog(context, next) {

    let dialogFunc: Iopa.FC | null = null

    for (var key in this.dialogs) {
      const dialog = this.dialogs[key]

      if (typeof dialog.steps[0] != 'function') {
        let intents = (dialog.steps[0] as unknown) as Array<string>
        if (intents.includes(context[BOT.Intent]) || intents.includes('*')) {
          dialogFunc = dialog.steps[1] as Iopa.FC
          context[BOT.Session][BOT.CurrentDialog] = {
            name: dialog.name,
            step: 2,
            totalSteps: dialog.steps.length
          }
          break
        }
      }
    }

    if (dialogFunc) return dialogFunc(context, next)
    else return next()
  }

  private _continueDialog(context, next) {
    var sessionDialog = context[BOT.Session][BOT.CurrentDialog]

    var dialog = this.dialogs[sessionDialog.name]

    if (!dialog) {
      // not a recognized dialog so clear
      context[BOT.Session][BOT.CurrentDialog] = null
      return this._matchBeginDialog(context, next)
    }

    if (sessionDialog.step >= dialog.steps.length) {
      // was at end of dialog so just clear
      context[BOT.Session][BOT.CurrentDialog] = null
      context[BOT.Session][BOT.LastDialogEndedDate] = new Date().getTime()
      return this._matchBeginDialog(context, next)
    }

    let intentFilter: string[] | null
    let dialogFunc: Iopa.FC

    intentFilter = dialog.steps[sessionDialog.step] as string[]

    if (typeof intentFilter == 'function') {
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
      sessionDialog.step++
      dialogFunc = dialog.steps[sessionDialog.step] as Iopa.FC
    }

    sessionDialog.step++

    return dialogFunc(context, next)
  }
}
