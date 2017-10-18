export interface ServiceWorkerClient {
  load: (serviceWorker: ServiceWorker) => void
  unload: () => void
}

function activate(client: ServiceWorkerClient, serviceWorker: ServiceWorker) {
  if (serviceWorker.state === 'activated') {
    client.load(serviceWorker)
  }
}

function install(client: ServiceWorkerClient, registration: ServiceWorkerRegistration) {
  registration.onupdatefound = () => {
    registration.update().then(() => {
      registration.unregister().then(() => {
        // Do Nothing
      })
    })
  }

  let serviceWorker = (registration.active || registration.installing)!;

  serviceWorker.onstatechange = () => {
    if (serviceWorker.state === 'redundant') {
      client.unload()
      register(client)
    }
    activate(client, serviceWorker)
  }

  activate(client, serviceWorker)
}

export function register(client: ServiceWorkerClient) {
  if ("serviceWorker" in navigator) {
    let scriptUrl = window.location.href.replace('frame.html', 'worker.bundle.js')
    navigator.serviceWorker.register(scriptUrl, {scope: "./"}).then(registration => {
      install(client, registration)
    }).catch(error => {
      console.error(error)
    })
  } else {
    throw new Error("Browser is not supported")
  }
}
