export type Difficulty = 'easy' | 'medium' | 'hard'

export type QuizQuestion = {
  id: number
  question: string
  options: string[]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export type QuizResponse = {
  questions: QuizQuestion[]
}

const OPTION_LETTERS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

function sanitizeSentence(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim()
}

function createFallbackQuizFromText(
  text: string,
  numQuestions: number,
  difficulty: Difficulty,
): QuizResponse {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(sanitizeSentence)
    .filter((s) => s.length > 35)
    .slice(0, 80)

  const pool = sentences.length > 0 ? sentences : ['The document does not contain enough parseable content.']
  const questions: QuizQuestion[] = []

  for (let i = 0; i < numQuestions; i += 1) {
    const correctIndex = i % pool.length
    const correctSentence = pool[correctIndex]
    const distractors: string[] = []

    for (let j = 1; j < 4; j += 1) {
      const distractor = pool[(correctIndex + j) % pool.length]
      distractors.push(distractor === correctSentence ? `${distractor} (alternative view)` : distractor)
    }

    const options = [correctSentence, ...distractors]
    const rotation = i % 4
    const rotated = options.map((_, idx) => options[(idx + rotation) % 4])
    const correctAnswer = OPTION_LETTERS[rotated.indexOf(correctSentence)]

    questions.push({
      id: i + 1,
      question: `Which statement is best supported by the document? (${difficulty})`,
      options: rotated,
      correctAnswer,
      explanation:
        'Fallback quiz mode is active because the AI endpoint is unavailable. The correct option directly reflects document text.',
    })
  }

  return { questions }
}

export async function generateQuizFromText(
  text: string,
  numQuestions: number = 10,
  difficulty: Difficulty = 'medium',
  model: string = 'anthropic/claude-3.5-sonnet',
) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error(
      'OpenRouter API key is missing. Add VITE_OPENROUTER_API_KEY to your .env file. Get a key at https://openrouter.ai/keys.',
    )
  }

  const systemPrompt = `You are an expert educator. Create a high-quality, accurate multiple-choice quiz based ONLY on the provided document content.
Generate exactly ${numQuestions} questions.
Difficulty: ${difficulty}.
Each question must have 4 options (A, B, C, D), only one correct answer.
Include a short, helpful explanation for the correct answer.
Return valid JSON only in this exact format:

{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "B",
      "explanation": "Short clear explanation..."
    }
  ]
}

Do not add any extra text outside the JSON.`

  const userPrompt = `Document content:\n\n${text}`

  const fallbackModels = ['openai/gpt-4o-mini', 'google/gemini-flash-1.5']

  const requestWithModel = async (activeModel: string) => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-OpenRouter-Title': 'Lumora',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      let details = ''
      try {
        const errJson = await response.json()
        details = errJson?.error?.message ? ` - ${String(errJson.error.message)}` : ''
      } catch {
        details = ''
      }

      throw new Error(`API Error: ${response.status}${details}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      throw new Error('OpenRouter returned an invalid response payload.')
    }

    const quizData = JSON.parse(content) as QuizResponse
    if (!quizData?.questions?.length) {
      throw new Error('OpenRouter returned empty quiz content.')
    }

    return quizData
  }

  try {
    return await requestWithModel(model)
  } catch (error) {
    const notFound = error instanceof Error && error.message.includes('API Error: 404')
    if (!notFound) {
      throw error
    }

    for (const candidate of fallbackModels) {
      if (candidate === model) continue
      try {
        return await requestWithModel(candidate)
      } catch (retryError) {
        const retryNotFound =
          retryError instanceof Error && retryError.message.includes('API Error: 404')
        if (!retryNotFound) throw retryError
      }
    }

    return createFallbackQuizFromText(text, numQuestions, difficulty)
  }
}
