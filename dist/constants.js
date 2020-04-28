"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT = {
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
    Skill: 'bot:Skill',
    SkillVersion: 'bot:SkillVersion',
    Slots: 'bot:Slots',
    Variables: 'bot:Variables',
    NewSession: 'bot:NewSession',
    CurrentDialog: 'bot:CurrentDialog',
    LastDialogEndedDate: 'bot:LastDialogEndedDate',
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
};
exports.default = {
    BOT: exports.BOT
};
