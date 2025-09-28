// Content Security Policy Enforcer
// This script enforces CSP rules client-side as a fallback

(function() {
    'use strict';
    
    // CSP Configuration
    const CSP_CONFIG = {
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdn.tailwindcss.com',
            'https://cdn.jsdelivr.net',
            'https://www.gstatic.com',
            'https://cdnjs.cloudflare.com'
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
            'https://fonts.googleapis.com'
        ],
        'font-src': [
            "'self'",
            'https://fonts.gstatic.com'
        ],
        'img-src': [
            "'self'",
            'data:',
            'blob:'
        ],
        'connect-src': [
            "'self'",
            'https://presidential-car-museum-default-rtdb.asia-southeast1.firebasedatabase.app',
            'https://*.firebaseapp.com'
        ],
        'frame-ancestors': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'object-src': ["'none'"]
    };
    
    // Function to validate URLs against CSP
    function validateURL(url, directive) {
        if (!CSP_CONFIG[directive]) return false;
        
        try {
            const urlObj = new URL(url);
            const allowedSources = CSP_CONFIG[directive];
            
            return allowedSources.some(source => {
                if (source === "'self'") {
                    return urlObj.origin === window.location.origin;
                }
                if (source === "'unsafe-inline'") {
                    return url.startsWith('data:') || url.startsWith('javascript:');
                }
                if (source === "'unsafe-eval'") {
                    return url.includes('eval(') || url.includes('Function(');
                }
                if (source.startsWith('https://')) {
                    return urlObj.origin === source;
                }
                if (source.includes('*')) {
                    const pattern = source.replace(/\*/g, '.*');
                    return new RegExp(pattern).test(urlObj.origin);
                }
                return false;
            });
        } catch (e) {
            return false;
        }
    }
    
    // Override fetch to enforce CSP
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (!validateURL(url, 'connect-src')) {
            console.warn('CSP Violation: Blocked fetch to', url);
            return Promise.reject(new Error('CSP violation: connect-src'));
        }
        return originalFetch.call(this, url, options);
    };
    
    // Override XMLHttpRequest to enforce CSP
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (!validateURL(url, 'connect-src')) {
            console.warn('CSP Violation: Blocked XHR to', url);
            throw new Error('CSP violation: connect-src');
        }
        return originalXHROpen.call(this, method, url, ...args);
    };
    
    // Monitor script loading
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && !validateURL(value, 'script-src')) {
                    console.warn('CSP Violation: Blocked script from', value);
                    return;
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        if (tagName.toLowerCase() === 'link') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'href' && !validateURL(value, 'style-src')) {
                    console.warn('CSP Violation: Blocked stylesheet from', value);
                    return;
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        return element;
    };
    
    // Monitor image loading
    const originalImage = window.Image;
    window.Image = function() {
        const img = new originalImage();
        const originalSetAttribute = img.setAttribute;
        img.setAttribute = function(name, value) {
            if (name === 'src' && !validateURL(value, 'img-src')) {
                console.warn('CSP Violation: Blocked image from', value);
                return;
            }
            return originalSetAttribute.call(this, name, value);
        };
        return img;
    };
    
    // CSP Violation Reporter
    function reportCSPViolation(violation) {
        const report = {
            'csp-report': {
                'document-uri': window.location.href,
                'referrer': document.referrer,
                'violated-directive': violation.violatedDirective,
                'effective-directive': violation.effectiveDirective,
                'original-policy': violation.originalPolicy,
                'disposition': violation.disposition,
                'blocked-uri': violation.blockedURI,
                'line-number': violation.lineNumber,
                'column-number': violation.columnNumber,
                'source-file': violation.sourceFile,
                'status-code': violation.statusCode,
                'script-sample': violation.scriptSample
            }
        };
        
        // Send violation report
        fetch('/csp-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(report)
        }).catch(e => console.warn('Failed to send CSP report:', e));
    }
    
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', function(e) {
        console.warn('CSP Violation detected:', e);
        reportCSPViolation(e);
    });
    
    // Log CSP enforcement
    console.log('🔒 Content Security Policy Enforcer loaded');
    console.log('📋 CSP Configuration:', CSP_CONFIG);
    
})();
