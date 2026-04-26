import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ProviderType = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'xai'

export interface AIConfig {
  provider: ProviderType
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
}

export const PROVIDER_CONFIGS: Record<ProviderType, { name: string; baseURL: string; models: string[] }> = {
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'x-ai/grok-4',
      'meta-llama/llama-3.1-70b-instruct',
    ],
  },
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  },
  google: {
    name: 'Google (Gemini)',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
  },
  xai: {
    name: 'xAI (Grok)',
    baseURL: 'https://api.x.ai/v1',
    models: [
      'grok-4',
      'grok-3',
    ],
  },
}

const STORAGE_KEY = 'neuraldrop-ai-config'

interface AIConfigContextType {
  config: AIConfig | null
  setConfig: (config: AIConfig) => void
  clearConfig: () => void
  isLoading: boolean
  maskApiKey: (key: string) => string
  getDisplayModel: () => string
}

const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined)

export function AIConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AIConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AIConfig
        setConfigState(parsed)
      }
    } catch (error) {
      console.error('Failed to load AI config from localStorage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setConfig = (newConfig: AIConfig) => {
    setConfigState(newConfig)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig))
    } catch (error) {
      console.error('Failed to save AI config to localStorage:', error)
    }
  }

  const clearConfig = () => {
    setConfigState(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear AI config from localStorage:', error)
    }
  }

  const maskApiKey = (key: string): string => {
    if (key.length <= 6) return '••••••'
    return `••••••${key.slice(-6)}`
  }

  const getDisplayModel = (): string => {
    if (!config) return 'Default Model'
    const providerConfig = PROVIDER_CONFIGS[config.provider]
    return `${config.model.split('/').pop()} (${providerConfig.name})`
  }

  const value: AIConfigContextType = {
    config,
    setConfig,
    clearConfig,
    isLoading,
    maskApiKey,
    getDisplayModel,
  }

  return <AIConfigContext.Provider value={value}>{children}</AIConfigContext.Provider>
}

export function useAIConfig(): AIConfigContextType {
  const context = useContext(AIConfigContext)
  if (!context) {
    throw new Error('useAIConfig must be used within AIConfigProvider')
  }
  return context
}
