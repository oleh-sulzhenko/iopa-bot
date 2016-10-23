/*
 * Iopa Bot Framework
 * Copyright (c) 2016 Internet of Protocols Alliance 
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

const iopa = require('iopa'),
    constants = iopa.constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER,
    BOT = require('../constants').BOT,
    path = require('path');

function SessionMiddleware(app) {

    if (!app.properties[SERVER.Capabilities]["urn:io.iopa.database"])
        throw new Error("Session Middleware requires database middleware");

    this.app = app;
    var db = app.properties[SERVER.Capabilities]["urn:io.iopa.database:session"] || app.properties[SERVER.Capabilities]["urn:io.iopa.database"];
    this.db = db;

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session] = {
        get: function (id, timeout) {

            var dbpath = path.join("sessions", id);
            return db.get(dbpath).then(function (session) {
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
                    var expiration = new Date((new Date()).getTime() - timeout);

                    if (updated < expiration) {
                        session = {
                            id: id,
                            updated: updated.getTime()
                        };
                        db.put(dbpath, session);
                    }
                }
                return session;
            });

       },
       put : function (session) {
           var dbpath = path.join("sessions", session.id);
           session.updated = new Date().getTime();
           db.put(dbpath, session);
           return Promise.resolve(null);
       },
       "delete" : function (id) {
           var dbpath = path.join("sessions", id);
           db.put(dbpath, null);
           return Promise.resolve(null);
       }
   }
   app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session][IOPA.Version] = BOT.Version;

}

module.exports = SessionMiddleware;

SessionMiddleware.prototype.invoke = function (context, next) {
    if (!context[BOT.Session]  && context[BOT.Address] && context[BOT.Address][BOT.User])
      return this.app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session].get(context[BOT.Address][BOT.User])
        .then(function(session){ context[BOT.Session] = session;  })
        .then(next)
        .then(function(){
            if (context.response[BOT.ShouldEndSession]) 
              this.app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session]["delete"](context[BOT.Session].id);
            else
              this.app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Session].put(context[BOT.Session]);
        });
    
    else return next();
}
