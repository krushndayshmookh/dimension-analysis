import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { htmlDocument } from '../src/lib/download.js'

describe('htmlDocument', () => {
  it('wraps body HTML in a standalone page with the given styles', () => {
    const doc = htmlDocument('Feedback', '<p>Hello</p>', '.a { color: red }')
    assert.ok(doc.startsWith('<!doctype html>'))
    assert.ok(doc.includes('<title>Feedback</title>'))
    assert.ok(doc.includes('<style>.a { color: red }</style>'))
    assert.ok(doc.includes('<body><p>Hello</p></body>'))
  })

  it('escapes the title', () => {
    assert.ok(htmlDocument('A <b> & "c"', '', '').includes('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>'))
  })
})
