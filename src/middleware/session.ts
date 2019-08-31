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

interface Db {
  get<T>(path: string): Promise<T | null>
  put<T>(path: string, item: T): Promise<void>
  delete(path: string): Promise<void>
}

export interface Session {
  id: string
  updated: number
  [key: string]: any
}

export interface SessionDbCapability {
  /** return item from session storage */
  get(id: string, timeout: number): Promise<Session>

  /** put item into session storage */
  put(session: Partial<Session> & { id: string })

  /** delete item from session storage */
  delete(id: string)

  /** stop dialog manager and dispose resources */
  dispose()
}

export default class SessionMiddleware implements Iopa.Component {
  app: Iopa.App | null
  db: Db | null

  constructor(app: Iopa.App) {
    if (
      !app.properties[SERVER.Capabilities]['urn:io.iopa.database:session'] &&
      !app.properties[SERVER.Capabilities]['urn:io.iopa.database']
    )
      throw new Error('Session Middleware requires database middleware')

    this.app = app

    var db =
      app.properties[SERVER.Capabilities]['urn:io.iopa.database:session'] ||
      app.properties[SERVER.Capabilities]['urn:io.iopa.database']
    this.db = db

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session] = {
      /** return item from session storage */
      get: async (id: string, timeout: number) => {
        if (!this.app) {
          return undefined
        }

        var dbpath = 'sessions/' + id

        let session: Session = await db.get(dbpath)

        if (!session) {
          session = {
            id: id,
            updated: new Date().getTime()
          }
          db.put(dbpath, session)
          return session
        } else {
          session.id = id
        }

        if (timeout && timeout > 0) {
          var updated = new Date(session.updated)
          var expiration = new Date(new Date().getTime() - timeout)

          if (updated < expiration) {
            session = {
              id: id,
              updated: updated.getTime()
            }
            db.put(dbpath, session)
          }
        }

        return session
      },

      /** put item into session storage */
      put: (session: Session) => {
        if (!this.app) {
          return undefined
        }

        var dbpath = 'sessions/' + session.id
        session.updated = new Date().getTime()
        db.put(dbpath, session)
        return Promise.resolve(undefined)
      },

      /** delete item from session storage */
      delete: (id: string) => {
        if (!this.app) {
          return undefined
        }

        var dbpath = 'sessions/' + id
        return db.delete(dbpath)
      },

      dispose: () => {
        this.app = null
        this.db = null
      }
    } as SessionDbCapability

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session][
      IOPA.Version
    ] = BOT.VERSION
  }

  async invoke(context, next) {
    if (!this.app) return Promise.resolve()

    const sessiondb = this.app.properties[SERVER.Capabilities][
      BOT.CAPABILITIES.Session
    ]

    if (
      !context[BOT.Session] &&
      context[BOT.Address] &&
      context[BOT.Address][BOT.User]
    ) {
      const session = await sessiondb.get(context[BOT.Address][BOT.User])

      context[BOT.Session] = session
    }

    await next()

    if (
      context.response[BOT.ShouldEndSession] ||
      Object.keys(context[BOT.Session]).length == 1
    ) {
      await sessiondb['delete'](context[BOT.Session].id)
    } else {
      await sessiondb.put(context[BOT.Session])
    }
  }
}
