'use client'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getSubmissionById } from '@/services/app'
import { uploadHealthCheckVideo } from '@/services/healthCheckService'
import type { ISubmissionDoc } from '@/types'
import { getSubmissionDetailVideoUrl } from '@/utils/submissionDetailVideo'
import { submissionDocToPlanterGroup } from '@/utils/submissionPlanterGroup'
import { validateVideoFile } from '@/utils/videoValidation'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { IoVideocamOutline } from 'react-icons/io5'
import { MdClose } from 'react-icons/md'

export default function CreateHealthCheckPage() {
  const params = useParams()
  const submissionId = typeof params.id === 'string' ? params.id : ''
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  const [plantVideoUrl, setPlantVideoUrl] = useState<string | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [reverseGeocode, setReverseGeocode] = useState('')
  const [maxTreesAlive, setMaxTreesAlive] = useState(0)

  const [healthFile, setHealthFile] = useState<File | null>(null)
  const [healthFileUrl, setHealthFileUrl] = useState('')
  const [treesAliveInput, setTreesAliveInput] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const treesAlive = useMemo(() => {
    const parsed = parseInt(treesAliveInput, 10)
    return Number.isFinite(parsed) ? parsed : -1
  }, [treesAliveInput])

  const canSubmit = useMemo(() => {
    if (!healthFile || submitting) return false
    if (latitude == null || longitude == null) return false
    if (!Number.isFinite(treesAlive) || treesAlive < 0) return false
    if (treesAlive > maxTreesAlive) return false
    return true
  }, [healthFile, submitting, latitude, longitude, treesAlive, maxTreesAlive])

  useEffect(() => {
    const load = async () => {
      if (!submissionId) {
        setError('Invalid submission id')
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const res = await getSubmissionById(submissionId)
        const doc = res.data.data as ISubmissionDoc & Record<string, unknown>
        const group = submissionDocToPlanterGroup(doc)
        const plantVideo = group.plantVideo
        const landVideo = group.landVideo
        setMaxTreesAlive(Math.max(0, Number(doc.treesPlanted || 0)))

        const gps = plantVideo?.gpsCoordinates || landVideo?.gpsCoordinates
        if (!gps) {
          setError('Missing GPS coordinates on this submission')
          return
        }

        setPlantVideoUrl(getSubmissionDetailVideoUrl(plantVideo))
        setLatitude(gps.latitude)
        setLongitude(gps.longitude)
        setReverseGeocode(
          plantVideo?.reverseGeocode || landVideo?.reverseGeocode || '',
        )
      } catch (e) {
        console.error(e)
        setError('Failed to load submission')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [submissionId])

  useEffect(() => {
    return () => {
      if (healthFileUrl) URL.revokeObjectURL(healthFileUrl)
    }
  }, [healthFileUrl])

  const onPickFile = async (file: File | null) => {
    if (!file) return
    setValidationError('')
    try {
      const validation = await validateVideoFile(file)
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid video file')
        return
      }
      setHealthFile(file)
      if (healthFileUrl) URL.revokeObjectURL(healthFileUrl)
      setHealthFileUrl(URL.createObjectURL(file))
    } catch {
      setValidationError('Failed to validate health check video')
    }
  }

  const clearFile = () => {
    setHealthFile(null)
    if (healthFileUrl) URL.revokeObjectURL(healthFileUrl)
    setHealthFileUrl('')
  }

  const onSubmit = async () => {
    if (!canSubmit || !healthFile || latitude == null || longitude == null)
      return
    setSubmitting(true)
    setUploadProgress(0)
    try {
      await uploadHealthCheckVideo(
        submissionId,
        {
          videoFile: healthFile,
          latitude,
          longitude,
          treesAlive,
          reverseGeocode: reverseGeocode || undefined,
        },
        { onUploadProgress: setUploadProgress },
      )
      toast.success('Health check uploaded')
      router.replace(
        `/submissions/${encodeURIComponent(submissionId)}/health-checks`,
      )
    } catch (e: unknown) {
      const message =
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message?: string }).message || 'Upload failed')
          : 'Upload failed'
      toast.error(message)
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 mb-24">
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Reference (plant clip)
            </h2>
            {plantVideoUrl ? (
              <div className="w-full overflow-hidden rounded-xl bg-black shadow-md">
                <video
                  className="aspect-video w-full object-cover"
                  controls
                  preload="metadata"
                >
                  <source src={plantVideoUrl} type="video/mp4" />
                </video>
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-200">
                <IoVideocamOutline className="h-7 w-7 text-gray-500" />
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Health check video
            </h2>
            <p className="mb-3 text-sm text-gray-500">
              Film left to right across the planted area.
            </p>
            {healthFile ? (
              <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-black shadow-md">
                <video
                  className="h-full w-full object-cover"
                  controls
                  preload="metadata"
                  src={healthFileUrl}
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 p-1.5 shadow"
                  aria-label="Remove video"
                >
                  <MdClose className="h-6 w-6 text-brown-2" />
                </button>
              </div>
            ) : (
              <label
                onDragEnter={e => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragOver={e => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={e => {
                  e.preventDefault()
                  setIsDragOver(false)
                }}
                onDrop={e => {
                  e.preventDefault()
                  setIsDragOver(false)
                  void onPickFile(e.dataTransfer.files?.[0] || null)
                }}
                className={`relative flex aspect-[2/1] w-full cursor-pointer items-center justify-center rounded-xl shadow-md ${
                  isDragOver
                    ? 'bg-[#e8f7ed] ring-2 ring-tree-green-2'
                    : 'bg-[#f7fbf3]'
                }`}
              >
                <IoVideocamOutline
                  className="pointer-events-none h-10 w-10 text-[#435f24]"
                  aria-hidden
                />
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={e => void onPickFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <label className="mb-1.5 block text-sm text-gray-600">
              Trees alive *
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Maximum {maxTreesAlive} (trees planted on submission)
            </p>
            <input
              value={treesAliveInput}
              onChange={e => setTreesAliveInput(e.target.value)}
              type="number"
              min={0}
              max={maxTreesAlive}
              inputMode="numeric"
              placeholder="e.g. 8"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900"
            />
          </section>

          {validationError ? (
            <p className="text-sm text-red-600">{validationError}</p>
          ) : null}
          {submitting ? (
            <p className="text-xs text-gray-600">
              Uploading... {uploadProgress}%
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              color="gray"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              color="success"
              onClick={() => void onSubmit()}
              disabled={!canSubmit}
            >
              Submit health check
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
