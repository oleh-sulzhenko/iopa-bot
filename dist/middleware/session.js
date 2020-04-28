"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
                else {
                    session.id = id;
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
            put: (session) => {
                if (!this.app) {
                    return undefined;
                }
                var dbpath = 'sessions/' + session.id;
                session.updated = new Date().getTime();
                db.put(dbpath, session);
                return Promise.resolve(undefined);
            },
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
                console.log("READ SESSION. SOURCE: " + context["urn:session:source"] + " Session:\n" + JSON.stringify(session, null, 2));
                context[constants_1.BOT.Session] = session;
            }
            yield next();
            if (context.response[constants_1.BOT.ShouldEndSession] ||
                Object.keys(context[constants_1.BOT.Session]).length == 1) {
                yield sessiondb['delete'](context[constants_1.BOT.Session].id);
            }
            else {
                try {
                    yield sessiondb.put(context[constants_1.BOT.Session]);
                    console.log("SAVED SESSION. SOURCE: " + context["urn:session:source"] + " Session:\n" + JSON.stringify(context[constants_1.BOT.Session], null, 2));
                }
                catch (err) {
                    console.log("SESSION ERROR. SOURCE: " + context["urn:session:source"] + " Session:\n" + JSON.stringify(context[constants_1.BOT.Session], null, 2) + "\nError: " + err);
                }
            }
        });
    }
}
exports.default = SessionMiddleware;
