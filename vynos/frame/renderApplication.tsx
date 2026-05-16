import * as React from "react"
import { createRoot, type Root } from "react-dom/client"
import WorkerProxy from "./WorkerProxy"
import { Provider, useSelector } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { createTheme, MantineProvider } from "@mantine/core"
import RemoteStore from "./lib/RemoteStore"
import { createFrameStore } from "./redux/store"
import { createWagmiConfig } from "./wagmiConfig"
import type { FrameState } from "./redux/FrameState"
import "@mantine/core/styles.css"
import "./styles/ynos.css"

const MOUNT_POINT_ID = "mount-point"
const queryClient = new QueryClient()
const roots = new WeakMap<HTMLElement, Root>()
const cozyTheme = createTheme({
  fontFamily: '"Alegreya Sans", "Source Sans Pro", "Segoe UI", sans-serif',
  primaryColor: "pink",
  primaryShade: 5,
  defaultRadius: "md",
  colors: {
    pink: ["#fff1f7", "#ffe2ee", "#f7bdd6", "#ef96bd", "#e86ea5", "#d94c8a", "#b53a71", "#8f2b58", "#691f40", "#431228"]
  },
  components: {
    Paper: {
      defaultProps: {
        radius: "xl"
      }
    },
    Button: {
      defaultProps: {
        radius: "xl"
      }
    },
    TextInput: {
      defaultProps: {
        radius: "md",
        size: "md"
      }
    },
    Select: {
      defaultProps: {
        radius: "md",
        size: "md"
      }
    }
  }
})

function useSystemColorScheme(): "light" | "dark" {
  const [scheme, setScheme] = React.useState<"light" | "dark">(globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")

  React.useEffect(() => {
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)")
    const listener = (event: MediaQueryListEvent) => {
      setScheme(event.matches ? "dark" : "light")
    }
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  return scheme
}

type RootContainerComponent = React.ComponentType

function ThemedFrameApp({
  RootContainer,
  wagmiConfig
}: {
  RootContainer: RootContainerComponent
  wagmiConfig: ReturnType<typeof createWagmiConfig>
}): React.JSX.Element {
  const systemColorScheme = useSystemColorScheme()
  const selectedTheme = useSelector((state: FrameState) => state.shared.preferences?.theme || "light")
  const forceColorScheme = selectedTheme === "system" ? systemColorScheme : selectedTheme

  return (
    <div className="vynos-shell" data-vynos-theme={forceColorScheme}>
      <MantineProvider theme={cozyTheme} forceColorScheme={forceColorScheme}>
        <WagmiProvider config={wagmiConfig}>
          <RootContainer />
        </WagmiProvider>
      </MantineProvider>
    </div>
  )
}

async function renderToMountPoint(mountPoint: HTMLElement, workerProxy: WorkerProxy): Promise<void> {
  const store = createFrameStore(workerProxy)
  const wagmiConfig = createWagmiConfig(workerProxy.provider)
  const frameState = await workerProxy.getSharedState()
  const remoteStore = new RemoteStore(workerProxy, frameState)
  remoteStore.wireToLocal(store)

  const reload = async () => {
    const RootContainer = (await import("./pages/RootContainer")).default
    let root = roots.get(mountPoint)
    if (!root) {
      root = createRoot(mountPoint)
      roots.set(mountPoint, root)
    }
    root.render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ThemedFrameApp RootContainer={RootContainer} wagmiConfig={wagmiConfig} />
        </Provider>
      </QueryClientProvider>
    )
  }

  await reload()

  if (import.meta.hot) {
    import.meta.hot.accept("./pages/RootContainer", () => {
      reload().catch(console.error)
    })
  }
}

export default async function renderApplication(document: HTMLDocument, workerProxy: WorkerProxy): Promise<void> {
  const mountPoint = document.getElementById(MOUNT_POINT_ID)
  if (!mountPoint) {
    console.error(`Can not find mount point element #${MOUNT_POINT_ID}`)
    return
  }

  await renderToMountPoint(mountPoint, workerProxy)
}
