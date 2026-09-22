import { defineType, defineField } from 'sanity'

/**
 * One stage of a build, for the construction timeline on a new-development
 * listing. The stage list is fixed and mirrors CONSTRUCTION_STAGES in
 * apps/web/lib/real-estate/progress.ts — the web app computes the completion
 * percentage from these values, so a value added here that is missing there
 * scores nothing and silently drags the percentage down. Change both together.
 */
export const STAGES = [
  { title: 'Groundbreaking', value: 'groundbreaking' },
  { title: 'Foundation', value: 'foundation' },
  { title: 'Superstructure', value: 'superstructure' },
  { title: 'Roofing', value: 'roofing' },
  { title: 'Walling and plaster', value: 'walling-plaster' },
  { title: 'Windows, doors and services', value: 'services' },
  { title: 'Finishes', value: 'finishes' },
  { title: 'Handover', value: 'handover' },
]

export default defineType({
  name: 'constructionMilestone',
  title: 'Construction milestone',
  type: 'object',
  fields: [
    defineField({
      name: 'stage',
      title: 'Stage',
      type: 'string',
      options: { list: STAGES },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Done', value: 'done' },
          { title: 'In progress', value: 'in-progress' },
          { title: 'Upcoming', value: 'upcoming' },
        ],
        layout: 'radio',
      },
      initialValue: 'upcoming',
      validation: (rule) => rule.required(),
    }),
    // `hidden` below only hides these two fields from the Studio UI — it does
    // not clear the stored value. Flip a stage from done back to upcoming and
    // the old completedDate is still sitting in the document, unedited. That's
    // fine: mapConstructionProgress in apps/web/lib/real-estate/progress.ts
    // strips whichever date doesn't match the current status on every read, so
    // the orphaned value never reaches a buyer. That filtering is load-bearing,
    // not defensive — don't remove it as dead code.
    defineField({
      name: 'completedDate',
      title: 'Completed on',
      description: 'Shown to buyers as month and year only.',
      type: 'date',
      hidden: ({ parent }: { parent?: { status?: string } }) =>
        parent?.status !== 'done',
    }),
    defineField({
      name: 'targetDate',
      title: 'Target date',
      description:
        'Estimated, and labelled as such on the page. Shown to buyers as month and year only.',
      type: 'date',
      hidden: ({ parent }: { parent?: { status?: string } }) =>
        parent?.status === 'done',
    }),
    defineField({
      name: 'note',
      title: 'Note',
      description:
        'One sentence of context, e.g. "Units 1-4 roofed, 5-8 to follow". Optional.',
      type: 'string',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'photos',
      title: 'Site photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule: any) => rule.required(),
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      stage: 'stage',
      status: 'status',
      completedDate: 'completedDate',
      targetDate: 'targetDate',
      media: 'photos.0',
    },
    prepare({ stage, status, completedDate, targetDate, media }: any) {
      const label = STAGES.find((s) => s.value === stage)?.title ?? 'Stage'
      const date = status === 'done' ? completedDate : targetDate
      return {
        title: label,
        subtitle: [status, date].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
