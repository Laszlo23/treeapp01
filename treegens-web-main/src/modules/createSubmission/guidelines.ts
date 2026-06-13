import { VIDEO_CONFIG } from '@/utils/constants'

/** Mirrors `mobile/modules/createSubmission/guidelines.ts` */
export const guidelines = [
  {
    title: 'Two videos required',
    description:
      'Film the land before planting, plant your trees in the field, then film the same area after planting.',
  },
  {
    title: `Up to ${VIDEO_CONFIG.MAX_DURATION_SECONDS} seconds`,
    description:
      `You can record up to ${VIDEO_CONFIG.MAX_DURATION_SECONDS} seconds—enough to pan across the planting area in one smooth clip`,
  },
  {
    title: 'Be ready',
    description: 'Plan what to show before starting',
  },
  {
    title: 'Stay steady',
    description: 'Hold your phone still during recording',
  },
  {
    title: 'One continuous direction',
    description:
      'Pan in one smooth direction only—either left-to-right or right-to-left across the scene. Don’t reverse mid-clip or scan back and forth.',
  },
  {
    title: 'Good lighting',
    description: 'Record during daylight for clarity',
  },
  {
    title: 'Show context',
    description: 'Include surrounding landmarks',
  },
] as const
