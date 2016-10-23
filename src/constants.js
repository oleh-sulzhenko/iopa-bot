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

exports.BOT = {
    Source: "bot:Source",
    Intent: "bot:Intent",
    Text: "bot:Text",
    Address: "bot:Address",
    ChannelId: "bot:ChannelId",
    User: "bot:User",
    Bot: "bot:Bot",
    Conversation: "bot:Conversation",
    MessageId: "bot:MessageId",
    Session: "bot:Session",
    OrgUnit: "bot:OrgUnit",
    Say: "bot:Say",
    Card: "bot:Card",
    Reprompt: "bot:Reprompt",
    ShouldEndSession: "bot:ShouldEndSession",
    Send: "bot:Send",
    Fail: "bot:Fail",
    Timestamp: "bot:Timestamp",
    
    // Session Variables:
    Skill: "bot:Skill",
    Slots: "bot:Slots",
    Variables: "bot:Variables",
    NewSession: "bot:NewSession",
    CurrentDialog: "bot:CurrentDialog",

    CAPABILITIES: {
        Slack: "urn:io.iopa.bot:slack",
        Console: "urn:io.iopa.bot:console",
        Skills: "urn:io.iopa.bot:skills",
        Dialog: "urn:io.iopa.bot:dialog",
        Session: "urn:io.iopa.bot:session"
    },
    
    VERSION: "1.4",

    INTENTS: {
        Launch: "urn:io.iopa.bot:launch",
        Yes: "urn:io.iopa.bot:yesintent",
        No: "urn:io.iopa.bot:nointent",
        SessionEnded: "urn:io.iopa.bot:sessionended"
    }
}
