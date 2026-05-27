import { describe, expect, it } from 'vitest'
import { buildFAQJsonLd, buildHowToJsonLd } from './json-ld'

describe('buildHowToJsonLd', () => {
  it('emits valid HowTo shape with positioned steps', () => {
    const ld = buildHowToJsonLd({
      name: 'Ghibli portrait',
      description: 'Turn your selfie into a Ghibli still.',
      image: 'https://example.com/og.jpg',
      url: 'https://example.com/trend/ghibli',
      steps: [
        { name: 'Upload photo', text: 'Pick a clear front-facing selfie.' },
        { name: 'Generate', text: 'Tap generate and wait ~30 seconds.' },
      ],
    })
    expect(ld['@type']).toBe('HowTo')
    expect(ld.step).toHaveLength(2)
    expect(ld.step[0].position).toBe(1)
    expect(ld.step[1].position).toBe(2)
    expect(ld.totalTime).toBe('PT60S')
  })

  it('honors custom totalTime', () => {
    const ld = buildHowToJsonLd({
      name: 'X',
      description: 'Y',
      image: 'i',
      url: 'u',
      totalTimeIso: 'PT2M',
      steps: [{ name: 's', text: 't' }],
    })
    expect(ld.totalTime).toBe('PT2M')
  })
})

describe('buildFAQJsonLd', () => {
  it('emits FAQPage with question/answer entries', () => {
    const ld = buildFAQJsonLd([
      { question: 'Is it free?', answer: 'You get 5 free per week.' },
      { question: 'Does it work on iPhone?', answer: 'Yes, all modern browsers.' },
    ])
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(2)
    expect(ld.mainEntity[0].name).toBe('Is it free?')
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe('You get 5 free per week.')
  })
})
