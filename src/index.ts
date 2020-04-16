import {
  default as IopaBotFramework,
  // @ts-ignore
  AppBotExtensions,
  // @ts-ignore
  DialogApp,
  // @ts-ignore
  SkillsCapability
} from './iopa-bot-framework'

import {
  // @ts-ignore
  ReactiveDialogsCapability,
  // @ts-ignore
  ReactiveDialogsSession,
  useReactiveDialogs
} from './middleware/reactive-dialogs-manager'

export type AppBotExtensions = AppBotExtensions
export type DialogApp = DialogApp
export type SkillsCapability = SkillsCapability
export type ReactiveDialogsCapability = ReactiveDialogsCapability
export type ReactiveDialogsSession = ReactiveDialogsSession

export { useReactiveDialogs }
export { IopaBotFramework as default }
export { BOT, default as constants } from './constants'
