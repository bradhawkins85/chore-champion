# Family notifications with ntfy

ChoreQuest publishes notifications from the backend to [ntfy](https://ntfy.sh).
Parents can receive updates in the ntfy mobile or desktop app while ChoreQuest
is closed. Delivery does not depend on SMTP, PWA installation, browser notification
permissions, or a parent having ChoreQuest open.

## Set up a family

1. Open **Parent Mode → Settings → Notifications**.
2. Each family starts with notifications enabled, `https://ntfy.sh`, and a unique
   topic generated with 24 cryptographically random bytes. Existing families
   receive these defaults automatically when the backend starts after upgrading.
3. Subscribe to the displayed server and topic in the ntfy app on each parent's
   device, or open the displayed subscription link.
4. Select the notification types the family wants, then **Save settings**.
5. Choose **Send test notification** to verify the saved configuration.

These preferences are shared across the family. Topics persist across restarts
and logins; changing a topic requires updating subscriptions on receiving devices.
The public ntfy.sh server allows anyone who knows a topic to subscribe or publish.
Keep the random topic private, or use an authenticated server for access control.

## Custom servers and authentication

Families can independently choose a server URL, topic, and authentication method:

- **No authentication** for open topics.
- **Access token** for an ntfy API token (sent using bearer authentication).
- **Username and password** for servers using basic authentication.

HTTP and HTTPS servers, custom ports, and reverse proxy path prefixes are
supported. The URL must be reachable from the ChoreQuest backend. Prefer HTTPS
when sending credentials. The configured identity needs permission to publish
to the selected topic. Subscribers may need their own read credentials in ntfy.

Saved credentials never appear in API responses or general KV exports. A blank
credential field preserves an existing credential for the same server and account.
Changing the server, authentication method, or username requires re-entering the
credential. Choosing **No authentication** removes it.

Credentials are encrypted using AES-256-GCM. By default the encryption key is
derived from `JWT_SECRET`; optionally set a separate, stable `NTFY_ENCRYPTION_KEY`
in the backend environment. Back up the key with the database. If the key changes,
re-enter each family's credentials. No ntfy environment variables are required
for the default public server.

## Notification types

All types are enabled by default and can be disabled independently:

| Type | Trigger |
| --- | --- |
| Chores marked complete | A chore completion is saved, including one awaiting approval |
| Chore completions undone | A completion is removed or marked undone |
| Chores approved | An existing completion changes to approved |
| Chores rejected | An existing completion changes to rejected; includes the reason |
| Reward requests | A child requests a reward from the shop |
| Rewards fulfilled | An existing request is marked fulfilled |
| Reward requests cancelled | An outstanding reward request is removed |

Notifications include the child and chore or reward name. Chore notifications
include the AM/PM slot when present, and reward requests include the point cost.
Inactive chores and chores in any category hidden from Up Next or the calendar
are ignored for all chore notification types. Visibility is checked again before
delivery, so hiding a chore also discards its queued retries. On upgrade, legacy
queued chore messages without a chore ID are discarded because their visibility
cannot be checked.
The family switch disables all delivery. Pending queued messages are also
discarded if their family or notification type is disabled before delivery.

## Delivery and upgrades

The backend compares saved completion and purchase records. Repeated writes,
polling, and unchanged records do not create duplicate notifications. A state
change and its notification are committed in the same database transaction.
The database outbox survives API restarts, and workers retry failed delivery
with backoff, up to an hour between attempts. A network timeout is limited to
five seconds and cannot block a child's saved chore or reward action.

The settings page shows the latest delivery time and failure, and includes a
test action. Save settings before testing. A test uses the family's current
server, topic and credentials. Delivery uses the latest saved settings.
Like other HTTP notification integrations, delivery is at least once: a crash
after ntfy accepts a message but before the outbox commits may repeat that message.

Bulk KV migration/imports and whole-key deletion are maintenance operations and
do not send historical notifications. The old browser push settings, local
notification calls, per-device subscriptions, and push digest options have been
removed. Old subscription data is deleted on backend startup, and the service
worker unsubscribes old browser subscriptions when it activates. PWA caching
and email settings continue to work.

## Developer validation

Run the production builds and unit tests:

```sh
npm run build
cd server
npm run build
npm test
```

The integration suite uses MySQL and a local HTTP ntfy stand-in; it never publishes
to the public service. Use a disposable database whose name ends in `_ntfy_test`:

```sh
cd server
NTFY_TEST_DATABASE=1 MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 \
  MYSQL_USER=chorequest MYSQL_PASSWORD=chorequest \
  MYSQL_DATABASE=chorequest_ntfy_test npm run test:integration
```

The suite checks upgrades and signup defaults, authenticated family isolation,
secret handling, actual API writes and HTTP delivery, notification switches,
concurrent repeated writes, and recovery after a simulated ntfy outage.
