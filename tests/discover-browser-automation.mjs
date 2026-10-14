import assert from 'node:assert/strict'

async function runBrowserVerification() {
  console.log('[Browser Automation] Connecting to Chrome DevTools Protocol on port 9222...')
  
  // 1. Create a new target page navigated to http://localhost:3000/discover
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000/discover', { method: 'PUT' })
  const tabData = await newTabRes.json()
  const pageWsUrl = tabData.webSocketDebuggerUrl
  const pageId = tabData.id

  assert.ok(pageWsUrl, 'Chrome must return webSocketDebuggerUrl')
  console.log(`[Browser Automation] Opened page target ${pageId}`)

  const ws = new WebSocket(pageWsUrl)
  let msgId = 0
  const pendingRequests = new Map()
  const consoleErrors = []
  const runtimeExceptions = []

  function sendCdpCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId
      pendingRequests.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  await new Promise((resolve) => {
    ws.onopen = resolve
  })

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id)
      pendingRequests.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      if (msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ')
        consoleErrors.push(text)
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      runtimeExceptions.push(msg.params.exceptionDetails.text || JSON.stringify(msg.params.exceptionDetails))
    }
  }

  // Enable necessary CDP domains
  await sendCdpCommand('Runtime.enable')
  await sendCdpCommand('Page.enable')

  // Helper to execute expression in page context
  async function evalInPage(expression) {
    const res = await sendCdpCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return res.result?.value
  }

  // Wait 4s for initial hydration & DB sync to settle
  console.log('[Browser Automation] Waiting for page hydration and database sync...')
  await new Promise((r) => setTimeout(r, 4000))

  console.log('[Browser Automation] Page loaded. Beginning verification steps...')

  // Step 1: Verify Default Tab is "All Stories"
  const defaultTab = await evalInPage(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('All Stories') || b.textContent.includes('New This Week'));
      const allStoriesTab = tabs.find(b => b.textContent.includes('All Stories'));
      return {
        hasAllStoriesTab: Boolean(allStoriesTab),
        title: document.title,
      };
    })()
  `)
  console.log('[Browser Automation] Step 1: Default tab state:', defaultTab)
  assert.ok(defaultTab.hasAllStoriesTab, 'Discover page must have "All Stories" tab')

  // Step 2: Record baseline story count once DB sync settled and analyze DOM card structure
  const baselineState = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      const storyIds = cards.map(c => c.getAttribute('data-work-id'));
      const uniqueStoryIds = Array.from(new Set(storyIds));
      const footerGridDivs = Array.from(document.querySelectorAll('footer div.grid > div'));
      const genericGridDivs = Array.from(document.querySelectorAll('div.grid > div'));
      const titles = Array.from(worksGrid ? worksGrid.querySelectorAll('h3') : []).map(h => h.textContent.trim()).filter(Boolean);
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
        storyIds,
        uniqueStoryIds,
        footerGridDivCount: footerGridDivs.length,
        genericGridDivCount: genericGridDivs.length,
        titles,
      };
    })()
  `)
  console.log('[Browser Automation] Step 2: Baseline settled count, cards & story IDs:', baselineState)
  assert.equal(baselineState.cardCount, 8, 'Exactly 8 genuine story cards must be rendered in works grid')
  assert.equal(baselineState.uniqueStoryIds.length, 8, 'All 8 rendered cards must have unique story IDs')
  assert.equal(baselineState.footerGridDivCount, 4, 'Footer grid has exactly 4 navigation columns')
  assert.equal(baselineState.genericGridDivCount, 12, 'Generic "div.grid > div" matches 8 cards + 4 footer columns = 12 total')
  assert.ok(baselineState.countText.includes('8'), 'UI count must state "Showing 8 works"')
  const baselineCountText = baselineState.countText

  // Step 3: Test "Trending" Tab & Verify Trending Semantic Separation
  console.log('[Browser Automation] Step 3: Clicking "Trending" tab...')
  await evalInPage(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Trending');
      if (tabs[0]) tabs[0].click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const trendingState = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      const storyIds = cards.map(c => c.getAttribute('data-work-id'));
      const titles = Array.from(worksGrid ? worksGrid.querySelectorAll('h3') : []).map(h => h.textContent.trim()).filter(Boolean);
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
        storyIds,
        titles,
      };
    })()
  `)
  console.log('[Browser Automation] Trending tab results:', trendingState)
  assert.equal(trendingState.cardCount, 3, 'Trending tab must render exactly 3 genuine story cards')
  assert.ok(!trendingState.titles.includes('A Winter in Kyoto'), 'Featured-only work "A Winter in Kyoto" must NOT appear in Trending')
  assert.ok(!trendingState.titles.includes('The Cartographer of Lost Ships'), 'Featured-only work "The Cartographer of Lost Ships" must NOT appear in Trending')
  assert.ok(trendingState.titles.includes('The Bureaucracy of Miracles'), 'Trending work "The Bureaucracy of Miracles" MUST appear in Trending')
  assert.ok(trendingState.titles.includes('The Redacted Script'), 'Trending work "The Redacted Script" MUST appear in Trending')

  // Step 4: Test "Completed Works" Tab
  console.log('[Browser Automation] Step 4: Clicking "Completed Works" tab...')
  await evalInPage(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Completed Works'));
      if (tabs[0]) tabs[0].click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))
  const completedState = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      const storyIds = cards.map(c => c.getAttribute('data-work-id'));
      const titles = Array.from(worksGrid ? worksGrid.querySelectorAll('h3') : []).map(h => h.textContent.trim()).filter(Boolean);
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
        storyIds,
        titles,
      };
    })()
  `)
  console.log('[Browser Automation] Completed Works tab results:', completedState)
  assert.equal(completedState.cardCount, 5, 'Completed Works tab must render exactly 5 genuine story cards')
  assert.ok(completedState.titles.includes('A Winter in Kyoto'), 'Completed work "A Winter in Kyoto" must be present')

  // Step 5: Restore to "All Stories" Tab
  console.log('[Browser Automation] Step 5: Restoring "All Stories" tab...')
  await evalInPage(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('All Stories'));
      if (tabs[0]) tabs[0].click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  // Step 6: Test Search Input interaction
  console.log('[Browser Automation] Step 6: Interacting with Search...')
  await evalInPage(`
    (() => {
      const input = document.querySelector('input[placeholder*="Search"]');
      if (!input) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, 'Kyoto');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const postSearchCount = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      const titles = Array.from(worksGrid ? worksGrid.querySelectorAll('h3') : []).map(h => h.textContent);
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
        matchedTitles: titles.filter(t => t.toLowerCase().includes('kyoto')),
      };
    })()
  `)
  console.log('[Browser Automation] Search results for "Kyoto":', postSearchCount)
  assert.equal(postSearchCount.cardCount, 1, 'Search for "Kyoto" must render exactly 1 story card')
  assert.ok(postSearchCount.matchedTitles.length === 1, 'Search for "Kyoto" must return Kyoto manuscript')
  assert.ok(postSearchCount.countText.includes('1'), 'Search count should display 1 work')

  // Step 7: Clear Search via Clear button
  console.log('[Browser Automation] Step 7: Clearing search input...')
  await evalInPage(`
    (() => {
      const clearBtn = document.querySelector('button[aria-label="Clear search"]');
      if (clearBtn) {
        clearBtn.click();
      } else {
        const input = document.querySelector('input[placeholder*="Search"]');
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const postClearSearchCount = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
      };
    })()
  `)
  console.log('[Browser Automation] Count restored after clearing search:', postClearSearchCount)
  assert.equal(postClearSearchCount.cardCount, 8, 'Clearing search must restore exactly 8 story cards')
  assert.equal(postClearSearchCount.countText, baselineCountText, 'Clearing search must restore baseline count')

  // Step 8: Test Category Chip Selection ('Novels')
  console.log('[Browser Automation] Step 8: Clicking "Novels" category chip...')
  await evalInPage(`
    (() => {
      const chips = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Novels');
      if (chips[0]) chips[0].click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const novelsCount = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Reset');
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
        hasResetBtn: Boolean(resetBtn),
      };
    })()
  `)
  console.log('[Browser Automation] Novels category count & reset visibility:', novelsCount)
  assert.equal(novelsCount.cardCount, 2, 'Novels category must display exactly 2 story cards')
  assert.ok(novelsCount.hasResetBtn, 'Active category filter must display "Reset" button')

  // Step 9: Test Clicking "Reset" Button
  console.log('[Browser Automation] Step 9: Clicking Reset button...')
  await evalInPage(`
    (() => {
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Reset');
      if (resetBtn) resetBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const restoredAfterReset = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
      };
    })()
  `)
  console.log('[Browser Automation] Count restored after Reset:', restoredAfterReset)
  assert.equal(restoredAfterReset.cardCount, 8, 'Reset button must restore exactly 8 story cards')
  assert.equal(restoredAfterReset.countText, baselineCountText, 'Reset button must restore baseline count')

  // Step 10: Test Status Disclosure Filter Interaction
  console.log('[Browser Automation] Step 10: Opening Status dropdown and selecting Completed...')
  await evalInPage(`
    (() => {
      const statusBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('Status'));
      if (statusBtn) statusBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 500))

  await evalInPage(`
    (() => {
      const completedOpt = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Completed');
      if (completedOpt) completedOpt.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const statusFilterResult = await evalInPage(`
    (() => {
      const countEl = document.querySelector('span.font-mono');
      const worksGrid = document.querySelector('[data-testid="discover-works-grid"]');
      const cards = worksGrid ? Array.from(worksGrid.querySelectorAll('[data-testid="work-card"]')) : [];
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Reset');
      return {
        countText: countEl ? countEl.textContent : '',
        cardCount: cards.length,
        hasReset: Boolean(resetBtn),
      };
    })()
  `)
  console.log('[Browser Automation] Status filter result:', statusFilterResult)
  assert.equal(statusFilterResult.cardCount, 5, 'Status Completed must display exactly 5 story cards')
  assert.ok(statusFilterResult.hasReset, 'Status filter selection must activate Reset button')

  // Reset filter back
  await evalInPage(`
    (() => {
      const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Reset');
      if (resetBtn) resetBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  // Step 11: Verify Anonymous Access Hides "Rising Stories" Tab
  console.log('[Browser Automation] Step 11: Verifying unauthenticated tab visibility...')
  const risingTabPresent = await evalInPage(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Rising Stories'));
      return tabs.length > 0;
    })()
  `)
  console.log('[Browser Automation] Rising Stories tab present for anonymous visitor:', risingTabPresent)
  assert.equal(risingTabPresent, false, 'Rising Stories tab must NOT be visible to unauthenticated visitors')

  // Step 12: Assert Zero Console Errors / Runtime Exceptions
  console.log('[Browser Automation] Step 12: Checking console errors and exceptions...')
  const fatalErrors = consoleErrors.filter(
    (e) => !e.includes('Multiple GoTrueClient') && !e.includes('Download the React DevTools')
  )
  console.log('[Browser Automation] Total runtime exceptions:', runtimeExceptions.length)
  console.log('[Browser Automation] Fatal console errors:', fatalErrors.length)

  assert.equal(runtimeExceptions.length, 0, `Expected 0 runtime exceptions, got: ${runtimeExceptions.join('; ')}`)
  assert.equal(fatalErrors.length, 0, `Expected 0 console errors, got: ${fatalErrors.join('; ')}`)

  // Cleanup: close test target
  await fetch(`http://127.0.0.1:9222/json/close/${pageId}`)
  ws.close()
  console.log('[Browser Automation] All browser verification steps PASSED successfully!\n')
}

runBrowserVerification().catch((err) => {
  console.error('[Browser Automation Failed]:', err)
  process.exit(1)
})
