import { createSignal, createEffect, onCleanup, type Component } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import FileDropZone from '../components/FileDropZone'
import FileList, { type FileEntry } from '../components/FileList'
import ShareStatus from '../components/ShareStatus'
import DiscoveredDevices, {
  type DiscoveredDevice,
} from '../components/DiscoveredDevices'

const SharePage: Component = () => {
  const [files, setFiles] = createSignal<FileEntry[]>([])
  const [serverRunning, setServerRunning] = createSignal(false)
  const [serverUrl, setServerUrl] = createSignal('')
  const [ip, setIp] = createSignal('')
  const [port, setPort] = createSignal(8080)
  const [loading, setLoading] = createSignal(false)
  const [devices, setDevices] = createSignal<DiscoveredDevice[]>([])

  // Load initial state
  createEffect(() => {
    void loadFiles()
    void loadNetworkInfo()
    void checkServerStatus()
  })

  // Listen for mDNS events
  let unlistenUp: UnlistenFn | undefined
  let unlistenDown: UnlistenFn | undefined

  createEffect(() => {
    async function initListeners() {
      unlistenUp = await listen<DiscoveredDevice>('mdns-device-up', event => {
        setDevices(prev => {
          const exists = prev.find(
            d => d.ip === event.payload.ip && d.port === event.payload.port,
          )
          if (exists) return prev
          return [...prev, event.payload]
        })
      })

      unlistenDown = await listen<{ fullname: string }>(
        'mdns-device-down',
        event => {
          setDevices(prev =>
            prev.filter(d => !event.payload.fullname.includes(d.device_name)),
          )
        },
      )
    }
    void initListeners()
  })

  onCleanup(() => {
    unlistenUp?.()
    unlistenDown?.()
  })

  async function loadFiles() {
    try {
      const result = await invoke<FileEntry[]>('list_files')
      setFiles(result)
    } catch (e) {
      console.error('Failed to load files:', e)
    }
  }

  async function loadNetworkInfo() {
    try {
      const info = await invoke<{ ip: string; device_name: string }>(
        'get_network_info',
      )
      setIp(info.ip)
    } catch (e) {
      console.error('Failed to get network info:', e)
    }
  }

  async function checkServerStatus() {
    try {
      const status = await invoke<{ running: boolean; file_count: number }>(
        'get_server_status',
      )
      setServerRunning(status.running)
    } catch (e) {
      console.error('Failed to check server status:', e)
    }
  }

  async function handleFilesAdded(paths: string[]) {
    // Optimistic: try to add files locally first
    for (const path of paths) {
      const name = path.split(/[/\\]/).pop() || 'unknown'
      const ext = (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setFiles(prev => [
        ...prev,
        {
          id: optimisticId,
          name,
          size: 0,
          ext,
          path,
        },
      ])
    }

    // Then invoke the backend
    for (const path of paths) {
      try {
        // On Android, content:// URIs need to be copied to cache first
        let resolvedPath = path
        if (path.startsWith('content://')) {
          resolvedPath = await invoke<string>('resolve_file_path', { path })
        }
        await invoke<FileEntry>('add_file', { path: resolvedPath })
      } catch (e) {
        console.error(`Failed to add file ${path}:`, e)
      }
    }
    // Refresh from backend to get correct IDs and sizes
    await loadFiles()
  }

  async function handleRemoveFile(id: string) {
    // Optimistic: remove from local state immediately
    const prevFiles = files()
    setFiles(prev => prev.filter(f => f.id !== id))
    try {
      await invoke('remove_file', { id })
    } catch (e) {
      console.error('Failed to remove file:', e)
      // Revert on error
      setFiles(prevFiles)
    }
  }

  async function handleClearFiles() {
    // Optimistic: clear local state immediately
    const prevFiles = files()
    setFiles([])
    try {
      await invoke('clear_files')
    } catch (e) {
      console.error('Failed to clear files:', e)
      // Revert on error
      setFiles(prevFiles)
    }
  }

  async function handleStartServer() {
    setLoading(true)
    try {
      const result = await invoke<{ port: number; ip: string; url: string }>(
        'start_server',
        { port: 8080 },
      )
      setPort(result.port)
      setIp(result.ip)
      setServerUrl(result.url)
      setServerRunning(true)
    } catch (e) {
      console.error('Failed to start server:', e)
      alert(`Failed to start server: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleStopServer() {
    // Optimistic: update UI immediately
    const prevRunning = serverRunning()
    const prevUrl = serverUrl()
    setServerRunning(false)
    setServerUrl('')
    try {
      await invoke('stop_server')
    } catch (e) {
      console.error('Failed to stop server:', e)
      // Revert on error
      setServerRunning(prevRunning)
      setServerUrl(prevUrl)
    }
  }

  return (
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* My Share Section */}
      <section>
        <h2 class="text-lg font-semibold mb-3">My Share</h2>
        <div class="space-y-4">
          <FileDropZone onFilesAdded={paths => void handleFilesAdded(paths)} />
          <FileList
            files={files()}
            onRemove={id => void handleRemoveFile(id)}
            onClear={() => void handleClearFiles()}
          />
          <ShareStatus
            running={serverRunning()}
            url={serverUrl()}
            ip={ip()}
            port={port()}
            onStart={() => void handleStartServer()}
            onStop={() => void handleStopServer()}
            loading={loading()}
          />
        </div>
      </section>

      {/* Discovered Devices Section */}
      <section>
        <h2 class="text-lg font-semibold mb-3">Discovered Devices</h2>
        <DiscoveredDevices devices={devices()} />
      </section>
    </div>
  )
}

export default SharePage