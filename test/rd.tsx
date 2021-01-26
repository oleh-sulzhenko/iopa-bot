/* eslint-disable no-useless-concat */
/** @jsx ReactiveDialogs.h */
import * as ReactiveDialogs from 'reactive-dialogs'
import { AppBotExtensions } from 'iopa-types'
import * as iopa from 'iopa'
import iopaBotConnectorConsole, { AppConsoleExtensions } from 'iopa-bot-console'

import iopaBotFramework, { BOT } from '../src/index'

export const ReactiveDialogsFix = ReactiveDialogs

const { RDXCard, RDXImageCard } = ReactiveDialogs
interface App extends iopa.App, AppBotExtensions, AppConsoleExtensions {}

const app = (new iopa.App() as any) as App
app.use(iopaBotConnectorConsole)
// add any first pass intent processors here e.g. Microsoft Luis, IBMWatson etc.
app.use(iopaBotFramework)

const TestDialog = (props) => {
  return (
    <flow id="test" canLaunchFromGlobal utterances={['halt']} {...props}>
      <dialog title="introduction" id="introduction">
        <RDXCard
          title={`Are you in a ${'pla' + 'ce'} and where you can go exercise?`}
        >
          <action
            url="#exercise-prompt"
            utterances={['exercise']}
            type="openurl"
          >
            Yes
          </action>
          <action
            url="#halt-prompt"
            utterances={['start', 'halt']}
            type="openurl"
          >
            No
          </action>
        </RDXCard>
        <text>Here is a follow on sentence</text>
      </dialog>
      <dialog title="not understood" id="not-understood">
        <text>I didn&apos;t quite understand your response</text>
        <text>Please answer yes or no</text>
        <action url="#introduction" type="openurl" />
      </dialog>
      <dialog title="Exercise Prompt" id="exercise-prompt">
        <RDXImageCard altText="A = Angry" src="resources/halt-a.jpg" />
        <text>Ok great let&apos;s go exercise</text>
      </dialog>
      <dialog title="Halt Prompt" id="halt-prompt">
        <text>That is very odd</text>
      </dialog>
    </flow>
  )
}

app.reactivedialogs.use(TestDialog)

app.intent(BOT.INTENTS.Launch, { utterances: ['/launch', '/open'] })

app.dialog('/', [BOT.INTENTS.Launch], (context, next) => {
  context.response.say('Hello!  Please converse with this bot. ').send()
})

app.intent(
  'helloIntent',
  { utterances: ['hi', 'hello', 'hey'] },
  (context, next) => {
    void context.response.say('Hello World').send()
    return Promise.resolve()
  }
)

app.dialog('/unknown', '*', (context, next) => {
  context.response
    .say(`I don't know what you mean by ${context[BOT.Text]}`)
    .send()
  return Promise.resolve()
})

app.build()
// eslint-disable-next-line dot-notation
app['listen']()
