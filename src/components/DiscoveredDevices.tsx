import type { Component } from 'solid-js'

export interface DiscoveredDevice {
  device_name: string
  ip: string
  port: number
  file_count: number
}

interface DiscoveredDevicesProps {
  devices: DiscoveredDevice[]
}

const DiscoveredDevices: Component<DiscoveredDevicesProps> = props => {
  if (props.devices.length === 0) {
    return (
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 class="text-sm font-medium mb-2">Discovered Devices</h3>
        <div class="text-center py-6 text-gray-400">
          <p class="text-sm">No devices found on the network</p>
          <p class="text-xs mt-1">Make sure other devices are running LanShare</p>
        </div>
      </div>
    )
  }

  return (
    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium">Discovered Devices</h3>
        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {props.devices.length} online
        </span>
      </div>

      <ul class="space-y-2">
        {props.devices.map(device => (
          <li class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span class="text-xl">💻</span>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{device.device_name}</p>
                <p class="text-xs text-gray-400">
                  {device.ip}:{device.port} &middot; {device.file_count} file(s)
                </p>
              </div>
            </div>
            <a
              href={`http://${device.ip}:${device.port}`}
              target="_blank"
              rel="noopener noreferrer"
              class="flex-shrink-0 px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Open
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DiscoveredDevices