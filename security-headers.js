// Security Headers Configuration for Node.js/Express Server
// Add this middleware to your Express app

const helmet = require('helmet');

// Security middleware configuration
const securityHeaders = helmet({
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.tailwindcss.com",
        "https://cdn.jsdelivr.net",
        "https://www.gstatic.com"
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
        "data:"
      ],
      connectSrc: [
        "'self'",
        "https://presidential-car-museum-default-rtdb.asia-southeast1.firebasedatabase.app"
      ],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // X-Frame-Options
  frameguard: { action: 'sameorigin' },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Permissions Policy
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
    syncXhr: []
  },
  
  // Additional security headers
  xssFilter: true,
  hidePoweredBy: true
});

// Apply security headers
app.use(securityHeaders);

// Additional custom headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

module.exports = securityHeaders;
