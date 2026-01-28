import { useState, useMemo, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Gear } from '@phosphor-icons/react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { ParentPanel } from '@/components/ParentPanel'
import { ChildSelector } from '@/components/ChildSelector'
import { ChildChoreView } from '@/components/ChildChoreView'
import { RewardShop } from '@/components/RewardShop'
import { ParentPinDialog } from '@/components/ParentPinDialog'
import {
  AppMode,
  Child,
  Chore,
  ChoreAssignment,
  ChoreCompletion,
  ChoreHistoryEvent,
  Reward,
  RewardPurchase,
  MissedChore,
  CelebrationSettings,
  CelebrationAnimation,
  GoalTracker,
  Category,
  DayOfWeek,
  RepeatPattern,
} from '@/lib/types'
import { getChildTotalPoints, getChildAvailablePoints, canPurchaseReward, DEFAULT_CATEGORIES, getChildPointsByCategory } from '@/lib/helpers'

function App() {
  const [mode, setMode] = useState<AppMode>('child')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [showRewardShop, setShowRewardShop] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  
  const [parentPin, setParentPin] = useKV<string | null>('parent-pin', null)

  const [chores, setChores] = useKV<Chore[]>('chores', [])
  const [childrenList, setChildrenList] = useKV<Child[]>('children', [])
  const [assignments, setAssignments] = useKV<ChoreAssignment[]>('assignments', [])
  const [completions, setCompletions] = useKV<ChoreCompletion[]>('completions', [])
  const [rewards, setRewards] = useKV<Reward[]>('rewards', [])
  const [purchases, setPurchases] = useKV<RewardPurchase[]>('purchases', [])
  const [history, setHistory] = useKV<ChoreHistoryEvent[]>('chore-history', [])
  const [dismissedMissedChores, setDismissedMissedChores] = useKV<MissedChore[]>('dismissed-missed-chores', [])
  const [celebrationSettings, setCelebrationSettings] = useKV<CelebrationSettings>('celebration-settings', {
    enabled: true,
    animations: {
      confetti: true,
      fireworks: true,
      sparkles: true,
      stars: true,
      bubbles: true,
      hearts: true,
    },
  })
  const [trackedGoals, setTrackedGoals] = useKV<GoalTracker[]>('tracked-goals', [])
  const [categories, setCategories] = useKV<Category[]>('categories', [])
  
  const hasMigratedRewards = useRef(false)

  const hasInitializedCategories = useRef(false)

  useEffect(() => {
    if (!hasInitializedCategories.current && categories && categories.length === 0) {
      const defaultCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `category_default_${index}`,
        createdAt: 0,
      }))
      setCategories(defaultCategories)
      hasInitializedCategories.current = true
    }
  }, [])

  const migratedChores = useMemo(() => {
    if (!chores || chores.length === 0) return chores || []
    
    let needsAnyMigration = false
    for (const chore of chores) {
      if (!chore.timeOfDay || !chore.completionType || !chore.categoryIds || !chore.categoryPoints) {
        needsAnyMigration = true
        break
      }
    }
    
    if (!needsAnyMigration) {
      return chores
    }
    
    const firstCategoryId = (categories || [])[0]?.id
    
    return chores.map((chore) => {
      const needsMigration = !chore.timeOfDay || !chore.completionType || !chore.categoryIds || !chore.categoryPoints
      
      if (needsMigration) {
        const migratedChore: Chore = {
          ...chore,
          timeOfDay: chore.timeOfDay || 'anytime',
          completionType: chore.completionType || 'individual',
          categoryIds: chore.categoryIds || (firstCategoryId ? [firstCategoryId] : []),
        }
        
        if (!chore.categoryPoints && migratedChore.categoryIds.length > 0) {
          migratedChore.categoryPoints = migratedChore.categoryIds.map(catId => ({
            categoryId: catId,
            points: chore.points || 10,
          }))
        }
        
        return migratedChore
      }
      
      return chore
    })
  }, [chores, categories])

  useEffect(() => {
    if (assignments && assignments.length > 0) {
      const oldChores = chores || []
      const needsMigration = oldChores.some((c: any) => c.daysOfWeek || c.repeatPattern || c.startDate || c.endDate)
      
      if (needsMigration) {
        const updatedAssignments = (assignments || []).map(assignment => {
          const oldChore: any = oldChores.find((c: any) => c.id === assignment.choreId)
          if (oldChore && !assignment.daysOfWeek && !assignment.repeatPattern && !assignment.startDate && !assignment.endDate) {
            return {
              ...assignment,
              daysOfWeek: oldChore.daysOfWeek,
              repeatPattern: oldChore.repeatPattern,
              startDate: oldChore.startDate,
              endDate: oldChore.endDate,
            }
          }
          return assignment
        })
        setAssignments(updatedAssignments)
        
        const cleanedChores = oldChores.map((chore: any) => {
          const { daysOfWeek, repeatPattern, startDate, endDate, ...rest } = chore
          return rest
        })
        setChores(cleanedChores)
      }
    }
  }, [])

  const choresMap = useMemo(() => {
    return new Map((migratedChores || []).map((c) => [c.id, c]))
  }, [migratedChores])

  const childPoints = useMemo(() => {
    const points = new Map<string, number>()
    ;(childrenList || []).forEach((child) => {
      points.set(child.id, getChildTotalPoints(completions || [], choresMap, child.id, assignments || []))
    })
    return points
  }, [childrenList, completions, choresMap, assignments])

  const childCategoryPoints = useMemo(() => {
    const categoryPointsMap = new Map<string, Map<string, number>>()
    ;(childrenList || []).forEach((child) => {
      const childCatPoints = new Map<string, number>()
      ;(categories || []).forEach((category) => {
        const points = getChildPointsByCategory(
          completions || [],
          choresMap,
          child.id,
          category.id,
          assignments || []
        )
        childCatPoints.set(category.id, points)
      })
      categoryPointsMap.set(child.id, childCatPoints)
    })
    return categoryPointsMap
  }, [childrenList, categories, completions, choresMap, assignments])

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

  const handleEditAssignment = (
    assignmentId: string,
    updates: {
      startDate?: number
      endDate?: number
      daysOfWeek?: DayOfWeek[]
      repeatPattern?: RepeatPattern
      timeOfDay?: 'am' | 'pm' | 'both' | 'anytime'
      timeWindow?: { startTime: string; endTime: string }
      pointOverrides?: { childId: string; points: number }[]
      categoryPointOverrides?: { childId: string; categoryId: string; points: number }[]
    }
  ) => {
    setAssignments((current) =>
      (current || []).map((a) =>
        a.id === assignmentId ? { ...a, ...updates } : a
      )
    )
    toast.success('Assignment updated!')
  }

  const handleCompleteChore = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const completionId = `completion_${Date.now()}_${Math.random()}`
    const newCompletion: ChoreCompletion = {
      id: completionId,
      childId,
      choreId,
      completedAt: Date.now(),
      timeOfDay,
    }
    setCompletions((current) => [...(current || []), newCompletion])
    
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'complete',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
      completionId,
    }
    setHistory((current) => [...(current || []), historyEvent])
  }

  const handleUndoChore = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    setCompletions((current) => {
      const currentCompletions = current || []
      const sortedCompletions = [...currentCompletions].sort((a, b) => b.completedAt - a.completedAt)
      
      const completionToRemove = sortedCompletions.find(
        (c) =>
          c.childId === childId &&
          c.choreId === choreId &&
          c.timeOfDay === timeOfDay
      )
      
      if (completionToRemove) {
        toast.info('Chore completion undone')
        
        const historyEvent: ChoreHistoryEvent = {
          id: `history_${Date.now()}_${Math.random()}`,
          type: 'undo',
          childId,
          choreId,
          timestamp: Date.now(),
          timeOfDay,
          completionId: completionToRemove.id,
        }
        setHistory((currentHistory) => [...(currentHistory || []), historyEvent])
        
        return currentCompletions.filter((c) => c.id !== completionToRemove.id)
      }
      
      return currentCompletions
    })
  }

  const handleAddReward = (rewardData: Omit<Reward, 'id' | 'createdAt'>) => {
    const categoryIdsArray = Array.isArray(rewardData.categoryIds) ? [...rewardData.categoryIds] : []
    
    const newReward: Reward = {
      ...rewardData,
      id: `reward_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
      categoryIds: categoryIdsArray,
    }
    setRewards((current) => [...(current || []), newReward])
    toast.success(`Reward "${newReward.name}" created!`)
  }

  const handleEditReward = (
    id: string,
    rewardData: Omit<Reward, 'id' | 'createdAt'>
  ) => {
    const categoryIdsArray = Array.isArray(rewardData.categoryIds) ? [...rewardData.categoryIds] : []
    
    setRewards((current) =>
      (current || []).map((r) =>
        r.id === id ? { 
          ...r, 
          ...rewardData,
          categoryIds: categoryIdsArray,
        } : r
      )
    )
    toast.success('Reward updated!')
  }

  const handleDeleteReward = (id: string) => {
    setRewards((current) => (current || []).filter((r) => r.id !== id))
    toast.success('Reward deleted')
  }

  const handleToggleRewardDisabled = (id: string) => {
    setRewards((current) =>
      (current || []).map((r) =>
        r.id === id ? { ...r, disabled: !r.disabled } : r
      )
    )
    const reward = (rewards || []).find((r) => r.id === id)
    if (reward) {
      toast.success(reward.disabled ? 'Reward enabled' : 'Reward disabled')
    }
  }

  const handlePurchaseReward = (childId: string, rewardId: string, cost: number) => {
    const reward = (rewards || []).find((r) => r.id === rewardId)
    if (!reward) return

    const limitCheck = canPurchaseReward(reward, childId, purchases || [])
    if (!limitCheck.canPurchase) {
      toast.error('Cannot purchase reward', {
        description: limitCheck.reason,
      })
      return
    }

    const newPurchase: RewardPurchase = {
      id: `purchase_${Date.now()}_${Math.random()}`,
      childId,
      rewardId,
      purchasedAt: Date.now(),
      fulfilled: false,
    }
    setPurchases((current) => [...(current || []), newPurchase])
    
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

  const handleOpenParentMode = () => {
    setShowPinDialog(true)
  }

  const handlePinSuccess = () => {
    setShowPinDialog(false)
    setMode('parent')
  }

  const handleSetPin = (pin: string) => {
    setParentPin(pin)
    toast.success('Parent PIN set successfully!')
  }

  const handleChangePin = (newPin: string) => {
    setParentPin(newPin)
    toast.success('Parent PIN changed successfully!')
  }

  const handleOverrideComplete = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const completionId = `completion_${Date.now()}_${Math.random()}`
    const newCompletion: ChoreCompletion = {
      id: completionId,
      childId,
      choreId,
      completedAt: Date.now(),
      timeOfDay,
      overridden: true,
    }
    setCompletions((current) => [...(current || []), newCompletion])
    
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'override-complete',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
      completionId,
    }
    setHistory((current) => [...(current || []), historyEvent])

    const chore = (migratedChores || []).find((c) => c.id === choreId)
    const child = (childrenList || []).find((c) => c.id === childId)
    toast.success(`Awarded ${chore?.points || 0} points to ${child?.name || 'child'}`, {
      description: 'Missed chore marked as complete',
    })
  }

  const handleDismissMissed = (childId: string, choreId: string, timeOfDay?: 'am' | 'pm') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dismissedChore: MissedChore = {
      childId,
      choreId,
      timeOfDay,
      missedDate: today.getTime(),
      dismissed: true,
    }
    setDismissedMissedChores((current) => [...(current || []), dismissedChore])
    
    const historyEvent: ChoreHistoryEvent = {
      id: `history_${Date.now()}_${Math.random()}`,
      type: 'override-dismiss',
      childId,
      choreId,
      timestamp: Date.now(),
      timeOfDay,
    }
    setHistory((current) => [...(current || []), historyEvent])

    toast.info('Missed chore dismissed')
  }

  const handleToggleGoalTracking = (childId: string, rewardId: string) => {
    setTrackedGoals((current) => {
      const currentGoals = current || []
      const existingGoal = currentGoals.find(g => g.childId === childId)
      
      if (existingGoal?.rewardId === rewardId) {
        toast.info('Goal tracking removed')
        return currentGoals.filter(g => g.childId !== childId)
      } else {
        const reward = (rewards || []).find(r => r.id === rewardId)
        if (reward) {
          toast.success(`Tracking goal: ${reward.name}`)
        }
        if (existingGoal) {
          return currentGoals.map(g => 
            g.childId === childId ? { ...g, rewardId } : g
          )
        } else {
          return [...currentGoals, { childId, rewardId }]
        }
      }
    })
  }

  const handleAddCategory = (categoryData: Omit<Category, 'id' | 'createdAt'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `category_${Date.now()}_${Math.random()}`,
      createdAt: Date.now(),
    }
    setCategories((current) => [...(current || []), newCategory])
    toast.success(`Category "${newCategory.name}" created!`)
  }

  const handleEditCategory = (
    id: string,
    categoryData: Omit<Category, 'id' | 'createdAt'>
  ) => {
    setCategories((current) =>
      (current || []).map((c) =>
        c.id === id ? { ...c, ...categoryData } : c
      )
    )
    toast.success('Category updated!')
  }

  const handleDeleteCategory = (id: string) => {
    setChores((current) =>
      (current || []).map((chore) => ({
        ...chore,
        categoryIds: chore.categoryIds.filter((cid) => cid !== id),
      }))
    )
    setRewards((current) =>
      (current || []).map((reward) => ({
        ...reward,
        categoryIds: reward.categoryIds.filter((cid) => cid !== id),
      }))
    )
    setCategories((current) => (current || []).filter((c) => c.id !== id))
    toast.success('Category deleted')
  }

  const migratedRewards = useMemo(() => {
    if (!rewards || rewards.length === 0) return rewards || []
    
    const needsMigration = rewards.some(r => !Array.isArray(r.categoryIds) || r.categoryIds === undefined || r.categoryIds === null)
    if (!needsMigration) return rewards
    
    const firstCategoryId = (categories || [])[0]?.id
    
    return rewards.map((reward) => {
      const rewardCategoryIds = reward.categoryIds
      const hasValidCategoryIds = Array.isArray(rewardCategoryIds) && rewardCategoryIds !== null && rewardCategoryIds !== undefined
      
      return {
        ...reward,
        categoryIds: hasValidCategoryIds ? [...rewardCategoryIds] : (firstCategoryId ? [firstCategoryId] : []),
      }
    })
  }, [rewards, categories])

  useEffect(() => {
    if (hasMigratedRewards.current) return
    
    if (rewards && rewards.length > 0 && categories && categories.length > 0) {
      const needsMigration = rewards.some(r => !Array.isArray(r.categoryIds) || r.categoryIds === undefined || r.categoryIds === null)
      if (needsMigration) {
        const firstCategoryId = categories[0]?.id
        const migrated = rewards.map((reward) => {
          const rewardCategoryIds = reward.categoryIds
          const hasValidCategoryIds = Array.isArray(rewardCategoryIds) && rewardCategoryIds !== null && rewardCategoryIds !== undefined
          
          return {
            ...reward,
            categoryIds: hasValidCategoryIds ? [...rewardCategoryIds] : (firstCategoryId ? [firstCategoryId] : []),
          }
        })
        setRewards(migrated)
        hasMigratedRewards.current = true
      }
    }
  }, [rewards, categories, setRewards])

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
          rewards={migratedRewards || []}
          purchases={purchases || []}
          history={history || []}
          dismissedMissedChores={dismissedMissedChores || []}
          parentPin={parentPin ?? null}
          celebrationSettings={celebrationSettings || { enabled: true, animations: { confetti: true, fireworks: true, sparkles: true, stars: true, bubbles: true, hearts: true } }}
          categories={categories || []}
          childCategoryPoints={childCategoryPoints}
          onAddChore={handleAddChore}
          onEditChore={handleEditChore}
          onDeleteChore={handleDeleteChore}
          onAddChild={handleAddChild}
          onEditChild={handleEditChild}
          onDeleteChild={handleDeleteChild}
          onAssignChore={handleAssignChore}
          onUnassignChore={handleUnassignChore}
          onEditAssignment={handleEditAssignment}
          onAddReward={handleAddReward}
          onEditReward={handleEditReward}
          onDeleteReward={handleDeleteReward}
          onToggleRewardDisabled={handleToggleRewardDisabled}
          onFulfillPurchase={handleFulfillPurchase}
          onUnfulfillPurchase={handleUnfulfillPurchase}
          onChangePin={handleChangePin}
          onCelebrationSettingsChange={(settings) => setCelebrationSettings(settings)}
          onOverrideComplete={handleOverrideComplete}
          onDismissMissed={handleDismissMissed}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
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
            rewards={migratedRewards || []}
            chores={migratedChores || []}
            completions={completions || []}
            purchases={purchases || []}
            trackedGoal={(trackedGoals || []).find(g => g.childId === selectedChild.id)}
            onToggleGoalTracking={(rewardId) => handleToggleGoalTracking(selectedChild.id, rewardId)}
            categories={categories || []}
            availablePoints={getChildAvailablePoints(
              childPoints.get(selectedChild.id) || 0,
              (purchases || [])
                .filter((p) => p.childId === selectedChild.id)
                .map((p) => {
                  const reward = (migratedRewards || []).find((r) => r.id === p.rewardId)
                  const override = reward?.costOverrides?.find(o => o.childId === selectedChild.id)
                  return { cost: override ? override.cost : (reward?.cost || 0) }
                })
            )}
            onPurchase={(rewardId) => {
              const reward = (migratedRewards || []).find((r) => r.id === rewardId)
              if (reward) {
                const override = reward.costOverrides?.find(o => o.childId === selectedChild.id)
                const cost = override ? override.cost : reward.cost
                handlePurchaseReward(selectedChild.id, rewardId, cost)
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
            celebrationSettings={celebrationSettings || { enabled: true, animations: { confetti: true, fireworks: true, sparkles: true, stars: true, bubbles: true, hearts: true } }}
            trackedGoal={(trackedGoals || []).find(g => g.childId === selectedChild.id)}
            rewards={rewards || []}
            categories={categories || []}
            categoryPoints={childCategoryPoints.get(selectedChild.id)}
            onComplete={(choreId, timeOfDay) => handleCompleteChore(selectedChild.id, choreId, timeOfDay)}
            onUndo={(choreId, timeOfDay) => handleUndoChore(selectedChild.id, choreId, timeOfDay)}
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
                  onClick={handleOpenParentMode}
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
              trackedGoals={trackedGoals || []}
              rewards={rewards || []}
              categoryPoints={childCategoryPoints}
              categories={categories || []}
              onSelect={setSelectedChild}
              onParentMode={handleOpenParentMode}
            />
          )}
        </>
      )}

      <ParentPinDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSuccess={handlePinSuccess}
        storedPin={parentPin ?? null}
        onSetPin={handleSetPin}
      />

      <Toaster />
    </div>
  )
}

export default App