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

const iopaBotFramework = require('iopa-bot'),
 iopa = require('iopa'),
 BOT = iopaBotFramework.constants.BOT;

require('iopa-bot-console');

var app = new iopa.App();

// use connector and Bot Framework

app.use(iopaBotFramework.connectors.console);

// add any first pass intent processors here e.g. Microsoft Luis, IBMWatson etc.

app.use(iopaBotFramework);

// ....

// define schema intents 

app.intent(BOT.INTENTS.Launch, { "utterances": ['/launch', '/open'] })

// define dialogs

app.dialog('/', [BOT.INTENTS.Launch], function(context, next) {
    context.response.say("Hello!  Please converse with this bot. ").send();
});

app.intent('helloIntent', { "utterances": ['hi', 'hello', 'hey'] }, function(context, next) {
     context.response.say("Hello World").send();
})

app.dialog('/unknown', '*', function(context, next) {
    context.response.say("I don't know what you mean by " + context[BOT.Text]).send();
});

// build and listen

app.build();
app.listen();

