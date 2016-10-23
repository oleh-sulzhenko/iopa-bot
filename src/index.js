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
  BOT = require('./constants').BOT;

const  sessionMiddleware = require('./middleware/session'),
    DialogManagerMiddleware = require('./middleware/dialogManager'),
    ItentParserMiddleware = require('./middleware/intentParser'),
    Skill = require('./schema/skill');

function SkillsManager(app) { 

     app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills] = {

        verbose: false,
        timeout: 300000, // session timeout in milliseconds, 0 to disable
        skills: {},

        add: function (name) {
            if (!this.skills[name])
                this.skills[name] = new Skill(name);
            return this.skills[name];
        },

        skill: function (name) {
            return this.skills[name];
        }

    }

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills][IOPA.Version] = BOT.Version;
    this.defaultSkill = app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills].add('default');
    app.intent = this.defaultSkill.intent.bind(this.defaultSkill);
    app.dictionary = this.defaultSkill.dictionary.bind(this.defaultSkill);

    app.use(sessionMiddleware);
    app.use(ItentParserMiddleware);
    app.use(DialogManagerMiddleware);
}

module.exports = SkillsManager;
module.exports.constants = require('./constants');

