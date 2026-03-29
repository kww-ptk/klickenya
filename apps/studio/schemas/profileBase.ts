import { defineField } from 'sanity'

/**
 * Shared profile fields used across host, author, and future profile types.
 * This is an object helper — not a registered document type.
 * Import and spread into other schemas for consistency.
 */
export const profileBaseFields = [
  defineField({
    name: 'name',
    title: 'Name',
    type: 'string',
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'slug',
    title: 'Slug',
    type: 'slug',
    options: { source: 'name', maxLength: 96 },
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'photo',
    title: 'Profile photo',
    type: 'image',
    options: { hotspot: true },
  }),
  defineField({
    name: 'bio',
    title: 'Bio',
    type: 'text',
    rows: 3,
  }),
  defineField({
    name: 'website',
    title: 'Website',
    type: 'url',
  }),
  defineField({
    name: 'instagram',
    title: 'Instagram',
    type: 'string',
    description: '@handle or full URL',
  }),
  defineField({
    name: 'facebook',
    title: 'Facebook',
    type: 'string',
    description: 'Page name or full URL',
  }),
  defineField({
    name: 'twitter',
    title: 'Twitter / X',
    type: 'string',
    description: '@handle or full URL',
  }),
]
