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

import './polyfill/array'
import { IopaBotApp, BotSkill, IopaBotContext } from 'iopa-types'
import { BOT } from './constants'

import sessionMiddleware from './middleware/session'
import DialogManagerMiddleware from './middleware/dialog-manager'
import ReactiveDialogsMiddleware from './middleware/reactive-dialogs-manager'
import IntentParserMiddleware from './middleware/intent-parser'
import Skill from './schema/skill'

export default class IopaBotFramework {
    private defaultSkill: BotSkill

    private skills: { [key: string]: BotSkill } = {}

    constructor(app: IopaBotApp) {
        console.log(
            `REGISTERED SKILLS MANAGER on ${app.properties.get('server.AppId')}`
        )
        app.setCapability('urn:io.iopa.bot:skills', {
            'iopa.Version': BOT.VERSION,
            verbose: false,
            timeout: 300000, // session timeout in milliseconds, 0 to disable
            skills: this.skills,

            add: (name) => {
                if (!this.skills[name]) {
                    this.skills[name] = new Skill(name)
                }
                return this.skills[name]
            },

            skill: (name) => {
                return this.skills[name]
            },
        })

        this.defaultSkill = app
            .capability('urn:io.iopa.bot:skills')
            .add('default')

        app.intent = this.defaultSkill.intent.bind(this.defaultSkill)
        app.dictionary = this.defaultSkill.dictionary.bind(this.defaultSkill)

        app.skill = (name: string) => {
            name = name || 'default'
            return app.capability('urn:io.iopa.bot:skills').add(name)
        }

        app.use((context: IopaBotContext, next: () => Promise<void>) => {
            if (context.response) {
                context.response.get =
                    context.response.get ||
                    ((key: any) => {
                        return context.response[key]
                    })

                context.response.set =
                    context.response.set ||
                    ((key: any, value: any) => {
                        context.response[key] = value
                    })

                context.response.set(
                    'server.Capabilities',
                    context.get('server.Capabilities')
                )
            }
            return next()
        }, 'iopa-bot-framework')

        app.use(sessionMiddleware, 'iopa-bot-sessionMiddleware')
        app.use(IntentParserMiddleware, 'iopa-bot-IntentParserMiddleware')
        app.use(ReactiveDialogsMiddleware, 'iopa-bot-ReactiveDialogsMiddleware')
        app.use(DialogManagerMiddleware, 'iopa-bot-DialogManagerMiddleware')
        console.log('registered iopa-bot middleware')
    }
}
