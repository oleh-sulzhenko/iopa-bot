import * as ReactiveCards from 'reactive-cards'
import {
  FlowElement,
  TableElement,
  DialogElement,
  ActionElement,
  CardElement,
  TextElement,
  ActionOpenUrlElement,
  Element,
  CustomElement,
  ActionSetElement,
  render
} from 'reactive-dialogs'
import * as Iopa from 'iopa'
const { IOPA, SERVER } = Iopa.constants
import { BOT } from '../constants'
import Skill from '../schema/skill'
import { asyncForEachIfTrue } from '../util/forEachAsync'
import { parse_url } from '../polyfill/parse_url'

/** Custom command handlers return true if should continue after, false to stop current flow */
export type CommandHandler = (
  command: string,
  props: { [key: string]: any },
  context: any
) => Promise<boolean>

// TO DO, get from host context
const defaultPauseInterval = 200
const logDebug = true

/** Reactive Dialogs Capability 'urn:io.iopa.bot:reactive-dialogs' */
export interface ReactiveDialogsCapability {
  /** register a reactives-dialog flow or table in the engine; it will not be rendered until renderFlow is called */
  use(
    /** JSX of dialog flow / table */
    jsx: ({ }) => FlowElement | TableElement,
    /** property bag of meta data associated with this flow */
    meta?: { [key: string]: string }
  ): void
  /** render an anonymous reactive-dialog flow or set of directives without pre-registration;
   * used for directives or other elements that don't have their own unique intents */
  render(
    element: Element,
    context: Iopa.Context,
    next: () => Promise<void>
  ): Promise<void>
  /** render (perform) a specific dialog and/or dialog step */
  renderFlow(
    /** id of flow to perform ; use undefined for current flow if there is one executing */
    flowId: string | undefined | null,
    /** id of dialog step to perform; use undefined for first dialog step in flow */
    dialogId: string | undefined | null,
    /* Context of current iopa record being executed */
    context: Iopa.Context,
    /* Iopa pipeline next, called by dialog flow handler if cannot handle this request */
    next: () => Promise<void>
  ): Promise<void>
  /** end the current flow if there is one being executed */
  end(context: Iopa.Context): Promise<void>
  /** map of command name and associated handlers; returns disposer to remove handler */
  registerCommand(command: string, handler: CommandHandler): () => void
  /** Version of this capability */
  'iopa.Version': string
  /** meta data for all currently registered flows */
  meta: { [key: string]: { [key: string]: string } }
  /** All currently registered lists */
  lists: { [key: string]: string[] }
  /** Meta data for all currently registered tables */
  tables: { [key: string]: { [key: string]: string | string[] } }
  /** set scheme for local resources e.g,, app:// */
  setLocalResourceProtocol(protocol: string): void
}

interface ReactiveDialogsCapabilityPrivate extends ReactiveDialogsCapability {
  /** map of command name and associated handlers, push to this array to register additional platform commands */
  _commandHandlers: Map<string, CommandHandler>
}

export interface SessionCurrentDialog {
  /* current step id */
  id: string
  /** version of the IOPA dialogs manager */
  iopaBotVersion: '2.0'
  /** sequence number of the directive last executed in the current dialog step */
  lastDirective: number | null
  /** id of step rendered before this one (for return logic) */
  previousId: string
  /** last set of actions prompted to participant */
  lastPromptActions: ActionElement[] | null
}

/** Reactive Dialogs Session passed to every context record */
export interface ReactiveDialogsSession {
  /** id of the dialog step being executed in the current skill */
  'bot:CurrentDialog': SessionCurrentDialog | null
  /** timestamp that the last dialog step ended */
  'bot:LastDialogEndedDate': number | null
  /** Flag indicating whether this intent is the first for this session */
  'bot:NewSession': boolean
  /** id of the current executing bot session */
  'bot:Skill': string
  /** V2 semversion of the current executing bot session;  checked in case flow definition upgraded mid conversation */
  'bot:SkillVersion': string
  /** Skill data for current request */
  'bot:Slots': string
  /** property bag of all data collected in current skill session, including silent properties specifed on card actions */
  'bot:Variables': any
}

export const useReactiveDialogs = (context: Iopa.Context) => {
  return context[SERVER.Capabilities][
    BOT.CAPABILITIES.ReactiveDialogs
  ] as ReactiveDialogsCapability
}

export const useBotSession = (context: Iopa.Context) =>
  [
    context[BOT.Session] as ReactiveDialogsSession,
    newState => {
      context[BOT.Session] = newState
        ? Object.assign(context[BOT.Session], newState)
        : { id: context[BOT.Session]['id'] }

      return context[SERVER.Capabilities][BOT.CAPABILITIES.Session].put(
        context[BOT.Session]
      )
    }
  ] as [ReactiveDialogsSession, (newState) => Promise<void>]

const RDM_VERSION = '2.0'

/**
 * The ReactiveDialogManager registers bot dialog flows provided as reactive-dialog
 * functional components.
 *
 * It maintains session state to keep track of the current dialog step and directive within a dialog step,
 * and manages intents to branch through the flow according to the declared logic
 * within the reactive-dialog directives
 */
export default class ReactiveDialogManager {
  app: any
  private flows: { [key: string]: FlowElement } = {}
  private flowsMeta: { [key: string]: { [key: string]: string } } = {}
  private tableLists: { [key: string]: string[] } = {}
  private tableMeta: { [key: string]: { [key: string]: string | string[] } } = {}
  private launchIntentsToFlows: { [key: string]: string } = {}

  private commandHandlers: Map<string, CommandHandler>

  /** public IOPA constructor used to register this capability */
  constructor(app) {
    this.app = app

    app.properties[SERVER.CancelTokenSource] =
      app.properties[SERVER.CancelTokenSource] ||
      new Iopa.util.CancellationTokenSource()
    app.properties[SERVER.CancelToken] =
      app.properties[SERVER.CancelTokenSource].token

    this.commandHandlers = new Map<string, CommandHandler>()

    //
    // set up useReactiveDialogs() public capability handle
    //

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.ReactiveDialogs] = {
      'iopa.Version': BOT.VERSION,

      use: (jsx: ({ }) => FlowElement, meta?: { [key: string]: string }) => {
        this.register(app, jsx, meta)
      },

      render: (
        element: Element,
        context: Iopa.Context,
        next: () => Promise<void>
      ) => {
        return this.render(element, context, next)
      },

      renderFlow: (
        id: string,
        stepId: string | undefined,
        context: Iopa.Context,
        next: () => Promise<void>
      ) => {
        return this.renderFlowById(id, stepId, context, next)
      },

      end: async (context: Iopa.Context) => {
        return this.endFlow(context, { reason: 'capability.end' })
      },

      registerCommand: (command: string, handler: CommandHandler) => {
        this.commandHandlers.set(command, handler)
        return () => {
          this.commandHandlers.delete(command)
        }
      },

      _commandHandlers: this.commandHandlers,

      meta: this.flowsMeta,

      lists: this.tableLists,

      tables: this.tableMeta,

      setLocalResourceProtocol: (protocol: string) => {
        ReactiveCards.setLocalResourceProtocol(protocol)
      }

    } as ReactiveDialogsCapabilityPrivate

    app.reactivedialogs =
      app.properties[SERVER.Capabilities][BOT.CAPABILITIES.ReactiveDialogs]

    app.properties[SERVER.Capabilities][BOT.CAPABILITIES.ReactiveDialogs][
      IOPA.Version
    ] = BOT.VERSION

    //
    // Register well-known intent and default command handlers
    //

    app.intent(
      'reactivedialogs:intents:start',
      {
        slots: {
          FlowId: true
        },
        utterances: ['/dialog {-|FlowId}']
      },
      async (context, next) => {
        context.response.responseHandled = true
        const flowId = context[BOT.Slots]['FlowId']
        return this.renderFlowById(flowId, null, context, next)
      }
    )

    this.commandHandlers.set(
      'end',
      async (_command, _props, context: Iopa.Context) => {
        this.endFlow(context, { reason: 'command:end' })
        return false
      }
    )

    this.commandHandlers.set(
      'pause',
      async (_command, props, context: Iopa.Context) => {
        await delay(context, props.delay || defaultPauseInterval)
        return true
      }
    )

    this.commandHandlers.set(
      'return',
      async (_command, props, context: Iopa.Context) => {
        const botSession = useBotSession(context)[0]

        const prevDialog = botSession[BOT.CurrentDialog] as SessionCurrentDialog

        if (prevDialog && prevDialog.previousId) {
          await this.renderFlowById(
            botSession[BOT.Skill],
            prevDialog.previousId,
            context,
            () => Promise.resolve()
          )
        }

        return false
      }
    )
  }

  /**
   * Public IOPA invoke method that handles the processing of each inbound
   * record;
   */
  public invoke(
    context: Iopa.Context,
    next: () => Promise<void>
  ): Promise<void> {
    const flows = useReactiveDialogs(context)

    //
    // Check for well known context in case its a record to actually invoke
    // a new flow
    //
    if (context['urn:bot:dialog:invoke']) {
      const flowId = context['urn:bot:dialog:invoke']
      return flows.renderFlow(flowId, null, context, next)
    }

    //
    // Check for intent provided by Intent pre-processor.
    // Must have an intent to continue
    //
    if (!context[BOT.Intent]) {
      return next()
    }

    const botSession = useBotSession(context)[0]

    var isV2Dialog = !!botSession[BOT.SkillVersion]
    if (!isV2Dialog) return next()

    console.log('>> skill', botSession[BOT.Skill])
    console.log('>> intent', context[BOT.Intent])
    console.log('>> dialog', botSession[BOT.CurrentDialog] ? botSession[BOT.CurrentDialog].id : "")

    //
    // Check if we are checking for a new session or continuing an existing session
    //
    if (!botSession[BOT.CurrentDialog]) {
      return this._matchBeginFlow(context, next)
    } else {
      return this._continueFlow(context, next) as Promise<void>
    }

  }

  /** Check if we can process the intent and therefore start this dialog */
  private _matchBeginFlow(context, next): Promise<void> {
    const reactive = useReactiveDialogs(context)

    const intent = context[BOT.Intent]

    const flowId = this.launchIntentsToFlows[intent]

    if (!flowId) {
      console.log('No current dialog, and could not find as launch intent')
      // TO DO: Check for global '*'
      return next()
    }

    return reactive.renderFlow(flowId, null, context, next)
  }

  private _continueFlow(context: Iopa.Context, next: () => Promise<void>) {

    const [botSession, setBotSession] = useBotSession(context)
    const intent: string = context[BOT.Intent]

    var flowId = botSession[BOT.Skill]
    var flow = this.flows[flowId]

    if (!flow) {
      // not a recognized flow so clear
      console.log(
        `Dialog Flow  ${flowId} in session no longer available in registry`
      )

      if (this.commandHandlers.has('dialog-abend')) {
        this.commandHandlers.get('dialog-abend')!(
          'dialog-abend',
          {
            id: botSession[BOT.Skill],
            reason: `Dialog Flow ${flowId} in session no longer available in registry`
          },
          context
        )
      }

      setBotSession(null)

      return this._matchBeginFlow(context, next)
    }

    if (
      botSession[BOT.SkillVersion] &&
      flow.props.version.split('.')[0] !==
      botSession[BOT.SkillVersion].split('.')[0]
    ) {
      // major version change so clear
      console.log(
        `Dialog Flow ${flowId} major version ${
        flow.props.version
        } updated while participant was mid session on version ${
        botSession[BOT.SkillVersion]
        }`
      )

      if (this.commandHandlers.has('dialog-abend')) {
        this.commandHandlers.get('dialog-abend')!(
          'dialog-abend',
          {
            id: botSession[BOT.Skill],
            reason: `Dialog Flow ${flowId} major version ${
              flow.props.version
              } updated while participant was mid session on version ${
              botSession[BOT.SkillVersion]
              }`
          },
          context
        )
      }

      setBotSession(null)
      return this._matchBeginFlow(context, next)
    }

    const {
      id: dialogId,
      lastDirective,
      lastPromptActions,
      iopaBotVersion
    } = botSession[BOT.CurrentDialog] as SessionCurrentDialog

    if (iopaBotVersion !== RDM_VERSION) {
      return next()
    }

    const dialogSeqNo = flow.props.children.findIndex(
      directive => directive.type == 'dialog' && directive.props.id == dialogId
    )

    if (dialogSeqNo == -1) {
      //
      // not a recognized dialog step so clear
      //
      console.log(
        `Current session dialog step ${dialogId} in flow ${flowId} no longer available in registry`
      )

      if (this.commandHandlers.has('dialog-abend')) {
        this.commandHandlers.get('dialog-abend')!(
          'dialog-abend',
          {
            id: botSession[BOT.Skill],
            reason: `Current session dialog step ${dialogId} in flow ${flowId} no longer available in registry`
          },
          context
        )
      }

      setBotSession(null)
      return this._matchBeginFlow(context, next)
    }

    setBotSession({
      [BOT.Variables]: {
        ...botSession[BOT.Variables],
        [`${dialogId}${lastDirective ? `.${lastDirective}` : ''}`]: intent,
        [`${dialogId}${
          lastDirective ? `.${lastDirective}.raw` : '.raw'
          }`]: context[BOT.Text]
      }
    })

    if (dialogSeqNo == flow.props.children.length - 1) {
      // TO DO POST READING OF END FLOW WITH ALL PROPERTIES

      //
      // was at end of flow so end
      //

      setBotSession({
        [BOT.LastDialogEndedDate]: new Date().getTime()
      })

      return this.endFlow(context, { reason: 'last-response' })
    }

    const dialog = flow.props.children[dialogSeqNo]

    if (
      lastDirective == null ||
      lastDirective >= dialog.props.children.length
    ) {
      //
      // invalid lastCompletedDirective
      //  - nevertheless log and continue in case the saved actions are still good enough
      //
      console.log(
        `Last directive sequence #${lastDirective} of dialog #${dialogId} in flow ${flowId} no longer available in registry`
      )
    }

    if (!lastPromptActions) {
      //
      // was not in a prompt directive so just post the result to session bag
      // and continue with next directive or dialog
      //
      return this.proceedToNextDirective(
        context,
        flow,
        dialog,
        dialogSeqNo,
        lastDirective
      )
    } else {
      ///
      /// match intent to actions Element
      ///

      const intentFilters = lastPromptActions.map(
        action =>
          action.props.intents || action.props.utterances || [toString(action)]
      )

      const selectedActionSeqNo = intentFilters.findIndex(
        filters => filters.includes(intent) || filters.includes('*')
      )

      if (selectedActionSeqNo == -1) {
        const notUnderstoodDialog = `${dialogId}-not-understood`
        const notUnderstoodSkill = `not-understood`

        const nextStep: DialogElement | undefined =
          flow.props.children.find(
            dialog => dialog.props.id == notUnderstoodDialog
          ) ||
          flow.props.children.find(
            dialog => dialog.props.id == notUnderstoodSkill
          )

        if (nextStep) {
          return this.renderDialogStep(flow, nextStep, context)
        }

        // No matching intent for current flow dialog step, see if we should start another flow
        return this._matchBeginFlow(context, next)
      }

      const action = lastPromptActions[selectedActionSeqNo]

      if (action.props.url) {
        action.props.type = 'openurl'
      }

      switch (action.props.type) {
        case 'submit':
          return this.proceedToNextDirective(
            context,
            flow,
            dialog,
            dialogSeqNo,
            lastDirective
          )

        case 'openurl':
          return this.renderActionOpenUrl(action as ActionOpenUrlElement, context)

        default:
          console.log(
            `card type ${action.props.type} not yet supported in reactive-dialogs manager`
          )

          return this.proceedToNextDirective(
            context,
            flow,
            dialog,
            dialogSeqNo,
            lastDirective
          )
      }
    }
  }

  protected proceedToNextDirective(
    context: Iopa.Context,
    flow: FlowElement,
    dialog: DialogElement,
    dialogSeqNo: number,
    lastDirective: number | null
  ) {
    if (
      lastDirective !== null &&
      lastDirective < dialog.props.children.length - 1
    ) {
      //
      // not at end of dialog step
      // no op as we got a participant response while we were still handling directives for this step
      //
      return Promise.resolve()
    } else if (dialogSeqNo < flow.props.children.length - 1) {
      //
      // end of directives in current dialog step, but not at end of flow
      //
      const nextStep = flow.props.children[dialogSeqNo + 1]

      return this.renderDialogStep(flow, nextStep, context)
    } else {
      //
      // at end of flow
      //

      return this.endFlow(context, { reason: 'last-directive' })
    }
  }

  /** helper method to register a jsx flow or table element in this capability's inventory  */
  protected register(app: Iopa.App, jsx: ({ }) => FlowElement | TableElement, meta?: { [key: string]: string }): void {

    const flow: FlowElement | TableElement = jsx({})

    if (!flow) {
      return
    }

    if ((flow.type !== 'flow') && (flow.type !== 'table')) {
      return throwErr(
        'Tried to register a flow that is not a reactive-dialogs type'
      ) as any
    }

    if (flow.type == 'table') {

      //
      // Register Table Lists in main inventory
      //

      const tableId = flow.props.id
      const lists = flow.props.children
      this.tableMeta[tableId] = Object.assign({ lists: [] }, meta)

      lists.forEach(list => {
        const listid = list.props.id
        const items = list.props.children
        this.tableLists[listid] = items
          ; (this.tableMeta[tableId].lists as string[]).push(listid)

        console.log(` registered table ${tableId}  list ${list.props.id}`)

      })
      return
    }

    //
    // Register Flow in main inventory
    //

    const flowId = flow.props.id

    if (flowId in this.flows) {
      return throwErr(
        `Tried to register a dialog flow with id ${flowId} that already has been registered;  restart engine first`
      ) as any
    }

    this.flows[flowId] = flow
    this.flowsMeta[flowId] = meta

    const skill = app.properties[SERVER.Capabilities][
      BOT.CAPABILITIES.Skills
    ].add(flowId) as Skill

    if (!meta.global) {
      skill.global(false)
    }

    //
    // Register all intents used in this flow
    //

    flow.props.children.forEach(dialog => {
      this.registerDialogStep(dialog, skill)
    })

    //
    // Add this flow's launch intents to main inventory of launch intents
    //

    if (flow.props.utterances && flow.props.utterances.length > 0) {
      if (!Array.isArray(flow.props.utterances)) {
        throwErr('utterances on <flow> must be an array of strings')
      }

      const skills =
        app.properties[SERVER.Capabilities][BOT.CAPABILITIES.Skills].skills
      const launchSkill = flow.props.canLaunchFromGlobal
        ? skills.default
        : skill

      const existingIntent = launchSkill.lookupIntent(flow.props.utterances)

      if (existingIntent) {
        this.launchIntentsToFlows[existingIntent] = flowId
      } else {
        const launchName = `reactiveDialogs:flow:${flowId}:launchIntent`
        launchSkill.intent(launchName, { utterances: flow.props.utterances })
        this.launchIntentsToFlows[launchName] = flowId
      }
    }

    console.log(' registered ', flowId)
  }

  /** helper method to register a single dialog step in this skills inventory  */
  protected registerDialogStep(dialog: DialogElement, skill: Skill) {
    dialog.props.children
      .filter(
        dialogChild =>
          dialogChild.type == 'card' || typeof dialogChild.type == 'function'
      )
      .forEach(dialogChild => {
        if (dialogChild.type == 'card') {
          this.registerDialogCard(dialogChild as CardElement, skill)
        } else {
          this.registerDialogFuction(
            (dialogChild as any) as CustomElement,
            skill
          )
        }
      })
  }

  /** helper method to register a single card in this skills inventory  */
  protected registerDialogFuction(fn: CustomElement, skill: Skill) {
    const dialogChild = fn.type(
      Object.assign({}, fn.props, fn.type.defaultProps)
    )

    if (dialogChild == null) {
      return
    }

    if (dialogChild.type == 'card') {
      this.registerDialogCard(dialogChild as CardElement, skill)
    } else if (typeof dialogChild.type == 'function') {
      this.registerDialogFuction((dialogChild as any) as CustomElement, skill)
    }
  }

  /** helper method to register a single card in this skills inventory  */
  protected registerDialogCard(card: CardElement, skill: Skill) {
    card.props.children
      .filter(cardChild => cardChild.type == 'actionset')
      .forEach(actionset => {
        this.registerDialogCardActions(actionset as ActionSetElement, skill)
      })

    // TO DO CASCADE THROUGH CONTAINER actionsets (V1.2+)
  }

  /** helper method to register a single card action set in this skills inventory  */
  protected registerDialogCardActions(
    actionset: ActionSetElement,
    skill: Skill
  ) {
    actionset.props.children
      .filter(action => action.type == 'action')
      .forEach(action => {
        let response = toString(action).toLowerCase()
        const utterances = action.props.utterances || [response]
        const name = this.registerUtterances(
          utterances[0].replace(/[\W_]+/g, ''),
          utterances,
          skill
        )
        action.props.intents = action.props.intents || []
        action.props.intents.push(name)
      })
  }

  /** helper method to register a single card action set in this skills inventory  */
  protected registerUtterances(
    name,
    utterances: string[],
    skill: Skill
  ): string {
    const schemaUtterances = utterances.map(s => s.toLowerCase()).sort()

    const existingIntent = skill.lookupIntent(schemaUtterances)

    if (existingIntent) {
      return existingIntent
    }

    skill.intent(name, { utterances: schemaUtterances })

    return name
  }

  /** helper method to render an anonymous reactive-dialog flow or set of directives without pre-registration; */
  protected render(
    element: Element,
    context: Iopa.Context,
    next: () => Promise<void>
  ): Promise<void> {
    return throwErr(
      'Inline render of unregistered reactive-dialogs elements not yet implemented'
    )
  }

  /** find in inventory and render a specific flow and/or flow dialog step */
  protected renderFlowById(
    id: string | null | undefined,
    dialogId: string | null | undefined,
    context: Iopa.Context,
    next: () => Promise<void>
  ) {
    const [botSession, setBotSession] = useBotSession(context)

    if (id && botSession[BOT.Skill] && id !== botSession[BOT.Skill]) {
      if (this.commandHandlers.has('dialog-end')) {
        this.commandHandlers.get('dialog-end')!(
          'dialog-end',
          {
            id: botSession[BOT.Skill],
            reason: `switch ${id}`
          },
          context
        )
      }
    }

    const flowId = id || botSession[BOT.Skill]

    if (!flowId) {
      console.log(
        `Cannot infer blank id to render when not in a current flow;  continuing with pipeline`
      )
      return next()
    }

    const flow: FlowElement = this.flows[flowId]

    if (!flow) {
      console.log(
        `Dialog Flow ${flowId} not found in V2 handler;  continuing with pipeline`
      )
      return next()
    }

    if (flow.props.children.length == 0) {
      console.log(`Dialog Flow ${flowId} is empty`)
      return Promise.resolve()
    }

    let dialogStep: DialogElement

    if (
      !dialogId &&
      !id &&
      botSession[BOT.CurrentDialog] &&
      botSession[BOT.CurrentDialog].id
    ) {
      // find next step if both flow id and dialog id are blank

      const currentDialogId: string = botSession[BOT.CurrentDialog].id
      const currentSeq = flow.props.children.findIndex(
        dialog => dialog.props.id == currentDialogId
      )
      if (currentSeq < flow.props.children.length - 1) {
        dialogStep = flow.props.children[currentSeq + 1]
      } else {
        dialogStep = flow.props.children[0]
      }
    } else if (dialogId) {
      dialogStep = flow.props.children.find(c => c.props.id === dialogId)!
      if (!dialogStep) {
        console.log(
          `Step ${dialogId} not found on dialog ${flowId};  starting with first dialog step`
        )
        dialogStep = flow.props.children[0]
      }
    } else {
      dialogStep = flow.props.children[0]
    }

    if (!botSession[BOT.Skill] || flow.props.id !== botSession[BOT.Skill]) {
      if (this.commandHandlers.has('dialog-start')) {
        this.commandHandlers.get('dialog-start')!(
          'dialog-start',
          {
            id: flow.props.id,
            intent: context['urn:bot:dialog:invoke']
              ? 'urn:bot:dialog:invoke'
              : context[BOT.Intent]
          },
          context
        )
      }
    }

    setBotSession({
      [BOT.Skill]: flow.props.id,
      [BOT.SkillVersion]: flow.props.version,
      [BOT.CurrentDialog]: null,
      [BOT.Variables]: botSession[BOT.Variables] || {}
    })

    return this.renderDialogStep(flow, dialogStep, context)
  }

  /** render a given react-dialogs dialog step element to the host platform */
  protected async renderDialogStep(
    flow: FlowElement,
    dialog: DialogElement,
    context
  ): Promise<void> {
    console.log('Starting flow dialog step #', dialog.props.id)
    const [botSession, setBotSession] = useBotSession(context)
    if (!botSession) {
      /** dialog manager must have been disposed */ return
    }

    const prevDialog = botSession[BOT.CurrentDialog]

    const currentDialog: SessionCurrentDialog = {
      id: dialog.props.id,
      previousId: prevDialog ? prevDialog.id : undefined,
      iopaBotVersion: RDM_VERSION,
      lastDirective: null,
      lastPromptActions: null
    } as SessionCurrentDialog

    setBotSession({
      [BOT.CurrentDialog]: currentDialog,
      [BOT.isMultiChoicePrompt]: false
    })

    const isNotWaitingOnPrompt = await asyncForEachIfTrue(
      dialog.props.children,
      async (directive, i) => {
        if (this.app.properties[SERVER.CancelToken].isCancelled) return false

        console.log(`Performing dialog step ${dialog.props.id} directive ${i}`)

        currentDialog.lastDirective = i

        setBotSession({
          [BOT.CurrentDialog]: currentDialog
        })

        const isNotWaitingOnPrompt = await this.renderDirective(directive, context)

        return isNotWaitingOnPrompt
      }
    )

    if (isNotWaitingOnPrompt) {
      const isLastItem =
        flow.props.children[flow.props.children.length - 1] === dialog
      if (isLastItem) {
        return this.endFlow(context, { reason: 'last-response' })
      }

      const currentSeq = flow.props.children.findIndex(
        d => d.props.id == dialog.props.id
      )
      if (currentSeq !== -1) {
        const nextStep = flow.props.children[currentSeq + 1]
        return this.renderDialogStep(flow, nextStep, context)
      }
    }

    return
  }

  /** end the current flow if there is one being executed */
  protected endFlow(context: Iopa.Context, props): Promise<void> {
    const [botSession, setBotSession] = useBotSession(context)
    console.log(`Ending dialog flow ${botSession[BOT.Skill]}`)

    if (this.commandHandlers.has('dialog-end')) {
      this.commandHandlers.get('dialog-end')!(
        'dialog-end',
        {
          id: botSession[BOT.Skill],
          success: true,
          ...props
        },
        context
      )
    }

    setBotSession(null)
    context.response[BOT.ShouldEndSession] = true
    return Promise.resolve()
  }


  protected renderDirective(
    element: TextElement | CardElement | ActionElement | CustomElement,
    context: Iopa.Context
  ): Promise<boolean> {
    const vdom = render<TextElement | CardElement | ActionElement>(element)

    switch (vdom.type) {
      case 'text':
        return this.renderText(vdom, context)
      case 'card':
        this.saveActionsFromCard(vdom, context)
        return this.renderCard(vdom, context)
      case 'action':
        return this.renderAction(vdom, context)
      default:
        throwErr(
          `invalid dialog flow: <${
          (element as any).type
          }> not a valid dialog directive or card type`
        )
        return Promise.resolve(false)
    }
  }

  protected async renderText(
    element: TextElement,
    context: Iopa.Context
  ): Promise<boolean> {
    const text = toString(element)
    const pause = element.props.pause || defaultPauseInterval

    await context.response.sendAll([text])
    await delay(context, pause || defaultPauseInterval)

    return true
  }

  protected async renderCard(
    element: CardElement,
    context: Iopa.Context
  ): Promise<boolean> {
    const [botSession, setBotSession] = useBotSession(context)
    const actionset: ActionSetElement | undefined = element.props.children.find(
      child => child.type == 'actionset'
    ) as ActionSetElement | undefined

    if (actionset) {
      //
      // render openurl as submit
      //
      actionset.props.children.forEach(action => {
        if (action.props.type === 'openurl') {
          action.props.type = 'submit'
          action.props.data = action.props.utterances
            ? action.props.utterances[0]
            : toString(action).toLowerCase()
        }
      })

      await setBotSession({ [BOT.isMultiChoicePrompt]: true })
    }

    const meta = this.flowsMeta[botSession[BOT.Skill]]

    const resourceRoot = meta ? `${meta["nkar"]}/` : undefined

    const card = ReactiveCards.render(element, resourceRoot)

    const pause = element.props.pause || defaultPauseInterval

    await context.response.sendAll([{ text: '', attachments: [card] }])

    await delay(context, pause || defaultPauseInterval)

    return !card.actions || (card.actions.length == 0)
  }


  private saveActionsFromCard(
    element: CardElement,
    context: Iopa.Context
  ): void {
    const [botSession, setBotSession] = useBotSession(context)
    const currentDialog: SessionCurrentDialog = botSession[BOT.CurrentDialog]!
    const actionset = element.props.children.find(
      actionset => actionset.type == 'actionset'
    ) as ActionSetElement | undefined

    if (!actionset) {
      return
    }

    currentDialog.lastPromptActions = actionset.props.children.filter(
      action => action.type == 'action'
    )

    setBotSession({ [BOT.CurrentDialog]: currentDialog })
  }

  protected renderAction(
    element: ActionElement,
    context: Iopa.Context
  ): Promise<boolean> {
    switch (element.props.type) {
      case 'openurl':
        return this.renderActionOpenUrl(element as ActionOpenUrlElement, context)
      case 'showcard':
      case 'submit':
      default:
        throwErr(
          `Invalid action type '${element.props.type}' when used as a direct child of <step>`
        )
        return Promise.resolve(true)
    }
  }

  protected async renderActionOpenUrl(
    element: ActionOpenUrlElement,
    context: Iopa.Context
  ): Promise<boolean> {
    if (!element.props.url) {
      // continue with dialog next step
      return this.renderActionDialogFlow('', '', element, context)
    }

    if (element.props.url.indexOf(':') == -1) {
      element.props.url = `dialog:/` + element.props.url
    }

    const url = parse_url(element.props.url)

    switch (url.protocol) {
      case 'dialog:':
        const flowId = url.pathname.replace(/^\/*/, '')
        const dialogId = url.hash ? url.hash.replace(/^#/, '') : undefined
        if (!url.hash && !flowId) {
          console.log('found blank action url in dialog, continuing')
          return Promise.resolve(true)
        }
        await this.renderActionDialogFlow(flowId, dialogId, element, context)
        return Promise.resolve(false)
      case 'https:':
      case 'http:':
        await this.renderActionCommand('openurl', { url }, element, context)
        return Promise.resolve(false)
      case 'command:':
        //
        // <action type="openurl" url="command:pause?delay=500" />
        //
        return this.renderActionCommand(
          url.pathname.replace(/^\/*/, ''),
          getJsonFromUrl(url.query),
          element,
          context
        )
      default:
        throwErr(`unknown protocol ${url.protocol} on ${element.props.url}`)
        return Promise.resolve(true)
    }
  }

  protected async renderActionDialogFlow(
    id: string,
    dialogId: string | undefined,
    element: ActionOpenUrlElement,
    context: Iopa.Context
  ): Promise<boolean> {
    const reactive = useReactiveDialogs(
      context
    ) as ReactiveDialogsCapabilityPrivate

    await reactive.renderFlow(id, dialogId, context, () => Promise.resolve())

    return false
  }

  protected logStartOfDialog(context: Iopa.Context) { }
  protected logAbandondedDialog(context: Iopa.Context) { }
  protected logCompletedDialog(context: Iopa.Context) { }

  protected renderActionCommand(
    command: string,
    params: { [key: string]: any },
    element: ActionOpenUrlElement,
    context: Iopa.Context
  ): Promise<boolean> {
    const reactive = useReactiveDialogs(
      context
    ) as ReactiveDialogsCapabilityPrivate
    const handler = reactive._commandHandlers.get(command)
    if (handler) {
      return handler(
        command,
        Object.assign(
          { url: element.props.url, data: element.props.data },
          params
        ),
        context
      )
    } else {
      throwErr(
        `No handler registered for the command ${command} on ${element.props.url}`
      )
      return Promise.resolve(true)
    }
  }
}

const toString = child => {
  return child.props.children.join('')
}

const delay = (context, interval) => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, context.response[BOT.isDelayDisabled] ? 40 : interval)
  })
}

function throwErr(...args): Promise<void> {
  var message = Array.prototype.slice.call(args).join(' ')
  throw new Error(message)
}

function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index == 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/\s+/g, '')
}

export function getJsonFromUrl(url) {
  var query = url.substr(1);
  var result = {};
  query.split("&").forEach(function (part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}