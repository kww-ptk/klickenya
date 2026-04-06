import { useState, useCallback } from 'react'
import type { DocumentActionComponent } from 'sanity'
import { useClient } from 'sanity'

const ITINERARY_KEYWORDS = ['itinerary', 'days', 'trip', 'route', 'guide', 'day-by-day']
const COMPARISON_KEYWORDS = ['vs', 'compare', 'best', 'choose', 'which', 'or']

function detectTemplate(topic: string): 'itinerary' | 'comparison' {
  const lower = topic.toLowerCase()
  if (ITINERARY_KEYWORDS.some(k => lower.includes(k))) return 'itinerary'
  if (COMPARISON_KEYWORDS.some(k => lower.includes(k))) return 'comparison'
  return 'itinerary'
}

const BLOCK_SCHEMA_DOCS = `
Available Portable Text block types (use _type field):
- quickFactsBlock: { _type, _key, title, accentColor (amber|purple|teal), items: [{icon, label, value}] }
- tipCardBlock: { _type, _key, variant (tip|warning|teal|purple), icon, label, text }
- dayCardBlock: { _type, _key, dayNumber, location, title, meta, timeline: [{time, title, description, badge?}], costs: [string] }
- photoRowBlock: { _type, _key, layout (cols-2|cols-3|cols-3-rev|hero-full), photos: [{alt, aspectRatio}], caption }
- statRowBlock: { _type, _key, stats: [{number, label}] }
- budgetTableBlock: { _type, _key, columns: [string], rows: [{label, values: [string]}], totalRow: [string] }
- packingListBlock: { _type, _key, title, items: [{icon, text}] }
- pullQuoteBlock: { _type, _key, text, attribution, accentColor (amber|purple) }
- inlineListingBlock: { _type, _key, label } (listing reference added separately)
- compareTableBlock: { _type, _key, columns: [{label, color (teal|blue|purple|slate|amber)}], rows: [{criterion, values: [string]}] }
- verdictCardBlock: { _type, _key, variant (teal|blue|purple|amber), label, title, pros: [string], cons: [string] }
- whoIsItForBlock: { _type, _key, title, items: [{icon, text}] }
- destinationSectionBlock: { _type, _key, number, pill, pillColor (teal|blue|purple), title }
- distanceChipsBlock: { _type, _key, chips: [{icon (pin|clock), label: string, value: string}] }
- deciderGridBlock: { _type, _key, cards: [{label, color (teal|blue|purple), title, items: [string]}] }

Standard Portable Text block: { _type: "block", _key, style: "normal"|"h2"|"h3"|"h4"|"blockquote", children: [{_type: "span", _key, text, marks: []}] }
`

const ITINERARY_TEMPLATE = `
Generate a Kenya travel itinerary blog post. Use these block types in this order:
1. quickFactsBlock (6 items with emoji icons)
2. Standard h2 block for overview
3. Standard body text paragraphs
4. Multiple dayCardBlock entries (one per day) with timelines
5. tipCardBlock entries scattered between days (mix of tip, warning, teal variants)
6. statRowBlock with 3 impressive stats
7. budgetTableBlock with cost breakdown
8. packingListBlock with 12+ items
9. pullQuoteBlock with an evocative travel quote
10. photoRowBlock entries between sections

All content must be about real Kenya locations with accurate details.
`

const COMPARISON_TEMPLATE = `
Generate a Kenya destination comparison blog post. Use these block types in this order:
1. quickFactsBlock (6 items comparing destinations, purple accent)
2. Standard h2 block for overview
3. Standard body text paragraphs
4. compareTableBlock with detailed comparison rows
5. Multiple destinationSectionBlock + body text for each destination
6. verdictCardBlock for each destination (with pros/cons)
7. whoIsItForBlock for each destination
8. distanceChipsBlock for each destination
9. tipCardBlock entries (mix of purple, teal variants)
10. deciderGridBlock as final summary
11. pullQuoteBlock with a relevant quote

All content must be about real Kenya locations with accurate details.
`

function generateKey(): string {
  return Math.random().toString(36).slice(2, 12)
}

export const generateBlogDraft: DocumentActionComponent = (props) => {
  const { id, type } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)

    const template = detectTemplate(topic)
    const systemPrompt = `You are a Kenya travel blog content generator for Klickenya.
Output ONLY valid JSON — an array of Sanity Portable Text blocks.
Every block must have a unique _key (random 10-char alphanumeric string).
${BLOCK_SCHEMA_DOCS}
${template === 'itinerary' ? ITINERARY_TEMPLATE : COMPARISON_TEMPLATE}
Write engaging, accurate content about real Kenya destinations. Use vivid descriptions.
Return ONLY the JSON array, no markdown fences, no explanation.`

    try {
      const response = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, systemPrompt }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const blocks = data.blocks

      if (!Array.isArray(blocks)) {
        throw new Error('Invalid response: expected array of blocks')
      }

      // Ensure all blocks have _key
      const withKeys = blocks.map((block: any) => ({
        ...block,
        _key: block._key || generateKey(),
      }))

      // Patch the document with generated body
      await client
        .patch(id)
        .set({ body: withKeys })
        .commit()

      setDialogOpen(false)
      setTopic('')
    } catch (err: any) {
      setError(err.message || 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }, [topic, id, client])

  if (type !== 'blogPost') return null

  return {
    label: '✨ AI Draft',
    icon: () => <span style={{ fontSize: 16 }}>✨</span>,
    onHandle: () => setDialogOpen(true),
    dialog: isDialogOpen
      ? {
          type: 'dialog',
          header: 'Generate AI Blog Draft',
          onClose: () => {
            setDialogOpen(false)
            setError(null)
          },
          content: (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
                Describe the blog post topic. The AI will detect whether to use an itinerary or comparison template.
              </p>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. '10 days in Kenya for first-timers' or 'Watamu vs Kilifi vs Vipingo'"
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              {error && (
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setDialogOpen(false)
                    setError(null)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    background: 'white',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !topic.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: loading ? '#999' : '#18160F',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: !topic.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Generating…' : '✨ Generate Draft'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
                Template: {topic ? detectTemplate(topic) : '—'} · Powered by Claude
              </p>
            </div>
          ),
        }
      : null,
  }
}
