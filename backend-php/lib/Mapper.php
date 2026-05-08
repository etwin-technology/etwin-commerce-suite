<?php
/**
 * Mapper — Map MySQL rows → JSON contracts expected by the React client.
 */
class Mapper {

    public static function user(array $r): array {
        $role = $r['role'] ?? 'user';
        // backward compat: is_admin=1 + role='user' → super_admin
        if ($role === 'user' && !empty($r['is_admin'])) $role = 'super_admin';

        return [
            'id'       => $r['id'],
            'email'    => $r['email'],
            'fullName' => $r['full_name'],
            'role'     => $role,
            'isAdmin'  => $role === 'super_admin' || $role === 'admin',
        ];
    }

    public static function store(array $r): array {
        $theme  = $r['theme_settings']  ? json_decode($r['theme_settings'],  true) : null;
        $header = $r['header_settings'] ? json_decode($r['header_settings'], true) : null;
        $footer = $r['footer_settings'] ? json_decode($r['footer_settings'], true) : null;

        return [
            'id'           => $r['id'],
            'name'         => $r['name'],
            'slug'         => $r['slug'],
            'ownerId'      => $r['owner_id'],
            'currency'     => $r['currency'],
            'city'         => $r['city'],
            'logoUrl'      => $r['logo_url'],
            'storefrontUrl' => self::storefrontUrl($r['slug'], $r['custom_domain'] ?? null, !empty($r['domain_verified'])),
            'notifications' => [
                'whatsappNumber' => $r['whatsapp_number'] ?? '',
                'telegramChatId' => $r['telegram_chat_id'],
            ],
            'tracking' => [
                'facebookPixel' => $r['facebook_pixel'],
                'tiktokPixel'   => $r['tiktok_pixel'],
            ],
            'theme' => $theme ?: [
                'primaryColor'   => '#7C3AED',
                'secondaryColor' => '#F3F0FF',
                'accentColor'    => '#F59E0B',
                'fontFamily'     => 'DM Sans',
                'borderRadius'   => 'lg',
            ],
            'header' => $header ?: [
                'logoUrl'          => $r['logo_url'],
                'menuLinks'        => [],
                'showSearch'       => false,
                'announcementBar'  => false,
                'announcementText' => '',
            ],
            'footer' => $footer ?: [
                'description' => '',
                'links'       => [],
                'socials'     => ['facebook' => '', 'instagram' => '', 'tiktok' => '', 'youtube' => ''],
                'showPoweredBy' => true,
            ],
            'customDomain'   => $r['custom_domain'] ?? null,
            'domainVerified' => (bool)($r['domain_verified'] ?? 0),
            'onboardingComplete' => (bool)$r['onboarding_complete'],
            'subscription' => [
                'plan'      => $r['plan'],
                'expiresAt' => date('c', strtotime($r['plan_expires_at'])),
                'active'    => (bool)$r['plan_active'],
            ],
        ];
    }

    /**
     * Build the public storefront URL for a store, honouring (in order):
     *  1. Verified custom domain                  → https://<custom>
     *  2. STOREFRONT_URL_PATTERN with {slug}/{domain} tokens (subdomain mode)
     *  3. APP_BASE_URL/store/<slug>               (path-mode fallback)
     *
     * Pattern examples:
     *   STOREFRONT_URL_PATTERN=https://{slug}.{domain}   APP_DOMAIN=etwin.app
     *     → https://atlas-watches.etwin.app
     *   STOREFRONT_URL_PATTERN=path                       APP_BASE_URL=http://localhost:5173
     *     → http://localhost:5173/store/atlas-watches
     */
    public static function storefrontUrl(string $slug, ?string $customDomain, bool $domainVerified): string {
        $cfg = require __DIR__ . '/../config/config.php';

        if ($domainVerified && $customDomain) {
            $scheme = !empty($cfg['force_https']) ? 'https' : 'http';
            return "$scheme://$customDomain";
        }

        $pattern = (string)($cfg['storefront_url_pattern'] ?? 'path');
        $domain  = (string)($cfg['app_domain'] ?? '');

        // "path" or empty = fall back to APP_BASE_URL/store/<slug>
        if ($pattern === '' || $pattern === 'path' || $domain === '') {
            $base = rtrim((string)($cfg['app_base_url'] ?? ''), '/');
            return ($base !== '' ? $base : '') . '/store/' . rawurlencode($slug);
        }

        return strtr($pattern, ['{slug}' => $slug, '{domain}' => $domain]);
    }

    public static function product(array $r): array {
        return [
            'id'            => $r['id'],
            'tenantId'      => $r['tenant_id'],
            'name'          => $r['name'],
            'description'   => $r['description'],
            'price'         => (float)$r['price'],
            'originalPrice' => $r['original_price'] !== null ? (float)$r['original_price'] : null,
            'image'         => $r['image'],
            'extraImages'   => $r['extra_images'] ? json_decode($r['extra_images'], true) : [],
            'videoUrl'      => $r['video_url'],
            'stock'         => (int)$r['stock'],
            'status'        => $r['status'],
            'createdAt'     => date('c', strtotime($r['created_at'])),
        ];
    }

    public static function customer(array $r): array {
        return [
            'id'          => $r['id'],
            'tenantId'    => $r['tenant_id'],
            'name'        => $r['name'],
            'phone'       => $r['phone'],
            'address'     => $r['address'],
            'ordersCount' => (int)$r['orders_count'],
            'totalSpent'  => (float)$r['total_spent'],
        ];
    }

    public static function order(array $r, array $items): array {
        return [
            'id'              => $r['id'],
            'tenantId'        => $r['tenant_id'],
            'customerId'      => $r['customer_id'],
            'customerName'    => $r['customer_name'],
            'customerPhone'   => $r['customer_phone'],
            'customerAddress' => $r['customer_address'],
            'city'            => $r['city'],
            'total'           => (float)$r['total'],
            'status'          => $r['status'],
            'notes'           => $r['notes'] ?? null,
            'createdAt'       => date('c', strtotime($r['created_at'])),
            'items' => array_map(fn($i) => [
                'productId' => $i['product_id'],
                'name'      => $i['name'],
                'qty'       => (int)$i['qty'],
                'price'     => (float)$i['price'],
            ], $items),
        ];
    }
}
