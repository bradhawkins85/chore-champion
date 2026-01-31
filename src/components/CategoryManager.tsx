import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash, HourglassHigh, ArrowsLeftRight, Trophy, Eye } from '@phosphor-icons/react'
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
}

export function CategoryManager({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null)

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
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
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
                          <Eye className="h-3 w-3 mr-1" />
                          Hidden from up next
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

        {categories.length === 0 && (
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
        allCategories={categories}
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
