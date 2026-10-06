import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
