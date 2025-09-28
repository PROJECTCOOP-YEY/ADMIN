<?php
/**
 * COMPREHENSIVE SECURITY HEADERS FOR PHP
 * =====================================
 * 
 * This file provides all necessary security headers for your PHP application.
 * Include this file at the top of your PHP pages or in your main configuration.
 * 
 * Usage:
 * require_once 'security-headers.php';
 * 
 * Or copy the header() calls directly into your PHP files.
 */

// Prevent direct access to this file
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit('Access denied');
}

/**
 * Set comprehensive security headers
 */
function setSecurityHeaders() {
    // ========================================
    // HTTP STRICT TRANSPORT SECURITY (HSTS)
    // ========================================
    // Forces HTTPS connections and prevents protocol downgrade attacks
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    
    // ========================================
    // CONTENT SECURITY POLICY (CSP)
    // ========================================
    // Prevents XSS attacks by controlling resource loading
    $csp = "default-src 'self'; " .
           "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://www.gstatic.com https://cdnjs.cloudflare.com; " .
           "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " .
           "font-src 'self' https://fonts.gstatic.com; " .
           "img-src 'self' data: blob:; " .
           "connect-src 'self' https://presidential-car-museum-default-rtdb.asia-southeast1.firebasedatabase.app https://*.firebaseapp.com; " .
           "frame-ancestors 'self'; " .
           "base-uri 'self'; " .
           "form-action 'self'; " .
           "object-src 'none'; " .
           "upgrade-insecure-requests; " .
           "block-all-mixed-content;";
    
    header('Content-Security-Policy: ' . $csp);
    
    // ========================================
    // X-FRAME-OPTIONS
    // ========================================
    // Prevents clickjacking attacks by controlling iframe embedding
    header('X-Frame-Options: SAMEORIGIN');
    
    // ========================================
    // X-CONTENT-TYPE-OPTIONS
    // ========================================
    // Prevents MIME type sniffing attacks
    header('X-Content-Type-Options: nosniff');
    
    // ========================================
    // REFERRER POLICY
    // ========================================
    // Controls referrer information sent with requests
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    // ========================================
    // PERMISSIONS POLICY
    // ========================================
    // Controls browser features and APIs
    $permissions = "geolocation=(), microphone=(), camera=(), payment=(), usb=(), " .
                   "magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self), " .
                   "sync-xhr=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), " .
                   "battery=(), bluetooth=(), clipboard-read=(), clipboard-write=(), " .
                   "cross-origin-isolated=(), display-capture=(), document-domain=(), " .
                   "encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), " .
                   "focus-without-user-activation=(), gamepad=(), gyroscope=(), hid=(), " .
                   "identity-credentials-get=(), idle-detection=(), local-fonts=(), " .
                   "magnetometer=(), midi=(), otp-credentials=(), payment=(), " .
                   "picture-in-picture=(), publickey-credentials-create=(), publickey-credentials-get=(), " .
                   "screen-wake-lock=(), serial=(), storage-access=(), usb=(), " .
                   "web-share=(), xr-spatial-tracking=()";
    
    header('Permissions-Policy: ' . $permissions);
    
    // ========================================
    // ADDITIONAL SECURITY HEADERS
    // ========================================
    
    // X-XSS-Protection (legacy but still useful)
    header('X-XSS-Protection: 1; mode=block');
    
    // X-Download-Options (IE specific)
    header('X-Download-Options: noopen');
    
    // X-Permitted-Cross-Domain-Policies
    header('X-Permitted-Cross-Domain-Policies: none');
    
    // Cross-Origin-Embedder-Policy
    header('Cross-Origin-Embedder-Policy: require-corp');
    
    // Cross-Origin-Opener-Policy
    header('Cross-Origin-Opener-Policy: same-origin');
    
    // Cross-Origin-Resource-Policy
    header('Cross-Origin-Resource-Policy: same-origin');
    
    // Cache-Control for sensitive pages
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Remove server information
    header_remove('Server');
    header_remove('X-Powered-By');
}

/**
 * Set security headers for specific file types
 */
function setSecurityHeadersForFile($filename) {
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    switch ($extension) {
        case 'html':
        case 'htm':
            // HTML files should not be cached
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            break;
            
        case 'css':
            // CSS files can be cached
            header('Cache-Control: public, max-age=31536000');
            break;
            
        case 'js':
            // JavaScript files can be cached
            header('Cache-Control: public, max-age=31536000');
            break;
            
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
            // Images can be cached
            header('Cache-Control: public, max-age=31536000');
            break;
    }
}

/**
 * Validate and sanitize input
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Check if request is secure (HTTPS)
 */
function isSecure() {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
           $_SERVER['SERVER_PORT'] == 443 ||
           (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
}

/**
 * Force HTTPS redirect
 */
function forceHTTPS() {
    if (!isSecure()) {
        $redirectURL = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        header('Location: ' . $redirectURL, true, 301);
        exit();
    }
}

/**
 * Set security headers and force HTTPS
 */
function initializeSecurity() {
    // Force HTTPS if not already secure
    forceHTTPS();
    
    // Set all security headers
    setSecurityHeaders();
    
    // Set file-specific headers
    setSecurityHeadersForFile($_SERVER['SCRIPT_NAME']);
}

// Auto-initialize security if this file is included
if (!defined('SECURITY_HEADERS_LOADED')) {
    define('SECURITY_HEADERS_LOADED', true);
    initializeSecurity();
}

/**
 * CSP Violation Reporting Endpoint
 * 
 * Create a separate file called 'csp-report.php' and use this code:
 */
function handleCSPViolation() {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
        isset($_SERVER['CONTENT_TYPE']) && 
        strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
        
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && isset($data['csp-report'])) {
            $violation = $data['csp-report'];
            
            // Log the violation (customize as needed)
            error_log('CSP Violation: ' . json_encode($violation));
            
            // You can also store in database, send email, etc.
            // database_log_csp_violation($violation);
        }
        
        http_response_code(204); // No Content
        exit();
    }
}

/**
 * Security Headers Test Function
 * 
 * Call this function to test if headers are working:
 */
function testSecurityHeaders() {
    $headers = [
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy'
    ];
    
    $results = [];
    foreach ($headers as $header) {
        $results[$header] = headers_sent() ? 'Headers already sent' : 'OK';
    }
    
    return $results;
}

// Uncomment the line below to test security headers
// var_dump(testSecurityHeaders());

?>
