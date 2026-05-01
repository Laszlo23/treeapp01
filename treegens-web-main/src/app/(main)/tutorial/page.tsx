'use client'

import { HubPageHeader } from '@/components/Layout/HubPageHeader'
import { Button } from '@/components/ui/Button'
import { appConfig } from '@/config/appConfig'
import {
  hasSkippedPlantingTutorial,
  markPlantingTutorialSkipped,
} from '@/utils/plantingTutorialPreference'
import {
  plantInstructions,
  plantTitle,
} from '@/components/tutorial/plantTutorialCopy'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { HiArrowRight } from 'react-icons/hi2'

export default function TutorialPlantPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'English' | 'Swahili'>('English')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (hasSkippedPlantingTutorial()) {
      router.replace(appConfig.routes.NewPlant)
    }
  }, [mounted, router])

  if (!mounted) {
    return null
  }

  if (hasSkippedPlantingTutorial()) {
    return null
  }

  return (
    <div className="tg-page-bg flex min-h-screen flex-col px-4 pb-28 pt-3">
      <HubPageHeader
        title="How to plant"
        subtitle="Mangrove basics"
        rightSlot={
          <button
            type="button"
            onClick={() => {
              markPlantingTutorialSkipped()
              router.push(appConfig.routes.NewPlant)
            }}
            className="text-xs font-semibold text-[#6b6560] underline decoration-[#6b6560]/50 underline-offset-2 hover:text-[#435F24]"
          >
            Skip
          </button>
        }
      />

      <div className="relative z-0 mb-8 flex flex-1 flex-col gap-5">
        <div className="tg-pill-card-muted flex flex-wrap gap-2 p-1.5">
          <button
            type="button"
            onClick={() => setLang('English')}
            className={
              lang === 'English'
                ? 'tg-pill-row-btn flex-1 justify-center py-2.5 text-sm font-black'
                : 'rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#6b6560] transition hover:bg-white/40'
            }
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang('Swahili')}
            className={
              lang === 'Swahili'
                ? 'tg-pill-row-btn flex-1 justify-center py-2.5 text-sm font-black'
                : 'rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#6b6560] transition hover:bg-white/40'
            }
          >
            Swahili
          </button>
        </div>

        <section className="tg-pill-card overflow-hidden px-5 py-5">
          <h3 className="text-lg font-black tracking-tight text-[#1a2610]">
            {plantTitle[lang]}
          </h3>
          <div className="mt-3 text-sm leading-relaxed text-[#374151] [&_a]:text-[#435F24] [&_a]:underline [&_h3]:mt-4 [&_h3]:font-black [&_h3]:text-[#1a2610] [&_ol]:mt-2">
            {plantInstructions[lang]}
          </div>
        </section>

        <section className="tg-pill-card overflow-hidden">
          <div className="border-b border-[#435F24]/10 bg-gradient-to-r from-[#eef6e4] via-white to-[#faf9f6] px-5 py-3">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#435F24]">
              Watch video tutorial
            </h3>
          </div>
          <div className="p-4">
            <video
              className="aspect-video w-full overflow-hidden rounded-2xl bg-black/5 ring-1 ring-black/5"
              preload="metadata"
              controls
            >
              <source src="/videos/how-to-plant.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => router.push(appConfig.routes.TutorialVerify)}
            pill
            color="success"
          >
            Next
            <HiArrowRight className="ml-3 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
