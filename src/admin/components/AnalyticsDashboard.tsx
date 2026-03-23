import { useAnalytics } from '../hooks/useAnalytics'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function AnalyticsDashboard() {
  const { summary, loading, error, refresh } = useAnalytics()

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading analytics...</div>
  }

  if (error) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          Retry
        </Button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p>No analytics data yet.</p>
        <p className="text-sm mt-2">Data will appear here after students use the wizard.</p>
      </div>
    )
  }

  const completionRate =
    summary.recentDays.reduce((s, d) => s + d.wizardStarts, 0) > 0
      ? Math.round(
          (summary.recentDays.reduce((s, d) => s + d.wizardCompletions, 0) /
            summary.recentDays.reduce((s, d) => s + d.wizardStarts, 0)) *
            100
        )
      : 0

  // Sort course demand by scheduled count descending
  const demandEntries = summary.courseDemand
    ? Object.entries(summary.courseDemand.scheduled)
        .sort(([, a], [, b]) => b - a)
    : []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={summary.totalSubmissions} />
        <StatCard label="Unique Sessions" value={summary.totalUniqueSessions || '—'} />
        <StatCard label="Majors" value={summary.byDegreeType.major} />
        <StatCard label="Minors" value={summary.byDegreeType.minor} />
      </div>

      {/* Submission Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg Degree Progress"
          value={`${summary.insights.avgDegreeProgress}%`}
        />
        <StatCard
          label="Summer Opt-in"
          value={summary.totalSubmissions > 0
            ? `${Math.round((summary.insights.summerOptInCount / summary.totalSubmissions) * 100)}%`
            : '—'}
        />
        <StatCard
          label="Include Notes"
          value={summary.totalSubmissions > 0
            ? `${Math.round((summary.insights.hasNotesCount / summary.totalSubmissions) * 100)}%`
            : '—'}
        />
        <StatCard
          label="Have Special Credits"
          value={summary.totalSubmissions > 0
            ? `${Math.round((summary.insights.specialCreditsCount / summary.totalSubmissions) * 100)}%`
            : '—'}
        />
        <StatCard label="Completion Rate" value={`${completionRate}%`} />
      </div>

      {/* Daily Activity (last 30 days) */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Daily Activity (Last 30 Days)</h3>
        {summary.recentDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily data yet.</p>
        ) : (
          <div className="space-y-1.5">
            {summary.recentDays.map((day) => {
              const maxStarts = Math.max(...summary.recentDays.map((d) => d.wizardStarts), 1)
              return (
                <div key={day.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-muted-foreground font-mono text-xs">{day.date}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-5 bg-primary/20 rounded"
                      style={{ width: `${(day.wizardStarts / maxStarts) * 100}%`, minWidth: day.wizardStarts > 0 ? '4px' : '0' }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.wizardStarts} starts / {day.wizardCompletions} completions{day.uniqueSessions > 0 ? ` / ${day.uniqueSessions} unique` : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Graduation Timeline */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Expected Graduation Distribution</h3>
        {Object.keys(summary.byGraduation).length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(summary.byGraduation)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([term, count]) => (
                <div key={term} className="bg-card border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{term}</div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Course Demand */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">
          Course Demand {summary.courseDemand ? `(${summary.courseDemand.term})` : ''}
        </h3>
        {demandEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No course demand data yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Course</th>
                  <th className="text-right px-4 py-2 font-medium">Scheduled</th>
                  <th className="text-right px-4 py-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {demandEntries.map(([code, scheduled]) => (
                  <tr key={code} className="border-t">
                    <td className="px-4 py-2 font-mono">{code}</td>
                    <td className="text-right px-4 py-2">{scheduled}</td>
                    <td className="text-right px-4 py-2">
                      {summary.courseDemand?.completed[code] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Step Funnel */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Step Funnel</h3>
        {summary.stepFunnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">No step data yet.</p>
        ) : (
          <div className="space-y-1.5">
            {summary.stepFunnel.map((step, i) => {
              const maxVisits = summary.stepFunnel[0]?.visits || 1
              const prev = i > 0 ? summary.stepFunnel[i - 1].visits : step.visits
              const dropoff = prev > 0 ? Math.round(((prev - step.visits) / prev) * 100) : 0
              return (
                <div key={step.stepId} className="flex items-center gap-3 text-sm">
                  <span className="w-32 text-muted-foreground font-mono text-xs truncate">{step.stepId}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-5 bg-primary/20 rounded"
                      style={{ width: `${(step.visits / maxVisits) * 100}%`, minWidth: step.visits > 0 ? '4px' : '0' }}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {step.visits}
                      {i > 0 && dropoff > 0 && (
                        <span className="text-destructive/70 ml-1">-{dropoff}%</span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Peak Hours & Export Methods — side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Peak Usage Hours */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Peak Hours</h3>
          {Object.keys(summary.peakHours).length === 0 ? (
            <p className="text-sm text-muted-foreground">No hourly data yet.</p>
          ) : (
            <div className="space-y-1">
              {Array.from({ length: 24 }, (_, h) => h)
                .filter((h) => summary.peakHours[h.toString()])
                .map((h) => {
                  const count = summary.peakHours[h.toString()] || 0
                  const maxCount = Math.max(...Object.values(summary.peakHours), 1)
                  const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
                  return (
                    <div key={h} className="flex items-center gap-2 text-sm">
                      <span className="w-10 text-xs text-muted-foreground text-right font-mono">{label}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className="h-4 bg-primary/20 rounded"
                          style={{ width: `${(count / maxCount) * 100}%`, minWidth: '4px' }}
                        />
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </section>

        {/* Export Methods */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Export Methods</h3>
          {Object.keys(summary.exportCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No export data yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(summary.exportCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([method, count]) => (
                  <div key={method} className="bg-card border rounded-lg p-3 text-center">
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground capitalize">{method}</div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      {/* FERPA Notice */}
      <div className="bg-muted/50 border rounded-lg p-4 text-xs text-muted-foreground">
        All data shown is aggregate and anonymous. No student names, emails, or identifiable
        information is stored. Course codes are public catalog data. This dashboard is FERPA-compliant.
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
