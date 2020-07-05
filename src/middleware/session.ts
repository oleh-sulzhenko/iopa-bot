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
  Component,
  ISimpleDatabase,
  IopaBotApp,
  IopaBotSession,
  BotSessionBase,
  ISessionCapability,
  IopaBotContext
} from 'iopa-types'
import { IopaMap } from 'iopa'
import { BOT } from '../constants'

export default class SessionMiddleware implements Component {
  app: IopaBotApp<{}>

  db: ISimpleDatabase

  constructor(app: IopaBotApp<{}>) {
    if (
      !app.capability('urn:io.iopa.database:session') &&
      !app.capability('urn:io.iopa.database')
    ) {
      throw new Error('Session Middleware requires database middleware')
    }

    this.app = app

    this.db =
      app.capability('urn:io.iopa.database:session') ||
      app.capability('urn:io.iopa.database')

    app.setCapability('urn:io.iopa.bot:session', {
      'iopa.Version': BOT.VERSION,
      /** return item from session storage */
      get: async (id: string, timeout: number) => {
        if (!this.app) {
          throw new Error('Missing App')
        }

        const dbpath = `sessions/${id}`

        let sessionBase: Partial<BotSessionBase> = await this.db.get(dbpath)

        if (!sessionBase) {
          sessionBase = {
            id,
            updated: Date.now()
          }
          await this.db.put(dbpath, sessionBase)
          return new IopaMap(sessionBase) as IopaBotSession
        }
        sessionBase.id = id

        if (timeout && timeout > 0) {
          const { updated } = sessionBase
          const expiration = Date.now() - timeout

          if (updated < expiration) {
            sessionBase = {
              id,
              updated
            }
            await this.db.put(dbpath, sessionBase)
          }
        }

        return new IopaMap(sessionBase) as IopaBotSession
      },

      /** put item into session storage */
      put: async (session: IopaBotSession) => {
        if (!this.app) {
          return undefined
        }

        const dbpath = `sessions/${session.id}`
        session.updated = Date.now()
        await this.db.put(dbpath, session)
        return Promise.resolve(undefined)
      },

      /** delete item from session storage */
      delete: async (id: string) => {
        if (!this.app) {
          return
        }

        const dbpath = `sessions/${id}`
        await this.db.delete(dbpath)
      },

      dispose: () => {
        this.app = null
        this.db = null
      }
    } as ISessionCapability)
  }

  async invoke(context: IopaBotContext, next): Promise<void> {
    if (!this.app) {
      return
    }

    const sessiondb = this.app.capability('urn:io.iopa.bot:session')

    if (
      !context.get('bot.Session') &&
      context.get('bot.Address') &&
      context.get('bot.Address')['bot.User']
    ) {
      const session = await sessiondb.get(context[BOT.Address][BOT.User])

      context.set('bot.Session', session)
    }
    await next()
    if (
      context.response.get('bot.ShouldEndSession') ||
      Object.keys(context.get('bot.Session')).length === 1
    ) {
      await sessiondb.delete(context.get('bot.Session').id)
    } else {
      await sessiondb.put(context.get('bot.Session'))
    }
  }
}
