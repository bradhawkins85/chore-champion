-- Subscription and Billing Schema
-- This adds subscription management, billing plans, and payment tracking

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier ENUM('free', 'paid', 'unlimited') NOT NULL,
  description TEXT,
  max_children INT NULL,  -- NULL means unlimited
  max_devices INT NULL,   -- NULL means unlimited
  max_chores INT NULL,    -- NULL means unlimited
  max_rewards INT NULL,   -- NULL means unlimited
  price_per_child_aud DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Price per child per month in AUD
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Base monthly price
  billing_interval ENUM('monthly', 'annual') DEFAULT 'monthly',
  features JSON,  -- Array of feature strings
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tier (tier),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscription Pricing Settings Table
CREATE TABLE IF NOT EXISTS subscription_pricing_settings (
  id VARCHAR(36) PRIMARY KEY,
  scope ENUM('global', 'tenant') NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  price_per_child_aud DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_scope_tenant (scope, tenant_id),
  INDEX idx_scope (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid') DEFAULT 'active',
  current_period_start BIGINT NOT NULL,  -- Unix timestamp in milliseconds
  current_period_end BIGINT NOT NULL,    -- Unix timestamp in milliseconds
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at BIGINT NULL,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_status (status),
  INDEX idx_stripe_customer_id (stripe_customer_id),
  INDEX idx_stripe_subscription_id (stripe_subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36) NOT NULL,
  amount_due INT NOT NULL,  -- Amount in cents (AUD)
  amount_paid INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'draft',
  due_date BIGINT NOT NULL,  -- Unix timestamp in milliseconds
  paid_at BIGINT NULL,
  hosted_invoice_url TEXT NULL,
  invoice_pdf TEXT NULL,
  stripe_invoice_id VARCHAR(255) NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_stripe_invoice_id (stripe_invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  type ENUM('card', 'bank_account') DEFAULT 'card',
  last4 VARCHAR(4) NOT NULL,
  brand VARCHAR(50) NOT NULL,  -- e.g., 'visa', 'mastercard'
  expiry_month INT NOT NULL,
  expiry_year INT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_stripe_payment_method_id (stripe_payment_method_id),
  INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, tier, description, max_children, max_devices, max_chores, max_rewards, price_per_child_aud, base_price, billing_interval, features, is_active)
VALUES 
  -- Free Plan
  (
    'plan_free',
    'Free',
    'free',
    'Perfect for trying out ChoreQuest with basic features',
    1,  -- 1 child
    1,  -- 1 device
    3,  -- 3 chores
    3,  -- 3 rewards
    0.00,  -- Free
    0.00,
    'monthly',
    JSON_ARRAY('1 Child', '1 Linked Device', 'Up to 3 Chores', 'Up to 3 Rewards', 'Basic Notifications'),
    TRUE
  ),
  -- Paid Plan
  (
    'plan_paid',
    'Paid',
    'paid',
    'Full access to ChoreQuest for growing families',
    NULL,  -- Unlimited children
    NULL,  -- Unlimited devices
    NULL,  -- Unlimited chores
    NULL,  -- Unlimited rewards
    1.00,  -- $1 AUD per child per month
    0.00,
    'monthly',
    JSON_ARRAY('Unlimited Children', 'Unlimited Devices', 'Unlimited Chores', 'Unlimited Rewards', 'Priority Support', 'Advanced Analytics'),
    TRUE
  ),
  -- Unlimited Plan (Admin only)
  (
    'plan_unlimited',
    'Unlimited',
    'unlimited',
    'Unlimited plan for special accounts (admin configurable only)',
    NULL,  -- Unlimited children
    NULL,  -- Unlimited devices
    NULL,  -- Unlimited chores
    NULL,  -- Unlimited rewards
    0.00,  -- Free (no per-child charge)
    0.00,
    'monthly',
    JSON_ARRAY('Unlimited Children', 'Unlimited Devices', 'Unlimited Chores', 'Unlimited Rewards', 'VIP Support', 'Advanced Analytics'),
    TRUE
  )
;

-- Default global pricing (mirrors paid plan price)
INSERT IGNORE INTO subscription_pricing_settings (id, scope, tenant_id, price_per_child_aud)
VALUES ('pricing_global', 'global', 'global', 1.00);
