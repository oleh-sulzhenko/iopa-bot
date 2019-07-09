import {
  default as IopaBotFramework,
  AppBotExtensions,
  DialogApp,
  SkillsCapability
} from './iopa-bot-framework'
import {
  ReactiveDialogsCapability,
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
