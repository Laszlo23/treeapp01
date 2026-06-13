import { Button } from '@/components/ui/Button'

interface VideoSavedSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onDone: () => void
  locationInfo?: {
    hasValidLocation: boolean
    formatLocation: () => string
    accuracy?: number | null
  }
}

export default function VideoSavedSuccessModal({
  isOpen,
  onClose,
  onDone,
  locationInfo,
}: VideoSavedSuccessModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-6 py-9">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl" aria-hidden>
                🌱
              </span>
            </div>

            <h3 className="text-2xl font-bold text-gray-900">
              Before video saved
            </h3>

            <p className="text-lg font-semibold text-gray-700">
              Go plant your trees in the field, then come back for the after
              video.
            </p>

            {locationInfo?.hasValidLocation ? (
              <div className="w-full rounded-lg bg-gray-50 p-4">
                <div className="space-y-1 text-sm text-gray-700">
                  <p className="flex items-center justify-center gap-2">
                    <span aria-hidden>📍</span>
                    <span>
                      Location recorded: {locationInfo.formatLocation()}
                    </span>
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <span aria-hidden>🎯</span>
                    <span>
                      Accuracy: ±
                      {locationInfo.accuracy
                        ? Math.round(locationInfo.accuracy)
                        : 'Unknown'}
                      m
                    </span>
                  </p>
                </div>
              </div>
            ) : null}

            <Button
              onClick={onDone}
              className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-300"
              pill
              size="lg"
            >
              <span className="font-semibold">Continue to after video</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-gray-500 underline"
            >
              Stay on this page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
