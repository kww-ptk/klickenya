import { definePlugin } from 'sanity'
import { generateBlogDraft } from './generateBlogDraft'

export const aiActionsPlugin = definePlugin({
  name: 'ai-actions',
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'blogPost') {
        return [...prev, generateBlogDraft]
      }
      return prev
    },
  },
})
