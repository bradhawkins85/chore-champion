import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { ArrowLeft, Users, Database, CreditCard, BarChart, Trash2, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface Tenant {
  id: string
  created_at: string
  updated_at: string
  user_count: number
  device_count: number
  parent_emails: string
}

interface Parent {
  id: string
  email: string
  role: string
  tenant_id: string
  created_at: string
  updated_at: string
  tenant_created_at: string
}

interface Stats {
  totalTenants: number
  totalParents: number
  totalDevices: number
  recentSignups: number
  activeTenants: number
}

interface Payment {
  tenantId: string
  status: string
  billingDate: string
  users: number
  devices: number
  plan: string
  nextBillingDate: string | null
  amount: number
}

interface SubscriptionPlan {
  id: string
  name: string
  tier: 'free' | 'paid' | 'unlimited'
  description: string
  max_children: number | null
  max_devices: number | null
  max_chores: number | null
  max_rewards: number | null
  price_per_child_aud: number
  base_price: number
  billing_interval: 'monthly' | 'annual'
  features: string[]
  is_active: boolean
}

interface TenantSubscription {
  id: string
  tenant_id: string
  plan_id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan?: SubscriptionPlan
}

interface TenantWithSubscription extends Tenant {
  subscription?: TenantSubscription
}

export function AdminPanel() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [parentToDelete, setParentToDelete] = useState<{ id: string; email: string } | null>(null)
  const [tenantsWithSubscriptions, setTenantsWithSubscriptions] = useState<TenantWithSubscription[]>([])
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [changingSubscription, setChangingSubscription] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied. Admin role required.')
      navigate('/')
    }
  }, [user, navigate])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to load statistics')
    }
  }, [token])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch tenants')
      
      const data = await response.json()
      setTenants(data.tenants)
    } catch (error) {
      console.error('Error fetching tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const fetchParents = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/parents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch parents')
      
      const data = await response.json()
      setParents(data.parents)
    } catch (error) {
      console.error('Error fetching parents:', error)
      toast.error('Failed to load parent users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch payments')
      
      const data = await response.json()
      setPayments(data.payments)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payment status')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch plans')
      
      const plans = await response.json()
      setAvailablePlans(plans)
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Failed to load subscription plans')
    }
  }

  const fetchSubscriptions = async () => {
    setLoading(true)
    try {
      // First fetch tenants
      const tenantsResponse = await fetch('/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!tenantsResponse.ok) throw new Error('Failed to fetch tenants')
      
      const tenantsData = await tenantsResponse.json()
      const tenantsList = tenantsData.tenants

      // Then fetch subscription for each tenant
      const tenantsWithSubs = await Promise.all(
        tenantsList.map(async (tenant: Tenant) => {
          try {
            const subResponse = await fetch(`/api/admin/subscriptions/${tenant.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })

            if (subResponse.ok) {
              const subData = await subResponse.json()
              return {
                ...tenant,
                subscription: subData.subscription
              }
            }
            return tenant
          } catch (error) {
            console.error(`Error fetching subscription for tenant ${tenant.id}:`, error)
            return tenant
          }
        })
      )

      setTenantsWithSubscriptions(tenantsWithSubs)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const updateTenantSubscription = async (tenantId: string, planId: string) => {
    setChangingSubscription(tenantId)
    try {
      const response = await fetch(`/api/admin/subscriptions/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update subscription')
      }
      
      const data = await response.json()
      toast.success(data.message)
      
      // Refresh subscriptions list
      fetchSubscriptions()
    } catch (error: any) {
      console.error('Error updating subscription:', error)
      toast.error(error.message || 'Failed to update subscription')
    } finally {
      setChangingSubscription(null)
    }
  }

  const deleteParent = async (parentId: string, email: string) => {
    setParentToDelete({ id: parentId, email })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!parentToDelete) return

    try {
      const response = await fetch(`/api/admin/parents/${parentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete parent')
      
      const data = await response.json()
      toast.success(data.message)
      
      // Refresh lists
      fetchParents()
      fetchTenants()
      fetchStats()
    } catch (error) {
      console.error('Error deleting parent:', error)
      toast.error('Failed to delete parent user')
    } finally {
      setDeleteDialogOpen(false)
      setParentToDelete(null)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats()
      fetchAvailablePlans()
    }
  }, [user, fetchStats])

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Platform management and administration</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}>
            Sign Out
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalTenants}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Parents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalParents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalDevices}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recent Signups (30d)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.recentSignups}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Tenants (7d)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeTenants}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenants" onClick={fetchTenants}>
              <Database className="h-4 w-4 mr-2" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="parents" onClick={fetchParents}>
              <Users className="h-4 w-4 mr-2" />
              Parent Users
            </TabsTrigger>
            <TabsTrigger value="subscriptions" onClick={fetchSubscriptions}>
              <Settings className="h-4 w-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="payments" onClick={fetchPayments}>
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenant Management</CardTitle>
                    <CardDescription>View and manage all tenants on the platform</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchTenants} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {tenants.map((tenant) => (
                      <Card key={tenant.id}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Tenant ID</p>
                              <p className="font-mono text-sm">{tenant.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Created</p>
                              <p className="text-sm">{new Date(tenant.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground mb-1">Parent Emails</p>
                              <p className="text-sm">{tenant.parent_emails || 'No parents'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Users</p>
                              <Badge variant="secondary">{tenant.user_count}</Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Devices</p>
                              <Badge variant="secondary">{tenant.device_count}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {tenants.length === 0 && !loading && (
                      <p className="text-center text-muted-foreground py-8">No tenants found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Parent User Management</CardTitle>
                    <CardDescription>View and manage parent accounts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchParents} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {parents.map((parent) => (
                      <Card key={parent.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p className="text-sm font-medium">{parent.email}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Tenant ID</p>
                                <p className="font-mono text-xs">{parent.tenant_id}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Created</p>
                                <p className="text-sm">{new Date(parent.created_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Role</p>
                                <Badge>{parent.role}</Badge>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteParent(parent.id, parent.email)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {parents.length === 0 && !loading && (
                      <p className="text-center text-muted-foreground py-8">No parent users found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Subscription Management</CardTitle>
                    <CardDescription>View and manage tenant subscriptions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {tenantsWithSubscriptions.map((tenant) => {
                      const subscription = tenant.subscription
                      const currentPlan = subscription?.plan
                      const tierColors = {
                        free: 'secondary',
                        paid: 'default',
                        unlimited: 'default'
                      } as const

                      return (
                        <Card key={tenant.id}>
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Tenant ID</p>
                                <p className="font-mono text-sm">{tenant.id}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Parent Emails</p>
                                <p className="text-sm">{tenant.parent_emails || 'No parents'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
                                {currentPlan ? (
                                  <Badge variant={tierColors[currentPlan.tier] || 'secondary'}>
                                    {currentPlan.name}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">No Subscription</Badge>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                                <Badge variant={subscription?.status === 'active' ? 'default' : 'outline'}>
                                  {subscription?.status || 'none'}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Change Plan</p>
                                <Select
                                  value={subscription?.plan_id || ''}
                                  onValueChange={(planId) => updateTenantSubscription(tenant.id, planId)}
                                  disabled={changingSubscription === tenant.id}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select plan..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availablePlans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name} ({plan.tier})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {currentPlan && (
                                <>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Max Children</p>
                                    <p className="text-sm">{currentPlan.max_children === null ? '∞' : currentPlan.max_children}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Max Devices</p>
                                    <p className="text-sm">{currentPlan.max_devices === null ? '∞' : currentPlan.max_devices}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Max Chores</p>
                                    <p className="text-sm">{currentPlan.max_chores === null ? '∞' : currentPlan.max_chores}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Max Rewards</p>
                                    <p className="text-sm">{currentPlan.max_rewards === null ? '∞' : currentPlan.max_rewards}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Period</p>
                                    <p className="text-sm">
                                      {subscription?.current_period_start 
                                        ? new Date(subscription.current_period_start).toLocaleDateString()
                                        : 'N/A'} 
                                      {' - '}
                                      {subscription?.current_period_end 
                                        ? new Date(subscription.current_period_end).toLocaleDateString()
                                        : 'N/A'}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    {tenantsWithSubscriptions.length === 0 && !loading && (
                      <p className="text-center text-muted-foreground py-8">No tenants found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Status</CardTitle>
                    <CardDescription>View billing and payment information (placeholder)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    ℹ️ This is a placeholder for future payment integration. Currently showing mock data.
                  </p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <Card key={payment.tenantId}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Tenant ID</p>
                              <p className="font-mono text-xs">{payment.tenantId}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Status</p>
                              <Badge variant={payment.status === 'active' ? 'default' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Plan</p>
                              <Badge variant="outline">{payment.plan}</Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Users</p>
                              <p className="text-sm">{payment.users}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Devices</p>
                              <p className="text-sm">{payment.devices}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Amount</p>
                              <p className="text-sm">${payment.amount.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {payments.length === 0 && !loading && (
                      <p className="text-center text-muted-foreground py-8">No payment data available</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parent User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete parent user <strong>{parentToDelete?.email}</strong>? 
              This action cannot be undone. All data associated with this user will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setParentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
