import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  ListChecks, 
  Users, 
  Gift, 
  Calendar, 
  Shield, 
  Envelope, 
  CloudSun, 
  SpeakerHigh, 
  Bell, 
  Devices,
  ChartLine,
  ArrowsClockwise,
  Question,
  Sparkle,
  Trophy,
  Star,
  Package
} from '@phosphor-icons/react'

export function HelpMenu() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Question className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-fredoka">Help & Feature Guide</CardTitle>
              <CardDescription>
                Learn about all the features available in ChoreQuest
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This guide provides concise information about each feature in ChoreQuest. 
              Click on any section below to learn more.
            </AlertDescription>
          </Alert>

          <Accordion type="multiple" className="w-full">
            {/* Core Features */}
            <AccordionItem value="core-features">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Core Features
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Child-Friendly Interface</h4>
                  <p className="text-muted-foreground">Simple, intuitive tablet-optimized interface designed for children to easily view and complete their chores.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Parent Dashboard</h4>
                  <p className="text-muted-foreground">Comprehensive management panel with full control over chores, children, rewards, and settings. Access via PIN protection.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Real-Time Progress Tracking</h4>
                  <p className="text-muted-foreground">Live updates on chore completion and point balances across all children.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Chores & Scheduling */}
            <AccordionItem value="chores-scheduling">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Chores & Scheduling
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Flexible Scheduling</h4>
                  <p className="text-muted-foreground">Set chores to repeat daily, weekly, bi-weekly, or custom patterns. Supports specific days of the week (e.g., every Monday, Wednesday).</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Time-Based Chores</h4>
                  <p className="text-muted-foreground">Schedule chores for AM/PM (e.g., "Brush Teeth" twice daily) or specific time windows (e.g., complete between 5-8pm).</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Start/End Dates</h4>
                  <p className="text-muted-foreground">Set optional date ranges for seasonal or temporary chores.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Rotational Chores <Badge variant="secondary" className="ml-2">Advanced</Badge></h4>
                  <p className="text-muted-foreground">Automatically rotate chores between children on a schedule. Perfect for "whose turn is it" tasks.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">School Holidays</h4>
                  <p className="text-muted-foreground">Define holidays when certain chores don't apply. System automatically skips school-day chores on holidays.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Missed Chore Tracking</h4>
                  <p className="text-muted-foreground">Automatically tracks missed chores. Parents can dismiss or mark them as complete.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Rewards & Points */}
            <AccordionItem value="rewards-points">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Rewards & Points System
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Point Categories</h4>
                  <p className="text-muted-foreground">Create multiple point categories (e.g., "Regular" and "Extra") for different types of rewards and chores.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Category Completion Bonuses</h4>
                  <p className="text-muted-foreground">Award bonus points when all chores in a category are completed for the day.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Point Swapping</h4>
                  <p className="text-muted-foreground">Allow children to swap points between categories with custom exchange rates.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Virtual Rewards Shop</h4>
                  <p className="text-muted-foreground">Children can browse and purchase rewards using their earned points. Parents fulfill purchases.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Reward Customization</h4>
                  <p className="text-muted-foreground">Set custom costs per child, expiry dates, availability periods, and purchase limits (per day/week/month).</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Goal Tracking</h4>
                  <p className="text-muted-foreground">Children can track progress toward specific rewards, helping them save for special items.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Family Management */}
            <AccordionItem value="family-management">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Management
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Child Profiles</h4>
                  <p className="text-muted-foreground">Create profiles for each child with custom avatars, optional PINs, and calendar integration.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Per-Child Customization</h4>
                  <p className="text-muted-foreground">Set custom point rewards and costs per child for chores and rewards.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Multi-Parent Access <Badge variant="secondary" className="ml-2">Premium</Badge></h4>
                  <p className="text-muted-foreground">Invite a second parent via email to co-manage the family account with shared access.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Shareable Chores</h4>
                  <p className="text-muted-foreground">Allow multiple children to work together on the same chore.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Approval Workflow</h4>
                  <p className="text-muted-foreground">Optionally require parent approval before chore completions are counted.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Engaging Experience */}
            <AccordionItem value="engaging-experience">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Sparkle className="h-5 w-5" />
                  Engaging Experience
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Celebration Animations</h4>
                  <p className="text-muted-foreground">Trigger fun animations when chores are completed: confetti, fireworks, sparkles, stars, bubbles, and hearts.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Voice Reading</h4>
                  <p className="text-muted-foreground">Enable text-to-speech to read upcoming chores aloud for children.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Weather Integration</h4>
                  <p className="text-muted-foreground">Display live weather and suggest weather-appropriate chores. Auto-detect temperature units based on location.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Seasonal Themes</h4>
                  <p className="text-muted-foreground">Automatic color scheme changes based on weather and seasons.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Reports & Analytics */}
            <AccordionItem value="reports-analytics">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <ChartLine className="h-5 w-5" />
                  Reports & Analytics
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Activity Reports</h4>
                  <p className="text-muted-foreground">View detailed completion history for all children and chores.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Weekly Reports</h4>
                  <p className="text-muted-foreground">Automatically generate and email weekly activity summaries to parents.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Custom Report Templates</h4>
                  <p className="text-muted-foreground">Create custom report templates with specific metrics and filters.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Points History</h4>
                  <p className="text-muted-foreground">Track earned and expired points over time with detailed logs.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Purchase History</h4>
                  <p className="text-muted-foreground">Review all reward purchases and fulfillment status.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Undo History</h4>
                  <p className="text-muted-foreground">View a log of all undo actions with timestamps.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Security & Access */}
            <AccordionItem value="security-access">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Access Control
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Multi-Tenant Authentication</h4>
                  <p className="text-muted-foreground">Secure email & password authentication with complete tenant isolation for privacy.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Parent PIN Protection</h4>
                  <p className="text-muted-foreground">Protect Parent Mode access with a PIN code. Includes brute-force protection with lockout.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Biometric Authentication</h4>
                  <p className="text-muted-foreground">Use fingerprint or face recognition for quick Parent Mode access on PWA.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">IP Address Restrictions</h4>
                  <p className="text-muted-foreground">Limit access to approved IP addresses with override PIN option for exceptions.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Device Linking</h4>
                  <p className="text-muted-foreground">Link specific devices to specific children for controlled access.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Notifications & Email */}
            <AccordionItem value="notifications-email">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications & Communication
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Email Alerts</h4>
                  <p className="text-muted-foreground">Configure SMTP settings to receive alerts for reward purchases, chore completions, and pending approvals.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Digest Mode</h4>
                  <p className="text-muted-foreground">Choose between immediate or batched notifications to reduce email frequency.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Push Notifications</h4>
                  <p className="text-muted-foreground">Enable push notifications on PWA-installed devices for instant alerts.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Parent Invitations</h4>
                  <p className="text-muted-foreground">Send secure email invitations to co-parents with 7-day expiration.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Calendar & Events */}
            <AccordionItem value="calendar-events">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendar Integration
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">ICS Feed Import</h4>
                  <p className="text-muted-foreground">Import external calendar events per child via ICS feed URLs (e.g., Google Calendar, school calendars).</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">"On This Day" Display</h4>
                  <p className="text-muted-foreground">Show upcoming calendar events on the child's dashboard for context.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">7-Day Preview</h4>
                  <p className="text-muted-foreground">View upcoming chores and events for the next week in calendar view.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Auto-Refresh</h4>
                  <p className="text-muted-foreground">Automatically refresh calendar feeds at configurable intervals.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* System Management */}
            <AccordionItem value="system-management">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <ArrowsClockwise className="h-5 w-5" />
                  System Management
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Built-in Updates</h4>
                  <p className="text-muted-foreground">Check for and install updates directly from the dashboard with automatic backup.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Data Storage</h4>
                  <p className="text-muted-foreground">Choose between browser localStorage or MySQL database for centralized storage across devices.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Docker Deployment</h4>
                  <p className="text-muted-foreground">Easy deployment with Docker Compose including persistent volumes and automated backups.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Progressive Web App</h4>
                  <p className="text-muted-foreground">Install on mobile and desktop devices for app-like experience with offline support.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Getting Started */}
            <AccordionItem value="getting-started">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Quick Start Guide
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-2">Initial Setup Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                    <li>Create your account with email and password</li>
                    <li>Set a Parent Mode PIN for security</li>
                    <li>Add children with names and optional avatars</li>
                    <li>Create point categories (e.g., "Regular", "Extra")</li>
                    <li>Add chores with schedules and point values</li>
                    <li>Assign chores to children</li>
                    <li>Create rewards in the shop</li>
                    <li>Exit Parent Mode and let children start earning!</li>
                  </ol>
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-1">For Children:</h4>
                  <p className="text-muted-foreground">Select your profile → View today's chores → Complete them → Earn points → Shop for rewards</p>
                </div>
                <div className="mt-2">
                  <h4 className="font-semibold mb-1">For Parents:</h4>
                  <p className="text-muted-foreground">Enter PIN → Monitor completions → Approve pending items → Fulfill purchases → View reports</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tips & Best Practices */}
            <AccordionItem value="tips">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tips & Best Practices
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Start Simple</h4>
                  <p className="text-muted-foreground">Begin with a few basic daily chores and expand as your family gets comfortable.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Use Categories Wisely</h4>
                  <p className="text-muted-foreground">Create separate categories for different reward types (e.g., screen time vs. treats).</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Set Clear Time Windows</h4>
                  <p className="text-muted-foreground">Use time-based chores for morning/evening routines to create structure.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Enable Celebrations</h4>
                  <p className="text-muted-foreground">Keep children motivated with fun animations on chore completion.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Review Reports Weekly</h4>
                  <p className="text-muted-foreground">Use weekly reports to identify patterns and adjust chore assignments.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Backup Your Data</h4>
                  <p className="text-muted-foreground">If using Docker, enable automated backups. If using localStorage, export data regularly.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Troubleshooting */}
            <AccordionItem value="troubleshooting">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Common Issues & Solutions
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-base">
                <div>
                  <h4 className="font-semibold mb-1">Chores Not Appearing</h4>
                  <p className="text-muted-foreground">Verify chores are assigned to the child, check schedule settings, and ensure they're not outside their date range.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Points Not Calculating</h4>
                  <p className="text-muted-foreground">Check category assignments on chores and rewards. Verify point overrides for specific children.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email Not Sending</h4>
                  <p className="text-muted-foreground">Verify SMTP settings are correct. For Gmail, use an App Password instead of your regular password.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Weather Not Loading</h4>
                  <p className="text-muted-foreground">Check that location is entered correctly and internet connection is active. Coordinates must be detected properly.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Can't Access Parent Mode</h4>
                  <p className="text-muted-foreground">If locked out, wait for the lockout period to expire. If PIN forgotten, you may need to reset data.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Alert className="mt-6">
            <AlertDescription>
              <strong>Need More Help?</strong> For detailed documentation, visit the{' '}
              <a 
                href="https://github.com/bradhawkins85/chore-champion" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                GitHub repository README
              </a>
              {' '}or open an issue for support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
