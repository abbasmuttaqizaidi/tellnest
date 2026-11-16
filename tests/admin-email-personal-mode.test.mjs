import test from 'node:test'
import assert from 'node:assert'
import {
  generateAdminPersonalEmailHtml,
  generateAdminDirectEmailHtml,
  sendAdminDirectEmail,
} from '../src/lib/email/resend.ts'

test('Email Layout Modes: generateAdminPersonalEmailHtml outputs clean 1-on-1 personal layout', () => {
  const html = generateAdminPersonalEmailHtml({
    headline: 'Quick question for you',
    message: 'Hi Abhishek,\n\nDid you leave us on read with Pleasure After Dark?',
    ctaText: 'Continue Reading',
    ctaUrl: 'https://hatchpen.com/works/pleasure-after-dark',
    fromName: 'Shreya from HatchPen',
  })

  // Invariant 1: Must NOT contain marketing newsletter banners or presentation tables
  assert.ok(!html.includes('#121214'), 'Personal layout must omit dark corporate header banner')
  assert.ok(!html.includes('Editorial Note'), 'Personal layout must omit marketing badge')
  assert.ok(!html.includes('<table'), 'Personal layout must omit complex button tables')

  // Invariant 2: Must contain message, clean link, and sign-off
  assert.ok(html.includes('Did you leave us on read with Pleasure After Dark?'), 'Must contain message')
  assert.ok(html.includes('Continue Reading &rarr;'), 'Must contain text link')
  assert.ok(html.includes('Shreya from HatchPen'), 'Must contain sender sign-off')
  assert.ok(html.includes('https://hatchpen.com/works/pleasure-after-dark'), 'Must include target URL')
})

test('Email Layout Modes: generateAdminDirectEmailHtml outputs editorial newsletter layout', () => {
  const html = generateAdminDirectEmailHtml({
    headline: 'Weekly Editorial Dispatch',
    message: 'Welcome to this week’s curated releases.',
    ctaText: 'Explore Discover',
    ctaUrl: 'https://hatchpen.com/discover',
    fromName: 'HatchPen Editorial',
  })

  // Invariant 1: Must contain editorial banner and button styling
  assert.ok(html.includes('#121214'), 'Newsletter layout must contain dark header banner')
  assert.ok(html.includes('Editorial Note'), 'Newsletter layout must contain badge')
  assert.ok(html.includes('table role="presentation"'), 'Newsletter layout must contain presentation tables')
})

test('Email Layout Modes: sendAdminDirectEmail dispatches personal mode seamlessly', async () => {
  const result = await sendAdminDirectEmail({
    to: 'test@example.com',
    subject: 'Did you leave us on read?',
    message: 'Testing personal mode delivery.',
    layoutMode: 'personal',
    from: 'Shreya <shreya@hatchpen.com>',
  })

  assert.strictEqual(result.success, true, 'Email dispatch must succeed')
})
