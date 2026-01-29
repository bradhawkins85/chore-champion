import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowsLeftRight, Check } from '@phosphor-icons/react'
import { Category, ExchangeRate } from '@/lib/types'
import { getAvailableExchangeRates } from '@/lib/helpers'

interface PointSwapDialogProps {
  open: boolean
  onClose: () => void
  childName: string
  categories: Category[]
  categoryPoints: Map<string, number>
  onSwap: (fromCategoryId: string, toCategoryId: string, fromAmount: number, toAmount: number) => void
}

export function PointSwapDialog({
  open,
  onClose,
  childName,
  categories,
  categoryPoints,
  onSwap,
}: PointSwapDialogProps) {
  const [selectedRate, setSelectedRate] = useState<{
    fromCategoryId: string
    toCategoryId: string
    rate: ExchangeRate
  } | null>(null)

  const availableSwaps = categories
    .map((category) => {
      const rates = getAvailableExchangeRates(category, categories)
      return rates.map((rate) => ({
        fromCategory: category,
        toCategory: categories.find((c) => c.id === rate.toCategoryId)!,
        rate,
      }))
    })
    .flat()
    .filter((swap) => {
      const availablePoints = categoryPoints.get(swap.fromCategory.id) || 0
      return availablePoints >= swap.rate.fromAmount
    })

  const handleSwap = () => {
    if (!selectedRate) return

    onSwap(
      selectedRate.fromCategoryId,
      selectedRate.toCategoryId,
      selectedRate.rate.fromAmount,
      selectedRate.rate.toAmount
    )
    setSelectedRate(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fredoka text-2xl">Swap Points</DialogTitle>
          <DialogDescription>
            Exchange points between categories for {childName}
          </DialogDescription>
        </DialogHeader>

        {availableSwaps.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No point swaps available right now.</p>
            <p className="text-sm mt-2">You need more points to make an exchange.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableSwaps.map((swap, index) => {
              const isSelected =
                selectedRate?.fromCategoryId === swap.fromCategory.id &&
                selectedRate?.toCategoryId === swap.toCategory.id
              const availablePoints = categoryPoints.get(swap.fromCategory.id) || 0

              return (
                <button
                  key={index}
                  onClick={() =>
                    setSelectedRate({
                      fromCategoryId: swap.fromCategory.id,
                      toCategoryId: swap.toCategory.id,
                      rate: swap.rate,
                    })
                  }
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: swap.fromCategory.color }}
                      >
                        {swap.rate.fromAmount}
                      </div>
                      <ArrowsLeftRight className="text-muted-foreground" size={24} />
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: swap.toCategory.color }}
                      >
                        {swap.rate.toAmount}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check size={16} weight="bold" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-left">
                    <p className="text-sm font-medium">
                      {swap.rate.fromAmount} {swap.fromCategory.name} → {swap.rate.toAmount}{' '}
                      {swap.toCategory.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {availablePoints} {swap.fromCategory.name} points
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {availableSwaps.length > 0 && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSwap}
              disabled={!selectedRate}
              className="flex-1 font-fredoka"
            >
              <ArrowsLeftRight className="mr-2" size={20} />
              Swap Points
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
