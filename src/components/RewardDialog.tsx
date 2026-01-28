import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from '@phosphor-icons/react'
import { Reward } from '@/lib/types'

interface RewardDialogProps {
  reward?: Reward
  onSave: (rewardData: Omit<Reward, 'id' | 'createdAt'>) => void
  trigger?: React.ReactNode
}

export function RewardDialog({ reward, onSave, trigger }: RewardDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(reward?.name || '')
  const [description, setDescription] = useState(reward?.description || '')
  const [cost, setCost] = useState(reward?.cost?.toString() || '')
  const [imageEmoji, setImageEmoji] = useState(reward?.imageEmoji || '🎁')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !cost) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      cost: parseInt(cost, 10),
      imageEmoji,
    })

    if (!reward) {
      setName('')
      setDescription('')
      setCost('')
      setImageEmoji('🎁')
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="font-fredoka">
            <Plus className="mr-2" />
            Add Reward
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-fredoka text-2xl">
            {reward ? 'Edit Reward' : 'Add Reward'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reward-emoji">Emoji</Label>
            <Input
              id="reward-emoji"
              value={imageEmoji}
              onChange={(e) => setImageEmoji(e.target.value)}
              placeholder="🎁"
              maxLength={4}
              className="text-3xl text-center"
            />
          </div>
          <div>
            <Label htmlFor="reward-name">Reward Name</Label>
            <Input
              id="reward-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ice Cream Trip"
              required
            />
          </div>
          <div>
            <Label htmlFor="reward-description">Description</Label>
            <Textarea
              id="reward-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this reward include?"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="reward-cost">Cost (Points)</Label>
            <Input
              id="reward-cost"
              type="number"
              min="1"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g., 50"
              required
            />
          </div>
          <Button type="submit" className="w-full font-fredoka">
            {reward ? 'Update Reward' : 'Create Reward'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
