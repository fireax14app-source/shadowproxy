window.ShadowProxyData = {};
window.ShadowProxyData.THEMES = [
    { id: 'midnight', name: 'Midnight', sw: '#8b5cf6' },
    { id: 'aurora',   name: 'Aurora',   sw: '#2dd4bf' },
    { id: 'ember',    name: 'Ember',    sw: '#f97316' },
    { id: 'ice',      name: 'Ice',      sw: '#38bdf8' },
    { id: 'paper',    name: 'Paper',    sw: '#b45309' },
    { id: 'terminal', name: 'Terminal', sw: '#22c55e' }
  ];
window.ShadowProxyData.CATS = [
    { id: 'all',    name: 'All' },
    { id: 'school', name: 'School' },
    { id: 'media',  name: 'Media' },
    { id: 'social', name: 'Social' },
    { id: 'dev',    name: 'Dev' },
    { id: 'tools',  name: 'Tools' }
  ];
window.ShadowProxyData.LINKS = [
    { n: 'Classroom',     u: 'https://classroom.google.com',        c: 'school' },
    { n: 'Drive',         u: 'https://drive.google.com',            c: 'school' },
    { n: 'Docs',          u: 'https://docs.google.com',             c: 'school' },
    { n: 'Sheets',        u: 'https://sheets.google.com',           c: 'school' },
    { n: 'Slides',        u: 'https://slides.google.com',           c: 'school' },
    { n: 'Gmail',         u: 'https://mail.google.com',             c: 'school' },
    { n: 'Khan Academy',  u: 'https://www.khanacademy.org',         c: 'school' },
    { n: 'Quizlet',       u: 'https://quizlet.com',                 c: 'school' },
    { n: 'Desmos',        u: 'https://www.desmos.com/calculator',   c: 'school' },
    { n: 'WolframAlpha',  u: 'https://www.wolframalpha.com',        c: 'school' },
    { n: 'YouTube',       u: 'https://www.youtube.com',             c: 'media' },
    { n: 'Twitch',        u: 'https://www.twitch.tv',               c: 'media' },
    { n: 'Spotify',       u: 'https://open.spotify.com',            c: 'media' },
    { n: 'Netflix',       u: 'https://www.netflix.com',             c: 'media' },
    { n: 'SoundCloud',    u: 'https://soundcloud.com',              c: 'media' },
    { n: 'IMDb',          u: 'https://www.imdb.com',                c: 'media' },
    { n: 'Discord',       u: 'https://discord.com/app',             c: 'social' },
    { n: 'Reddit',        u: 'https://www.reddit.com',              c: 'social' },
    { n: 'Instagram',     u: 'https://www.instagram.com',           c: 'social' },
    { n: 'TikTok',        u: 'https://www.tiktok.com',              c: 'social' },
    { n: 'X',             u: 'https://x.com',                       c: 'social' },
    { n: 'Pinterest',     u: 'https://www.pinterest.com',           c: 'social' },
    { n: 'Snapchat',      u: 'https://web.snapchat.com',            c: 'social' },
    { n: 'GitHub',        u: 'https://github.com',                  c: 'dev' },
    { n: 'Stack Overflow',u: 'https://stackoverflow.com',           c: 'dev' },
    { n: 'MDN',           u: 'https://developer.mozilla.org',       c: 'dev' },
    { n: 'Replit',        u: 'https://replit.com',                  c: 'dev' },
    { n: 'CodePen',       u: 'https://codepen.io',                  c: 'dev' },
    { n: 'npm',           u: 'https://www.npmjs.com',               c: 'dev' },
    { n: 'Wikipedia',     u: 'https://en.wikipedia.org',            c: 'tools' },
    { n: 'ChatGPT',       u: 'https://chatgpt.com',                 c: 'tools' },
    { n: 'Claude',        u: 'https://claude.ai',                   c: 'tools' },
    { n: 'Translate',     u: 'https://translate.google.com',        c: 'tools' },
    { n: 'Archive',       u: 'https://web.archive.org',             c: 'tools' },
    { n: 'Speedtest',     u: 'https://www.speedtest.net',           c: 'tools' },
    { n: 'OpenStreetMap', u: 'https://www.openstreetmap.org',       c: 'tools' }
  ];
window.ShadowProxyData.SEARCH = function (q) { return 'https://www.bing.com/search?q=' + encodeURIComponent(q); };
