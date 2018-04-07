import VynosClient from './VynosClient'
import Frame from './Frame'
import FrameStream from '../lib/FrameStream'
import Vynos from '../lib/Vynos'
import { BROWSER_NOT_SUPPORTED_TEXT } from '../frame/constants'

// DOM and Window is ready.
export function isReady (callback: () => void) {
  const state = document.readyState
  if (state === 'complete' || state === 'interactive') {
    return setTimeout(callback, 0)
  }

  document.addEventListener('DOMContentLoaded', function onLoad () {
    callback()
  })
}

function scriptAddress (scriptElement: HTMLScriptElement | SVGScriptElement | null): string {
  if (scriptElement instanceof HTMLScriptElement) {
    return scriptElement.src
  } else if (scriptElement instanceof SVGScriptElement) {
    return scriptElement.href.baseVal
  } else {
    return ''
  }
}

export default class Namespace {
  scriptAddress: string
  private window: Window
  private client?: Promise<VynosClient>
  private frame: Frame | undefined

  constructor (scriptElement: HTMLScriptElement | SVGScriptElement | null, window: Window) {
    this.scriptAddress = scriptAddress(scriptElement)
    this.window = window
    this.frame = undefined
  }

  // Initialize frame container for the Wallet.
  // Optional to use.
  init (frameElement?: HTMLIFrameElement, frame?: Frame): Promise<Vynos> {
    this.client = new Promise(resolve => {
      isReady(() => {
        this.frame = frame ? frame : new Frame(this.scriptAddress, frameElement)
        this.frame.attach(this.window.document)
        let stream = new FrameStream('vynos').toFrame(this.frame.element)
        let client = new VynosClient(stream)
        client.onSharedStateUpdate(state => {
          if (state.isTransactionPending) {
            this.display()
          }
        })
        client.onBuyProcessEventReceived()
        resolve(client)
      })
    })
    return this.client
  }

  display (): void {
    this.ready().then(() => {
      this.frame!.display()
    })
  }

  setContainerStyle (style: CSSStyleDeclaration): void {
    this.frame!.setContainerStyle(style)
  }

  hide (): void {
    this.ready().then(() => {
      this.frame!.hide()
    })
  }

  ready (): Promise<Vynos> {
    if ('serviceWorker' in navigator) {
      if (this.client) {
        return this.client
      } else {
        return this.init()
      }
    } else {
      return Promise.reject(new Error(BROWSER_NOT_SUPPORTED_TEXT))
    }
  }
}
