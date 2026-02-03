import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Users, Database, CreditCard, BarChart, Trash2, RefreshCw } from 'lucide-react'
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

export function AdminPanel() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied. Admin role required.')
      navigate('/')
    }
  }, [user, navigate])

  const fetchStats = async () => {
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
  }

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

  const deleteParent = async (parentId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete parent user ${email}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/parents/${parentId}`, {
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
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats()
    }
  }, [user])

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
    </div>
  )
}
