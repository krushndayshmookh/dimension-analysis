import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { HELP, helpTopics } from '../src/lib/help.js'

describe('help topics', () => {
  it('covers every section of the paper analysis page', () => {
    for (const id of ['summary', 'overall', 'dimensions', 'tiers', 'matrix', 'topics', 'blueprint', 'quartiles', 'questions']) {
      assert.ok(HELP[id], `missing help for ${id}`)
    }
  })

  it('gives every topic a title, an introduction and described parts', () => {
    for (const [id, topic] of Object.entries(helpTopics())) {
      assert.ok(topic.title && topic.about, `${id} needs a title and an introduction`)
      assert.ok(topic.parts.length, `${id} needs at least one part`)
      for (const part of topic.parts) {
        assert.ok(part.heading, `${id}: a part needs a heading`)
        assert.ok(part.entries.length, `${id}/${part.heading}: needs entries`)
        for (const entry of part.entries) assert.ok(entry.term && entry.text, `${id}/${part.heading}: every entry needs a term and a text`)
      }
    }
  })

  it('describes each column of the questions table once', () => {
    const terms = HELP.questions.parts.find((p) => p.heading === 'Table columns').entries.map((e) => e.term)
    for (const column of ['Question', 'Type', 'Dimensions', 'Tier', 'Topics', 'Marks', 'Expected', 'Expected source', 'Actual', 'Solved', 'Of attempted', 'Attempted by', 'Mean score', 'Deviation', 'Deviation level', 'Discrimination', 'Discrimination level', 'Item-rest r', 'Alpha if removed', 'Flags', 'Expected / actual']) {
      assert.equal(terms.filter((t) => t === column).length, 1, `column ${column}`)
    }
  })

  it('quotes the tier defaults from the constants', () => {
    assert.match(JSON.stringify(HELP.questions), /beginner 85%/)
  })
})

describe('help wiring', () => {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.vue')) files.push(full)
    }
  }
  walk('src')
  const used = new Set()
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/(?<![:\w])(?:help|topic)="([\w.]+)"/g)) used.add(m[1])
  }

  it('uses only topics that exist', () => {
    for (const id of used) assert.ok(HELP[id], `no help topic "${id}"`)
  })

  it('has a button for every topic', () => {
    for (const id of Object.keys(HELP)) assert.ok(used.has(id), `topic "${id}" is not used by any page`)
  })
})
