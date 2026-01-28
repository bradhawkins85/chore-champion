import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus } from '@phosphor-icons/react'
import { Child, Chore, ChoreAssignment } from '@/lib/types'
import { ChoreCard } from './ChoreCard'
import { ChildCard } from './ChildCard'
import { ChoreDialog } from './ChoreDialog'
import { ChildDialog } from './ChildDialog'
import { AssignChoresView } from './AssignChoresView'

interface ParentPanelProps {
  chores: Chore[]
  children: Child[]
  assignments: ChoreAssignment[]
  childPoints: Map<string, number>
  onAddChore: (chore: Omit<Chore, 'id' | 'createdAt'>) => void
  onEditChore: (id: string, chore: Omit<Chore, 'id' | 'createdAt'>) => void
  onDeleteChore: (id: string) => void
  onAddChild: (child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => void
  onEditChild: (id: string, child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => void
  onDeleteChild: (id: string) => void
  onAssignChore: (childId: string, choreId: string) => void
  onUnassignChore: (assignmentId: string) => void
}

export function ParentPanel({
  chores,
  children,
  assignments,
  childPoints,
  onAddChore,
  onEditChore,
  onDeleteChore,
  onAddChild,
  onEditChild,
  onDeleteChild,
  onAssignChore,
  onUnassignChore,
}: ParentPanelProps) {
  const [choreDialogOpen, setChoreDialogOpen] = useState(false)
  const [childDialogOpen, setChildDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | undefined>()
  const [editingChild, setEditingChild] = useState<Child | undefined>()
  const [deleteChoreId, setDeleteChoreId] = useState<string | null>(null)
  const [deleteChildId, setDeleteChildId] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  const handleEditChore = (chore: Chore) => {
    setEditingChore(chore)
    setChoreDialogOpen(true)
  }

  const handleSaveChore = (chore: Omit<Chore, 'id' | 'createdAt'>) => {
    if (editingChore) {
      onEditChore(editingChore.id, chore)
      setEditingChore(undefined)
    } else {
      onAddChore(chore)
    }
  }

  const handleEditChild = (child: Child) => {
    setEditingChild(child)
    setChildDialogOpen(true)
  }

  const handleSaveChild = (child: Omit<Child, 'id' | 'createdAt' | 'totalPoints'>) => {
    if (editingChild) {
      onEditChild(editingChild.id, child)
      setEditingChild(undefined)
    } else {
      onAddChild(child)
    }
  }

  const handleChildCardClick = (child: Child) => {
    setSelectedChild(child)
  }

  if (selectedChild) {
    return (
      <AssignChoresView
        child={selectedChild}
        allChores={chores}
        assignments={assignments}
        onBack={() => setSelectedChild(null)}
        onAssign={(choreId) => onAssignChore(selectedChild.id, choreId)}
        onUnassign={onUnassignChore}
      />
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-fredoka font-bold mb-2">Parent Dashboard</h1>
        <p className="text-muted-foreground">
          Manage chores, children, and assignments
        </p>
      </div>

      <Tabs defaultValue="children" className="space-y-6">
        <TabsList>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="chores">Chores</TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-fredoka font-bold">Children</h2>
            <Button onClick={() => setChildDialogOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Add Child
            </Button>
          </div>

          {children.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No children added yet. Add your first child to get started!
                </p>
                <Button onClick={() => setChildDialogOpen(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Child
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  totalPoints={childPoints.get(child.id) || 0}
                  onEdit={handleEditChild}
                  onDelete={setDeleteChildId}
                  onClick={handleChildCardClick}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chores" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-fredoka font-bold">Chores Library</h2>
            <Button onClick={() => setChoreDialogOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Add Chore
            </Button>
          </div>

          {chores.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No chores created yet. Create your first chore to assign to children!
                </p>
                <Button onClick={() => setChoreDialogOpen(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Chore
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {chores.map((chore) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  onEdit={handleEditChore}
                  onDelete={setDeleteChoreId}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ChoreDialog
        open={choreDialogOpen}
        onOpenChange={(open) => {
          setChoreDialogOpen(open)
          if (!open) setEditingChore(undefined)
        }}
        onSave={handleSaveChore}
        editChore={editingChore}
      />

      <ChildDialog
        open={childDialogOpen}
        onOpenChange={(open) => {
          setChildDialogOpen(open)
          if (!open) setEditingChild(undefined)
        }}
        onSave={handleSaveChild}
        editChild={editingChild}
      />

      <AlertDialog open={deleteChoreId !== null} onOpenChange={() => setDeleteChoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chore? This will also remove all assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChoreId) onDeleteChore(deleteChoreId)
                setDeleteChoreId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteChildId !== null} onOpenChange={() => setDeleteChildId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Child</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this child? This will remove all their assignments
              and completion history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChildId) onDeleteChild(deleteChildId)
                setDeleteChildId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
