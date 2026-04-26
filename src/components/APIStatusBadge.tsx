import { useAIConfig } from '../context/AIConfigContext'
import { SettingsIcon } from './SettingsIcon'

interface APIStatusBadgeProps {
  onClick: () => void
}

export function APIStatusBadge({ onClick }: APIStatusBadgeProps) {
  const { config, maskApiKey } = useAIConfig()

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
      title={config ? `${config.provider} - ${maskApiKey(config.apiKey)}` : 'No API key configured'}
    >
      {/* Status Dot */}
      <div className={`w-2 h-2 rounded-full ${config ? 'bg-green-500' : 'bg-zinc-600'}`} />

      {/* Text */}
      <span className="text-xs font-medium text-zinc-300">
        {config ? 'Connected' : 'Settings'}
      </span>

      {/* Icon */}
      <SettingsIcon className="w-4 h-4 text-zinc-400" />
    </button>
  )
}
