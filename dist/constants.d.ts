export declare const BOT: {
    Source: string;
    Intent: string;
    Text: string;
    Address: string;
    ChannelId: string;
    User: string;
    Bot: string;
    Conversation: string;
    MessageId: string;
    Session: string;
    OrgUnit: string;
    Say: string;
    Card: string;
    Reprompt: string;
    ShouldEndSession: string;
    Send: string;
    Fail: string;
    Timestamp: string;
    isDelayDisabled: string;
    /** skill id for the current executing bot session */
    Skill: string;
    /** V2 semversion of the current executing bot session;  checked in case flow definition upgraded mid conversation */
    SkillVersion: string;
    /** Skill data for current request */
    Slots: string;
    /** property bag of all data collected in current skill session, including silent properties specifed on card actions */
    Variables: string;
    /** Flag indicating whether this intent is the first for this session */
    NewSession: string;
    /** id of the dialog step being executed in the current skill */
    CurrentDialog: string;
    /** timestamp that the last dialog ended */
    LastDialogEndedDate: string;
    /** flag indicating whether bot is expecting an answer to a multi-choice prompt */
    isMultiChoicePrompt: string;
    CAPABILITIES: {
        Slack: string;
        Console: string;
        Skills: string;
        Dialog: string;
        ReactiveDialogs: string;
        Session: string;
    };
    VERSION: string;
    INTENTS: {
        Launch: string;
        Yes: string;
        No: string;
        SessionEnded: string;
    };
};
declare const _default: {
    BOT: {
        Source: string;
        Intent: string;
        Text: string;
        Address: string;
        ChannelId: string;
        User: string;
        Bot: string;
        Conversation: string;
        MessageId: string;
        Session: string;
        OrgUnit: string;
        Say: string;
        Card: string;
        Reprompt: string;
        ShouldEndSession: string;
        Send: string;
        Fail: string;
        Timestamp: string;
        isDelayDisabled: string;
        /** skill id for the current executing bot session */
        Skill: string;
        /** V2 semversion of the current executing bot session;  checked in case flow definition upgraded mid conversation */
        SkillVersion: string;
        /** Skill data for current request */
        Slots: string;
        /** property bag of all data collected in current skill session, including silent properties specifed on card actions */
        Variables: string;
        /** Flag indicating whether this intent is the first for this session */
        NewSession: string;
        /** id of the dialog step being executed in the current skill */
        CurrentDialog: string;
        /** timestamp that the last dialog ended */
        LastDialogEndedDate: string;
        /** flag indicating whether bot is expecting an answer to a multi-choice prompt */
        isMultiChoicePrompt: string;
        CAPABILITIES: {
            Slack: string;
            Console: string;
            Skills: string;
            Dialog: string;
            ReactiveDialogs: string;
            Session: string;
        };
        VERSION: string;
        INTENTS: {
            Launch: string;
            Yes: string;
            No: string;
            SessionEnded: string;
        };
    };
};
export default _default;
