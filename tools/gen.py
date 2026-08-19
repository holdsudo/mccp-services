#!/usr/bin/env python3
"""Generate MCCPS static pages with shared head/nav/footer."""
import os, re, html

S = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(S)  # repo root
PHONE = '844.826.6227'
TEL = 'tel:+18448266227'
BASE = 'https://joe-miz.com/mccp-services/'

ICON = {
 'arrow': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/></svg>',
 'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" opacity=".35"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>',
 'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 'card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/></svg>',
 'globe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
 'mobile': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
 'repeat': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
 'chart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/></svg>',
 'layers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>',
 'zap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>',
 'headset': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
 'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
 'building': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>',
}

NAV_LINKS = [('index.html','Home'),('free-analysis.html','Free Analysis'),('agents.html','Become an Agent'),('faq.html','Agent FAQ')]

def head(title, desc, path, extra=''):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#04070f">
<link rel="canonical" href="{BASE}{path if path!='index.html' else ''}">
<meta property="og:site_name" content="MCCPS — Merchant Credit Card Processing Services">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{BASE}{path if path!='index.html' else ''}">
<meta property="og:image" content="{BASE}assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="assets/favicon.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
{extra}
</head>
<body>
'''

def nav():
    links = ''.join(f'<li><a href="{h}">{t}</a></li>' for h,t in NAV_LINKS)
    mlinks = ''.join(f'<a href="{h}">{t}</a>' for h,t in NAV_LINKS)
    return f'''<header class="nav">
  <div class="container nav__inner">
    <a class="nav__logo" href="index.html" aria-label="MCCPS home"><img src="assets/logo.png" alt="MCCPS — Merchant Credit Card Processing Services" width="236" height="76"></a>
    <nav aria-label="Primary"><ul class="nav__links">{links}</ul></nav>
    <div class="nav__cta">
      <a class="nav__phone" href="{TEL}">{PHONE}</a>
      <a class="btn btn--primary btn--sm" href="free-analysis.html">Free Analysis {ICON['arrow']}</a>
    </div>
    <button class="nav__burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  {mlinks}
  <a class="btn btn--primary" href="free-analysis.html">Get Your Free Analysis {ICON['arrow']}</a>
  <a class="mobile-menu__phone" href="{TEL}">Call {PHONE}</a>
</div>
'''

def footer(sticky=True):
    st = f'''<div class="sticky-cta" aria-hidden="false">
  <a class="btn btn--ghost" href="{TEL}">{ICON['phone']} Call</a>
  <a class="btn btn--primary" href="free-analysis.html">Free Analysis</a>
</div>''' if sticky else ''
    return f'''<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div>
        <a class="footer__logo" href="index.html"><img src="assets/logo.png" alt="MCCPS" width="236" height="76"></a>
        <p>Merchant Credit Card Processing Services “MCCPS” LLC — secure, low-cost payment processing for businesses online, in person and over the phone. Personal, first-hand customer service, 24/7.</p>
        <a class="footer__phone mt-1" href="{TEL}">{ICON['phone']} {PHONE}</a>
        <p class="small" style="margin-top:.3rem">844.826.MCCP</p>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="free-analysis.html">Free Savings Analysis</a></li>
          <li><a href="agents.html">Become an MCCPS Agent</a></li>
          <li><a href="faq.html">Agent FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Legal</h4>
        <ul>
          <li><a href="terms.html">Terms of Use</a></li>
          <li><a href="privacy.html">Privacy Policy</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__legal">
      <p>Merchant Credit Card Processing Services “MCCPS” LLC acquires vast, broad, comprehensive, expansive, global strategic partnerships throughout the merchant and credit card processing industry; that provides, services, supports and maintains all types and aspects of merchant credit card processing services and point of sale systems (POS).</p>
      <p>MCCPS is in alliance and affiliated with several global strategic partnerships that are registered ISOs of Wells Fargo Bank, N.A., Concord, CA; RBS WorldPay; Deutsche Bank USA, New York, NY; Merrick Bank, South Jordan, UT; Harris N.A., Chicago, IL; Fifth Third Bank, Cincinnati, OH.</p>
      <div class="footer__bottom">
        <span>© <span data-year>2026</span> MCCPS LLC. All rights reserved.</span>
        <span><a href="terms.html">Terms</a> · <a href="privacy.html">Privacy</a></span>
      </div>
    </div>
  </div>
</footer>
{st}
<script src="site.config.js"></script>
<script src="app.js" defer></script>
'''

def page(path, title, desc, body, scene=False, sticky=True, extra_head='', module=None, body_class='', bg=False):
    bgdiv = '<div class="page-bg" data-scene="ambient" aria-hidden="true"></div>\n' if bg else ''
    out = head(title, desc, path, extra_head) + nav() + bgdiv + body + footer(sticky)
    if bg: scene = True
    if scene: out += '<script type="module" src="scene.js"></script>\n'
    if module: out += f'<script type="module" src="{module}"></script>\n'
    out += '</body>\n</html>\n'
    if body_class: out = out.replace('<body>', f'<body class="{body_class}">', 1)
    with open(os.path.join(OUT, path), 'w') as f: f.write(out)
    print('wrote', path, len(out))

# ============================================================ HOME
def feature_card(icon, title, text, viz='', cls=''):
    return f'''<article class="card reveal {cls}">
  {viz}
  <div class="card__icon">{ICON[icon]}</div>
  <h3>{title}</h3>
  <p>{text}</p>
</article>'''

ICON['drag'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>'
ICON['replay'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>'
HOME = open(os.path.join(S, 'home.part.html')).read()
for k, v in {'{ARROW}': ICON['arrow'], '{PHONEICON}': ICON['phone'], '{CHECK}': ICON['check'], '{DRAGICON}': ICON['drag'], '{REPLAYICON}': ICON['replay'], '{TEL}': TEL, '{PHONE}': PHONE}.items():
    HOME = HOME.replace(k, v)

LD = '''<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FinancialService","name":"Merchant Credit Card Processing Services (MCCPS)","alternateName":"MCCPS LLC","url":"https://www.mccp.services/","telephone":"+1-844-826-6227","description":"Secure, low-cost merchant credit card processing online, in person and over the phone. Zero processing fee program, next-day funding, 24/7 support.","areaServed":"US","image":"https://joe-miz.com/mccp-services/assets/og.png"}
</script>'''

IMPORTMAP = '<script type="importmap">{"imports":{"three":"./assets/vendor/three.module.min.js","three/addons/":"./assets/vendor/addons/"}}</script>\n<link rel="stylesheet" href="cinema.css">\n<link rel="modulepreload" href="assets/vendor/three.module.min.js">'
page('index.html', 'MCCPS — Merchant Credit Card Processing Services | Payments, re-engineered',
     'M.C.C.P.S secure payment processing takes the guesswork out of accepting credit cards online, in person and over the phone. Low rates, zero-fee program, next-day funding, 24/7 support. Get a free savings analysis.',
     HOME, scene=False, sticky=False, extra_head=LD + '\n' + IMPORTMAP, module='experience.js', body_class='is-cinema')

# ============================================================ FREE ANALYSIS
FA = f'''
<section class="page-hero">
  <div class="container">
    <div class="split split--sticky" style="align-items:start">
      <div>
        <span class="kicker reveal is-visible">Free savings analysis</span>
        <h1 class="words">Save money on your credit card transactions.</h1>
        <p class="lead reveal" style="--d:400ms">Currently accepting cards? Odds are, we can save you money — and M.C.C.P.S. makes it easy. Three quick steps and you're back to your business. No obligation, ever.</p>
        <ul class="check-list reveal" style="--d:550ms">
          <li>{ICON['check']}<span>Line-by-line review of your current rates and fees</span></li>
          <li>{ICON['check']}<span>Keep your existing re-programmable terminals</span></li>
          <li>{ICON['check']}<span>Ask about <b>Zero Processing Fees</b></span></li>
        </ul>
        <div class="glass mt-2 reveal" style="--d:700ms">
          <strong>Prefer to talk?</strong>
          <p class="muted small mt-1">Call us and we'll walk through it together.</p>
          <a class="footer__phone" href="{TEL}">{ICON['phone']} {PHONE}</a>
        </div>
      </div>

      <form class="form-card reveal" style="--d:300ms" data-form="free-analysis" action="#" enctype="multipart/form-data" novalidate
            data-success="Thank you! Your analysis request was received. An MCCPS specialist will review your statements and reach out shortly.">
        <input type="hidden" name="_subject" value="MCCPS — Free Analysis Request">
        <input type="text" name="_gotcha" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="progress" aria-hidden="true"><span></span><span></span><span></span></div>

        <fieldset class="fieldset">
          <legend><i>1</i> Contact information</legend>
          <div class="form-grid">
            <div class="field full"><label for="fa-ref">Did someone refer you to us? <span class="req">*</span></label><input id="fa-ref" name="referred_by" required placeholder="Name of the person or business — so we can say thanks!"></div>
            <div class="field"><label for="fa-first">First name <span class="req">*</span></label><input id="fa-first" name="first_name" required autocomplete="given-name"></div>
            <div class="field"><label for="fa-last">Last name <span class="req">*</span></label><input id="fa-last" name="last_name" required autocomplete="family-name"></div>
            <div class="field full"><label for="fa-biz">Business name <span class="req">*</span></label><input id="fa-biz" name="business_name" required autocomplete="organization"></div>
            <div class="field full"><label for="fa-email">Email <span class="req">*</span></label><input id="fa-email" type="email" name="email" required autocomplete="email"></div>
            <div class="field"><label for="fa-cell">Cell # <span class="req">*</span></label><input id="fa-cell" type="tel" name="cell_phone" required autocomplete="tel"></div>
            <div class="field"><label for="fa-bphone">Business phone <span class="req">*</span></label><input id="fa-bphone" type="tel" name="business_phone" required></div>
            <div class="field full"><span style="font-size:.85rem;font-weight:600;color:var(--ink-2)">We currently accept credit cards <span class="req">*</span></span>
              <div class="radio-row">
                <label class="chip"><input type="radio" name="accepts_cards" value="Yes" required><span>Yes</span></label>
                <label class="chip"><input type="radio" name="accepts_cards" value="No"><span>No</span></label>
              </div>
            </div>
            <div class="field full"><label for="fa-addr1">Business address <span class="req">*</span></label><input id="fa-addr1" name="address_line1" required placeholder="Street address" autocomplete="address-line1"></div>
            <div class="field full"><label for="fa-addr2" class="sr-only">Address line 2</label><input id="fa-addr2" name="address_line2" placeholder="Suite, unit (optional)" autocomplete="address-line2"></div>
            <div class="field"><label for="fa-city">City <span class="req">*</span></label><input id="fa-city" name="city" required autocomplete="address-level2"></div>
            <div class="field"><label for="fa-state">State <span class="req">*</span></label><input id="fa-state" name="state" required autocomplete="address-level1"></div>
            <div class="field"><label for="fa-zip">ZIP <span class="req">*</span></label><input id="fa-zip" name="zip" required inputmode="numeric" autocomplete="postal-code"></div>
            <div class="field"><label for="fa-country">Country</label><input id="fa-country" name="country" value="United States" autocomplete="country-name"></div>
            <div class="field full"><label for="fa-about">Tell us about your business <span class="req">*</span></label><textarea id="fa-about" name="about_business" required placeholder="What makes your business special or unique? What do you specialize in?"></textarea></div>
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend><i>2</i> Basic business information</legend>
          <div class="form-grid">
            <div class="field"><label for="fa-vol">Average monthly card volume <span class="req">*</span></label><input id="fa-vol" name="monthly_volume" required placeholder="$" inputmode="decimal"></div>
            <div class="field"><label for="fa-proc">Current processing company <span class="req">*</span></label><input id="fa-proc" name="current_processor" required></div>
            <div class="field full"><label for="fa-rates">Processing rates or fees <span class="req">*</span></label><input id="fa-rates" name="current_rates" required placeholder="e.g. 2.9% + $0.30, monthly fees…"></div>
            <div class="field full"><span style="font-size:.85rem;font-weight:600;color:var(--ink-2)">Which applies to your business? <span class="req">*</span></span>
              <div class="radio-row">
                <label class="chip"><input type="radio" name="business_type" value="Retail location with physical card swipe" required><span>Retail / card-present</span></label>
                <label class="chip"><input type="radio" name="business_type" value="Web or online card payments accepted"><span>Web / online</span></label>
                <label class="chip"><input type="radio" name="business_type" value="Mobile swipe or card reader"><span>Mobile reader</span></label>
                <label class="chip"><input type="radio" name="business_type" value="Not accepting cards yet"><span>Not yet accepting</span></label>
                <label class="chip"><input type="radio" name="business_type" value="Other"><span>Other</span></label>
              </div>
            </div>
            <div class="field full"><label for="fa-more">Any additional info <span class="req">*</span></label><textarea id="fa-more" name="additional_info" required></textarea></div>
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend><i>3</i> Two consecutive monthly statements</legend>
          <div class="form-grid">
            <div class="field full"><label for="fa-f1">Statement 1 (PDF or image, max 20 MB)</label><input id="fa-f1" type="file" name="statement_1" accept=".pdf,image/*"></div>
            <div class="field full"><label for="fa-f2">Statement 2</label><input id="fa-f2" type="file" name="statement_2" accept=".pdf,image/*"></div>
            <div class="field full"><label for="fa-f3">Additional file (optional)</label><input id="fa-f3" type="file" name="statement_3" accept=".pdf,image/*"></div>
            <p class="form-note full">Don't have your statements handy? Submit anyway — we'll collect them on the call.</p>
          </div>
        </fieldset>

        <button class="btn btn--primary btn--lg btn--block" type="submit">Submit my free analysis {ICON['arrow']}</button>
        <div class="form-status" role="status" aria-live="polite"></div>
        <p class="form-note mt-1">Your information is kept private and used only to prepare your analysis. See our <a href="privacy.html" style="text-decoration:underline">Privacy Policy</a>.</p>
      </form>
    </div>
  </div>
</section>
'''
page('free-analysis.html', 'Free Savings Analysis — MCCPS Merchant Credit Card Processing',
     'Find out quickly if MCCPS can save your business money on credit card processing fees. Three quick steps, no obligation. Upload two statements and we do the rest.',
     FA, sticky=False, bg=True)

# ============================================================ AGENTS
AG = f'''
<section class="page-hero page-hero--center">
  <div class="container">
    <span class="kicker reveal is-visible">Independent sales offices & agents welcome</span>
    <h1 class="words">MCCPS is looking for new independent sales agents.</h1>
    <p class="lead reveal" style="--d:400ms">We work with dozens of ISOs and ISAs across the nation as partners — helping clients handle payment processing in ways that create wins for everyone.</p>
    <div class="hero__actions reveal" style="justify-content:center;--d:550ms">
      <a class="btn btn--primary btn--lg" href="#apply">Join our team {ICON['arrow']}</a>
      <a class="btn btn--ghost btn--lg" href="faq.html">Agent FAQ</a>
    </div>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="bento" data-stagger>
      {feature_card('layers','Vertical solutions','Industry-specific solutions only available to MCCPS ISOs and ISAs.')}
      {feature_card('building','Multiple platforms & banks','Processing options across multiple platforms and issuing banks — place every merchant.')}
      {feature_card('zap','Fast approvals','E-signature merchant processing applications get your merchants live quickly.')}
      {feature_card('users','Personal marketing program','A customized marketing program tailored specifically for you — see the packages below.')}
      {feature_card('repeat','Monthly residuals','Continuous monthly residuals on every merchant you refer, for as long as they process with MCCPS.')}
      {feature_card('chart','Full reporting','View all reporting for all of your merchants, any time.')}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="split">
      <div class="reveal">
        <span class="kicker">Change your income potential</span>
        <h2 class="h2">Earn while you sleep — <span class="gt">from the businesses you already know.</span></h2>
        <p class="lead">Looking for a new way to earn income, or to supplement what you make today? Want to earn from the businesses you frequent as a patron — just by introducing them to our processing services?</p>
        <p class="lead">If you answered <b>“yes”</b> to any of those, contact us to learn more about our income-earning programs as an independent sales agent, and change your earning potential today.</p>
      </div>
      <div class="reveal">
        <div class="card" style="transform:none">
          <div class="card__icon">{ICON['users']}</div>
          <h3>Do it by yourself — or work as a team</h3>
          <p>Being an Independent Sales Agent (ISA) gives you the freedom and flexibility to set your own hours, days and goals. Earn overrides from the team members in your network. Divide and conquer businesses in your local areas to build a profitable network for you and your team.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--tight" id="marketing">
  <div class="container">
    <div class="section__head section__head--center reveal">
      <span class="kicker">MCCPS marketing material packages</span>
      <h2 class="h2">The largest selection of offset & digital products in the market today.</h2>
    </div>
    <div class="pack-grid" data-stagger>
      <div class="pack reveal"><h3>Package 1</h3><ul>
        <li>Sales binder with company logo <b>$49.99</b></li><li>Business cards ×250 <b>$29.95</b></li><li>Sales brochures ×250 <b>$39.95</b></li><li>Sales flyers ×250 <b>$49.95</b></li></ul></div>
      <div class="pack pack--hot reveal"><span class="pack__tag">Popular</span><h3>Package 2</h3><ul>
        <li>Sales binder with company logo <b>$49.99</b></li><li>Business cards ×500 <b>$39.95</b></li><li>Sales brochures ×500 <b>$49.95</b></li><li>Sales flyers ×1000 <b>$59.95</b></li></ul></div>
      <div class="pack reveal"><h3>Package 3</h3><ul>
        <li>Sales binder with company logo <b>$49.99</b></li><li>Business cards ×1000 <b>$49.95</b></li><li>Sales brochures ×1000 <b>$59.95</b></li><li>Sales flyers ×1000 <b>$69.95</b></li></ul></div>
    </div>
    <div class="addons mt-2" data-stagger>
      <div class="pack reveal"><h3>Banners with company logo</h3><ul><li>3×6 <b>$39.95</b></li><li>4×8 <b>$49.95</b></li></ul></div>
      <div class="pack reveal"><h3>Letterhead & envelopes</h3><ul><li>250 <b>$29.95</b></li><li>500 <b>$44.95</b></li></ul></div>
      <div class="pack reveal"><h3>Pens with company logo</h3><ul><li>50 <b>$24.95</b></li><li>100 <b>$44.95</b></li><li>250 <b>$64.95</b></li></ul></div>
    </div>
  </div>
</section>

<section class="section" id="apply">
  <div class="container">
    <div class="split">
      <div class="reveal">
        <span class="kicker">Join our team</span>
        <h2 class="h2">Contact our H/R rep to <span class="gt">change your earning potential today.</span></h2>
        <p class="lead">Tell us a bit about yourself and we'll get you set up with training, sales and marketing materials.</p>
        <a class="footer__phone mt-2" href="{TEL}" style="font-size:1.8rem">{ICON['phone']} {PHONE}</a>
      </div>
      <form class="form-card reveal" data-form="agent-application" action="#" novalidate data-success="Thanks! Our H/R rep will reach out to get you started.">
        <input type="hidden" name="_subject" value="MCCPS — Agent Application">
        <input type="text" name="_gotcha" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="form-grid">
          <div class="field"><label for="ag-first">First name <span class="req">*</span></label><input id="ag-first" name="first_name" required autocomplete="given-name"></div>
          <div class="field"><label for="ag-last">Last name <span class="req">*</span></label><input id="ag-last" name="last_name" required autocomplete="family-name"></div>
          <div class="field"><label for="ag-email">Email <span class="req">*</span></label><input id="ag-email" type="email" name="email" required autocomplete="email"></div>
          <div class="field"><label for="ag-phone">Phone <span class="req">*</span></label><input id="ag-phone" type="tel" name="phone" required autocomplete="tel"></div>
          <div class="field full"><label for="ag-loc">City / State <span class="req">*</span></label><input id="ag-loc" name="location" required></div>
          <div class="field full"><span style="font-size:.85rem;font-weight:600;color:var(--ink-2)">I am a…</span>
            <div class="radio-row">
              <label class="chip"><input type="radio" name="agent_type" value="Independent Sales Agent" checked><span>Independent agent</span></label>
              <label class="chip"><input type="radio" name="agent_type" value="ISO / Sales office"><span>ISO / sales office</span></label>
              <label class="chip"><input type="radio" name="agent_type" value="Just exploring"><span>Just exploring</span></label>
            </div>
          </div>
          <div class="field full"><label for="ag-msg">Tell us about your experience</label><textarea id="ag-msg" name="message" placeholder="Sales background, industries you know, how many merchants you could introduce…"></textarea></div>
          <div class="field full"><button class="btn btn--primary btn--block" type="submit">Apply to join {ICON['arrow']}</button></div>
        </div>
        <div class="form-status" role="status" aria-live="polite"></div>
      </form>
    </div>
  </div>
</section>
'''
page('agents.html', 'Become an MCCPS Agent — Independent Sales Agents & ISOs',
     'MCCPS is looking for independent sales agents and ISOs nationwide. Monthly residuals, fast e-sign approvals, multiple platforms and banks, personalized marketing packages.',
     AG, sticky=False, bg=True)

# ============================================================ FAQ
FAQS = [
 ("Why become an M.C.C.P.S. agent?", "So you can help your merchants reduce their credit card rates and fees, work on your own time, and make as much money as you want."),
 ("How do I make money with M.C.C.P.S.?", "Very simple: you refer merchants who are willing to let us analyze their credit card statements. We reduce their rates and fees, and you continuously get paid for as long as the referred merchant processes through MCCPS."),
 ("Can I build my own sales team?", "100%. You will always receive overrides and commissions on all of your down-line sales team's referrals, for as long as they are referred."),
 ("Do you have training available?", "Yes. Once you're set up as a sales agent, one of our MCCPS team members will meet with you to get you fully set up with sales and marketing materials."),
 ("Who are my potential clients?", "Any business that accepts credit cards as a form of payment."),
 ("How do I get them to sign up?", "All you need to do is have them give you a copy of their credit card processing statement for our office to analyze for rate and fee reduction."),
 ("Can they use their own terminals?", "They can use their existing terminals if they own them and if they are re-programmable."),
 ("Do I get reports on my merchants?", "100%. You will be able to view all reporting for all of your merchants."),
 ("How do I get paid, and where do I sign?", "You receive continuous monthly residuals against all of your referred merchants' credit card processing. Contact our H/R rep to get your agreement started."),
]
FAQ_LD = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in FAQS]}
import json
FQ = f'''
<section class="page-hero page-hero--center">
  <div class="container">
    <span class="kicker reveal is-visible">Agent portal</span>
    <h1 class="words">M.C.C.P.S. independent agent F.A.Q.s</h1>
    <p class="lead reveal" style="--d:400ms">Everything you need to know about referring merchants, building a team and getting paid.</p>
  </div>
</section>
<section class="section section--tight">
  <div class="container">
    <div class="faq" data-stagger>
      {''.join(f'<details class="reveal"{" open" if i==0 else ""}><summary>{html.escape(q)}<i></i></summary><div class="faq__body">{html.escape(a)}</div></details>' for i,(q,a) in enumerate(FAQS))}
    </div>
    <div class="cta-band mt-3 reveal reveal--scale">
      <h2>Ready to get started?</h2>
      <p>Contact our H/R rep to change your earning potential today.</p>
      <div class="actions">
        <a class="btn btn--primary" href="agents.html#apply">Become an MCCPS Agent {ICON['arrow']}</a>
        <a class="btn btn--ghost" href="{TEL}">{ICON['phone']} {PHONE}</a>
      </div>
    </div>
  </div>
</section>
'''
page('faq.html', 'Agent FAQ — MCCPS Independent Sales Agents',
     'Frequently asked questions for MCCPS independent sales agents: how you earn residuals, building a team, training, reporting and more.',
     FQ, sticky=False, extra_head='<script type="application/ld+json">'+json.dumps(FAQ_LD)+'</script>', bg=True)

# ============================================================ LEGAL
def prose_from_txt(fn, title):
    t = open(os.path.join(S, fn)).read()
    t = re.sub(r'^\s*class="[^"]*">\s*', '', t)
    t = t.split('\nMain Menu')[0]
    email = 'legal@mccp.services' if 'privacy' in fn else 'info@mccp.services'
    t = re.sub(r'\s*\n\s*\[email\W?protected\]\s*\n\s*', ' ' + email, t)
    t = re.sub(r'\s*\n\s*legal\s*\n\s*@mccp\.services\s*\n\s*', ' legal@mccp.services ', t)
    t = re.sub(r'\s*\n\s*(https://www\.mccp\.services/privacy-policy)\s*\n\s*', r' \1', t)
    lines = [re.sub(r'\s+', ' ', l).strip() for l in t.split('\n') if l.strip()]
    lines = lines[1:] if lines and ('Terms of Use' in lines[0] or 'Privacy Statement' in lines[0]) else lines
    # merge bare "5." with following heading line
    merged = []
    for l in lines:
        if merged and re.fullmatch(r'\d+\.', merged[-1]): merged[-1] = merged[-1] + ' ' + l
        else: merged.append(l)
    lines = merged
    privacy = 'privacy' in fn
    out = []; buf = []
    def flush():
        if buf: out.append('<p>' + html.escape(' '.join(buf)) + '</p>'); buf.clear()
    i = 0
    while i < len(lines):
        l = lines[i]; nxt = lines[i+1] if i+1 < len(lines) else ''
        numbered = re.match(r'^\d+\.\s+\S', l)
        short = len(l) <= 60 and not l.endswith(',')
        if numbered and short:
            flush(); lab = re.sub(r'^(\d+\.)\s+', r'\1 ', l.rstrip(':')); out.append('<h2>' + html.escape(lab.title() if lab.isupper() else lab) + '</h2>')
        elif short and nxt.startswith(':'):
            flush(); out.append('<p><b>' + html.escape(l) + '</b>' + html.escape(nxt) + '</p>'); i += 1
        elif short and l.endswith('.') and len(l.split()) <= 4 and nxt and not nxt.startswith('·'):
            flush(); out.append('<p><b>' + html.escape(l) + '</b> ' + html.escape(nxt) + '</p>'); i += 1
        elif l.startswith('·'):
            flush(); out.append('<ul><li>' + html.escape(l.lstrip('· ')) + '</li></ul>')
        elif short and not l.endswith('.') and (not privacy or l.isupper() or l in ('Email communications',)):
            flush(); out.append('<h2>' + html.escape(l.title() if l.isupper() else l) + '</h2>')
        elif short and not l.endswith('.') and privacy:
            flush(); out.append('<ul><li>' + html.escape(l) + '</li></ul>')
        else:
            buf.append(l.lstrip('. ') if l.startswith('.') else l)
            if l.endswith('.') or l.endswith(':'): flush()
        i += 1
    flush()
    s = '\n'.join(out).replace('</ul>\n<ul>', '\n')
    s = s.replace('https://www.mccp.services/privacy-policy', '<a href="privacy.html">our Privacy Statement</a>')
    for e in ('info@mccp.services','legal@mccp.services'): s = s.replace(e, f'<a href="mailto:{e}">{e}</a>')
    return s

for fn, path, title, kicker in [('terms-of-use.txt','terms.html','MCCPS LLC Terms of Use','Legal'),('privacy-policy.txt','privacy.html','MCCPS, LLC Privacy Statement','Legal')]:
    body = prose_from_txt(fn, title)
    pg = f'''
<section class="page-hero">
  <div class="container prose">
    <span class="kicker">{kicker}</span>
    <h1>{html.escape(title)}</h1>
    <p class="meta">Merchant Credit Card Processing Services, LLC · www.mccp.services</p>
    {body}
  </div>
</section>
'''
    page(path, f'{title} — MCCPS', f'{title} for www.mccp.services, Merchant Credit Card Processing Services LLC.', pg, sticky=False, bg=True)

# ============================================================ 404
NF = f'''
<section class="page-hero page-hero--center" style="min-height:70vh;display:grid;align-items:center">
  <div class="container">
    <span class="kicker">404</span>
    <h1>That page went <span class="gt">off the grid.</span></h1>
    <p class="lead">The link may be outdated. Head back home or start a free savings analysis.</p>
    <div class="hero__actions" style="justify-content:center"><a class="btn btn--primary" href="index.html">Back home {ICON['arrow']}</a><a class="btn btn--ghost" href="free-analysis.html">Free analysis</a></div>
  </div>
</section>
'''
page('404.html', 'Page not found — MCCPS', 'Page not found.', NF, sticky=False, bg=True)
