import { createSignal, type Component } from 'solid-js'

interface ShareStatusProps {
  running: boolean
  url: string
  ip: string
  port: number
  onStart: () => void
  onStop: () => void
  loading: boolean
}

const ShareStatus: Component<ShareStatusProps> = props => {
  const [copied, setCopied] = createSignal(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = props.url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenUrl = () => {
    window.open(props.url, '_blank')
  }

  return (
    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div class="flex items-center gap-2 mb-3">
        <span
          class={`w-3 h-3 rounded-full ${props.running ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
        />
        <span class="text-sm font-medium">
          {props.running ? 'Running' : 'Stopped'}
        </span>
      </div>

      {props.running && props.url && (
        <>
          <div class="mb-3">
            <label class="text-xs text-gray-400 block mb-1">Access URL</label>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-blue-600 truncate font-mono">
                {props.url}
              </code>
              <button
                onClick={() => void handleCopy()}
                class="flex-shrink-0 px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {copied() ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleOpenUrl}
                class="flex-shrink-0 px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Open in browser"
              >
                ↗
              </button>
            </div>
          </div>

          <div class="text-xs text-gray-400 mb-3">
            IP: {props.ip} &middot; Port: {props.port}
          </div>
        </>
      )}

      <button
        onClick={() => (props.running ? props.onStop() : props.onStart())}
        disabled={props.loading}
        class={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          props.running
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        } ${props.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {props.loading
          ? 'Starting...'
          : props.running
            ? 'Stop Sharing'
            : 'Start Sharing'}
      </button>
    </div>
  )
}

export default ShareStatus