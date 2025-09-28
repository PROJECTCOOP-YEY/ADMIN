// Security Headers Configuration for Node.js/Express Server
// ========================================================
// 
// This middleware provides comprehensive security headers for your Express application.
// 
// Usage:
// const securityHeaders = require('./security-headers');
// app.use(securityHeaders);

const helmet = require('helmet');

// Comprehensive security headers configuration
const securityHeaders = helmet({
  // ========================================
  // HTTP STRICT TRANSPORT SECURITY (HSTS)
  // ========================================
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // ========================================
  // CONTENT SECURITY POLICY (CSP)
  // ========================================
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.tailwindcss.com",
        "https://cdn.jsdelivr.net",
        "https://www.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://presidential-car-museum-default-rtdb.asia-southeast1.firebasedatabase.app",
        "https://*.firebaseapp.com"
      ],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      blockAllMixedContent: []
    }
  },
  
  // ========================================
  // X-FRAME-OPTIONS
  // ========================================
  frameguard: { action: 'sameorigin' },
  
  // ========================================
  // X-CONTENT-TYPE-OPTIONS
  // ========================================
  noSniff: true,
  
  // ========================================
  // REFERRER POLICY
  // ========================================
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // ========================================
  // PERMISSIONS POLICY
  // ========================================
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    speaker: [],
    vibrate: [],
    fullscreen: ['self'],
    syncXhr: [],
    accelerometer: [],
    ambientLightSensor: [],
    autoplay: [],
    battery: [],
    bluetooth: [],
    clipboardRead: [],
    clipboardWrite: [],
    crossOriginIsolated: [],
    displayCapture: [],
    documentDomain: [],
    encryptedMedia: [],
    executionWhileNotRendered: [],
    executionWhileOutOfViewport: [],
    focusWithoutUserActivation: [],
    gamepad: [],
    gyroscope: [],
    hid: [],
    identityCredentialsGet: [],
    idleDetection: [],
    localFonts: [],
    magnetometer: [],
    midi: [],
    otpCredentials: [],
    payment: [],
    pictureInPicture: [],
    publickeyCredentialsCreate: [],
    publickeyCredentialsGet: [],
    screenWakeLock: [],
    serial: [],
    storageAccess: [],
    usb: [],
    webShare: [],
    xrSpatialTracking: []
  },
  
  // ========================================
  // ADDITIONAL SECURITY HEADERS
  // ========================================
  xssFilter: true,
  hidePoweredBy: true,
  dnsPrefetchControl: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true
});

// Additional custom headers middleware
const additionalHeaders = (req, res, next) => {
  // Cache-Control for sensitive pages
  if (req.path.endsWith('.html') || req.path.endsWith('.htm')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Additional security headers
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  next();
};

// CSP Violation Reporting Endpoint
const cspReportHandler = (req, res) => {
  if (req.method === 'POST' && req.is('application/json')) {
    const violation = req.body;
    
    // Log the violation
    console.log('CSP Violation:', JSON.stringify(violation, null, 2));
    
    // You can also store in database, send email, etc.
    // database.logCSPViolation(violation);
    
    res.status(204).send(); // No Content
  } else {
    res.status(400).send('Bad Request');
  }
};

// Security Headers Test Function
const testSecurityHeaders = (req, res) => {
  const headers = [
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy'
  ];
  
  const results = {};
  headers.forEach(header => {
    results[header] = res.get(header) || 'Not set';
  });
  
  res.json({
    status: 'Security Headers Test',
    results: results,
    timestamp: new Date().toISOString()
  });
};

// Example Express app setup
const express = require('express');
const app = express();

// Apply security headers
app.use(securityHeaders);
app.use(additionalHeaders);

// CSP violation reporting endpoint
app.post('/csp-report', cspReportHandler);

// Security headers test endpoint
app.get('/security-test', testSecurityHeaders);

module.exports = {
  securityHeaders,
  additionalHeaders,
  cspReportHandler,
  testSecurityHeaders
};
