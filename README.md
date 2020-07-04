# [![IOPA](http://iopa.io/iopa.png)](http://iopa.io)<br> iopa-bot

[![NPM](https://img.shields.io/badge/iopa-certified-99cc33.svg?style=flat-square)](http://iopa.io/)
[![NPM](https://img.shields.io/badge/iopa-bot%20framework-F67482.svg?style=flat-square)](http://iopa.io/)

[![NPM](https://nodei.co/npm/iopa-bot.png?downloads=true)](https://nodei.co/npm/iopa-bot/)

## About

This repository contains the IOPA Bot Framework for writing and running Conversational Agents.

Unlike most IOPA example implementations, this repository is not sufficient to develop a working app. It does
not yet provide the connectors but these will be published over time.

## Background

Conversational agents (or bots) can run in many environments, including Amazon Alexa, Facebook Messenger, WhatsApp, WeChat, Slack, Skype, etc.

Back in 2015, the number of global users of the largest four of these environments surpassed the largest four social networks for the first time.

## Limitations of Existing Solutions

Writing a bot generally requires platform specific code to receive input from human participants and to reply with cards, voice, and text message. Yet
the basic architecture of most bots is similar, and so we need a level of astraction to harmonize the platform differences, enable common code for the most
commonly used functions, and at the same time take advantage of pltaform-specific features.

Some bot frameworks such as the Microsoft Bot Framework already do a lot of this abstraction but suffer from a few limitations:

1. Some use a properietary server component that handle all the authentication and authorization, but therefore are not able to use platform-specific  
   features (e.g., Slack connector in Microsoft bot framework handles free text but not Slack commands), and make using custom authentication in other parts
   of the app challenging (e.g., associating users across multiple third party networks).
2. Others such as alexa-app, do not provide a full-featured way of handling dialogs of multiple exchanges
3. Defining the meta data for natural language processing is sometimes handled by the service provider (e.g., Amazon Alexa, IBM Watson) and mostly not.
4. Chat bots are ripe for edge functions on Amazon Lambda, Azure Functions, etc., but not all frameworks make this abstraction easy.

## The `iopa-bot` solution

This framework provides a lightweight abstraction layer to translate the request and response into a format
that can be reused regardless of the host environment, and can be used locally for console testing just as easily as remotely. It sits on top
of iopa-edge so can be used in any edge environment, locally on an express server, or on custom infrastructure.

`iopa-bot` provides an opinionated way to define converational schemas, with industry-standard features such as dialogs, intents, slots, and utterances and exports this
metadata for direct loading into the service provider (e.g., Amazon Alexa).

It is one of the few bot frameworks today that can serve both an Alexa bot and a Text-based chat bot such as Slack, with the same application codeset.

## Usage

```bash
npm install iopa-bot
```

## Example App

```js
const iopaEdge = require('./iopa-edge'),
  iopa = require('iopa').App,
  connector_slack = require('./connectors/slack'),
  iopaBotFramework = require('./iopa-bot'),
  bot_helloworld = require('./bot-skills/helloworld')

module.exports = iopaEdge.azure(function(context) {
  var app = new iopa()
  app.use(connector_slack)
  app.use(iopaBotFramework)
  app.use(bot_helloworld)
  app.build()

  return app.invoke(context)
})
```

See also [`/test/index.js`](./test/index.js) for a self-contained console application

## Example Skill (bot_helloworld.js)

```js
const iopa = require('iopa'),
  constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  BOT = require('iopa-bot').constants.BOT

module.exports = function SkillsContainer(app) {
  app.intent(
    'hello',
    {
      utterances: ['hi', 'hello', 'hey']
    },
    function(context, next) {
      context.response.say('Hi there.')
      return context.response.send().then(next)
    }
  )
}
```

## Example Dialog Skill (bot_helloworld.js)

```js
const iopa = require('iopa'),
  constants = iopa.constants,
  IOPA = constants.IOPA,
  SERVER = constants.SERVER,
  BOT = require('iopa-bot').constants.BOT

module.exports = function SkillsContainer(app) {
  app.dialog(
    'QuestionDialog',
    function displayquestion(context, next) {
      var card = {
        type: 'Standard',
        text: 'Are you happy?',
        title: 'A sample question',
        image: {
          smallImageUrl: 'https://crossorigin.me/https://github.io/small.png',
          largeImageUrl: 'https://crossorigin.me/https://github.io/large.png'
        },
        attachments: [
          {
            actions: [
              {
                text: 'Yes',
                type: 'button',
                value: 'YesIntent'
              },
              {
                text: 'No',
                type: 'button',
                value: 'NoIntent'
              }
            ]
          }
        ]
      }
      return context.response
        .card(card)
        .send()
        .then(next)
    },
    ['YesIntent', 'NoIntent'],
    function(context, next) {
      var value
      switch (context[BOT.Intent]) {
        case 'NoIntent':
          value = 0
          break
        case 'YesIntent':
          value = 1
          break
      }
      context.response
        .status(200)
        .say('value = ' + value)
        .send()
        .then(next)
      return context[SERVER.Capabilities][BOT.CAPABILITIES.Dialog].beginDialog(
        'WrapupDialog',
        context,
        next
      )
    }
  )
}
```

## Reference

### Skills

Each conversational agent is made up of one or more skills. A skill is a set of machine intelligence functions that generally relate to a common
application domain. Some skills (e.g., weather) may be shared across multiple bots.

### Sessions

Each exchange between a human and a bot (or two bots) is managed in a virtual session. This is not necessarily and in fact unlikely to be a transport
session, but does allow for session context data to be persisted across the duration of the session.

A session may be handled by (edge) cloud functions running across multiple regions or infrastructure, so the persistence (provided by the connector or
source service provider) can be thought of as a temporary global data store unique to this session.

### Intents

An intent is the meaning of what the remote participant is trying to convey. There are usually multiple ways (utterances) to say
a given intent.

Defining an intent is just like using a router in any web framework:

```js
app.intent(INTENT_NAME, function(context, next){ .... });
```

The combined schema for all intents can be summarized (for upload to Alexa for example) by using

```js
context.log(
  app.properties['server.Capabilities']['urn:io.iopa.bot:skills']
    .skill('default')
    .schema()
)
```

### Utterances

Example utterances that the user might say to mean a given intent

Define utterances as part of the intent function:

```js
app.intent("YesIntent"
 {
    "utterances": ["yes", "sure", "yup"]
  },
  function(context, next){ .... });
```

All utterances can be summarized (for upload to Alexa for example) by using

```js
context.log(
  app.properties['server.Capabilities']['urn:io.iopa.bot:skills']
    .skill('default')
    .utterances()
)
```

### Slots

A slot is a variable of a given type that is provided by the user for a given utterance

Define slots as part of the intent function:

```js
app.intent('SumAnswerIntent',
  {
      "slots": [
        {
          "name": "Answer",
          "type": "NUMBER"
        }],
      "utterances": ["The sum is {Answer}"]
    });
  function(context, next){ .... });
```

### Request

An event indicating that the user has invoked the conversational agent, either by launching it or "saying" something

Access variables on the request as direct keys of the iopa context record

```js
var intent = context['bot.Intent']
```

### Response

A (reactive) response to a given request that the bot issues after processing a request.

Access functions on the response as direct keys of the iopa context.response record. Most functions return the response
record and so functions can be chained.

```js
context.response
  .status(200)
  .say('Hello World')
  .send()
```

### Pro-active response

An outbound message that is issued in a given session but not immediately upon receiving a request; for example a bot may
respond straight away, but later send another message in follow up.

### dialogs

A dialog is the logical expected grouping of requests and responses. Often these are waterfall in nature (request -> response, next request -> response, last request -> response);
A dialog may return a response to the remote participant, do nothing, or launch another dialog (immediately).

### Context record

#### Request Data

| Required | IOPA Key Name   | Value Description                                                                                                                                   |
| :------: | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
|   Yes    | 'bot.Source'    | The urn of the conversational agent service provider e.g., "urn:io.iopa.bot:slack", "urn:io.iopa.bot:alexa"                                         |
|   Yes    | 'bot.Intent'    | The intent of the message (usually derived in middleware by parsing audio or free form text, but may be provided by service provider such as Alexa) |
|    No    | 'bot.Text'      | The original source message as entered by the user                                                                                                  |
|    No    | 'bot.MessageId' | The unique identifier for this particular context record                                                                                            |
|   Yes    | bot:Timestamp"  | The timestamp (in milliseconds since epoch) of the message                                                                                          |
|   Yes    | 'bot.Session'   | A read/write property dictionary of session data that is persisted for the entire session (even across host execution servers/regions)              |
|    No    | 'bot.Slots'     | The variables values in the input message that correspond to the variable keys for this intent/utterance                                            |
|    No    | 'bot.Variables' | The variables keys that correspond to the variable values provided in the input message                                                             |

#### Request bot.Address Sub fields

| Required | IOPA Key Name      | Value Description                                                                                                            |
| :------: | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
|   Yes    | 'bot.User'         | The unique id of the user (within the domain of this source)                                                                 |
|   Yes    | 'bot.Bot'          | The unique id of the bot (within the domain of this sourcee)                                                                 |
|    No    | "bot.Conversation" | The conversation identifier                                                                                                  |
|   Yes    | "bot.Session"      | The unique identifier for this session (not necessarily unique across time, but unique for a given exchange at a given time) |
|    No    | 'bot.OrgUnit'      | The team or organizational identifier (e.g., Slack team)                                                                     |

### Session bot.Session Sub fields

| Required | IOPA Key Name       | Value Description                                                                                                      |
| :------: | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
|   Yes    | 'bot.Skill'         | The name of the skill that is currently being invoked for this session (used internally by dialog manager, but public) |
|   Yes    | 'bot.NewSession'    | The associated request is the first one for this session                                                               |
|    No    | 'bot.CurrentDialog' | The name and step of the current dialog being executed (used internally by dialog manager)                             |

### Response functions

| Required | IOPA Key Name          | Value Description                                                                                                           |
| :------: | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
|   Yes    | say                    | `void func(text)` Reply to the user with the given text; calling successively before Send will append multiple lines        |
|   Yes    | card                   | `void func(object)` Reply to the user with the given card which can include text, images, buttons etc.                      |
|   Yes    | show                   | `void func(object)` Show on the secondary modality (or display) the given card which can include text, images, buttons etc. |
|   Yes    | 'bot.Reprompt'         | `void func(text)` Store the text with which to reprompt the user in case of error/timeout                                   |
|   Yes    | 'bot.ShouldEndSession' | `void func(boolean)` Indicate that on completion of this exchange the session should be closed and disposed                 |
|   Yes    | 'bot.Send'             | `void func()` Display/send the text and/or cards queued up by the above functions                                           |
|   Yes    | 'bot.Fail'             | `void func(err)` Display/send the error message as the body of the response instead of the text/card already queued up      |
|   Yes    | status                 | `void func(int)` Set the status code (e.g., 200 for OK, 500 for server error)                                               |

## Roadmap

Note: connectors will be released in the future for each of the major bot service providers. Contributions are welcome.

## Inspiration / Third Party

The conversational schema is based on most common bot frameworks but inspired by the Amazon Alexa schema and alexa-app Copyright (c) 2016 Matt Kruse licensed under MIT

The dialog approach is based on several common bot frameworks but influenced by the open source Microsoft Bot Framework

The parsing and matching functions are based on chatskills Copyright (c) 2016 Kory Becker licensed under MIT
and alexa-app Copyright (c) 2016 Matt Kruse licensed under MIT

## License

Apache-2.0

## API Reference Specification

[![IOPA](http://iopa.io/iopa.png)](http://iopa.io)
