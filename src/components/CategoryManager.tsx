import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash, HourglassHigh, ArrowsLeftRight, Trophy, Eye, EyeSlash, Calendar as CalendarIcon, CaretUp, CaretDown, DotsSixVertical } from '@phosphor-icons/react'
import { Category } from '@/lib/types'
import { CategoryDialog } from './CategoryDialog'
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

interface CategoryManagerProps {
  categories: Category[]
  onAddCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void
  onEditCategory: (id: string, category: Omit<Category, 'id' | 'createdAt'>) => void
  onDeleteCategory: (id: string) => void
  onReorderCategories?: (categories: Category[]) => void
}

export function CategoryManager({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories,
}: CategoryManagerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Sort categories by order field, or by creation date if order not set
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const orderA = a.order ?? a.createdAt
      const orderB = b.order ?? b.createdAt
      return orderA - orderB
    })
  }, [categories])

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setShowDialog(true)
  }

  const handleAdd = () => {
    setEditingCategory(undefined)
    setShowDialog(true)
  }

  const handleSave = (categoryData: Omit<Category, 'id' | 'createdAt'>) => {
    if (editingCategory) {
      onEditCategory(editingCategory.id, categoryData)
    } else {
      onAddCategory(categoryData)
    }
  }

  const handleDelete = (category: Category) => {
    setDeleteConfirm(category)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeleteCategory(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const moveCategory = (fromIndex: number, toIndex: number) => {
    if (!onReorderCategories) return
    if (fromIndex === toIndex) return
    
    const reordered = [...sortedCategories]
    const [movedItem] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, movedItem)
    
    // Update order values
    const updatedCategories = reordered.map((cat, index) => ({
      ...cat,
      order: index
    }))
    
    onReorderCategories(updatedCategories)
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveCategory(index, index - 1)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < sortedCategories.length - 1) {
      moveCategory(index, index + 1)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveCategory(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-fredoka font-semibold">Categories</h3>
          <p className="text-sm text-muted-foreground">
            Organize chores and rewards into separate point systems
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-3">
        {sortedCategories.map((category, index) => (
          <Card 
            key={category.id}
            draggable={onReorderCategories !== undefined}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`transition-all ${
              draggedIndex === index ? 'opacity-50' : ''
            } ${
              dragOverIndex === index ? 'border-primary border-2' : ''
            } ${
              onReorderCategories ? 'cursor-move' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                {onReorderCategories && (
                  <div className="flex flex-col gap-1 pt-1" role="group" aria-label="Reorder controls">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label="Move category up"
                    >
                      <CaretUp className="h-4 w-4" />
                    </Button>
                    <div className="drag-icon" aria-hidden="true">
                      <DotsSixVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedCategories.length - 1}
                      aria-label="Move category down"
                    >
                      <CaretDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    {category.description && (
                      <CardDescription className="text-sm mt-1">
                        {category.description}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {category.pointsExpiry?.enabled && category.pointsExpiry.interval !== 'never' && (
                        <Badge variant="secondary" className="text-xs">
                          <HourglassHigh className="h-3 w-3 mr-1" />
                          Expires {category.pointsExpiry.interval}
                        </Badge>
                      )}
                      {category.exchangeRates && category.exchangeRates.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <ArrowsLeftRight className="h-3 w-3 mr-1" />
                          {category.exchangeRates.length} exchange{category.exchangeRates.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {category.completionBonus && (
                        <Badge variant="secondary" className="text-xs">
                          <Trophy className="h-3 w-3 mr-1" />
                          Completion bonus
                        </Badge>
                      )}
                      {category.showInUpNext === false && (
                        <Badge variant="secondary" className="text-xs">
                          <EyeSlash className="h-3 w-3 mr-1" />
                          Hidden from up next
                        </Badge>
                      )}
                      {category.showInCalendar === false && (
                        <Badge variant="secondary" className="text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Hidden from calendar
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category)}
                  >
                    <Trash />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}

        {sortedCategories.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No categories yet. Create your first category to get started.
            </CardContent>
          </Card>
        )}
      </div>

      <CategoryDialog
        open={showDialog}
        onClose={() => {
          setShowDialog(false)
          setEditingCategory(undefined)
        }}
        onSave={handleSave}
        category={editingCategory}
        allCategories={sortedCategories}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This will remove the
              category from all chores and rewards, but won't delete the chores or rewards
              themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
