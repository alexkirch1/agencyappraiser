"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, ArrowLeft, RotateCcw } from "lucide-react"

interface QuizOption {
  label: string
  score: number
}

interface QuizQuestion {
  category: string
  question: string
  options: QuizOption[]
}

const questions: QuizQuestion[] = [
  {
    category: "Retention",
    question: "Do you know your exact client retention rate?",
    options: [
      { label: "Yes, it's above 92% and I track it monthly", score: 10 },
      { label: "Yes, it's between 85-92%", score: 7 },
      { label: "I have a general idea, around 80%", score: 4 },
      { label: "I don't track retention regularly", score: 1 },
    ],
  },
  {
    category: "Financials",
    question: "How well-documented are your agency's financials?",
    options: [
      { label: "Clean P&L, Balance Sheet, tax returns for 3+ years", score: 10 },
      { label: "I have tax returns but no formal P&L", score: 6 },
      { label: "My accountant handles everything, I'd need to pull it together", score: 3 },
      { label: "My books are disorganized or mixed with personal finances", score: 1 },
    ],
  },
  {
    category: "Legal",
    question: "Do you have producer agreements with non-solicitation clauses?",
    options: [
      { label: "Yes, all producers have strong non-compete/non-solicit agreements", score: 10 },
      { label: "Some producers have informal agreements", score: 5 },
      { label: "No formal agreements in place", score: 2 },
      { label: "I am the only producer (solo agency)", score: 6 },
    ],
  },
  {
    category: "Carrier Diversification",
    question: "How diversified is your carrier portfolio?",
    options: [
      { label: "No single carrier represents more than 30% of my book", score: 10 },
      { label: "My top carrier is 30-50% of my book", score: 7 },
      { label: "My top carrier is 50-75% of my book", score: 4 },
      { label: "One carrier dominates (75%+ of my book)", score: 1 },
    ],
  },
  {
    category: "Succession",
    question: "Do you have a succession or transition plan?",
    options: [
      { label: "Yes, I have a documented plan with a timeline", score: 10 },
      { label: "I've thought about it but nothing is formalized", score: 5 },
      { label: "I know I need one but haven't started", score: 3 },
      { label: "No, I haven't considered succession planning", score: 1 },
    ],
  },
  {
    category: "Technology",
    question: "What is your agency's technology and systems readiness?",
    options: [
      { label: "Modern AMS, digital workflows, cloud-based operations", score: 10 },
      { label: "We have an AMS but still use some manual processes", score: 7 },
      { label: "Mostly manual with basic software", score: 3 },
      { label: "Paper files and spreadsheets", score: 1 },
    ],
  },
  {
    category: "Concentration",
    question: "How concentrated is your client base?",
    options: [
      { label: "Top 10 clients are less than 10% of revenue", score: 10 },
      { label: "Top 10 clients are 10-20% of revenue", score: 7 },
      { label: "Top 10 clients are 20-35% of revenue", score: 4 },
      { label: "Top 10 clients are 35%+ of revenue", score: 1 },
    ],
  },
  {
    category: "Growth",
    question: "What has your revenue trajectory been over the past 3 years?",
    options: [
      { label: "Consistent growth (10%+ CAGR)", score: 10 },
      { label: "Moderate growth (3-10% CAGR)", score: 7 },
      { label: "Flat (roughly the same each year)", score: 4 },
      { label: "Declining revenue", score: 1 },
    ],
  },
  {
    category: "Valuation Expectations",
    question: "How well do you understand what your agency is worth?",
    options: [
      { label: "I've had a formal valuation or appraisal done", score: 10 },
      { label: "I've used tools and have a reasonable estimate", score: 7 },
      { label: "I have a number in my head but no data to back it up", score: 4 },
      { label: "I have no idea what my agency is worth", score: 1 },
    ],
  },
  {
    category: "Timeline",
    question: "What is your ideal timeline for a sale?",
    options: [
      { label: "12-24 months out, I'm planning proactively", score: 10 },
      { label: "6-12 months, I'd like to move relatively soon", score: 7 },
      { label: "I need to sell within 6 months", score: 4 },
      { label: "As soon as possible / urgent", score: 2 },
    ],
  },
]

function getGrade(score: number) {
  if (score >= 85) return { grade: "A", color: "text-[hsl(var(--success))]", borderColor: "border-[hsl(var(--success))]", label: "Exit Ready", description: "Your agency is well-positioned for a premium exit. You have strong fundamentals and preparation. Focus on maximizing your multiple through the Deal Simulator." }
  if (score >= 65) return { grade: "B", color: "text-primary", borderColor: "border-primary", label: "Nearly Ready", description: "You're in solid shape with some areas to improve. Addressing the weak spots below could significantly increase your valuation multiple." }
  if (score >= 40) return { grade: "C", color: "text-[hsl(var(--warning))]", borderColor: "border-[hsl(var(--warning))]", label: "Needs Work", description: "There are meaningful gaps in your exit readiness. Buyers will identify these during due diligence and discount your valuation accordingly." }
  return { grade: "D", color: "text-destructive", borderColor: "border-destructive", label: "Not Ready", description: "Significant preparation is needed before going to market. Selling now would likely result in a below-market valuation. Use the recommendations below to build your action plan." }
}

export function QuizEngine() {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null))
  const [showResults, setShowResults] = useState(false)

  const progress = ((currentQ + (showResults ? 1 : 0)) / questions.length) * 100
  const totalScore = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
  const maxScore = questions.length * 10

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQ] = score
    setAnswers(newAnswers)
  }

  const goNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setShowResults(true)
    }
  }

  const goPrev = () => {
    if (showResults) {
      setShowResults(false)
    } else if (currentQ > 0) {
      setCurrentQ(currentQ - 1)
    }
  }

  const restart = () => {
    setCurrentQ(0)
    setAnswers(new Array(questions.length).fill(null))
    setShowResults(false)
  }

  if (showResults) {
    const pct = Math.round((totalScore / maxScore) * 100)
    const gradeInfo = getGrade(pct)

    return (
      <div className="mx-auto max-w-2xl">
        <Progress value={100} className="mb-8" />

        {/* Grade */}
        <Card className="mb-6 border-border bg-card">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 ${gradeInfo.borderColor}`}>
              <span className={`text-4xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{gradeInfo.label}</h2>
            <p className="mt-1 text-lg font-semibold text-muted-foreground">{pct}% ({totalScore}/{maxScore})</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{gradeInfo.description}</p>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="mb-6 border-border bg-card">
          <CardContent className="flex flex-col gap-3 pt-6">
            <h3 className="text-sm font-semibold text-foreground">Category Breakdown</h3>
            {questions.map((q, i) => {
              const score = answers[i] ?? 0
              const pctScore = (score / 10) * 100
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground">{q.category}</span>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`rounded-full transition-all ${pctScore >= 70 ? "bg-[hsl(var(--success))]" : pctScore >= 40 ? "bg-[hsl(var(--warning))]" : "bg-destructive"}`}
                      style={{ width: `${pctScore}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-foreground">{score}/10</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mb-6 border-border bg-card">
          <CardContent className="flex flex-col gap-3 pt-6">
            <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
            {questions
              .map((q, i) => ({ ...q, score: answers[i] ?? 0, idx: i }))
              .filter((q) => q.score < 7)
              .sort((a, b) => a.score - b.score)
              .map((q) => (
                <div key={q.idx} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-[hsl(var(--warning))]">{q.category}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You scored {q.score}/10. The top answer was: &quot;{q.options[0].label}&quot;
                  </p>
                </div>
              ))}
            {questions.every((_, i) => (answers[i] ?? 0) >= 7) && (
              <p className="text-sm text-[hsl(var(--success))]">All categories are strong. You are well-prepared.</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={restart} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </Button>
          <Button asChild className="gap-2">
            <Link href="/calculator">
              Start Your Valuation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]

  return (
    <div className="mx-auto max-w-2xl">
      <Progress value={progress} className="mb-8" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Question {currentQ + 1} of {questions.length}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          {q.category}
        </span>
      </div>

      <h2 className="mb-6 text-xl font-bold text-foreground">{q.question}</h2>

      <div className="flex flex-col gap-3">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt.score)}
            className={`rounded-lg border p-4 text-left text-sm transition-colors ${
              answers[currentQ] === opt.score
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev} disabled={currentQ === 0} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button onClick={goNext} disabled={answers[currentQ] === null} className="gap-2">
          {currentQ === questions.length - 1 ? "View Results" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
