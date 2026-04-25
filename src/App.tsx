import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  generateQuizFromText,
  type Difficulty,
  type QuizQuestion,
} from './services/ai'
import { extractTextFromFile } from './utils/extractText'

const MODEL_OPTIONS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Fast + reliable)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (Fast + cheap)' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Best quality)' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Alternative)' },
  { id: 'x-ai/grok-4', label: 'Grok 4 (xAI)' },
] as const

type QuizState = 'upload' | 'loading' | 'quiz' | 'results'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [numQuestions, setNumQuestions] = useState(10)
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].id)
  const [appState, setAppState] = useState<QuizState>('upload')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)

  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined

  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return answers[question.id] === question.correctAnswer ? total + 1 : total
      }, 0),
    [answers, questions],
  )

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const [file] = acceptedFiles
    setSelectedFile(file ?? null)
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  })

  const handleGenerateQuiz = async () => {
    if (!selectedFile) {
      setError('Please upload a PDF, TXT, or DOCX file.')
      return
    }

    try {
      setError(null)
      setNotice(null)
      setAppState('loading')
      const extracted = await extractTextFromFile(selectedFile)

      if (!extracted || extracted.length < 100) {
        throw new Error(
          'Not enough extractable text found in this file. Try a longer or text-based document.',
        )
      }

      const clippedText = extracted.slice(0, 24000)
      const quiz = await generateQuizFromText(
        clippedText,
        numQuestions,
        difficulty,
        selectedModel,
      )

      if (!quiz?.questions?.length) {
        throw new Error('The AI did not return valid quiz questions. Try another model.')
      }

      if (
        quiz.questions.some((q) =>
          q.explanation.toLowerCase().includes('fallback quiz mode is active'),
        )
      ) {
        setNotice(
          'AI endpoint returned 404 for this request, so Lumora used fallback quiz mode from your document text.',
        )
      }

      setQuestions(quiz.questions)
      setAnswers({})
      setCurrentIndex(0)
      setRevealed(false)
      setAppState('quiz')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate quiz.'
      setError(message)
      setAppState('upload')
    }
  }

  const selectAnswer = (optionIndex: number) => {
    if (!currentQuestion || revealed) return
    const optionLetter = String.fromCharCode(65 + optionIndex)
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionLetter }))
  }

  const revealAndContinue = () => {
    if (!currentQuestion) return
    if (!revealed) {
      setRevealed(true)
      return
    }

    const isLast = currentIndex === questions.length - 1
    if (isLast) {
      setAppState('results')
      return
    }

    setCurrentIndex((prev) => prev + 1)
    setRevealed(false)
  }

  const restart = () => {
    setSelectedFile(null)
    setQuestions([])
    setAnswers({})
    setCurrentIndex(0)
    setRevealed(false)
    setError(null)
    setNotice(null)
    setAppState('upload')
  }

  return (
    <main className="min-h-screen bg-ink text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-10 sm:py-14">
        <header className="mb-12 space-y-5">
          <div className="flex items-center gap-3">
            <img
              src="/neuraldrop-logo.png"
              alt="Lumora logo"
              className="h-11 w-11 rounded-xl border border-line object-cover"
            />
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Lumora</p>
          </div>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Generate quizzes from your documents
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            Upload a document, let AI build a focused quiz, then answer one question at a time
            with instant feedback and clear explanations.
          </p>
        </header>

        {appState === 'upload' && (
          <section className="space-y-8">
            <div
              {...getRootProps()}
              className={`rounded-2xl border border-dashed p-10 transition ${
                isDragActive
                  ? 'border-white bg-white/5'
                  : 'border-line bg-panel/40 hover:border-zinc-500'
              }`}
            >
              <input {...getInputProps()} />
              <p className="text-lg font-medium">Drop your file here</p>
              <p className="mt-2 text-sm text-muted">
                or click to upload. Supports PDF, TXT, DOCX.
              </p>
              {selectedFile && (
                <p className="mt-4 text-sm text-zinc-300">Selected: {selectedFile.name}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">Questions (Max 100)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted">Model</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
                >
                  {MODEL_OPTIONS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error.includes('OpenRouter API key is missing') ? (
                  <>
                    OpenRouter key missing. Add `VITE_OPENROUTER_API_KEY` in your `.env` file. Get
                    one at{' '}
                    <a
                      href="https://openrouter.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      openrouter.ai
                    </a>
                    .
                  </>
                ) : (
                  error
                )}
              </div>
            )}

            {notice && (
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
                {notice}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateQuiz}
              className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Generate quiz
            </button>
          </section>
        )}

        {appState === 'loading' && (
          <section className="space-y-4 rounded-2xl border border-line bg-panel/40 p-8">
            <p className="text-lg font-medium">Generating your quiz...</p>
            <p className="text-sm text-muted">
              Extracting text and calling OpenRouter. This can take up to 30 seconds.
            </p>
          </section>
        )}

        {appState === 'quiz' && currentQuestion && (
          <section className="space-y-8">
            {notice && (
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
                {notice}
              </div>
            )}
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-muted">
              <span>
                Question {currentIndex + 1} / {questions.length}
              </span>
              <span>Score: {score}</span>
            </div>

            <article className="space-y-6 rounded-2xl border border-line bg-panel/40 p-7">
              <h2 className="text-xl leading-8">{currentQuestion.question}</h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index)
                  const selected = currentAnswer === letter
                  const isCorrect = currentQuestion.correctAnswer === letter
                  const showCorrect = revealed && isCorrect
                  const showWrong = revealed && selected && !isCorrect

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => selectAnswer(index)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        showCorrect
                          ? 'border-emerald-700 bg-emerald-900/30'
                          : showWrong
                            ? 'border-red-700 bg-red-900/30'
                            : selected
                              ? 'border-zinc-400 bg-white/5'
                              : 'border-line bg-panel hover:border-zinc-500'
                      }`}
                    >
                      <span className="mr-2 text-muted">{letter}.</span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {revealed && (
                <div className="rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  <p className="font-medium text-zinc-100">
                    Correct answer: {currentQuestion.correctAnswer}
                  </p>
                  <p className="mt-2 leading-7">{currentQuestion.explanation}</p>
                </div>
              )}

              <button
                type="button"
                disabled={!currentAnswer}
                onClick={revealAndContinue}
                className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {!revealed
                  ? 'Check answer'
                  : currentIndex === questions.length - 1
                    ? 'See results'
                    : 'Next question'}
              </button>
            </article>
          </section>
        )}

        {appState === 'results' && (
          <section className="space-y-8 rounded-2xl border border-line bg-panel/40 p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Results</p>
            <h2 className="text-3xl font-medium tracking-tight">
              You scored {score} / {questions.length}
            </h2>
            <p className="text-sm leading-7 text-muted">
              {score === questions.length
                ? 'Perfect score. Strong understanding.'
                : score >= Math.ceil(questions.length * 0.7)
                  ? 'Great job. You understood most key ideas.'
                  : 'Good effort. Review explanations and try another run.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0)
                  setRevealed(false)
                  setAppState('quiz')
                }}
                className="rounded-xl border border-line bg-panel px-5 py-3 text-sm transition hover:border-zinc-500"
              >
                Review questions
              </button>
              <button
                type="button"
                onClick={restart}
                className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Start new quiz
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
