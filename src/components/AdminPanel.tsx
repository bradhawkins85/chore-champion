import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { ArrowLeft, Users, Database, CreditCard, BarChart, Trash2, RefreshCw, Settings, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react'
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

type SortField = 'id' | 'created_at' | 'user_count' | 'device_count' | 'email' | 'tenant_id' | 'plan' | 'status'
type SortDirection = 'asc' | 'desc'

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

  // Search and filter states
  const [tenantsSearch, setTenantsSearch] = useState('')
  const [parentsSearch, setParentsSearch] = useState('')
  const [subscriptionsSearch, setSubscriptionsSearch] = useState('')
  const [paymentsSearch, setPaymentsSearch] = useState('')

  // Sorting states
  const [tenantsSortField, setTenantsSortField] = useState<SortField>('created_at')
  const [tenantsSortDirection, setTenantsSortDirection] = useState<SortDirection>('desc')
  const [parentsSortField, setParentsSortField] = useState<SortField>('created_at')
  const [parentsSortDirection, setParentsSortDirection] = useState<SortDirection>('desc')
  const [subscriptionsSortField, setSubscriptionsSortField] = useState<SortField>('created_at')
  const [subscriptionsSortDirection, setSubscriptionsSortDirection] = useState<SortDirection>('desc')
  const [paymentsSortField, setPaymentsSortField] = useState<SortField>('status')
  const [paymentsSortDirection, setPaymentsSortDirection] = useState<SortDirection>('desc')

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

  const viewTenant = async (tenantId: string) => {
    try {
      // Generate a view-only token for this tenant
      const response = await fetch(`/api/admin/tenants/${tenantId}/view-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to generate view token')
      
      const data = await response.json()
      
      // Store the view token and redirect to the main app
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('view_only_mode', 'true')
      localStorage.setItem('viewing_tenant_id', tenantId)
      
      // Redirect to main app (will show parent panel in read-only mode)
      navigate('/')
    } catch (error) {
      console.error('Error viewing tenant:', error)
      toast.error('Failed to view tenant dashboard')
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats()
      fetchAvailablePlans()
    }
  }, [user, fetchStats])

  // Sorting and filtering logic
  const sortData = <T extends Record<string, any>>(data: T[], field: SortField, direction: SortDirection): T[] => {
    return [...data].sort((a, b) => {
      let aVal = a[field]
      let bVal = b[field]

      // Handle nested subscription plan name for subscriptions
      if (field === 'plan' && a.subscription?.plan) {
        aVal = a.subscription.plan.name
        bVal = b.subscription?.plan?.name || ''
      }

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }

  const toggleSort = (
    currentField: SortField,
    currentDirection: SortDirection,
    newField: SortField,
    setField: (field: SortField) => void,
    setDirection: (direction: SortDirection) => void
  ) => {
    if (currentField === newField) {
      setDirection(currentDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setField(newField)
      setDirection('asc')
    }
  }

  const SortButton = ({ label, field, currentField, currentDirection, onClick }: {
    label: string
    field: SortField
    currentField: SortField
    currentDirection: SortDirection
    onClick: () => void
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 hover:bg-muted"
      onClick={onClick}
    >
      <span className="mr-1">{label}</span>
      {currentField === field ? (
        currentDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  )

  // Filtered and sorted data
  const filteredTenants = useMemo(() => {
    let filtered = tenants.filter(tenant => 
      tenant.id.toLowerCase().includes(tenantsSearch.toLowerCase()) ||
      tenant.parent_emails?.toLowerCase().includes(tenantsSearch.toLowerCase())
    )
    return sortData(filtered, tenantsSortField, tenantsSortDirection)
  }, [tenants, tenantsSearch, tenantsSortField, tenantsSortDirection])

  const filteredParents = useMemo(() => {
    let filtered = parents.filter(parent =>
      parent.email.toLowerCase().includes(parentsSearch.toLowerCase()) ||
      parent.tenant_id.toLowerCase().includes(parentsSearch.toLowerCase())
    )
    return sortData(filtered, parentsSortField, parentsSortDirection)
  }, [parents, parentsSearch, parentsSortField, parentsSortDirection])

  const filteredSubscriptions = useMemo(() => {
    let filtered = tenantsWithSubscriptions.filter(tenant =>
      tenant.id.toLowerCase().includes(subscriptionsSearch.toLowerCase()) ||
      tenant.parent_emails?.toLowerCase().includes(subscriptionsSearch.toLowerCase()) ||
      tenant.subscription?.plan?.name?.toLowerCase().includes(subscriptionsSearch.toLowerCase())
    )
    return sortData(filtered, subscriptionsSortField, subscriptionsSortDirection)
  }, [tenantsWithSubscriptions, subscriptionsSearch, subscriptionsSortField, subscriptionsSortDirection])

  const filteredPayments = useMemo(() => {
    let filtered = payments.filter(payment =>
      payment.tenantId.toLowerCase().includes(paymentsSearch.toLowerCase()) ||
      payment.plan.toLowerCase().includes(paymentsSearch.toLowerCase()) ||
      payment.status.toLowerCase().includes(paymentsSearch.toLowerCase())
    )
    return sortData(filtered, paymentsSortField, paymentsSortDirection)
  }, [payments, paymentsSearch, paymentsSortField, paymentsSortDirection])

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-none p-6 border-b">
        {/* Header */}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
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
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Platform management and administration</p>
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
                  <CardDescription className="text-xs">Total Tenants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTenants}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Parents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalParents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Devices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDevices}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Recent Signups (30d)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recentSignups}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Active Tenants (7d)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeTenants}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Tabs - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-6">
          <Tabs defaultValue="tenants" className="h-full flex flex-col">
            <TabsList className="flex-none mt-4">
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
            <TabsContent value="tenants" className="flex-1 overflow-hidden flex flex-col space-y-4">
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="flex-none pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Tenant Management</CardTitle>
                      <CardDescription className="text-xs">View and manage all tenants on the platform</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchTenants} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by tenant ID or parent email..."
                        value={tenantsSearch}
                        onChange={(e) => setTenantsSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <SortButton
                                label="Tenant ID"
                                field="id"
                                currentField={tenantsSortField}
                                currentDirection={tenantsSortDirection}
                                onClick={() => toggleSort(tenantsSortField, tenantsSortDirection, 'id', setTenantsSortField, setTenantsSortDirection)}
                              />
                            </TableHead>
                            <TableHead>
                              <SortButton
                                label="Created"
                                field="created_at"
                                currentField={tenantsSortField}
                                currentDirection={tenantsSortDirection}
                                onClick={() => toggleSort(tenantsSortField, tenantsSortDirection, 'created_at', setTenantsSortField, setTenantsSortDirection)}
                              />
                            </TableHead>
                            <TableHead>Parent Emails</TableHead>
                            <TableHead className="text-center">
                              <SortButton
                                label="Users"
                                field="user_count"
                                currentField={tenantsSortField}
                                currentDirection={tenantsSortDirection}
                                onClick={() => toggleSort(tenantsSortField, tenantsSortDirection, 'user_count', setTenantsSortField, setTenantsSortDirection)}
                              />
                            </TableHead>
                            <TableHead className="text-center">
                              <SortButton
                                label="Devices"
                                field="device_count"
                                currentField={tenantsSortField}
                                currentDirection={tenantsSortDirection}
                                onClick={() => toggleSort(tenantsSortField, tenantsSortDirection, 'device_count', setTenantsSortField, setTenantsSortDirection)}
                              />
                            </TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTenants.map((tenant) => (
                            <TableRow key={tenant.id}>
                              <TableCell className="font-mono text-xs">{tenant.id}</TableCell>
                              <TableCell className="text-sm">{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-sm max-w-xs truncate">{tenant.parent_emails || 'No parents'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-xs">{tenant.user_count}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-xs">{tenant.device_count}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewTenant(tenant.id)}
                                  className="h-8 w-8 p-0"
                                  title="View Dashboard"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredTenants.length === 0 && !loading && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No tenants found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Parents Tab */}
            <TabsContent value="parents" className="flex-1 overflow-hidden flex flex-col space-y-4">
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="flex-none pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Parent User Management</CardTitle>
                      <CardDescription className="text-xs">View and manage parent accounts</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchParents} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email or tenant ID..."
                        value={parentsSearch}
                        onChange={(e) => setParentsSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <SortButton
                                label="Email"
                                field="email"
                                currentField={parentsSortField}
                                currentDirection={parentsSortDirection}
                                onClick={() => toggleSort(parentsSortField, parentsSortDirection, 'email', setParentsSortField, setParentsSortDirection)}
                              />
                            </TableHead>
                            <TableHead>Tenant ID</TableHead>
                            <TableHead>
                              <SortButton
                                label="Created"
                                field="created_at"
                                currentField={parentsSortField}
                                currentDirection={parentsSortDirection}
                                onClick={() => toggleSort(parentsSortField, parentsSortDirection, 'created_at', setParentsSortField, setParentsSortDirection)}
                              />
                            </TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParents.map((parent) => (
                            <TableRow key={parent.id}>
                              <TableCell className="font-medium text-sm">{parent.email}</TableCell>
                              <TableCell className="font-mono text-xs max-w-xs truncate">{parent.tenant_id}</TableCell>
                              <TableCell className="text-sm">{new Date(parent.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge className="text-xs">{parent.role}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteParent(parent.id, parent.email)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredParents.length === 0 && !loading && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No parent users found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="flex-1 overflow-hidden flex flex-col space-y-4">
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="flex-none pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Subscription Management</CardTitle>
                      <CardDescription className="text-xs">View and manage tenant subscriptions</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by tenant ID, email, or plan..."
                        value={subscriptionsSearch}
                        onChange={(e) => setSubscriptionsSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tenant ID</TableHead>
                            <TableHead>Parent Emails</TableHead>
                            <TableHead>Current Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Limits</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Change Plan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubscriptions.map((tenant) => {
                            const subscription = tenant.subscription
                            const currentPlan = subscription?.plan
                            const tierColors = {
                              free: 'secondary',
                              paid: 'default',
                              unlimited: 'default'
                            } as const

                            return (
                              <TableRow key={tenant.id}>
                                <TableCell className="font-mono text-xs">{tenant.id}</TableCell>
                                <TableCell className="text-sm max-w-xs truncate">{tenant.parent_emails || 'No parents'}</TableCell>
                                <TableCell>
                                  {currentPlan ? (
                                    <Badge variant={tierColors[currentPlan.tier] || 'secondary'} className="text-xs">
                                      {currentPlan.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">No Subscription</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={subscription?.status === 'active' ? 'default' : 'outline'} className="text-xs">
                                    {subscription?.status || 'none'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {currentPlan && (
                                    <div className="space-y-1">
                                      <div>Ch: {currentPlan.max_children === null ? '∞' : currentPlan.max_children}</div>
                                      <div>Dev: {currentPlan.max_devices === null ? '∞' : currentPlan.max_devices}</div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {subscription?.current_period_start 
                                    ? `${new Date(subscription.current_period_start).toLocaleDateString()} - ${new Date(subscription.current_period_end).toLocaleDateString()}`
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={subscription?.plan_id || ''}
                                    onValueChange={(planId) => updateTenantSubscription(tenant.id, planId)}
                                    disabled={changingSubscription === tenant.id}
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                      <SelectValue placeholder="Select plan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availablePlans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id} className="text-xs">
                                          {plan.name} ({plan.tier})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {filteredSubscriptions.length === 0 && !loading && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No tenants found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="flex-1 overflow-hidden flex flex-col space-y-4">
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="flex-none pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Payment Status</CardTitle>
                      <CardDescription className="text-xs">View billing and payment information (placeholder)</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-3 mb-3 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      ℹ️ This is a placeholder for future payment integration. Currently showing mock data.
                    </p>
                  </div>
                  <div>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by tenant ID, plan, or status..."
                        value={paymentsSearch}
                        onChange={(e) => setPaymentsSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tenant ID</TableHead>
                            <TableHead>
                              <SortButton
                                label="Status"
                                field="status"
                                currentField={paymentsSortField}
                                currentDirection={paymentsSortDirection}
                                onClick={() => toggleSort(paymentsSortField, paymentsSortDirection, 'status', setPaymentsSortField, setPaymentsSortDirection)}
                              />
                            </TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead className="text-center">Users</TableHead>
                            <TableHead className="text-center">Devices</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => (
                            <TableRow key={payment.tenantId}>
                              <TableCell className="font-mono text-xs">{payment.tenantId}</TableCell>
                              <TableCell>
                                <Badge variant={payment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{payment.plan}</Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">{payment.users}</TableCell>
                              <TableCell className="text-center text-sm">{payment.devices}</TableCell>
                              <TableCell className="text-right text-sm font-medium">${payment.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          {filteredPayments.length === 0 && !loading && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No payment data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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
