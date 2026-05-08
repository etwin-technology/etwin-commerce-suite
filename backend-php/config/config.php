<?php
// ETWIN Commerce — Configuration
// All sensitive values MUST be provided via environment variables in production.
// `APP_ENV=production` triggers strict validation: missing/weak secrets cause a 500
// at boot rather than silently using insecure defaults.

// Load `backend-php/.env` (if present) so local dev (e.g. Laragon on Windows)
// works without setting Windows-level environment variables. Real env vars
// always win over .env values, so production deploys are unaffected.
// Guarded by a constant because config.php is `require`d (not `require_once`)
// from many call sites — we only need to read the file once per request.
if (!defined('ETWIN_DOTENV_LOADED')) {
    define('ETWIN_DOTENV_LOADED', true);
    $envPath = __DIR__ . '/../.env';
    if (is_file($envPath) && is_readable($envPath)) {
        foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            if (!str_contains($line, '=')) continue;
            [$k, $v] = array_map('trim', explode('=', $line, 2));
            if ($k === '' || getenv($k) !== false) continue;
            // Strip a single matched pair of surrounding quotes.
            if (strlen($v) >= 2 && (($v[0] === '"' && $v[-1] === '"') || ($v[0] === "'" && $v[-1] === "'"))) {
                $v = substr($v, 1, -1);
            }
            putenv("$k=$v");
            $_ENV[$k] = $v;
        }
    }
    unset($envPath);
}

$env = getenv('APP_ENV') ?: 'development';
$isProd = $env === 'production';

$jwtSecret      = getenv('JWT_SECRET')              ?: '';
$telegramSecret = getenv('TELEGRAM_WEBHOOK_SECRET') ?: '';
$corsOrigin     = getenv('CORS_ALLOW_ORIGIN')       ?: '';
$dbPass         = getenv('DB_PASS');

if ($isProd) {
    $errors = [];
    if (strlen($jwtSecret)      < 32) $errors[] = 'JWT_SECRET must be set and >= 32 chars';
    if (strlen($telegramSecret) < 16) $errors[] = 'TELEGRAM_WEBHOOK_SECRET must be set and >= 16 chars';
    if ($corsOrigin === '' || $corsOrigin === '*') $errors[] = 'CORS_ALLOW_ORIGIN must be a specific origin (no wildcard)';
    if ($dbPass === false || $dbPass === '') $errors[] = 'DB_PASS must be set';
    if ($errors) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Server misconfigured', 'details' => $errors]);
        exit;
    }
}

return [
    'env'                     => $env,
    'is_prod'                 => $isProd,
    'db' => [
        'host'    => getenv('DB_HOST')    ?: '127.0.0.1',
        'port'    => getenv('DB_PORT')    ?: '3306',
        'name'    => getenv('DB_NAME')    ?: 'etwin_commerce',
        'user'    => getenv('DB_USER')    ?: 'root',
        'pass'    => $dbPass !== false ? $dbPass : '',
        'charset' => 'utf8mb4',
    ],
    'jwt_secret'              => $jwtSecret ?: 'dev-only-do-not-use-in-prod-please-replace',
    'jwt_ttl_seconds'         => 60 * 60 * 24 * 30, // 30 days
    'telegram_bot_token'      => getenv('TELEGRAM_BOT_TOKEN')      ?: '',
    'telegram_webhook_secret' => $telegramSecret ?: 'dev-only-telegram-secret',
    'cors_allow_origin'       => $corsOrigin ?: '*',
    'app_base_url'            => getenv('APP_BASE_URL')            ?: 'http://localhost:5173',
    'force_https'             => filter_var(getenv('FORCE_HTTPS') ?: ($isProd ? 'true' : 'false'), FILTER_VALIDATE_BOOLEAN),
    // IP address of this server — used for custom domain DNS verification
    'server_ip'               => getenv('SERVER_IP')               ?: '0.0.0.0',
    // Login attempt throttling — max attempts per (ip, email) within the window
    'login_throttle_max'      => (int)(getenv('LOGIN_THROTTLE_MAX')    ?: 8),
    'login_throttle_window'   => (int)(getenv('LOGIN_THROTTLE_WINDOW') ?: 600), // seconds
    // Storefront subdomain config — see Mapper::storefrontUrl().
    // STOREFRONT_URL_PATTERN supports tokens {slug} and {domain}, OR the literal "path"
    // for /store/{slug} fallback when subdomain DNS isn't available.
    'app_domain'              => getenv('APP_DOMAIN')              ?: '',
    'storefront_url_pattern'  => getenv('STOREFRONT_URL_PATTERN')  ?: 'path',
];
