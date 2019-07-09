"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Iopa = require("iopa");
const { IOPA, SERVER } = Iopa.constants;
const constants_1 = require("../constants");
class SessionMiddleware {
    constructor(app) {
        if (!app.properties[SERVER.Capabilities]['urn:io.iopa.database:session'] &&
            !app.properties[SERVER.Capabilities]['urn:io.iopa.database'])
            throw new Error('Session Middleware requires database middleware');
        this.app = app;
        var db = app.properties[SERVER.Capabilities]['urn:io.iopa.database:session'] ||
            app.properties[SERVER.Capabilities]['urn:io.iopa.database'];
        this.db = db;
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Session] = {
            /** return item from session storage */
            get: (id, timeout) => __awaiter(this, void 0, void 0, function* () {
                if (!this.app) {
                    return undefined;
                }
                var dbpath = 'sessions/' + id;
                let session = yield db.get(dbpath);
                if (!session) {
                    session = {
                        id: id,
                        updated: new Date().getTime()
                    };
                    db.put(dbpath, session);
                    return session;
                }
                if (timeout && timeout > 0) {
                    var updated = new Date(session.updated);
                    var expiration = new Date(new Date().getTime() - timeout);
                    if (updated < expiration) {
                        session = {
                            id: id,
                            updated: updated.getTime()
                        };
                        db.put(dbpath, session);
                    }
                }
                return session;
            }),
            /** put item into session storage */
            put: (session) => {
                if (!this.app) {
                    return undefined;
                }
                var dbpath = 'sessions/' + session.id;
                session.updated = new Date().getTime();
                db.put(dbpath, session);
                return Promise.resolve(undefined);
            },
            /** delete item from session storage */
            delete: (id) => {
                if (!this.app) {
                    return undefined;
                }
                var dbpath = 'sessions/' + id;
                return db.delete(dbpath);
            },
            dispose: () => {
                this.app = null;
                this.db = null;
            }
        };
        app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Session][IOPA.Version] = constants_1.BOT.VERSION;
    }
    invoke(context, next) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.app)
                return Promise.resolve();
            const sessiondb = this.app.properties[SERVER.Capabilities][constants_1.BOT.CAPABILITIES.Session];
            if (!context[constants_1.BOT.Session] &&
                context[constants_1.BOT.Address] &&
                context[constants_1.BOT.Address][constants_1.BOT.User]) {
                const session = yield sessiondb.get(context[constants_1.BOT.Address][constants_1.BOT.User]);
                context[constants_1.BOT.Session] = session;
            }
            yield next();
            if (context.response[constants_1.BOT.ShouldEndSession] ||
                Object.keys(context[constants_1.BOT.Session]).length == 1) {
                yield sessiondb['delete'](context[constants_1.BOT.Session].id);
            }
            else {
                yield sessiondb.put(context[constants_1.BOT.Session]);
            }
        });
    }
}
exports.default = SessionMiddleware;
