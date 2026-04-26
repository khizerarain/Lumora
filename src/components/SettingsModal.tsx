import { useState } from 'react'
import { useAIConfig, PROVIDER_CONFIGS, type ProviderType, type AIConfig } from '../context/AIConfigContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const PROVIDER_DOCS: Record<ProviderType, string> = {
  openrouter: 'https://openrouter.ai/keys',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/keys',
  google: 'https://aistudio.google.com/apikey',
  xai: 'https://console.x.ai/keys',
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { config, setConfig, clearConfig, maskApiKey } = useAIConfig()

  const [provider, setProvider] = useState<ProviderType>(config?.provider || 'openrouter')
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState(config?.model || PROVIDER_CONFIGS.openrouter.models[0])
  const [temperature, setTemperature] = useState(config?.temperature || 0.7)
  const [baseURL, setBaseURL] = useState(config?.baseURL || PROVIDER_CONFIGS[provider].baseURL)
  const [error, setError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  if (!isOpen) return null

  const currentProviderConfig = PROVIDER_CONFIGS[provider]
  const availableModels = currentProviderConfig.models

  // Update model if provider changes and current model isn't available
  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider)
    const newProviderConfig = PROVIDER_CONFIGS[newProvider]
    setBaseURL(newProviderConfig.baseURL)
    if (!newProviderConfig.models.includes(model)) {
      setModel(newProviderConfig.models[0])
    }
  }

  const handleSave = () => {
    setError(null)

    if (!apiKey.trim()) {
      setError('API Key is required')
      return
    }

    if (!model.trim()) {
      setError('Model selection is required')
      return
    }

    try {
      const newConfig: AIConfig = {
        provider,
        apiKey: apiKey.trim(),
        baseURL,
        model,
        temperature,
      }
      setConfig(newConfig)
      onClose()
    } catch (err) {
      setError(`Failed to save configuration: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleClear = () => {
    clearConfig()
    setShowClearConfirm(false)
    setApiKey('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-md mx-4 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">API Settings</h2>
          <p className="text-sm text-zinc-400 mt-1">Connect your AI provider to use your own models and billing</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Provider Dropdown */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-600 transition"
            >
              {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-300">API Key</label>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-zinc-500 hover:text-zinc-400 transition"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
            />
            <a
              href={PROVIDER_DOCS[provider]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block transition"
            >
              Where to get API key? →
            </a>
          </div>

          {/* Model Dropdown */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-600 transition"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-300">Temperature</label>
              <span className="text-xs text-zinc-500">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Lower = more focused, Higher = more creative
            </p>
          </div>

          {/* Base URL (Advanced) */}
          <details className="pt-2">
            <summary className="text-xs font-medium text-zinc-400 cursor-pointer hover:text-zinc-300 transition">
              Advanced: Custom Base URL
            </summary>
            <div className="mt-3">
              <input
                type="text"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
          </details>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm font-medium hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-zinc-100 text-black rounded text-sm font-medium hover:bg-white transition"
          >
            Save Settings
          </button>
        </div>

        {/* Clear API Key Button */}
        {config && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 transition"
              >
                Clear API Key
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">
                  Are you sure? This will remove your saved API key.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-white hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 px-3 py-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-400 hover:bg-red-900/50 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
