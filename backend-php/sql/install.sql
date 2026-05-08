-- ETWIN Commerce — One-shot install script
-- Replaces: schema.sql + migrate_v2..v6 (all tables in their final form)
-- Charset:  utf8mb4 for full Arabic + emoji support
--
-- Usage (Laragon → terminal):
--   mysql -u root < backend-php/sql/install.sql
-- Or via HeidiSQL: open this file → Run.
--
-- WARNING: this file DROPs the tables it manages. Existing data is lost.
-- For an in-place upgrade on an existing DB, run migrate_v*.sql in order instead.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS etwin_commerce
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE etwin_commerce;

-- Drop in reverse FK dependency order.
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS feature_catalog;
DROP TABLE IF EXISTS store_feature_overrides;
DROP TABLE IF EXISTS plan_catalog;
DROP TABLE IF EXISTS store_members;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS plan_features;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS users;

-- ─────────────────────────────────────────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            CHAR(36) PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(190) NOT NULL,
  is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
  role          ENUM('user','admin','super_admin') NOT NULL DEFAULT 'user',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  STORES (tenants)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE stores (
  id                  CHAR(36) PRIMARY KEY,
  owner_id            CHAR(36) NOT NULL,
  name                VARCHAR(190) NOT NULL,
  slug                VARCHAR(120) NOT NULL UNIQUE,
  currency            VARCHAR(8)   NOT NULL DEFAULT 'MAD',
  city                VARCHAR(120) NOT NULL DEFAULT '',
  logo_url            TEXT         NULL,
  whatsapp_number     VARCHAR(40)  NOT NULL DEFAULT '',
  telegram_chat_id    VARCHAR(64)  NULL,
  facebook_pixel      VARCHAR(64)  NULL,
  tiktok_pixel        VARCHAR(64)  NULL,
  onboarding_complete TINYINT(1)   NOT NULL DEFAULT 0,
  plan                ENUM('trial','starter','pro','business') NOT NULL DEFAULT 'starter',
  plan_expires_at     DATETIME     NOT NULL,
  plan_active         TINYINT(1)   NOT NULL DEFAULT 1,
  suspended           TINYINT(1)   NOT NULL DEFAULT 0,
  suspended_reason    VARCHAR(255) NULL,
  theme_settings      JSON         NULL,
  header_settings     JSON         NULL,
  footer_settings     JSON         NULL,
  custom_domain       VARCHAR(253) NULL UNIQUE,
  domain_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  domain_verified_at  DATETIME     NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stores_owner (owner_id),
  INDEX idx_stores_slug  (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id             CHAR(36) PRIMARY KEY,
  tenant_id      CHAR(36) NOT NULL,
  name           VARCHAR(190) NOT NULL,
  description    TEXT NOT NULL,
  price          DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(12,2) NULL,
  image          LONGTEXT NOT NULL,
  extra_images   JSON NULL,
  video_url      TEXT NULL,
  stock          INT NOT NULL DEFAULT 0,
  status         ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_products_tenant (tenant_id),
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id           CHAR(36) PRIMARY KEY,
  tenant_id    CHAR(36) NOT NULL,
  name         VARCHAR(190) NOT NULL,
  phone        VARCHAR(40)  NOT NULL,
  address      VARCHAR(255) NOT NULL DEFAULT '',
  orders_count INT NOT NULL DEFAULT 0,
  total_spent  DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_customers_tenant (tenant_id),
  INDEX idx_customers_phone  (tenant_id, phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               CHAR(36) PRIMARY KEY,
  tenant_id        CHAR(36) NOT NULL,
  customer_id      CHAR(36) NULL,
  customer_name    VARCHAR(190) NOT NULL,
  customer_phone   VARCHAR(40)  NOT NULL DEFAULT '',
  customer_address VARCHAR(255) NOT NULL DEFAULT '',
  city             VARCHAR(120) NOT NULL DEFAULT '',
  total            DECIMAL(12,2) NOT NULL DEFAULT 0,
  status           ENUM('pending','paid','shipped') NOT NULL DEFAULT 'pending',
  notes            TEXT NULL,
  shipping_status  ENUM('none','preparing','dispatched','delivered') NOT NULL DEFAULT 'none',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_tenant   FOREIGN KEY (tenant_id)   REFERENCES stores(id)    ON DELETE CASCADE,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_orders_tenant  (tenant_id),
  INDEX idx_orders_status  (tenant_id, status),
  INDEX idx_orders_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id   CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  name       VARCHAR(190) NOT NULL,
  qty        INT NOT NULL DEFAULT 1,
  price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  NOTIFICATIONS (dashboard bell)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  CHAR(36)     NOT NULL,
  type       ENUM('order','system','payment','domain') NOT NULL DEFAULT 'order',
  title      VARCHAR(255) NOT NULL,
  body       TEXT         NOT NULL,
  ref_id     CHAR(36)     NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_tenant FOREIGN KEY (tenant_id) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_notif_tenant_read (tenant_id, is_read),
  INDEX idx_notif_tenant_date (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  SUBSCRIPTION HISTORY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE subscription_plans (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id   CHAR(36)     NOT NULL,
  plan       ENUM('trial','starter','pro','business') NOT NULL DEFAULT 'starter',
  amount     DECIMAL(10,2)NOT NULL DEFAULT 0.00,
  started_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME     NOT NULL,
  status     ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  notes      TEXT         NULL,
  CONSTRAINT fk_subplan_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_subplan_store  (store_id),
  INDEX idx_subplan_status (store_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  PLAN FEATURES (legacy gate; superseded by plan_catalog flags)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE plan_features (
  feature     VARCHAR(100) NOT NULL PRIMARY KEY,
  min_plan    ENUM('trial','starter','pro','business') NOT NULL DEFAULT 'starter',
  trial_limit INT          NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO plan_features (feature, min_plan, trial_limit, description) VALUES
  ('products',          'starter', 10, 'Max 10 products on starter plan'),
  ('custom_domain',     'pro',     0,  'Custom domain support'),
  ('telegram_bot',      'pro',     0,  'Telegram bot order notifications'),
  ('facebook_pixel',    'pro',     0,  'Facebook & TikTok pixel tracking'),
  ('advanced_analytics','pro',     0,  'Advanced analytics dashboard'),
  ('remove_branding',   'pro',     0,  'Remove ETWIN branding from storefront'),
  ('team_members',      'pro',     0,  'Invite team members to dashboard');

-- ─────────────────────────────────────────────────────────────────────────────
--  PLATFORM SETTINGS (super-admin-controlled global config)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE platform_settings (
  `key`      VARCHAR(100) NOT NULL PRIMARY KEY,
  `value`    LONGTEXT     NULL,
  `type`     ENUM('string','json','boolean','number') NOT NULL DEFAULT 'string',
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO platform_settings (`key`, `value`, `type`) VALUES
  ('maintenance_mode',   '0',                                                                                'boolean'),
  ('platform_name',      'ETWIN Commerce',                                                                   'string'),
  ('trial_days',         '14',                                                                               'number'),
  ('max_products_trial', '10',                                                                               'number'),
  ('pricing_price',      '99',                                                                               'number'),
  ('pricing_currency',   'MAD',                                                                              'string'),
  ('hero_badge_ar',      'منصة مغربية #1',                                                                    'string'),
  ('hero_badge_fr',      'Plateforme n°1',                                                                   'string'),
  ('hero_title_ar',      'صاوب متجرك وبدا تبيع دابا',                                                          'string'),
  ('hero_title_fr',      'Lance ta boutique et vends maintenant',                                            'string'),
  ('hero_subtitle_ar',   'منصة مغربية متكاملة لإطلاق متجر أونلاين في 60 ثانية. WhatsApp + COD + Telegram.',     'string'),
  ('hero_subtitle_fr',   'Plateforme marocaine pour lancer une boutique en 60s. WhatsApp + COD + Telegram.', 'string'),
  ('hero_cta_ar',        'ابدأ مجاناً',                                                                        'string'),
  ('hero_cta_fr',        'Commencer gratuitement',                                                           'string'),
  ('support_whatsapp',   '',                                                                                 'string'),
  ('support_email',      'support@etwin.app',                                                                'string'),
  ('footer_text_ar',     'منصة مغربية لإطلاق متجرك الأونلاين',                                                  'string'),
  ('footer_text_fr',     'La plateforme marocaine pour votre boutique en ligne',                             'string');

-- ─────────────────────────────────────────────────────────────────────────────
--  STORE MEMBERS (team roles + per-member permissions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE store_members (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id   CHAR(36)     NOT NULL,
  user_id     CHAR(36)     NULL,
  email       VARCHAR(190) NOT NULL,
  full_name   VARCHAR(190) NOT NULL DEFAULT '',
  role        ENUM('owner','sales','stock','custom') NOT NULL DEFAULT 'custom',
  permissions JSON         NOT NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  invited_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_tenant FOREIGN KEY (tenant_id) REFERENCES stores(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_member_email (tenant_id, email),
  INDEX idx_members_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  PLAN CATALOG (super-admin-managed plans)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE plan_catalog (
  id              VARCHAR(40)   NOT NULL PRIMARY KEY,   -- starter|pro|business
  name            VARCHAR(80)   NOT NULL,
  price_mad       DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration        VARCHAR(40)   NOT NULL DEFAULT 'par mois',
  product_limit   INT           NULL,                    -- NULL = unlimited
  team_limit      INT           NOT NULL DEFAULT 0,
  order_limit     INT           NOT NULL DEFAULT 0,      -- 0 = unlimited
  excel_export    TINYINT(1)    NOT NULL DEFAULT 1,
  whatsapp_orders TINYINT(1)    NOT NULL DEFAULT 1,
  custom_domain   TINYINT(1)    NOT NULL DEFAULT 0,
  telegram_bot    TINYINT(1)    NOT NULL DEFAULT 0,
  pixels          TINYINT(1)    NOT NULL DEFAULT 0,
  analytics       TINYINT(1)    NOT NULL DEFAULT 0,
  remove_brand    TINYINT(1)    NOT NULL DEFAULT 0,
  priority_supp   TINYINT(1)    NOT NULL DEFAULT 0,
  recommended     TINYINT(1)    NOT NULL DEFAULT 0,
  sort_order      INT           NOT NULL DEFAULT 0,
  active          TINYINT(1)    NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO plan_catalog
  (id,         name,       price_mad, duration,         product_limit, team_limit, order_limit, excel_export, whatsapp_orders, custom_domain, telegram_bot, pixels, analytics, remove_brand, priority_supp, recommended, sort_order, active) VALUES
  ('starter',  'Starter',  0,         '14 jours essai', 10,            0,          30,          1,            1,               0,             0,            0,      0,         0,            0,             0,           1,          1),
  ('pro',      'Pro',      99,        'par mois',       NULL,          2,          0,           1,            1,               1,             1,            1,      1,         0,            0,             1,           2,          1),
  ('business', 'Business', 299,       'par mois',       NULL,          10,         0,           1,            1,               1,             1,            1,      1,         1,            1,             0,           3,          1);

-- ─────────────────────────────────────────────────────────────────────────────
--  STORE FEATURE OVERRIDES (super-admin grants beyond plan)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE store_feature_overrides (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id      CHAR(36)     NOT NULL,
  feature        VARCHAR(64)  NOT NULL,
  granted        TINYINT(1)   NOT NULL DEFAULT 1,
  override_value INT          NULL,
  reason         VARCHAR(255) NULL,
  granted_by     CHAR(36)     NULL,
  granted_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     DATETIME     NULL,
  CONSTRAINT fk_sfo_tenant FOREIGN KEY (tenant_id) REFERENCES stores(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_sfo (tenant_id, feature),
  INDEX idx_sfo_feature (feature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  FEATURE CATALOG (admin UI listing)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE feature_catalog (
  feature          VARCHAR(64)  NOT NULL PRIMARY KEY,
  label_fr         VARCHAR(120) NOT NULL,
  label_ar         VARCHAR(120) NOT NULL,
  description      VARCHAR(255) NULL,
  kind             ENUM('boolean','number') NOT NULL DEFAULT 'boolean',
  default_min_plan ENUM('starter','pro','business') NOT NULL DEFAULT 'pro',
  sort_order       INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO feature_catalog (feature, label_fr, label_ar, description, kind, default_min_plan, sort_order) VALUES
  ('whatsapp_orders','Commandes WhatsApp',     'طلبات WhatsApp',          'Bouton WhatsApp sur la boutique pour passer commande',  'boolean','starter',  5),
  ('custom_domain',  'Domaine personnalisé',   'دومين خاص',                'Connecter un domaine .com personnalisé',                'boolean','pro',     10),
  ('telegram_bot',   'Notifications Telegram', 'إشعارات Telegram',         'Recevoir les commandes via le bot Telegram',            'boolean','pro',     20),
  ('pixels',         'Pixels publicitaires',   'بكسلات الإعلانات',          'Facebook & TikTok pixel tracking',                      'boolean','pro',     30),
  ('analytics',      'Statistiques avancées',  'إحصائيات متقدمة',           'Tableau de bord & graphiques détaillés',                'boolean','pro',     40),
  ('remove_brand',   'Sans branding ETWIN',    'بلا علامة ETWIN',           'Cacher "Powered by ETWIN" sur la boutique',             'boolean','business',50),
  ('priority_supp',  'Support prioritaire',    'دعم بالأولوية',             'Réponse sous 4 h ouvrées',                              'boolean','business',60),
  ('excel_export',   'Export Excel',           'تصدير Excel',               'Exporter produits / commandes / clients en .xlsx',      'boolean','starter', 70),
  ('product_limit',  'Limite produits',        'حد المنتجات',               'Nombre maximum de produits actifs',                     'number', 'starter', 80),
  ('team_limit',     'Limite équipe',          'حد الفريق',                 'Nombre maximum de membres équipe',                      'number', 'pro',     90),
  ('order_limit',    'Limite commandes/mois',  'حد الطلبات/شهر',            'Plafond mensuel de commandes (0 = illimité)',           'number', 'starter',100);

-- ─────────────────────────────────────────────────────────────────────────────
--  LOGIN ATTEMPTS (brute-force throttle, lazy-created by AuthController)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE login_attempts (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL,
  ip         VARCHAR(64)  NOT NULL,
  success    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_la_lookup (email, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
--  TEST / DEMO ACCOUNTS — password for all three: demo1234
--  Bcrypt hash below is `password_hash('demo1234', PASSWORD_BCRYPT, ['cost'=>10])`.
--  If login fails after a PHP version change, regenerate hashes by running:
--    php backend-php/sql/seed_demo.php
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, full_name, is_admin, role) VALUES
  ('demo-user-001',   'demo@etwin.app',        '$2y$10$q8I.g5pN2QCjkYgb1q8DquNyDgn7OYi0kZdXQ3eSJnUJJ0fIMnBDG', 'Youssef Bennani', 0, 'user'),
  ('demo-admin-001',  'admin@etwin.app',       '$2y$10$q8I.g5pN2QCjkYgb1q8DquNyDgn7OYi0kZdXQ3eSJnUJJ0fIMnBDG', 'Amina Chakir',    0, 'admin'),
  ('demo-super-001',  'superadmin@etwin.app',  '$2y$10$q8I.g5pN2QCjkYgb1q8DquNyDgn7OYi0kZdXQ3eSJnUJJ0fIMnBDG', 'Mehdi El Fassi',  1, 'super_admin');

INSERT INTO stores (id, owner_id, name, slug, currency, city, plan, plan_expires_at, plan_active, onboarding_complete) VALUES
  ('store-demo-001',  'demo-user-001',  'Atlas Watches',   'atlas-watches',   'MAD', 'Tanger',     'starter', DATE_ADD(NOW(), INTERVAL 14 DAY), 1, 1),
  ('store-admin-001', 'demo-admin-001', 'Sahara Boutique', 'sahara-boutique', 'MAD', 'Casablanca', 'pro',     DATE_ADD(NOW(), INTERVAL 30 DAY), 1, 1);

INSERT INTO subscription_plans (store_id, plan, amount, expires_at, status) VALUES
  ('store-demo-001',  'starter', 0.00,  DATE_ADD(NOW(), INTERVAL 14 DAY), 'active'),
  ('store-admin-001', 'pro',     99.00, DATE_ADD(NOW(), INTERVAL 30 DAY), 'active');

INSERT INTO products (id, tenant_id, name, description, price, original_price, image, stock, status) VALUES
  ('prod-demo-001', 'store-demo-001', 'Montre Atlas Classic',
   'Montre élégante en cuir véritable. Mouvement quartz japonais. Garantie 1 an.',
   299, 450,
   'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80',
   12, 'active'),
  ('prod-demo-002', 'store-demo-001', 'Bracelet cuir naturel',
   'Bracelet en cuir tressé fait main. Trois couleurs disponibles.',
   89, 149,
   'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80',
   25, 'active'),
  ('prod-demo-003', 'store-demo-001', 'Lunettes de soleil Sahara',
   'Verres polarisés UV400. Monture en acétate italien.',
   179, 280,
   'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80',
   8, 'active');

SET FOREIGN_KEY_CHECKS = 1;

-- Done. Login credentials:
--   demo@etwin.app        / demo1234   (role: user, store: Atlas Watches)
--   admin@etwin.app       / demo1234   (role: admin, store: Sahara Boutique)
--   superadmin@etwin.app  / demo1234   (role: super_admin, full platform access)
