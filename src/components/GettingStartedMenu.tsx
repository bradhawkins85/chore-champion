import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RocketLaunch, CheckCircle, X, ArrowRight } from '@phosphor-icons/react'
import { GettingStartedState, GettingStartedTask } from '@/lib/types'
import { Separator } from '@/components/ui/separator'

interface GettingStartedMenuProps {
  state: GettingStartedState
  onUpdateState: (state: GettingStartedState) => void
  onNavigate: (tab: string, subTab?: string) => void
}

export function GettingStartedMenu({ state, onUpdateState, onNavigate }: GettingStartedMenuProps) {
  const completedCount = state.tasks.filter(t => t.completed || t.ignored).length
  const totalCount = state.tasks.length
  const allComplete = completedCount === totalCount

  const handleDismiss = () => {
    onUpdateState({
      ...state,
      dismissed: true,
    })
  }

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    const updatedTasks = state.tasks.map(task =>
      task.id === taskId ? { ...task, completed, ignored: false } : task
    )
    onUpdateState({
      ...state,
      tasks: updatedTasks,
    })
  }

  const handleTaskIgnore = (taskId: string) => {
    const updatedTasks = state.tasks.map(task =>
      task.id === taskId ? { ...task, ignored: true, completed: false } : task
    )
    onUpdateState({
      ...state,
      tasks: updatedTasks,
    })
  }

  const handleTaskNavigate = (task: GettingStartedTask) => {
    if (task.targetTab) {
      onNavigate(task.targetTab, task.targetSubTab)
    }
  }

  if (allComplete) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Congratulations!</strong> You've completed all the getting started tasks. 
            You're all set to manage your family's chores!
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RocketLaunch className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-fredoka">Getting Started</CardTitle>
                <CardDescription>
                  Complete these tasks to set up your ChoreQuest account
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="ml-2">
              {completedCount} / {totalCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Follow these steps to get your family chore system up and running. 
              You can skip any task if you prefer to set it up later.
            </AlertDescription>
          </Alert>

          <Separator />

          <div className="space-y-3">
            {state.tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  task.completed
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : task.ignored
                    ? 'bg-muted border-muted-foreground/20 opacity-60'
                    : 'bg-card border-border hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={task.id}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={task.id}
                    className={`text-base font-medium cursor-pointer ${
                      task.completed ? 'line-through text-muted-foreground' : ''
                    } ${task.ignored ? 'line-through text-muted-foreground italic' : ''}`}
                  >
                    {task.label}
                    {task.ignored && ' (skipped)'}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  {!task.completed && !task.ignored && task.id !== 'dismiss' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTaskIgnore(task.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Skip
                      </Button>
                      {task.targetTab && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskNavigate(task)}
                        >
                          Go <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </>
                  )}
                  {task.id === 'dismiss' && !task.completed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleDismiss}
                    >
                      Dismiss Guide
                    </Button>
                  )}
                  {task.completed && task.id !== 'dismiss' && (
                    <>
                      {task.targetTab && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskNavigate(task)}
                        >
                          Go <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </>
                  )}
                  {task.completed && task.id === 'dismiss' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
