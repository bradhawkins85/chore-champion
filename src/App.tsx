import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Gear } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { ParentPanel } from '@/components/ParentPanel'
import { ChildSelector } from '@/components/ChildSelector'
import { ChildChoreView } from '@/components/ChildChoreView'
import { RewardShop } from '@/components/RewardShop'
import {
  AppMode,
  Child,
  Chore,
  ChoreAssignment,
  ChoreCompletion,
  Reward,
  RewardPurchase,
} from '@/lib/types'
import { getChildTotalPoints, getChildAvailablePoints } from '@/lib/helpers'

function App() {
  const [mode, setMode] = useState<AppMode>('child')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showRewardShop, setShowRewardShop] = useState(false)

  const [chores, setChores] = useKV<Chore[]>('chores', [])
  const [childrenList, setChildrenList] = useKV<Child[]>('children', [])
  const [assignments, setAssignments] = useKV<ChoreAssignment[]>('assignments', [])
  const [completions, setCompletions] = useKV<ChoreCompletion[]>('completions', [])
  const [rewards, setRewards] = useKV<Reward[]>('rewards', [])
  const [purchases, setPurchases] = useKV<RewardPurchase[]>('purchases', [])

  const migratedChores = useMemo(() => {
    return (chores || []).map((chore) => ({
      ...chore,
      timeOfDay: chore.timeOfDay || 'anytime',
    }))
  }, [chores])

  const choresMap = useMemo(() => {
    return new Map((migratedChores || []).map((c) => [c.id, c]))
  }, [migratedChores])

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

  const handleCompleteChore = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const newCompletion: ChoreCompletion = {
      id: `completion_${Date.now()}_${Math.random()}`,
      childId,
      choreId,
      completedAt: Date.now(),
      timeOfDay,
    }
    setCompletions((current) => [...(current || []), newCompletion])
  }

  const handleAddReward = (rewardData: Omit<Reward, 'id' | 'createdAt'>) => {
    const newReward: Reward = {
      ...rewardData,
      id: `reward_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
    }
    setRewards((current) => [...(current || []), newReward])
    toast.success(`Reward "${newReward.name}" created!`)
  }

  const handleEditReward = (
    id: string,
    rewardData: Omit<Reward, 'id' | 'createdAt'>
  ) => {
    setRewards((current) =>
      (current || []).map((r) =>
        r.id === id ? { ...r, ...rewardData } : r
      )
    )
    toast.success('Reward updated!')
  }

  const handleDeleteReward = (id: string) => {
    setRewards((current) => (current || []).filter((r) => r.id !== id))
    toast.success('Reward deleted')
  }

  const handlePurchaseReward = (childId: string, rewardId: string, cost: number) => {
    const newPurchase: RewardPurchase = {
      id: `purchase_${Date.now()}_${Math.random()}`,
      childId,
      rewardId,
      purchasedAt: Date.now(),
      fulfilled: false,
    }
    setPurchases((current) => [...(current || []), newPurchase])
    
    const reward = (rewards || []).find((r) => r.id === rewardId)
    if (reward) {
      toast.success(`🎉 You got ${reward.name}!`, {
        description: `${cost} points spent. Ask your parents for your reward!`,
      })
    }
  }

  const handleFulfillPurchase = (purchaseId: string) => {
    setPurchases((current) =>
      (current || []).map((p) =>
        p.id === purchaseId ? { ...p, fulfilled: true } : p
      )
    )
    toast.success('Reward marked as fulfilled!')
  }

  const handleUnfulfillPurchase = (purchaseId: string) => {
    setPurchases((current) =>
      (current || []).map((p) =>
        p.id === purchaseId ? { ...p, fulfilled: false } : p
      )
    )
    toast.info('Reward marked as unfulfilled')
  }

  const pendingPurchasesCount = useMemo(() => {
    return (purchases || []).filter((p) => !p.fulfilled).length
  }, [purchases])

  return (
    <div className="min-h-screen bg-background">
      {mode === 'parent' ? (
        <ParentPanel
          chores={migratedChores || []}
          childrenList={childrenList || []}
          assignments={assignments || []}
          completions={completions || []}
          childPoints={childPoints}
          rewards={rewards || []}
          purchases={purchases || []}
          onAddChore={handleAddChore}
          onEditChore={handleEditChore}
          onDeleteChore={handleDeleteChore}
          onAddChild={handleAddChild}
          onEditChild={handleEditChild}
          onDeleteChild={handleDeleteChild}
          onAssignChore={handleAssignChore}
          onUnassignChore={handleUnassignChore}
          onAddReward={handleAddReward}
          onEditReward={handleEditReward}
          onDeleteReward={handleDeleteReward}
          onFulfillPurchase={handleFulfillPurchase}
          onUnfulfillPurchase={handleUnfulfillPurchase}
          onExitParentMode={() => {
            setMode('child')
            setSelectedChild(null)
            setShowRewardShop(false)
          }}
        />
      ) : selectedChild ? (
        showRewardShop ? (
          <RewardShop
            child={selectedChild}
            rewards={rewards || []}
            availablePoints={getChildAvailablePoints(
              childPoints.get(selectedChild.id) || 0,
              (purchases || [])
                .filter((p) => p.childId === selectedChild.id)
                .map((p) => {
                  const reward = (rewards || []).find((r) => r.id === p.rewardId)
                  return { cost: reward?.cost || 0 }
                })
            )}
            onPurchase={(rewardId) => {
              const reward = (rewards || []).find((r) => r.id === rewardId)
              if (reward) {
                handlePurchaseReward(selectedChild.id, rewardId, reward.cost)
              }
            }}
            onBack={() => setShowRewardShop(false)}
          />
        ) : (
          <ChildChoreView
            child={selectedChild}
            chores={migratedChores || []}
            assignments={assignments || []}
            completions={completions || []}
            totalPoints={childPoints.get(selectedChild.id) || 0}
            onComplete={(choreId, timeOfDay) => handleCompleteChore(selectedChild.id, choreId, timeOfDay)}
            onBack={() => setSelectedChild(null)}
            onShopClick={() => setShowRewardShop(true)}
          />
        )
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
              childrenList={childrenList || []}
              childPoints={childPoints}
              pendingPurchasesCount={pendingPurchasesCount}
              onSelect={setSelectedChild}
              onParentMode={() => setMode('parent')}
            />
          )}
        </>
      )}

      <Toaster />
    </div>
  )
}

export default App