export interface HomepageFeatureCard {
  id: string
  title: string
  description: string
  imageUrl?: string
}

export interface HomepageContent {
  heading: string
  subheading: string
  cards: HomepageFeatureCard[]
  sectionOrder: HomepageSectionId[]
}

export type HomepageSectionId = 'hero' | 'features' | 'access'

export const defaultHomepageSectionOrder: HomepageSectionId[] = ['hero', 'features', 'access']

export const defaultHomepageCards: HomepageFeatureCard[] = [
  {
    id: 'chore-tracking',
    title: 'Chore Tracking',
    description: 'Create and assign chores to each child with customizable points and schedules',
  },
  {
    id: 'points-system',
    title: 'Points System',
    description: 'Children earn points for completing chores and can track their progress',
  },
  {
    id: 'reward-shop',
    title: 'Reward Shop',
    description: 'Set up rewards that children can purchase with their earned points',
  },
  {
    id: 'goal-tracking',
    title: 'Goal Tracking',
    description: 'Kids can set goals and watch their progress towards special rewards',
  },
  {
    id: 'parent-approval',
    title: 'Parent Approval',
    description: 'Optional approval system for chores that need verification',
  },
  {
    id: 'multi-device',
    title: 'Multi-Device Support',
    description: 'Configure different child profiles for each device in your home',
  },
  {
    id: 'weekly-completions',
    title: 'Weekly Completions',
    description: 'Total chores completed this week',
  },
  {
    id: 'points-earned',
    title: 'Points Earned',
    description: 'Total points earned this week',
  },
  {
    id: 'top-performer',
    title: 'Top Performer',
    description: "This week's highest achiever",
  },
  {
    id: 'points-comparison',
    title: 'Points Comparison',
    description: 'This week vs last week',
  },
  {
    id: 'daily-activity',
    title: 'Daily Activity',
    description: 'Chores completed each day this week',
  },
  {
    id: 'weekly-report',
    title: "Child's Weekly Report",
    description: 'Detailed weekly summary and statistics',
  },
]

export const defaultHomepageContent: HomepageContent = {
  heading: 'ChoreQuest',
  subheading: 'Make chores fun and rewarding for the whole family',
  cards: defaultHomepageCards,
  sectionOrder: defaultHomepageSectionOrder,
}

export const normalizeHomepageContent = (content?: HomepageContent | null): HomepageContent => {
  if (!content) {
    return defaultHomepageContent
  }

  const contentById = new Map((content.cards ?? []).map((card) => [card.id, card]))
  const orderedIds = (content.cards ?? []).map((card) => card.id)
  const normalizedIds = [
    ...orderedIds.filter((id, index) => orderedIds.indexOf(id) === index && contentById.has(id)),
    ...defaultHomepageCards.map((card) => card.id).filter((id) => !orderedIds.includes(id)),
  ]

  const configuredSectionOrder = Array.isArray(content.sectionOrder) ? content.sectionOrder : []
  const normalizedSectionOrder: HomepageSectionId[] = [
    ...configuredSectionOrder.filter(
      (id, index): id is HomepageSectionId =>
        defaultHomepageSectionOrder.includes(id as HomepageSectionId) && configuredSectionOrder.indexOf(id) === index,
    ),
    ...defaultHomepageSectionOrder.filter((id) => !configuredSectionOrder.includes(id)),
  ]

  return {
    heading: content.heading || defaultHomepageContent.heading,
    subheading: content.subheading || defaultHomepageContent.subheading,
    sectionOrder: normalizedSectionOrder,
    cards: normalizedIds.map((id) => {
      const defaultCard = defaultHomepageCards.find((card) => card.id === id)
      const savedCard = contentById.get(id)

      return {
        ...(defaultCard || { id, title: id, description: '' }),
        ...savedCard,
        imageUrl: savedCard?.imageUrl || '',
      }
    }),
  }
}
