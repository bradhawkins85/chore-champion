import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Gear, User } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { ParentPanel } from '@/components/ParentPanel'
import { ChildSelector } from '@/components/ChildSelector'
import { ChildChoreView } from '@/components/ChildChoreView'
import {
  AppMode,
  Child,
  Chore,
  ChoreAssignment,
  ChoreCompletion,
} from '@/lib/types'
import { getChildTotalPoints } from '@/lib/helpers'

function App() {
  const [mode, setMode] = useState<AppMode>('child')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  const [chores, setChores] = useKV<Chore[]>('chores', [])
  const [childrenList, setChildrenList] = useKV<Child[]>('children', [])
  const [assignments, setAssignments] = useKV<ChoreAssignment[]>('assignments', [])
  const [completions, setCompletions] = useKV<ChoreCompletion[]>('completions', [])

  const choresMap = useMemo(() => {
    return new Map((chores || []).map((c) => [c.id, c]))
  }, [chores])

  const childPoints = useMemo(() => {
    const points = new Map<string, number>()
    ;(childrenList || []).forEach((child) => {
      points.set(child.id, getChildTotalPoints(completions || [], choresMap, child.id))
    })
    return points
  }, [childrenList, completions, choresMap])

  const handleAddChore = (choreData: Omit<Chore, 'id' | 'createdAt'>) => {
    const newChore: Chore = {
      ...choreData,
      id: `chore_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
    }
    setChores((current) => [...(current || []), newChore])
    toast.success(`Chore "${newChore.name}" created!`)
  }

  const handleEditChore = (
    id: string,
    choreData: Omit<Chore, 'id' | 'createdAt'>
  ) => {
    setChores((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, ...choreData } : c
      )
    )
    toast.success('Chore updated!')
  }

  const handleDeleteChore = (id: string) => {
    setChores((current) => (current || []).filter((c) => c.id !== id))
    setAssignments((current) => (current || []).filter((a) => a.choreId !== id))
    toast.success('Chore deleted')
  }

  const handleAddChild = (
    childData: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>
  ) => {
    const newChild: Child = {
      ...childData,
      id: `child_${Date.now()}_${Math.random()}`,
      totalPoints: 0,
      createdAt: Date.now(),
    }
    setChildrenList((current) => [...(current || []), newChild])
    toast.success(`${newChild.name} added!`)
  }

  const handleEditChild = (
    id: string,
    childData: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>
  ) => {
    setChildrenList((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, ...childData } : c
      )
    )
    toast.success('Child updated!')
  }

  const handleDeleteChild = (id: string) => {
    setChildrenList((current) => (current || []).filter((c) => c.id !== id))
    setAssignments((current) => (current || []).filter((a) => a.childId !== id))
    setCompletions((current) => (current || []).filter((c) => c.childId !== id))
    toast.success('Child removed')
  }

  const handleAssignChore = (childId: string, choreId: string) => {
    const newAssignment: ChoreAssignment = {
      id: `assignment_${Date.now()}_${Math.random()}`,
      childId,
      choreId,
      assignedAt: Date.now(),
    }
    setAssignments((current) => [...(current || []), newAssignment])
    toast.success('Chore assigned!')
  }

  const handleUnassignChore = (assignmentId: string) => {
    setAssignments((current) => (current || []).filter((a) => a.id !== assignmentId))
    toast.success('Chore unassigned')
  }

  const handleCompleteChore = (childId: string, choreId: string) => {
    const newCompletion: ChoreCompletion = {
      id: `completion_${Date.now()}_${Math.random()}`,
      childId,
      choreId,
      completedAt: Date.now(),
    }
    setCompletions((current) => [...(current || []), newCompletion])
  }

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? 'parent' : 'child')
    setSelectedChild(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 bg-card rounded-lg shadow-lg p-4 flex items-center gap-3">
        <User className="h-5 w-5" />
        <Label htmlFor="mode-switch" className="font-fredoka">
          Child Mode
        </Label>
        <Switch
          id="mode-switch"
          checked={mode === 'parent'}
          onCheckedChange={handleModeToggle}
        />
        <Label htmlFor="mode-switch" className="font-fredoka">
          Parent Mode
        </Label>
        <Gear className="h-5 w-5" />
      </div>

      {mode === 'parent' ? (
        <ParentPanel
          chores={chores || []}
          children={childrenList || []}
          assignments={assignments || []}
          childPoints={childPoints}
          onAddChore={handleAddChore}
          onEditChore={handleEditChore}
          onDeleteChore={handleDeleteChore}
          onAddChild={handleAddChild}
          onEditChild={handleEditChild}
          onDeleteChild={handleDeleteChild}
          onAssignChore={handleAssignChore}
          onUnassignChore={handleUnassignChore}
        />
      ) : selectedChild ? (
        <ChildChoreView
          child={selectedChild}
          chores={chores || []}
          assignments={assignments || []}
          completions={completions || []}
          totalPoints={childPoints.get(selectedChild.id) || 0}
          onComplete={(choreId) => handleCompleteChore(selectedChild.id, choreId)}
          onBack={() => setSelectedChild(null)}
        />
      ) : (
        <>
          {(childrenList || []).length === 0 ? (
            <div className="min-h-screen flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <h1 className="text-4xl font-fredoka font-bold mb-4">
                  Welcome to ChoreQuest!
                </h1>
                <p className="text-xl text-muted-foreground mb-6">
                  Switch to Parent Mode to add children and create chores.
                </p>
                <Button
                  size="lg"
                  onClick={() => setMode('parent')}
                  className="font-fredoka text-lg"
                >
                  <Gear className="h-5 w-5 mr-2" />
                  Go to Parent Mode
                </Button>
              </div>
            </div>
          ) : (
            <ChildSelector
              children={childrenList || []}
              childPoints={childPoints}
              onSelect={setSelectedChild}
            />
          )}
        </>
      )}

      <Toaster />
    </div>
  )
}

export default App