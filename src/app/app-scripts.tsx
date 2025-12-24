'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function AppScripts() {
  useEffect(() => {
    // LiveChat init logic
    (window as any).__lc = (window as any).__lc || {};
    (window as any).__lc.license = 12049137;
    (window as any).__lc.asyncInit = true;
    
    // Service Worker Prevention logic
    const userAgent = navigator.userAgent.toLowerCase();
    const isFirefox = userAgent.includes('firefox');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const shouldSkipSW = isFirefox || isSafari;

    if (shouldSkipSW) {
      const browserName = isFirefox ? 'Firefox' : 'Safari';
      console.log(
        `[HTML] ${browserName} detected - preventing service worker registration to avoid chunk loading issues`
      );

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then(registrations => {
            registrations.forEach(registration => {
              console.log(`[HTML] Unregistering existing SW for ${browserName}:`, registration.scope);
              registration.unregister();
            });
          })
          .catch(error => {
            console.error('[HTML] Failed to cleanup service workers:', error);
          });
      }
    }
  }, []);

  return (
    <Script
      id="livechat-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function (n, t, c) {
            function i(n) {
              return e._h ? e._h.apply(null, n) : e._q.push(n);
            }
            var e = {
              _q: [],
              _h: null,
              _v: '2.0',
              on: function () {
                i(['on', c.call(arguments)]);
              },
              once: function () {
                i(['once', c.call(arguments)]);
              },
              off: function () {
                i(['off', c.call(arguments)]);
              },
              get: function () {
                if (!e._h) throw new Error('[LiveChatWidget] You can’t use getters before load.');
                return i(['get', c.call(arguments)]);
              },
              call: function () {
                i(['call', c.call(arguments)]);
              },
              init: function () {
                setTimeout(() => {
                  var n = t.createElement('script');
                  ((n.async = !0),
                    (n.type = 'text/javascript'),
                    (n.src = 'https://cdn.livechatinc.com/tracking.js'),
                    t.head.appendChild(n));
                }, 3000);
              },
            };
            (!n.__lc.asyncInit && e.init(), (n.LiveChatWidget = n.LiveChatWidget || e));
          })(window, document, [].slice);
        `,
      }}
    />
  );
}
