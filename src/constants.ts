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

export const BOT = {
  Source: 'bot:Source',
  Intent: 'bot:Intent',
  Text: 'bot:Text',
  Address: 'bot:Address',
  ChannelId: 'bot:ChannelId',
  User: 'bot:User',
  Bot: 'bot:Bot',
  Conversation: 'bot:Conversation',
  MessageId: 'bot:MessageId',
  Session: 'bot:Session',
  OrgUnit: 'bot:OrgUnit',
  Say: 'bot:Say',
  Card: 'bot:Card',
  Reprompt: 'bot:Reprompt',
  ShouldEndSession: 'bot:ShouldEndSession',
  Send: 'bot:Send',
  Fail: 'bot:Fail',
  Timestamp: 'bot:Timestamp',
  isDelayDisabled: 'bot:isDelayDisabled',

  // Session Variables:
  /** skill id for the current executing bot session */
  Skill: 'bot:Skill',
  /** V2 semversion of the current executing bot session;  checked in case flow definition upgraded mid conversation */
  SkillVersion: 'bot:SkillVersion',
  /** Skill data for current request */
  Slots: 'bot:Slots',
  /** property bag of all data collected in current skill session, including silent properties specifed on card actions */
  Variables: 'bot:Variables',
  /** Flag indicating whether this intent is the first for this session */
  NewSession: 'bot:NewSession',
  /** id of the dialog step being executed in the current skill */
  CurrentDialog: 'bot:CurrentDialog',
  /** timestamp that the last dialog ended */
  LastDialogEndedDate: 'bot:LastDialogEndedDate',
  /** flag indicating whether bot is expecting an answer to a multi-choice prompt */
  isMultiChoicePrompt: 'isMultiChoicePrompt',

  CAPABILITIES: {
    Slack: 'urn:io.iopa.bot:slack',
    Console: 'urn:io.iopa.bot:console',
    Skills: 'urn:io.iopa.bot:skills',
    Dialog: 'urn:io.iopa.bot:dialog',
    ReactiveDialogs: 'urn:io.iopa.bot:reactive-dialogs',
    Session: 'urn:io.iopa.bot:session'
  },

  VERSION: '2.0.0',

  INTENTS: {
    Launch: 'urn:io.iopa.bot:launch',
    Yes: 'urn:io.iopa.bot:yesintent',
    No: 'urn:io.iopa.bot:nointent',
    SessionEnded: 'urn:io.iopa.bot:sessionended'
  }
}

export default {
  BOT
}
