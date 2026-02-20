"use client"

import { QuizEngine } from "@/components/quiz/quiz-engine"

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agency Readiness Quiz</h1>
        <p className="mt-2 text-muted-foreground">
          10 questions to assess if you and your agency are truly ready for an exit.
        </p>
      </div>
      <QuizEngine />
    </div>
  )
}
